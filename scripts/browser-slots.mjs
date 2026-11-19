// KF-5YWM5X: machine-wide browser slots, shared with Hot Sheet 2's
// `browser-engines` pool (HS2-M6TZB5; this ports its
// `clients/web/scripts/browser-slots.mjs` protocol).
//
// Playwright's macOS WebKit draws in real offscreen windows. Several local
// WebKit browsers at once, across agent sessions and repositories, have
// exhausted the system IOSurface limit and crashed WindowServer. Every local
// WebKit browser therefore first holds one slot of a machine-scoped
// resource-claim pool through `hotsheet-cli resource`:
// `browser-engines/webkit-1` … `webkit-N` (N = `HOTSHEET_WEBKIT_SLOTS`,
// default 2). The pool only bounds IOSurface use if every repository on the
// machine takes the same slots, so the names and lease rules must match.
//
// - Acquiring waits on every slot at once (the claim service's push-signalled
//   wait, not polling); the first grant wins, the other waits stop, and a
//   grant that raced the winner is released.
// - The holder renews its lease every third of it while the browser lives and
//   releases it on exit. A crashed holder stops renewing, so its lease lapses.
// - CI takes nothing, nor does `HOTSHEET_BROWSER_SLOTS=off`. Without
//   `hotsheet-cli` the caller falls back to the interim guard.
//
// Renewal and release pass the token through `HOTSHEET_RESOURCE_CLAIM_TOKEN`,
// never on a command line.

import {
  spawn as nodeSpawn,
  spawnSync as nodeSpawnSync,
} from 'node:child_process';

export const BROWSER_SLOT_NAMESPACE = 'browser-engines';
export const DEFAULT_WEBKIT_SLOTS = 2;
/** Set by a runner that already holds the slots its workers' browsers use. */
export const SLOTS_HELD_ENV = 'HOTSHEET_BROWSER_SLOTS_HELD';
export const DEFAULT_LEASE_MS = 120_000;
export const DEFAULT_WAIT_MS = 30 * 60_000;
/** One bounded wait round, so a stopped waiter's registration lapses soon. */
export const WAIT_ROUND_MS = 5 * 60_000;

/**
 * Whether this process takes slots: `off` in CI or when disabled, `held`
 * when its runner already holds them, otherwise `on`.
 */
export function slotPolicy(engine, env) {
  if (env.CI || env.HOTSHEET_BROWSER_SLOTS === 'off') return 'off';
  if ((env[SLOTS_HELD_ENV] ?? '').split(',').includes(engine)) return 'held';
  return 'on';
}

/** The pool's resource names for one engine. */
export function slotNames(engine, env) {
  const configured = Number.parseInt(
    env[`HOTSHEET_${engine.toUpperCase()}_SLOTS`] ?? '',
    10,
  );
  const count =
    Number.isInteger(configured) && configured >= 1 && configured <= 16
      ? configured
      : DEFAULT_WEBKIT_SLOTS;
  return Array.from({ length: count }, (_, index) => `${engine}-${index + 1}`);
}

export function claimCli(env) {
  return env.HOTSHEET_CLI_BIN || 'hotsheet-cli';
}

/** `90s`-style duration for the CLI, rounded up to whole seconds. */
const seconds = (ms) => `${Math.max(1, Math.ceil(ms / 1000))}s`;

/** The JSON object a `resource` command printed, or null. */
export function parseClaimOutput(stdout) {
  const start = stdout.indexOf('{');
  if (start < 0) return null;
  try {
    return JSON.parse(stdout.slice(start));
  } catch {
    return null;
  }
}

/** One line per holder, for a timeout that names who blocks the pool. */
export function describeHolders(holders) {
  return holders
    .map((holder) => {
      const meta = Object.entries(holder.metadata ?? {})
        .map(([key, value]) => `${key}=${String(value).replace(/^plain:/, '')}`)
        .join(' ');
      return `${holder.resource ?? '?'} held by claim ${holder.claim_id ?? '?'} until ${holder.expires_at ?? '?'}${meta ? ` (${meta})` : ''}`;
    })
    .join('; ');
}

