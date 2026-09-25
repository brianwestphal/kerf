import { execFile, spawn } from 'node:child_process';
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const script = resolve(import.meta.dirname, '../../scripts/ticket-timing.mjs');
const guard = resolve(
  import.meta.dirname,
  '../../scripts/check-guidance-integrity.mjs',
);

async function fixtureRepo(prefix: string) {
  const scratch = await mkdtemp(join(tmpdir(), prefix));
  const root = join(scratch, 'repo');
  const log = join(scratch, 'notes.log');
  const fake = join(scratch, 'hotsheet-cli');
  await mkdir(root);
  await writeFile(log, '');
  await writeFile(
    fake,
    `#!/bin/sh\nprintf '%s\\n' "$*" >> "$TIMING_TEST_LOG"\n`,
  );
  await chmod(fake, 0o755);
  const git = (args: string[]) => execFileAsync('git', args, { cwd: root });
  await git(['init', '-b', 'main']);
  await git(['config', 'user.name', 'Timing Test']);
  await git(['config', 'user.email', 'timing@example.test']);
  await writeFile(join(root, 'fixture.txt'), 'content\n');
  await git(['add', 'fixture.txt']);
  await git(['commit', '-m', 'KF-NEW111 outgoing change']);
  const { stdout } = await git(['rev-parse', 'HEAD']);
  const head = stdout.trim();
  return {
    scratch,
    root,
    log,
    git,
    pushInput: `refs/heads/main ${head} refs/heads/main ${'0'.repeat(40)}\n`,
    env: { ...process.env, HOTSHEET_CLI: fake, TIMING_TEST_LOG: log },
  };
}

function runWithInput(
  args: string[],
  options: { cwd: string; env: typeof process.env },
  input: string,
) {
  return new Promise<{ code: number | null; stderr: string }>(
    (resolvePromise, reject) => {
      const child = spawn(process.execPath, [script, ...args], options);
      let stderr = '';
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', (chunk: string) => (stderr += chunk));
      child.once('error', reject);
      child.once('close', (code) => resolvePromise({ code, stderr }));
      child.stdin.end(input);
    },
  );
}

