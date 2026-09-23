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

  it('accepts every public token shipped by foundation.css', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kerf-ui-foundation-tokens-'));
    await mkdir(join(root, 'src'));
    const foundation = await readFile(
      resolve(import.meta.dirname, '../../src/foundation.css'),
      'utf8',
    );
    const tokens = [
      ...new Set(
        [...foundation.matchAll(/^\s*(--kui-[a-z0-9-]+)\s*:/gm)].map(
          (match) => match[1],
        ),
      ),
    ];
    await writeFile(
      join(root, 'src/app.css'),
      `.app {\n${tokens.map((token, index) => `  --app-token-${index}: var(${token});`).join('\n')}\n}\n`,
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
    ).resolves.toBeDefined();
    const report = JSON.parse(
      await readFile(join(root, 'report.json'), 'utf8'),
    );
    expect(report.diagnostics).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ ruleId: 'KUI-L002' })]),
    );
  });

  it('offers a non-blocking adoption pass for unsupported overrides', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kerf-ui-analyzer-adoption-'));
    await mkdir(join(root, 'src'));
    await writeFile(
      join(root, 'src/app.css'),
      '.kui-state-banner .kui-private { color: red; }\nwa-dialog::part(body) { color: red; }',
    );
    const cli = resolve(import.meta.dirname, '../../analyzer/cli.mjs');

    await expect(
      execFileAsync(process.execPath, [
        cli,
        '--root',
        root,
        '--adoption',
        '--format',
        'json',
        '--output',
        'report.json',
      ]),
    ).resolves.toBeDefined();
    const report = JSON.parse(
      await readFile(join(root, 'report.json'), 'utf8'),
    );
    expect(report.summary).toMatchObject({ errors: 0, review: 2 });
    expect(report.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: 'KUI-L010', severity: 'review' }),
        expect.objectContaining({ ruleId: 'KUI-L011', severity: 'review' }),
      ]),
    );
  });

  it('emits stable catalog-driven CSS value diagnostics from the CLI', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kerf-ui-analyzer-values-cli-'));
    await mkdir(join(root, 'src'));
    await writeFile(
      join(root, 'src/app.tsx'),
      `import { List, uiColor } from '@kerfjs/ui';
export const App = () => <List gap={uiColor('accent')} />;
`,
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
    expect(report.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'KUI-L014',
          severity: 'error',
          message: expect.stringContaining('`rem()`'),
          location: expect.objectContaining({ file: 'src/app.tsx' }),
        }),
      ]),
    );
  });
});
