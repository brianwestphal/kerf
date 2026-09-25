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

describe('ticket timing CLI', () => {
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
    expect(await runs()).toBe(4);

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
    expect(await runs()).toBe(5);
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