// These drive real git/node subprocess round trips (the skip sequence runs
// about ten), so allow for full-suite CPU contention.
describe('ticket timing CLI', { timeout: 30_000 }, () => {
  it('runs a real command and appends a sanitized durable interval note', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kerf-ticket-timing-'));
    const log = join(root, 'notes.jsonl');
    const fake = join(root, 'hotsheet-cli');
    await writeFile(
      fake,
      `#!/bin/sh\nprintf '%s\\n' "$*" >> "$TIMING_TEST_LOG"\n`,
    );
    await chmod(fake, 0o755);

    await execFileAsync(
      process.execPath,
      [
        script,
        'run',
        'KF-TEST1',
        '--phase',
        'local_verification',
        '--gate',
        'unit:test',
        '--',
        process.execPath,
        '-e',
        '',
      ],
      {
        env: {
          ...process.env,
          HOTSHEET_CLI: fake,
          TIMING_TEST_LOG: log,
          PATH: `${root}${delimiter}${process.env.PATH}`,
        },
      },
    );

    const written = await readFile(log, 'utf8');
    expect(written).toContain('edit KF-TEST1');
    expect(written).toContain('"phase":"local_verification"');
    expect(written).toContain('"gate":"unit:test"');
    expect(written).toContain('"outcome":"passed"');
    expect(written).not.toContain(root);
  });

  it('preserves the wrapped failure and records a stable category', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kerf-ticket-timing-fail-'));
    const log = join(root, 'notes.jsonl');
    const fake = join(root, 'hotsheet-cli');
    await writeFile(
      fake,
      `#!/bin/sh\nprintf '%s\\n' "$*" >> "$TIMING_TEST_LOG"\n`,
    );
    await chmod(fake, 0o755);

    await expect(
      execFileAsync(
        process.execPath,
        [
          script,
          'run',
          'KF-TEST1',
          '--phase',
          'ci',
          '--gate',
          'github:ci',
          '--failure-category',
          'test_failure',
          '--',
          process.execPath,
          '-e',
          'process.exit(7)',
        ],
        {
          env: {
            ...process.env,
            HOTSHEET_CLI: fake,
            TIMING_TEST_LOG: log,
          },
        },
      ),
    ).rejects.toMatchObject({ code: 7 });

    const written = await readFile(log, 'utf8');
    expect(written).toContain('"outcome":"failed"');
    expect(written).toContain('"failure_category":"test_failure"');
  });

  it('ignores historical subjects for an annotated tag on an already-pushed commit', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kerf-ticket-timing-tag-'));
    const log = join(root, 'notes.jsonl');
    const fake = join(root, 'hotsheet-cli');
    await writeFile(log, '');
    await writeFile(
      fake,
      `#!/bin/sh\nprintf '%s\\n' "$*" >> "$TIMING_TEST_LOG"\n`,
    );
    await chmod(fake, 0o755);
    await execFileAsync('git', ['init', '-b', 'main'], { cwd: root });
    await execFileAsync('git', ['config', 'user.name', 'Timing Test'], {
      cwd: root,
    });
    await execFileAsync(
      'git',
      ['config', 'user.email', 'timing@example.test'],
      {
        cwd: root,
      },
    );
    await writeFile(join(root, 'fixture.txt'), 'already pushed\n');
    await execFileAsync('git', ['add', 'fixture.txt'], { cwd: root });
    await execFileAsync(
      'git',
      ['commit', '-m', 'KF-OLD111 already published'],
      { cwd: root },
    );
    await execFileAsync(
      'git',
      ['update-ref', 'refs/remotes/origin/main', 'HEAD'],
      { cwd: root },
    );
    await execFileAsync(
      'git',
      ['tag', '-a', 'v5.0.0-beta.36', '-m', 'beta 36'],
      { cwd: root },
    );
    const { stdout: tagSha } = await execFileAsync(
      'git',
      ['rev-parse', 'v5.0.0-beta.36'],
      { cwd: root },
    );
    const pushInput = `refs/tags/v5.0.0-beta.36 ${tagSha.trim()} refs/tags/v5.0.0-beta.36 ${'0'.repeat(40)}\n`;
    const env = {
      ...process.env,
      HOTSHEET_CLI: fake,
      TIMING_TEST_LOG: log,
      PATH: `${root}${delimiter}${process.env.PATH}`,
    };

    const result = await runWithInput(
      ['pre-push', 'origin', 'test://origin', '--', process.execPath, '-e', ''],
      { cwd: root, env },
      pushInput,
    );
    expect(result).toEqual({ code: 0, stderr: '' });
    expect(await readFile(log, 'utf8')).toBe('');

    const explicit = await runWithInput(
      ['pre-push', 'origin', 'test://origin', '--', process.execPath, '-e', ''],
      {
        cwd: root,
        env: { ...env, KERF_TICKET_TIMING_TICKETS: 'KF-RELEASE36' },
      },
      pushInput,
    );
    expect(explicit).toEqual({ code: 0, stderr: '' });
    expect(await readFile(log, 'utf8')).toContain('edit KF-RELEASE36');
    expect(await readFile(log, 'utf8')).not.toContain('KF-OLD111');
  });

  it('records a push of more outgoing tickets than a coherent batch only against explicit tickets', async () => {
    const repo = await fixtureRepo('kerf-ticket-timing-fanout-');
    for (let index = 0; index < 25; index += 1)
      await repo.git(['commit', '--allow-empty', '-m', `KF-HIST${index} old`]);
    const { stdout: head } = await repo.git(['rev-parse', 'HEAD']);
    const pushInput = `refs/heads/main ${head.trim()} refs/heads/main ${'0'.repeat(40)}\n`;
    const prePush = (env: typeof process.env) =>
      runWithInput(
        [
          'pre-push',
          'origin',
          'test://origin',
          '--',
          process.execPath,
          '-e',
          '',
        ],
        { cwd: repo.root, env },
        pushInput,
      );

    const bare = await prePush(repo.env);
    expect(bare.code).toBe(0);
    expect(bare.stderr).toContain(
      '26 outgoing tickets exceeds 25; not a coherent push, so recording no push-hook timing',
    );
    expect(await readFile(repo.log, 'utf8')).toBe('');

    const explicit = await prePush({
      ...repo.env,
      KERF_TICKET_TIMING_TICKETS: 'KF-FIRST1',
    });
    expect(explicit.code).toBe(0);
    expect(explicit.stderr).toContain(
      'recording only KERF_TICKET_TIMING_TICKETS (KF-FIRST1)',
    );
    const notes = (await readFile(repo.log, 'utf8')).trim().split('\n');
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatch(/^edit KF-FIRST1 /);
  });

  it('skips the pre-push check only for the exact clean tree that already passed', async () => {
    const repo = await fixtureRepo('kerf-ticket-timing-skip-');
    const ran = join(repo.scratch, 'check-ran');
    const check = [
      process.execPath,
      '-e',
      `require("node:fs").appendFileSync(${JSON.stringify(ran)}, "x")`,
    ];
    const prePush = (env: typeof process.env = repo.env) =>
      runWithInput(
        [
          'pre-push',
          'origin',
          'test://origin',
          '--skip-if-verified',
          '--',
          ...check,
        ],
        { cwd: repo.root, env },
        repo.pushInput,
      );
    const runs = async () => {
      try {
        return (await readFile(ran, 'utf8')).length;
      } catch {
        return 0;
      }
    };

    // No local pass recorded yet: the gate runs.
    expect((await prePush()).code).toBe(0);
    expect(await runs()).toBe(1);

    // A passing local `npm run check` (the guarded wrapper) records the tree.
    await execFileAsync(
      process.execPath,
      [guard, '--record-pass', '--', process.execPath, '-e', ''],
      { cwd: repo.root },
    );
    expect((await prePush()).code).toBe(0);
    expect(await runs()).toBe(1);
    const notes = await readFile(repo.log, 'utf8');
    expect(notes).toContain('"outcome":"skipped"');
    expect(notes).toContain('"skip_reason":"tree_already_verified"');
    expect(notes).toContain('edit KF-NEW111');

    // The explicit override always runs the gate.
    expect((await prePush({ ...repo.env, KERF_FORCE_CHECK: '1' })).code).toBe(
      0,
    );
    expect(await runs()).toBe(2);

    // A dirty worktree runs the gate even though HEAD's tree matches.
    await writeFile(join(repo.root, 'untracked.txt'), 'dirty\n');
    expect((await prePush()).code).toBe(0);
    expect(await runs()).toBe(3);
    await rm(join(repo.root, 'untracked.txt'));
    expect((await prePush()).code).toBe(0);
    expect(await runs()).toBe(3);

    // A (re)install changes the install fingerprint even though the tree and
    // worktree state are unchanged, so the recorded pass no longer applies.
    await writeFile(
      join(repo.root, '.git', 'info', 'exclude'),
      'node_modules/\n',
    );
    await mkdir(join(repo.root, 'node_modules'));
    await writeFile(
      join(repo.root, 'node_modules', '.package-lock.json'),
      '{"packages":{}}\n',
    );
    expect((await prePush()).code).toBe(0);
    expect(await runs()).toBe(4);
    await execFileAsync(
      process.execPath,
      [guard, '--record-pass', '--', process.execPath, '-e', ''],
      { cwd: repo.root },
    );
    expect((await prePush()).code).toBe(0);
    expect(await runs()).toBe(4);
    await writeFile(
      join(repo.root, 'node_modules', '.package-lock.json'),
      '{"packages":{"reinstalled":{}}}\n',
    );
    expect((await prePush()).code).toBe(0);
    expect(await runs()).toBe(5);

    // A new commit changes the tree, so the old pass no longer applies.
    await writeFile(join(repo.root, 'fixture.txt'), 'changed\n');
    await repo.git(['commit', '-am', 'KF-NEW222 second change']);
    const { stdout: head } = await repo.git(['rev-parse', 'HEAD']);
    const secondPush = `refs/heads/main ${head.trim()} refs/heads/main ${'0'.repeat(40)}\n`;
    expect(
      (
        await runWithInput(
          [
            'pre-push',
            'origin',
            'test://origin',
            '--skip-if-verified',
            '--',
            ...check,
          ],
          { cwd: repo.root, env: repo.env },
          secondPush,
        )
      ).code,
    ).toBe(0);
    expect(await runs()).toBe(6);

    // A failed rerun invalidates an earlier pass of the same tree.
    await execFileAsync(
      process.execPath,
      [guard, '--record-pass', '--', process.execPath, '-e', ''],
      { cwd: repo.root },
    );
    await expect(
      execFileAsync(
        process.execPath,
        [
          guard,
          '--record-pass',
          '--',
          process.execPath,
          '-e',
          'process.exit(3)',
        ],
        { cwd: repo.root },
      ),
    ).rejects.toMatchObject({ code: 3 });
    expect(
      (
        await runWithInput(
          [
            'pre-push',
            'origin',
            'test://origin',
            '--skip-if-verified',
            '--',
            ...check,
          ],
          { cwd: repo.root, env: repo.env },
          secondPush,
        )
      ).code,
    ).toBe(0);
    expect(await runs()).toBe(7);
  });

  it('summarizes a whole store read-only, excluding a fanned-out backfill', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kerf-ticket-timing-store-'));
    const store = join(root, 'store');
    const checkout = join(root, 'checkout');
    await mkdir(join(checkout, '.hotsheet2'), { recursive: true });
    await writeFile(join(checkout, '.hotsheet2', 'store'), `${store}\n`);
    const interval = (started: string, seconds: number) =>
      `KERF_TICKET_TIMING_V1 ${JSON.stringify({
        schema_version: 1,
        phase: 'push_hook',
        gate: 'root:check',
        event: 'interval',
        started_at: started,
        finished_at: new Date(
          Date.parse(started) + seconds * 1000,
        ).toISOString(),
        outcome: 'passed',
      })}`;
    const backfill = interval('2026-09-23T11:33:48.240Z', 55);
    for (let index = 0; index < 30; index += 1) {
      const bucket = join(store, 'tickets', String(index % 3));
      await mkdir(bucket, { recursive: true });
      await writeFile(
        join(bucket, `T${index}.md`),
        `---\nslug: KF-OLD${index}\n---\n${backfill}\n`,
      );
    }
    await writeFile(
      join(store, 'tickets', '0', 'NEW.md'),
      `---\nslug: KF-NEW1\n---\n${interval('2026-09-24T10:00:00.000Z', 75)}\n`,
    );
    const before = await readFile(join(store, 'tickets', '0', 'NEW.md'));

    const { stdout } = await execFileAsync(
      process.execPath,
      [script, 'summary', '--all'],
      { cwd: checkout },
    );
    expect(stdout).toContain(
      'Excluded backfill: push_hook/root:check at 2026-09-23T11:33:48.240Z attached to 30 tickets',
    );
    expect(stdout).toContain('push_hook/root:check: 1 run(s), median 75.0s');

    const { stdout: json } = await execFileAsync(
      process.execPath,
      [
        script,
        'summary',
        '--all',
        '--store',
        store,
        '--include-backfill',
        '--json',
      ],
      { cwd: root },
    );
    expect(JSON.parse(json)).toMatchObject({
      tickets: 31,
      excluded_records: 0,
      gates: [{ samples: 2 }],
    });
    expect(await readFile(join(store, 'tickets', '0', 'NEW.md'))).toEqual(
      before,
    );

    await expect(
      execFileAsync(process.execPath, [script, 'summary', '--all'], {
        cwd: root,
      }),
    ).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('No Hot Sheet store found'),
    });
  });

  it('does not record a pass when the checked worktree was dirty', async () => {
    const repo = await fixtureRepo('kerf-ticket-timing-dirty-');
    await writeFile(join(repo.root, 'fixture.txt'), 'edited\n');
    await execFileAsync(
      process.execPath,
      [guard, '--record-pass', '--', process.execPath, '-e', ''],
      { cwd: repo.root },
    );
    await repo.git(['checkout', 'fixture.txt']);
    const { stdout } = await repo.git([
      'rev-parse',
      '--git-path',
      'kerf/check-pass.json',
    ]);
    await expect(
      readFile(resolve(repo.root, stdout.trim()), 'utf8'),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
