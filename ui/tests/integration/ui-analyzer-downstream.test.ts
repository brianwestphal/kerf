import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

describe('kerf-ui-analyze downstream command', { timeout: 30_000 }, () => {
  it('accepts a descendant selector whose ancestor does not own scrolling or inset', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kerf-ui-analyzer-subject-cli-'));
    await mkdir(join(root, 'src'));
    await writeFile(
      join(root, 'src/app.css'),
      '.chat-composer .chat-input { max-height: 160px; overflow-y: auto; padding: 8px; }',
    );
    await writeFile(
      join(root, 'src/app.tsx'),
      `import './app.css';
export const App = () => <div class="chat-composer"><div class="chat-input" /></div>;
`,
    );
    const cli = resolve(import.meta.dirname, '../../analyzer/cli.mjs');

    const { stdout } = await execFileAsync(process.execPath, [
      cli,
      '--root',
      root,
      '--format',
      'json',
    ]);
    const report = JSON.parse(stdout);
    expect(report.summary).toMatchObject({ errors: 0, review: 0 });
    expect(report.diagnostics).toEqual([]);
  });

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

  it('reports component-ownership overrides in every output format', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kerf-ui-analyzer-ownership-'));
    await mkdir(join(root, 'src'));
    await writeFile(
      join(root, 'package.json'),
      '{"name":"ownership-app","private":true}',
    );
    await writeFile(
      join(root, 'src/app.css'),
      [
        '.kui-toolbar > .my-widget { margin-inline-start: auto; }',
        '.kui-list-item { color: red; }',
        'wa-button { border-radius: 0; }',
        '.app { --_kui-toolbar-inset: 0; --kui-floating-toolbar-inset: 0; }',
        '.panel-header { background: red; }',
        // A forced dimension reports once (KUI-L019); an ancestor-only public
        // class sizes the app's own element and reports nothing.
        '.kui-pane { width: 300px; }',
        '.kui-pane .app-sidebar { width: 240px; }',
        '',
      ].join('\n'),
    );
    await writeFile(
      join(root, 'src/app.tsx'),
      `import './app.css';
import { Toolbar } from '@kerfjs/ui/toolbar';
export const App = () => <Toolbar className="panel-header" />;
`,
    );
    const cli = resolve(import.meta.dirname, '../../analyzer/cli.mjs');
    const run = (format: string, output: string) =>
      execFileAsync(process.execPath, [
        cli,
        '--root',
        root,
        '--format',
        format,
        '--output',
        output,
      ]);

    await expect(run('json', 'report.json')).rejects.toMatchObject({
      code: 1,
    });
    const report = JSON.parse(
      await readFile(join(root, 'report.json'), 'utf8'),
    );
    expect(
      report.diagnostics.map(
        (item: { ruleId: string; location: { line: number } }) =>
          `${item.ruleId}:${item.location.line}`,
      ),
    ).toEqual([
      'KUI-L019:2',
      'KUI-L019:3',
      'KUI-L020:4',
      'KUI-L021:4',
      'KUI-L019:6',
      'KUI-L022:3',
    ]);
    expect(report.summary).toMatchObject({ errors: 6, review: 0 });

    await expect(run('sarif', 'report.sarif')).rejects.toMatchObject({
      code: 1,
    });
    const sarif = JSON.parse(
      await readFile(join(root, 'report.sarif'), 'utf8'),
    );
    const driverRules = sarif.runs[0].tool.driver.rules.map(
      (rule: { id: string }) => rule.id,
    );
    expect(driverRules).toEqual(
      expect.arrayContaining(['KUI-L019', 'KUI-L020', 'KUI-L021', 'KUI-L022']),
    );
    expect(driverRules).not.toContain('KUI-L005');
    for (const result of sarif.runs[0].results)
      expect(result.message.text).toContain('report the component gap');
  });

  it('passes a create-kerf-component scaffold and protects its components from an app', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kerf-ui-analyzer-scaffold-'));
    const scaffold = join(root, 'acme-counter');
    await execFileAsync(process.execPath, [
      resolve(import.meta.dirname, '../../../create-kerf-component/index.js'),
      scaffold,
    ]);
    const cli = resolve(import.meta.dirname, '../../analyzer/cli.mjs');

    // The scaffold's own `check:styles` gate: its stylesheet styles only
    // Counter, including in a Kerf UI Toolbar's context.
    const own = await execFileAsync(process.execPath, [
      cli,
      '--root',
      scaffold,
      '--format',
      'json',
      'src',
    ]);
    expect(JSON.parse(own.stdout)).toMatchObject({
      diagnostics: [],
      summary: { errors: 0, review: 0 },
    });

    // An application that declares the package's catalog may place its own
    // content in Counter's context but may not restyle Counter.
    const app = join(root, 'app');
    await mkdir(join(app, 'src'), { recursive: true });
    await writeFile(join(app, 'package.json'), '{"name":"counter-app"}');
    await writeFile(
      join(app, '.kerf-ui-profile.json'),
      JSON.stringify({
        schemaVersion: 1,
        scope: 'workspace',
        catalogs: [
          {
            package: 'acme-counter',
            composition: {
              path: '../acme-counter/component-composition.json',
              schemaVersion: 2,
            },
          },
        ],
      }),
    );
    await writeFile(
      join(app, 'src/app.css'),
      '.kerf-counter > .app-hint { opacity: 0.5; }\n.kerf-counter { gap: 0; }\n.app { --_kerf-counter-gap: 0; }\n',
    );
    await expect(
      execFileAsync(process.execPath, [
        cli,
        '--root',
        app,
        '--format',
        'json',
        '--output',
        'report.json',
      ]),
    ).rejects.toMatchObject({ code: 1 });
    const report = JSON.parse(await readFile(join(app, 'report.json'), 'utf8'));
    expect(
      report.diagnostics.map(
        (item: { ruleId: string; location: { line: number } }) =>
          `${item.ruleId}:${item.location.line}`,
      ),
    ).toEqual(['KUI-L019:2', 'KUI-L020:3']);
    expect(report.diagnostics[0].message).toContain(
      'report the component gap to acme-counter',
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
