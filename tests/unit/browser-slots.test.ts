// KF-5YWM5X: machine-wide WebKit slots shared with Hot Sheet 2's
// `browser-engines` pool, driven here through a fake `hotsheet-cli`.
import { EventEmitter } from 'node:events';

import { describe, expect, it, vi } from 'vitest';

import {
  acquireBrowserSlot,
  describeHolders,
  holdRunnerWebkitSlots,
  parseClaimOutput,
  slotNames,
  slotPolicy,
  SLOTS_HELD_ENV,
} from '../../scripts/browser-slots.mjs';
import { prepareWebkitRun } from '../../scripts/playwright-webkit-guard.mjs';

type Call = { args: string[]; env: Record<string, string | undefined> };
type Answer =
  | { stdout: string; delay?: number; ignoresKill?: boolean }
  | { error: Error & { code?: string } };

/** A fake `spawn` whose answer per call comes from `respond`. */
function fakeCli(respond: (call: Call) => Answer) {
  const calls: Call[] = [];
  const killed: string[][] = [];
  const spawn = (
    _cli: string,
    args: string[],
    options: { env: Call['env'] },
  ) => {
    const call = { args, env: options.env };
    calls.push(call);
    const child = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: (signal: string) => void;
    };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    const answer = respond(call);
    let closed = false;
    const close = (stdout: string) => {
      if (closed) return;
      closed = true;
      if (stdout) child.stdout.emit('data', stdout);
      child.emit('close', 0);
    };
    child.kill = () => {
      killed.push(args);
      // A grant already printed when the kill arrives still counts (a race).
      close('stdout' in answer && answer.ignoresKill ? answer.stdout : '');
    };
    setTimeout(() => {
      if ('error' in answer) child.emit('error', answer.error);
      else if (answer.delay === undefined) close(answer.stdout);
      else setTimeout(() => close(answer.stdout), answer.delay);
    }, 0);
    return child;
  };
  const syncCalls: Call[] = [];
  const spawnSync = (
    _cli: string,
    args: string[],
    options: { env: Call['env'] },
  ) => {
    syncCalls.push({ args, env: options.env });
    return { status: 0 };
  };
  return { spawn, spawnSync, calls, killed, syncCalls };
}

const grant = (claim: string, token: string) =>
  JSON.stringify({ acquired: true, claim_id: claim, renewal_token: token });
const timeout = (resource: string) =>
  JSON.stringify({
    acquired: false,
    code: 'wait_timeout',
    holder: {
      resource,
      claim_id: `held-${resource}`,
      expires_at: 'soon',
      metadata: { pid: 'plain:42' },
    },
  });
const slotOf = (call: Call) => call.args[2];

describe('browser slot policy and names', () => {
  it('takes no slot in CI, when disabled, or when the runner holds them', () => {
    expect(slotPolicy('webkit', { CI: '1' })).toBe('off');
    expect(slotPolicy('webkit', { HOTSHEET_BROWSER_SLOTS: 'off' })).toBe('off');
    expect(slotPolicy('webkit', { [SLOTS_HELD_ENV]: 'chromium,webkit' })).toBe(
      'held',
    );
    expect(slotPolicy('webkit', {})).toBe('on');
  });

  it('names two slots by default and honors a sane HOTSHEET_WEBKIT_SLOTS', () => {
    expect(slotNames('webkit', {})).toEqual(['webkit-1', 'webkit-2']);
    expect(slotNames('webkit', { HOTSHEET_WEBKIT_SLOTS: '3' })).toEqual([
      'webkit-1',
      'webkit-2',
      'webkit-3',
    ]);
    expect(slotNames('webkit', { HOTSHEET_WEBKIT_SLOTS: '99' })).toHaveLength(
      2,
    );
    expect(slotNames('webkit', { HOTSHEET_WEBKIT_SLOTS: 'x' })).toHaveLength(2);
  });

  it('parses the CLI JSON and describes holders', () => {
    expect(parseClaimOutput('note\n{"acquired":true}')).toEqual({
      acquired: true,
    });
    expect(parseClaimOutput('no json')).toBeNull();
    expect(parseClaimOutput('{broken')).toBeNull();
    expect(
      describeHolders([
        {
          resource: 'webkit-1',
          claim_id: 'c1',
          expires_at: 't',
          metadata: { pid: 'plain:7' },
        },
        {},
      ]),
    ).toBe(
      'webkit-1 held by claim c1 until t (pid=7); ? held by claim ? until ?',
    );
  });
});

