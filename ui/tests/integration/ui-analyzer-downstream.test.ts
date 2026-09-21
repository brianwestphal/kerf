import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

describe('kerf-ui-analyze downstream command', () => {
  it('writes versioned JSON and fails on definite integration errors', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kerf-ui-analyzer-cli-'));
    await mkdir(join(root, 'src'));
    await writeFile(
      join(root, 'src/app.css'),
      '.kui-toolbar__private { padding: 7px; }',
    );
    const cli = resolve(import.meta.dirname, '../../analyzer/cli.mjs');

    await expect(
      execFileAsync(process.execPath, [
        cli,
        '--root',
        root,
        '--format',
        'json',
        '--output',
        'report.json',
      ]),
    ).rejects.toMatchObject({ code: 1 });
    const report = JSON.parse(
      await readFile(join(root, 'report.json'), 'utf8'),
    );
    expect(report).toMatchObject({
      schemaVersion: 1,
      summary: { errors: 1 },
      diagnostics: expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'KUI-L001',
          location: expect.objectContaining({ file: 'src/app.css' }),
        }),
      ]),
    });
  });
});