function runCli(spawn, cli, args, env) {
  const child = spawn(cli, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  child.stdout?.on('data', (chunk) => (stdout += chunk));
  child.stderr?.on('data', (chunk) => (stderr += chunk));
  const done = new Promise((resolve) => {
    child.once('error', (error) =>
      resolve({ code: null, stdout, stderr, error }),
    );
    child.once('close', (code) => resolve({ code, stdout, stderr }));
  });
  return { child, done };
}

async function releaseToken(spawn, cli, env, token) {
  if (!token) return;
  await runCli(spawn, cli, ['resource', 'release'], {
    ...env,
    HOTSHEET_RESOURCE_CLAIM_TOKEN: token,
  }).done;
}

/** Wait on every slot at once for up to `roundMs`; the first grant wins. */
async function acquireRound({
  engine,
  env,
  cli,
  spawn,
  leaseMs,
  purpose,
  roundMs,
}) {
  const attempts = slotNames(engine, env).map((resource) => ({
    resource,
    ...runCli(
      spawn,
      cli,
      [
        'resource',
        'acquire',
        `${BROWSER_SLOT_NAMESPACE}/${resource}`,
        '--duration',
        seconds(leaseMs),
        '--wait',
        seconds(roundMs),
        '--meta',
        `pid=${process.pid}`,
        '--meta',
        `purpose=${purpose}`,
      ],
      env,
    ),
  }));
  const winner = await new Promise((resolve) => {
    let pending = attempts.length;
    for (const attempt of attempts)
      void attempt.done.then((result) => {
        const parsed = parseClaimOutput(result.stdout);
        if (parsed?.acquired === true) resolve({ attempt, grant: parsed });
        else if (--pending === 0) resolve(null);
      });
  });
  for (const attempt of attempts)
    if (attempt !== winner?.attempt) attempt.child.kill('SIGTERM');
  const results = await Promise.all(attempts.map((attempt) => attempt.done));
  const raced = attempts
    .map((attempt, index) =>
      attempt === winner?.attempt
        ? null
        : parseClaimOutput(results[index].stdout),
    )
    .filter((grant) => grant?.acquired === true);
  await Promise.all(
    raced.map((grant) => releaseToken(spawn, cli, env, grant.renewal_token)),
  );
  return { winner, results };
}

const noSlot = (reason) => ({
  resource: null,
  claimId: null,
  reason,
  release: async () => {},
  releaseSync: () => {},
});

/**
 * Holds one slot of the engine's pool until `release()` / `releaseSync()`.
 * Resolves a slot-less handle (with `reason`) in CI, when disabled or held,
 * or without `hotsheet-cli`; throws when no slot frees within `waitMs`.
 */
export async function acquireBrowserSlot({
  engine,
  env = process.env,
  waitMs = Number(env.HOTSHEET_BROWSER_SLOT_WAIT_MS) || DEFAULT_WAIT_MS,
  leaseMs = DEFAULT_LEASE_MS,
  purpose = 'playwright',
  spawn = nodeSpawn,
  spawnSync = nodeSpawnSync,
  now = Date.now,
}) {
  const policy = slotPolicy(engine, env);
  if (policy !== 'on') return noSlot(policy);
  const cli = claimCli(env);
  const started = now();
  let winner;
  for (;;) {
    const remaining = waitMs - (now() - started);
    const round = await acquireRound({
      engine,
      env,
      cli,
      spawn,
      leaseMs,
      purpose,
      roundMs: Math.max(1000, Math.min(remaining, WAIT_ROUND_MS)),
    });
    if (round.winner) {
      winner = round.winner;
      break;
    }
    const { results } = round;
    if (results.every((result) => result.error?.code === 'ENOENT'))
      return noSlot('no-cli');
    const outcomes = results.map((result) => parseClaimOutput(result.stdout));
    if (outcomes.every((outcome) => outcome?.code === 'wait_timeout')) {
      if (now() - started < waitMs - 1000) continue;
      const holders = outcomes
        .map((outcome) => outcome?.holder)
        .filter(Boolean);
      throw new Error(
        `No ${engine} browser slot came free within ${seconds(waitMs)}: ${describeHolders(holders)}. ` +
          `Inspect the pool with \`${cli} resource list ${BROWSER_SLOT_NAMESPACE}\`.`,
      );
    }
    const detail = results
      .map(
        (result) =>
          result.error?.message ??
          (parseClaimOutput(result.stdout)?.error || result.stderr.trim()),
      )
      .filter(Boolean)
      .join('; ');
    throw new Error(
      `Could not take a ${engine} browser slot: ${detail || 'unknown failure'}`,
    );
  }

  const token = winner.grant.renewal_token;
  // Renew at a third of the lease; a failed renewal lets the lease lapse.
  const timer = setInterval(() => {
    void runCli(
      spawn,
      cli,
      ['resource', 'renew', '--duration', seconds(leaseMs)],
      {
        ...env,
        HOTSHEET_RESOURCE_CLAIM_TOKEN: token,
      },
    ).done;
  }, leaseMs / 3);
  timer.unref?.();
  let released;
  return {
    resource: winner.attempt.resource,
    claimId: winner.grant.claim_id,
    waitedMs: now() - started,
    release: () => {
      released ??= (async () => {
        clearInterval(timer);
        await releaseToken(spawn, cli, env, token);
      })();
      return released;
    },
    releaseSync: () => {
      if (released) return;
      released = Promise.resolve();
      clearInterval(timer);
      spawnSync(cli, ['resource', 'release'], {
        env: { ...env, HOTSHEET_RESOURCE_CLAIM_TOKEN: token },
        stdio: 'ignore',
      });
    },
  };
}

/**
 * For a runner whose run includes WebKit: holds one slot per wanted WebKit
 * worker before any worker starts. It waits for the first slot, takes any
 * others that are free at once, and reports how many WebKit workers to run.
 * Marks the slots held for its workers (`HOTSHEET_BROWSER_SLOTS_HELD`) and
 * releases them on exit. Returns `{ workers, slots }`, or `{ reason }` when
 * it took none (`off`, `held`, or `no-cli`).
 */
export async function holdRunnerWebkitSlots({
  env = process.env,
  workers,
  acquire = acquireBrowserSlot,
  onExit = (release) => process.once('exit', release),
}) {
  const policy = slotPolicy('webkit', env);
  if (policy !== 'on') return { reason: policy };
  const wanted = Math.max(
    1,
    Math.min(workers ?? Infinity, slotNames('webkit', env).length),
  );
  const first = await acquire({
    engine: 'webkit',
    env,
    purpose: 'playwright-runner',
  });
  if (!first.resource) return { reason: first.reason };
  const slots = [first];
  while (slots.length < wanted) {
    try {
      const next = await acquire({
        engine: 'webkit',
        env,
        waitMs: 1000,
        purpose: 'playwright-runner',
      });
      if (!next.resource) break;
      slots.push(next);
    } catch {
      break;
    }
  }
  onExit(() => {
    for (const slot of slots) slot.releaseSync();
  });
  env[SLOTS_HELD_ENV] = [
    ...new Set([
      ...(env[SLOTS_HELD_ENV] ?? '').split(',').filter(Boolean),
      'webkit',
    ]),
  ].join(',');
  return { workers: slots.length, slots };
}
