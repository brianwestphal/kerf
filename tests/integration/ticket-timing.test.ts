import { execFile, spawn } from 'node:child_process';
import { chmod, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const script = resolve(import.meta.dirname, '../../scripts/ticket-timing.mjs');

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
});
