import { execFile } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const guard = join(repoRoot, 'scripts/check-guidance-integrity.mjs');

describe('guidance integrity check wrapper', () => {
  it('passes through a successful command that leaves guidance unchanged', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kerf-guidance-e2e-clean-'));
    await writeFile(join(root, 'AGENTS.md'), 'stable');

    await expect(
      execFileAsync(
        process.execPath,
        [guard, '--', process.execPath, '-e', ''],
        {
          cwd: root,
        },
      ),
    ).resolves.toMatchObject({ stderr: '' });
  });

  it('fails and names guidance changed by the wrapped process', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kerf-guidance-e2e-write-'));
    await writeFile(join(root, 'AGENTS.md'), 'before');

    const result = execFileAsync(
      process.execPath,
      [
        guard,
        '--',
        process.execPath,
        '-e',
        'require("node:fs").writeFileSync("AGENTS.md", "after")',
      ],
      { cwd: root },
    );

    await expect(result).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('AGENTS.md'),
    });
  });
});