describe('acquireBrowserSlot', () => {
  it('waits on every slot at once, keeps the first grant, and stops the rest', async () => {
    const cli = fakeCli((call) =>
      call.args[1] === 'acquire'
        ? slotOf(call) === 'browser-engines/webkit-2'
          ? { stdout: grant('c2', 'secret-2') }
          : { stdout: timeout('webkit-1'), delay: 50 }
        : { stdout: '{}' },
    );
    const slot = await acquireBrowserSlot({
      engine: 'webkit',
      env: {},
      spawn: cli.spawn as never,
      spawnSync: cli.spawnSync as never,
    });
    expect(slot.resource).toBe('webkit-2');
    expect(slot.claimId).toBe('c2');
    const acquires = cli.calls.filter((call) => call.args[1] === 'acquire');
    expect(acquires.map(slotOf)).toEqual([
      'browser-engines/webkit-1',
      'browser-engines/webkit-2',
    ]);
    expect(acquires[0]!.args).toEqual(
      expect.arrayContaining(['--duration', '120s', '--wait']),
    );
    expect(cli.killed.map((args) => args[2])).toEqual([
      'browser-engines/webkit-1',
    ]);
    await slot.release();
    await slot.release();
    const releases = cli.calls.filter((call) => call.args[1] === 'release');
    expect(releases).toHaveLength(1);
    // The token travels in the environment, never on the command line.
    expect(releases[0]!.env.HOTSHEET_RESOURCE_CLAIM_TOKEN).toBe('secret-2');
    expect(releases[0]!.args.join(' ')).not.toContain('secret-2');
    slot.releaseSync();
    expect(cli.syncCalls).toHaveLength(0);
  });

  it('releases a grant that raced the winner', async () => {
    const cli = fakeCli((call) =>
      call.args[1] === 'acquire'
        ? slotOf(call) === 'browser-engines/webkit-1'
          ? { stdout: grant('c1', 'secret-1') }
          : { stdout: grant('c2', 'secret-2'), delay: 5, ignoresKill: true }
        : { stdout: '{}' },
    );
    const slot = await acquireBrowserSlot({
      engine: 'webkit',
      env: {},
      spawn: cli.spawn as never,
    });
    const released = cli.calls
      .filter((call) => call.args[1] === 'release')
      .map((call) => call.env.HOTSHEET_RESOURCE_CLAIM_TOKEN);
    expect(slot.resource).toBe('webkit-1');
    expect(released).toEqual(['secret-2']);
    slot.releaseSync();
  });

  it('renews every third of the lease and releases synchronously on exit', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      const cli = fakeCli((call) =>
        call.args[1] === 'acquire'
          ? slotOf(call) === 'browser-engines/webkit-1'
            ? { stdout: grant('c1', 'secret-1') }
            : { stdout: timeout('webkit-2'), delay: 20 }
          : { stdout: '{}' },
      );
      const slot = await acquireBrowserSlot({
        engine: 'webkit',
        env: {},
        leaseMs: 3000,
        spawn: cli.spawn as never,
        spawnSync: cli.spawnSync as never,
      });
      vi.advanceTimersByTime(1000);
      const renew = cli.calls.find((call) => call.args[1] === 'renew')!;
      expect(renew.args).toEqual(['resource', 'renew', '--duration', '3s']);
      expect(renew.env.HOTSHEET_RESOURCE_CLAIM_TOKEN).toBe('secret-1');
      slot.releaseSync();
      slot.releaseSync();
      expect(cli.syncCalls).toHaveLength(1);
      expect(cli.syncCalls[0]!.env.HOTSHEET_RESOURCE_CLAIM_TOKEN).toBe(
        'secret-1',
      );
      await slot.release();
      expect(cli.calls.some((call) => call.args[1] === 'release')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns no slot without the CLI, in CI, or when held', async () => {
    const missing = Object.assign(new Error('spawn hotsheet-cli ENOENT'), {
      code: 'ENOENT',
    });
    const cli = fakeCli(() => ({ error: missing }));
    const slot = await acquireBrowserSlot({
      engine: 'webkit',
      env: {},
      spawn: cli.spawn as never,
    });
    expect(slot).toMatchObject({ resource: null, reason: 'no-cli' });
    await slot.release();
    slot.releaseSync();
    expect(
      (await acquireBrowserSlot({ engine: 'webkit', env: { CI: 'true' } }))
        .reason,
    ).toBe('off');
  });

  it('keeps waiting through timed-out rounds, then names the holders', async () => {
    let clock = 0;
    const cli = fakeCli((call) =>
      call.args[1] === 'acquire'
        ? { stdout: timeout(slotOf(call)!.split('/')[1]!) }
        : { stdout: '{}' },
    );
    await expect(
      acquireBrowserSlot({
        engine: 'webkit',
        env: {},
        waitMs: 3000,
        spawn: cli.spawn as never,
        now: () => (clock += 600),
      }),
    ).rejects.toThrow(
      /No webkit browser slot came free within 3s: webkit-1 held by claim held-webkit-1 .*resource list browser-engines/,
    );
    // More than one round ran before giving up.
    expect(
      cli.calls.filter((call) => call.args[1] === 'acquire').length,
    ).toBeGreaterThan(2);
  });

  it('reports any other CLI failure', async () => {
    const cli = fakeCli(() => ({
      stdout: '{"acquired":false,"error":"store locked"}',
    }));
    await expect(
      acquireBrowserSlot({
        engine: 'webkit',
        env: {},
        spawn: cli.spawn as never,
      }),
    ).rejects.toThrow(
      'Could not take a webkit browser slot: store locked; store locked',
    );
  });
});

