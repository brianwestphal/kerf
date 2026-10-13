// @vitest-environment node
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import tsParser from '@typescript-eslint/parser';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

import { analyzeUiProject } from '../../analyzer/index.mjs';

// eslint-plugin-kerfjs's `ui-css-values` and kerf-ui-analyze both report the
// CSS-value contract codes, and kerf-ui-doctor merges the two reports. Lint
// once registered helpers only for the `@kerfjs/ui` root import, so a helper
// imported from the documented `@kerfjs/ui/css-values` subpath produced a
// KUI-L014/L015 from the analyzer and silence from lint. Both tools must
// resolve a helper by its imported name from the package or ANY subpath, by
// named, aliased, or namespace import, and must ignore same-named helpers from
// other packages.
const uiRoot = resolve(import.meta.dirname, '../..');
const { default: plugin } = (await import(
  pathToFileURL(resolve(uiRoot, '../eslint-plugin/index.js')).href
)) as { default: ESLint.Plugin };
const aiPath = (name: string) => resolve(uiRoot, 'ai', name);
const packageProfile = aiPath('application-ui-profile.defaults.json');
const CODES = ['KUI-L013', 'KUI-L014', 'KUI-L015'];

const files: Record<string, string> = {
  'src/subpath.tsx': `import { ListItem } from '@kerfjs/ui/list-item';
import { ChoiceChips } from '@kerfjs/ui/choice-chips';
import { List } from '@kerfjs/ui/list';
import { fillColor, foregroundColor, plus, rem, px } from '@kerfjs/ui/css-values';
export const A = () => <ListItem label="A" iconTile={{ color: foregroundColor('#e5484d'), foreground: foregroundColor('white') }} />;
export const B = () => <ChoiceChips choices={[{ label: 'B', value: 'b', swatch: foregroundColor('#000') }]} />;
export const C = () => <List gap={plus(rem(1), px(2))} />;
export const D = () => <ListItem label="D" iconTile={{ color: fillColor('#000') }} />;
`,
  'src/aliased.tsx': `import { ListItem } from '@kerfjs/ui/list-item';
import { foregroundColor as fg, uiColor as tone } from '@kerfjs/ui/css-values';
export const E = () => <ListItem label="E" iconTile={{ color: fg('#e5484d'), foreground: tone('accent') }} />;
`,
  'src/namespace.ts': `import { List } from '@kerfjs/ui/list';
import { ListItem } from '@kerfjs/ui/list-item';
import * as css from '@kerfjs/ui/css-values';
List({ gap: css.plus(css.rem(1), css.px(2)) });
ListItem({ label: 'F', iconTile: { color: css.foregroundColor('#000') } });
List({ gap: '11px' });
`,
  'src/foreign.tsx': `import { ListItem } from '@kerfjs/ui/list-item';
import { foregroundColor } from 'other-ui/css-values';
import { flex } from '@kerfjs/ui-extras';
export const G = () => <ListItem label="G" iconTile={{ color: foregroundColor('#000'), foreground: flex(1) }} />;
`,
};

describe('ESLint ui-css-values agrees with kerf-ui-analyze', () => {
  it('reports the same KUI-L013–L015 findings for root, subpath, aliased, namespace, and foreign helper imports', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kerf-ui-css-values-parity-'));
    await mkdir(join(root, 'src'));
    for (const [path, source] of Object.entries(files))
      await writeFile(join(root, path), source);

    const report = await analyzeUiProject({ root, profile: packageProfile });
    const analyzed = report.diagnostics
      .filter(({ ruleId }) => CODES.includes(ruleId))
      .map(
        ({ ruleId, location }) =>
          `${location.file}:${location.line}:${location.column} ${ruleId}`,
      )
      .sort();

    const eslint = new ESLint({
      cwd: root,
      overrideConfigFile: true,
      overrideConfig: [
        {
          files: ['**/*.ts', '**/*.tsx'],
          languageOptions: {
            parser: tsParser,
            parserOptions: { ecmaFeatures: { jsx: true } },
          },
          plugins: { kerfjs: plugin },
          settings: {
            kerfjs: {
              ui: {
                workspaceRoot: root,
                catalogPath: aiPath('component-composition.json'),
                selectionCatalogPath: aiPath('component-catalog.json'),
                profileDefaultsPath: packageProfile,
                profileContractPath: aiPath('application-ui-profile-sync.cjs'),
              },
            },
          },
          rules: { 'kerfjs/ui-css-values': 'error' },
        },
      ],
    });
    const results = await eslint.lintFiles(['src/**/*.{ts,tsx}']);
    const linted = results
      .flatMap(({ filePath, messages }) =>
        messages.map(
          ({ line, column, message }) =>
            `${relative(root, filePath)}:${line}:${column} ${message.slice(0, 8)}`,
        ),
      )
      .sort();

    // Every finding the fixture plants, so neither tool can agree by both
    // going silent.
    expect(analyzed).toEqual(
      [
        'src/aliased.tsx:3:63 KUI-L014',
        'src/namespace.ts:4:13 KUI-L015',
        'src/namespace.ts:5:43 KUI-L014',
        'src/namespace.ts:6:13 KUI-L013',
        'src/subpath.tsx:5:63 KUI-L014',
        'src/subpath.tsx:6:81 KUI-L014',
        'src/subpath.tsx:7:35 KUI-L015',
      ].sort(),
    );
    expect(linted).toEqual(analyzed);
  }, 30_000);
});
