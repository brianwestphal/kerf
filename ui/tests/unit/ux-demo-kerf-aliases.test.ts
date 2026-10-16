// @vitest-environment node
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import config from '../../ux-demo/vite.config.js';

const uiRoot = resolve(import.meta.dirname, '../..');
const repoSource = resolve(uiRoot, '../src');

async function sourceFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(path)));
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(path);
  }
  return files;
}

async function kerfSpecifiers(files: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  for (const file of files)
    for (const match of (await readFile(file, 'utf8')).matchAll(
      /from\s+['"](kerfjs(?:\/[\w-]+)?)['"]/g,
    ))
      found.add(match[1]!);
  return found;
}

describe('UX demo kerfjs aliases', () => {
  // The demo aliases kerfjs to the repository source. A kerfjs specifier that
  // misses an alias resolves to the installed package instead, whose separate
  // signals copy fails the source runtime's Signal check, so a signal rendered
  // as a JSX child throws (the dev server's jsx-dev-runtime once did).
  it('aliases every kerfjs specifier the demo or the JSX transform loads to the repository source', async () => {
    const aliases = (config.resolve?.alias ?? []) as {
      find: RegExp;
      replacement: string;
    }[];
    const specifiers = await kerfSpecifiers(
      await sourceFiles(resolve(uiRoot, 'ux-demo')),
    );
    for (const injected of ['kerfjs/jsx-runtime', 'kerfjs/jsx-dev-runtime'])
      specifiers.add(injected);
    expect(specifiers).toContain('kerfjs');
    for (const specifier of specifiers) {
      const alias = aliases.find(({ find }) => find.test(specifier));
      expect(alias, `${specifier} has no source alias`).toBeDefined();
      expect(alias!.replacement.startsWith(repoSource)).toBe(true);
    }
    expect(
      aliases.find(({ find }) => find.test('kerfjs/jsx-dev-runtime'))!
        .replacement,
    ).toBe(resolve(repoSource, 'jsx-runtime.ts'));
  });
});
