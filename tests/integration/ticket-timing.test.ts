import { execFile } from 'node:child_process';
import { chmod, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const script = resolve(import.meta.dirname, '../../scripts/ticket-timing.mjs');

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
});
