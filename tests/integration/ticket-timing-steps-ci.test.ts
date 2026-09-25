import { execFile, spawn } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

import { parseTimingRecords } from '../../scripts/lib/ticket-timing.mjs';

const execFileAsync = promisify(execFile);
const timing = resolve(import.meta.dirname, '../../scripts/ticket-timing.mjs');
const runner = resolve(
  import.meta.dirname,
  '../../scripts/run-check-steps.mjs',
);

// A faithful Hot Sheet boundary: `show <ticket>` prints that ticket's notes
// and `edit <ticket> --note <text>` appends to them, as the real store does.
// Every command is also logged, in order, to one combined file.
const FAKE_HOTSHEET = `#!/bin/sh
if [ "$1" = show ]; then cat "$TIMING_TEST_LOG.$2" 2>/dev/null; exit 0; fi
printf '%s %s\\n' "$1" "$2" >> "$TIMING_TEST_LOG"
if [ "$3" = --note ]; then
  printf '%s\\n' "$4" >> "$TIMING_TEST_LOG"
  printf '%s\\n' "$4" >> "$TIMING_TEST_LOG.$2"
fi
`;

async function scratch(prefix: string) {
  const root = await mkdtemp(join(tmpdir(), prefix));
  const log = join(root, 'notes.log');
  const fake = join(root, 'hotsheet-cli');
  await writeFile(log, '');
  await writeFile(fake, FAKE_HOTSHEET);
  await chmod(fake, 0o755);
  return {
    root,
    log,
    env: { ...process.env, HOTSHEET_CLI: fake, TIMING_TEST_LOG: log },
    records: async () => parseTimingRecords(await readFile(log, 'utf8')),
  };
}

function node(code: string) {
  return `node -e ${JSON.stringify(code)}`;
}