describe('holdRunnerWebkitSlots', () => {
  const slot = (resource: string) => ({
    resource,
    claimId: resource,
    release: async () => {},
    releaseSync: vi.fn(),
  });

  it('holds one slot per wanted worker, marks them held, and releases on exit', async () => {
    const env: Record<string, string | undefined> = {};
    const acquire = vi
      .fn()
      .mockResolvedValueOnce(slot('webkit-1'))
      .mockResolvedValueOnce(slot('webkit-2'));
    let onExit: (() => void) | undefined;
    const held = await holdRunnerWebkitSlots({
      env,
      workers: 4,
      acquire,
      onExit: (release: () => void) => (onExit = release),
    });
    expect(held.workers).toBe(2);
    expect(acquire.mock.calls[1]![0]).toMatchObject({ waitMs: 1000 });
    expect(env[SLOTS_HELD_ENV]).toBe('webkit');
    onExit!();
    for (const taken of held.slots!)
      expect(taken.releaseSync).toHaveBeenCalled();
  });

  it('runs with fewer workers when later slots are busy', async () => {
    const acquire = vi
      .fn()
      .mockResolvedValueOnce(slot('webkit-1'))
      .mockRejectedValueOnce(new Error('busy'));
    const held = await holdRunnerWebkitSlots({
      env: {},
      workers: 2,
      acquire,
      onExit: () => {},
    });
    expect(held.workers).toBe(1);
    const none = vi
      .fn()
      .mockResolvedValueOnce(slot('webkit-1'))
      .mockResolvedValueOnce({ resource: null, reason: 'off' });
    expect(
      (
        await holdRunnerWebkitSlots({
          env: {},
          workers: 2,
          acquire: none,
          onExit: () => {},
        })
      ).workers,
    ).toBe(1);
  });

  it('takes nothing when off or held, and reports a missing CLI', async () => {
    expect(await holdRunnerWebkitSlots({ env: { CI: '1' } })).toEqual({
      reason: 'off',
    });
    expect(
      await holdRunnerWebkitSlots({ env: { [SLOTS_HELD_ENV]: 'webkit' } }),
    ).toEqual({ reason: 'held' });
    const acquire = vi
      .fn()
      .mockResolvedValue({ resource: null, reason: 'no-cli' });
    expect(await holdRunnerWebkitSlots({ env: {}, acquire })).toEqual({
      reason: 'no-cli',
    });
  });
});

describe('prepareWebkitRun', () => {
  const projects = ['chromium', 'firefox', 'webkit'];

  it('caps the webkit project at the slots it holds', async () => {
    const hold = vi.fn().mockResolvedValue({ workers: 2, slots: [] });
    expect(
      await prepareWebkitRun(projects, { argv: [], env: {}, hold, workers: 2 }),
    ).toEqual({ webkitWorkers: 2 });
    expect(hold).toHaveBeenCalledWith({ env: {}, workers: 2 });
    // Repeats are safe once the pool bounds the browsers.
    expect(
      await prepareWebkitRun(projects, {
        argv: ['--repeat-each=5'],
        env: {},
        hold,
      }),
    ).toEqual({ webkitWorkers: 2 });
  });

  it('takes nothing in a worker, in CI, for --list, or without WebKit', async () => {
    const hold = vi.fn();
    for (const [argv, env] of [
      [[], { TEST_WORKER_INDEX: '0' }],
      [[], { CI: '1' }],
      [['--list'], {}],
      [['--project=chromium'], {}],
    ] as const)
      expect(
        await prepareWebkitRun(projects, { argv: [...argv], env, hold }),
      ).toEqual({});
    expect(
      await prepareWebkitRun(['chromium'], { argv: [], env: {}, hold }),
    ).toEqual({});
    expect(hold).not.toHaveBeenCalled();
  });

  it('falls back to the interim guard without the pool', async () => {
    const log = vi.fn();
    const noCli = vi.fn().mockResolvedValue({ reason: 'no-cli' });
    await expect(
      prepareWebkitRun(projects, {
        argv: ['--repeat-each=3'],
        env: {},
        hold: noCli,
        log,
      }),
    ).rejects.toThrow(/Refusing a local Playwright run with --repeat-each=3/);
    expect(log.mock.calls[0]![0]).toMatch(/hotsheet-cli is not installed/);
    const off = vi.fn().mockResolvedValue({ reason: 'off' });
    log.mockClear();
    expect(
      await prepareWebkitRun(projects, {
        argv: ['--project=webkit'],
        env: {},
        hold: off,
        log,
      }),
    ).toEqual({});
    expect(log.mock.calls[0]![0]).toMatch(
      /^\[playwright-webkit-guard\] Local Playwright WebKit run/,
    );
    const held = vi.fn().mockResolvedValue({ reason: 'held' });
    log.mockClear();
    expect(
      await prepareWebkitRun(projects, { argv: [], env: {}, hold: held, log }),
    ).toEqual({});
    expect(log).not.toHaveBeenCalled();
  });
});
