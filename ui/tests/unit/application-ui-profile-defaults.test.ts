// @vitest-environment node
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import tsParser from '@typescript-eslint/parser';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

import {
  isDiscouragedWebAwesome,
  webAwesomeCatalog,
} from '../../ux-demo/catalog';

const uiRoot = resolve(import.meta.dirname, '../..');
// The in-repository plugin, loaded by URL as an installed consumer would
// resolve it (it ships no type declarations).
const { default: plugin } = (await import(
  pathToFileURL(resolve(uiRoot, '../eslint-plugin/index.js')).href
)) as { default: ESLint.Plugin };
const aiPath = (name: string) => resolve(uiRoot, 'ai', name);

interface Preference {
  preferred: string;
  avoid?: string[];
  rationale?: string;
}
const defaults = JSON.parse(
  readFileSync(aiPath('application-ui-profile.defaults.json'), 'utf8'),
) as { preferences: Record<string, Preference> };
const preferences = Object.values(defaults.preferences);
const avoided = preferences.flatMap(({ avoid = [] }) => avoid);
const discouraged = webAwesomeCatalog
  .filter(isDiscouragedWebAwesome)
  .map(({ id }) => `@kerfjs/ui:${id}`);

describe('package default application UI profile', () => {
  it('avoids exactly the Discouraged Web Awesome entries, in both directions', () => {
    // Every Discouraged entry is avoided, so KUI-L301 reports it when an app
    // renders it directly …
    expect(discouraged.filter((key) => !avoided.includes(key))).toEqual([]);
    // … and nothing else is: an avoided entry that is not Discouraged would
    // warn on a component the catalog recommends.
    expect(avoided.filter((key) => !discouraged.includes(key))).toEqual([]);
    expect(new Set(avoided).size).toBe(avoided.length);
  });

  it('prefers a first-party Kerf component and explains every avoid set', () => {
    for (const preference of preferences) {
      expect(discouraged).not.toContain(preference.preferred);
      expect(preference.preferred).not.toMatch(/^@kerfjs\/ui:wa-/);
      if (preference.avoid?.length) expect(preference.rationale).toBeTruthy();
    }
  });

  it('keeps the UX demo, recipes, and catalog shell free of directly rendered Discouraged elements', async () => {
    const eslint = new ESLint({
      cwd: uiRoot,
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
                workspaceRoot: uiRoot,
                catalogPath: aiPath('component-composition.json'),
                selectionCatalogPath: aiPath('component-catalog.json'),
                profileDefaultsPath: aiPath(
                  'application-ui-profile.defaults.json',
                ),
                profileContractPath: aiPath('application-ui-profile-sync.cjs'),
              },
            },
          },
          rules: { 'kerfjs/ui-preferences': 'error' },
        },
      ],
      // The Web Awesome catalog specimens render each Discouraged element on
      // purpose: that page documents the element itself.
      ignorePatterns: ['ux-demo/webawesome-demos.tsx'],
    });
    const results = await eslint.lintFiles([
      'ux-demo/**/*.{ts,tsx}',
      'docs/examples/**/*.tsx',
      'src/catalog.tsx',
      'src/catalog/**/*.{ts,tsx}',
    ]);
    expect(results.length).toBeGreaterThan(20);
    const findings = results.flatMap(({ filePath, messages }) =>
      messages.map(
        ({ line, message }) =>
          `${relative(uiRoot, filePath)}:${line} ${message}`,
      ),
    );
    expect(findings).toEqual([]);
  });

  it('reports a directly rendered Discouraged element through the same configuration', async () => {
    const eslint = new ESLint({
      cwd: uiRoot,
      overrideConfigFile: true,
      overrideConfig: [
        {
          files: ['**/*.tsx'],
          languageOptions: {
            parser: tsParser,
            parserOptions: { ecmaFeatures: { jsx: true } },
          },
          plugins: { kerfjs: plugin },
          settings: {
            kerfjs: {
              ui: {
                workspaceRoot: uiRoot,
                catalogPath: aiPath('component-composition.json'),
                selectionCatalogPath: aiPath('component-catalog.json'),
                profileDefaultsPath: aiPath(
                  'application-ui-profile.defaults.json',
                ),
                profileContractPath: aiPath('application-ui-profile-sync.cjs'),
              },
            },
          },
          rules: { 'kerfjs/ui-preferences': 'error' },
        },
      ],
    });
    const [result] = await eslint.lintText(
      'export const menu = () => <wa-dropdown><wa-dropdown-item /></wa-dropdown>;',
      { filePath: resolve(uiRoot, 'ux-demo/recipes/probe.tsx') },
    );
    expect(result.messages.map(({ message }) => message.slice(0, 8))).toEqual([
      'KUI-L301',
      'KUI-L301',
    ]);
    expect(result.messages[0].message).toContain('@kerfjs/ui:popup-menu');
  });
});