function spawnTiming(
  args: string[],
  options: { cwd?: string; env: typeof process.env },
  input = '',
) {
  const child = spawn(process.execPath, [timing, ...args], {
    ...options,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  child.stdin.end(input);
  const done = new Promise<number | null>((resolvePromise) =>
    child.once('close', (code) => resolvePromise(code)),
  );
  return { child, done };
}

describe('step-timed check chain', () => {
  it('runs each && segment, stops at the first failure, and logs step durations', async () => {
    const dir = await scratch('kerf-check-steps-');
    await writeFile(
      join(dir.root, 'package.json'),
      JSON.stringify({
        scripts: {
          chain: [
            node(''),
            node('process.exit(4)'),
            node('require("fs").writeFileSync("third", "")'),
          ].join(' && '),
        },
      }),
    );
    const stepLog = join(dir.root, 'steps.json');
    await expect(
      execFileAsync(process.execPath, [runner, 'chain'], {
        cwd: dir.root,
        env: { ...process.env, KERF_CHECK_STEP_LOG: stepLog },
      }),
    ).rejects.toMatchObject({ code: 4 });
    const log = JSON.parse(await readFile(stepLog, 'utf8')) as {
      steps: Array<{ name: string; outcome: string; duration_ms: number }>;
    };
    expect(log.steps.map((step) => [step.name, step.outcome])).toEqual([
      ['node', 'passed'],
      ['node-2', 'failed'],
    ]);
    await expect(readFile(join(dir.root, 'third'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('attaches per-step durations and the failed step to the push-hook record', async () => {
    const dir = await scratch('kerf-check-steps-push-');
    const repo = join(dir.root, 'repo');
    await mkdir(repo);
    await execFileAsync('git', ['init', '-b', 'main'], { cwd: repo });
    await writeFile(
      join(repo, 'package.json'),
      JSON.stringify({
        scripts: {
          'check:core': `npm run --silent ok && ${node('process.exit(2)')}`,
          ok: node(''),
        },
      }),
    );
    const { done } = spawnTiming(
      [
        'pre-push',
        'origin',
        'test://origin',
        '--',
        process.execPath,
        runner,
        'check:core',
      ],
      {
        cwd: repo,
        env: { ...dir.env, KERF_TICKET_TIMING_TICKETS: 'KF-STEP1' },
      },
    );
    expect(await done).toBe(2);
    const [record] = await dir.records();
    expect(record).toMatchObject({
      phase: 'push_hook',
      gate: 'root:check',
      outcome: 'failed',
      failure_category: 'command_exit',
      failed_step: 'node',
    });
    expect(Object.keys(record.steps)).toEqual(['ok', 'node']);
  });

  it('records an interrupted attempt when the wrapped gate is stopped', async () => {
    const dir = await scratch('kerf-check-steps-int-');
    const { child, done } = spawnTiming(
      [
        'run',
        'KF-INT1',
        '--phase',
        'local_verification',
        '--gate',
        'root:check',
        '--',
        process.execPath,
        '-e',
        'console.log("ready"); setTimeout(() => {}, 20000)',
      ],
      { env: dir.env },
    );
    await new Promise<void>((resolvePromise) =>
      child.stdout.once('data', () => resolvePromise()),
    );
    child.kill('SIGINT');
    expect(await done).toBe(130);
    expect(await dir.records()).toEqual([
      expect.objectContaining({
        outcome: 'interrupted',
        failure_category: 'signal',
      }),
    ]);
  });
});

describe('active and CI timing', () => {
  it('wraps Hot Sheet claim and release with an active session', async () => {
    const dir = await scratch('kerf-timing-claim-');
    await execFileAsync(
      process.execPath,
      [timing, 'claim', 'KF-ACT1', '--worker', 'agent-1'],
      { env: dir.env },
    );
    await execFileAsync(
      process.execPath,
      [timing, 'release', 'KF-ACT1', '--worker', 'agent-1'],
      { env: dir.env },
    );
    const text = await readFile(dir.log, 'utf8');
    expect(
      text.split('\n').filter((line) => /^(claim|release) /.test(line)),
    ).toEqual(['claim KF-ACT1', 'release KF-ACT1']);
    const records = await dir.records();
    expect(records.map((record) => [record.event, record.phase])).toEqual([
      ['start', 'active'],
      ['finish', 'active'],
    ]);
    expect(records[1].session_id).toBe(records[0].session_id);
  });

  it('imports completed GitHub runs per ticket exactly once', async () => {
    const dir = await scratch('kerf-timing-ci-');
    const repo = join(dir.root, 'repo');
    await mkdir(repo);
    const git = (args: string[]) => execFileAsync('git', args, { cwd: repo });
    await git(['init', '-b', 'main']);
    await git(['config', 'user.name', 'Timing Test']);
    await git(['config', 'user.email', 'timing@example.test']);
    const shas: string[] = [];
    for (const subject of ['KF-OLD1 base', 'KF-CI1 first', 'KF-CI2 second']) {
      await git(['commit', '--allow-empty', '-m', subject]);
      shas.push((await git(['rev-parse', 'HEAD'])).stdout.trim());
    }
    const runs = [
      {
        databaseId: 1,
        headSha: shas[0],
        headBranch: 'main',
        workflowName: 'CI',
        event: 'push',
        status: 'completed',
        conclusion: 'success',
        createdAt: '2026-09-25T10:00:00Z',
        startedAt: '2026-09-25T10:00:00Z',
        updatedAt: '2026-09-25T10:05:00Z',
      },
      {
        databaseId: 2,
        headSha: shas[2],
        headBranch: 'main',
        workflowName: 'CI',
        event: 'push',
        status: 'completed',
        conclusion: 'failure',
        createdAt: '2026-09-25T11:00:00Z',
        startedAt: '2026-09-25T11:00:00Z',
        updatedAt: '2026-09-25T11:08:00Z',
      },
    ];
    const ghArgs = join(dir.root, 'gh-args');
    const fakeGh = join(dir.root, 'gh');
    await writeFile(join(dir.root, 'runs.json'), JSON.stringify(runs));
    await writeFile(
      fakeGh,
      `#!/bin/sh\nprintf '%s\\n' "$*" > ${JSON.stringify(ghArgs)}\ncat ${JSON.stringify(join(dir.root, 'runs.json'))}\n`,
    );
    await chmod(fakeGh, 0o755);
    const env = { ...dir.env, KERF_GH_CLI: fakeGh };

    for (let pass = 0; pass < 2; pass += 1)
      await execFileAsync(
        process.execPath,
        [timing, 'import-ci', '--limit', '5'],
        {
          cwd: repo,
          env,
        },
      );

    expect(await readFile(ghArgs, 'utf8')).toContain(
      'run list --limit 5 --json',
    );
    const text = await readFile(dir.log, 'utf8');
    expect(text).toContain('edit KF-CI1');
    expect(text).toContain('edit KF-CI2');
    expect(text).not.toContain('KF-OLD1');
    const records = await dir.records();
    expect(records).toHaveLength(2);
    for (const record of records)
      expect(record).toMatchObject({
        phase: 'ci',
        gate: 'github:ci',
        run_id: '2',
        outcome: 'failed',
        failure_category: 'workflow_failure',
      });
    expect(text).not.toContain(repo);
  });

  it('treats a hand-recorded run, with or without --run-id, as already imported', async () => {
    const dir = await scratch('kerf-timing-ci-hand-');
    const repo = join(dir.root, 'repo');
    await mkdir(repo);
    const git = (args: string[]) => execFileAsync('git', args, { cwd: repo });
    await git(['init', '-b', 'main']);
    await git(['config', 'user.name', 'Timing Test']);
    await git(['config', 'user.email', 'timing@example.test']);
    const shas: string[] = [];
    for (const subject of [
      'KF-OLD1 base',
      'KF-HAND1 recorded by id',
      'KF-HAND2 recorded by time',
      'KF-HAND3 recorded for another run',
    ]) {
      await git(['commit', '--allow-empty', '-m', subject]);
      shas.push((await git(['rev-parse', 'HEAD'])).stdout.trim());
    }
    const ciRun = (databaseId: number, headSha: string, hour: number) => ({
      databaseId,
      headSha,
      headBranch: 'main',
      workflowName: 'CI',
      event: 'push',
      status: 'completed',
      conclusion: 'success',
      createdAt: `2026-09-25T${hour}:00:00Z`,
      startedAt: `2026-09-25T${hour}:00:00Z`,
      updatedAt: `2026-09-25T${hour}:05:00Z`,
    });
    const fakeGh = join(dir.root, 'gh');
    await writeFile(
      join(dir.root, 'runs.json'),
      JSON.stringify([ciRun(1, shas[0], 10), ciRun(2, shas[3], 11)]),
    );
    await writeFile(
      fakeGh,
      `#!/bin/sh\ncat ${JSON.stringify(join(dir.root, 'runs.json'))}\n`,
    );
    await chmod(fakeGh, 0o755);
    const env = { ...dir.env, KERF_GH_CLI: fakeGh };
    const record = (ticket: string, extra: string[]) =>
      execFileAsync(
        process.execPath,
        [
          timing,
          'record',
          ticket,
          '--phase',
          'ci',
          '--gate',
          'github:ci',
          '--outcome',
          'passed',
          ...extra,
        ],
        { cwd: repo, env },
      );

    await record('KF-HAND1', [
      '--started-at',
      '2026-09-25T08:00:00Z',
      '--finished-at',
      '2026-09-25T08:01:00Z',
      '--run-id',
      '2',
    ]);
    // Typed from memory: 30 s off the run's real window, and no run id.
    await record('KF-HAND2', [
      '--started-at',
      '2026-09-25T11:05:30Z',
      '--finished-at',
      '2026-09-25T11:06:00Z',
    ]);
    // Same window, but explicitly a different run.
    await record('KF-HAND3', [
      '--started-at',
      '2026-09-25T11:00:00Z',
      '--finished-at',
      '2026-09-25T11:05:00Z',
      '--run-id',
      '3',
    ]);
    await expect(
      record('KF-HAND1', [
        '--started-at',
        '2026-09-25T08:00:00Z',
        '--finished-at',
        '2026-09-25T08:01:00Z',
        '--run-id',
        'abc',
      ]),
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('Invalid run id: abc'),
    });

    const { stdout } = await execFileAsync(
      process.execPath,
      [timing, 'import-ci', '--limit', '5'],
      { cwd: repo, env },
    );
    expect(stdout).toContain('Imported 1 run interval(s); 2 already recorded');
    const records = await dir.records();
    expect(records).toHaveLength(4);
    expect(records[0]).toMatchObject({ run_id: '2' });
    expect(records[1]).not.toHaveProperty('run_id');
    expect(records[3]).toMatchObject({ run_id: '2' });
    const text = await readFile(dir.log, 'utf8');
    expect(text.match(/^edit KF-HAND3$/gm)).toHaveLength(2);
    expect(text.match(/^edit KF-HAND1$/gm)).toHaveLength(1);
    expect(text.match(/^edit KF-HAND2$/gm)).toHaveLength(1);
  });
});
