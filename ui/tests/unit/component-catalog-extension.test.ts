import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { validateCatalogExtensionReferences } from '../../scripts/component-catalog-extension-validation.mjs';

const readJson = async (path: string) =>
  JSON.parse(await readFile(resolve(import.meta.dirname, path), 'utf8'));

describe('consumer catalog extension', () => {
  it('accepts direct Kerf and consumer dependencies and relative source paths', async () => {
    const [schema, extension, kerfCatalog] = await Promise.all([
      readJson('../../ai/component-catalog-extension.schema.json'),
      readJson('../../docs/examples/component-catalog-extension.json'),
      readJson('../../ai/component-catalog.json'),
    ]);
    const entry = schema.$defs.entry.properties;
    const pathPattern = new RegExp(schema.$defs.repositoryPath.pattern);

    expect(entry.uses.uniqueItems).toBe(true);
    expect(entry.source.$ref).toBe('#/$defs/repositoryPath');
    expect(entry.demoSource.$ref).toBe('#/$defs/repositoryPath');
    expect(validateCatalogExtensionReferences(extension, kerfCatalog)).toEqual(
      [],
    );
    for (const value of ['src/filter-chip.tsx', '.storybook/preview.tsx'])
      expect(pathPattern.test(value)).toBe(true);
    for (const value of [
      '/src/filter-chip.tsx',
      '../filter-chip.tsx',
      'src/../filter-chip.tsx',
      'src//filter-chip.tsx',
      'C:\\src\\filter-chip.tsx',
    ])
      expect(pathPattern.test(value)).toBe(false);
  });

  it('rejects unresolved uses and duplicate Kerf ids', () => {
    const kerf = { entries: [{ id: 'toolbar' }] };
    expect(
      validateCatalogExtensionReferences(
        {
          entries: [
            { id: 'inspector', uses: ['toolbar', 'chip', 'filter-chip'] },
            { id: 'filter-chip', uses: [] },
          ],
        },
        kerf,
      ),
    ).toEqual(['inspector uses unknown entry chip']);
    expect(
      validateCatalogExtensionReferences(
        { entries: [{ id: 'toolbar', uses: ['unknown'] }] },
        kerf,
      ),
    ).toEqual([
      'toolbar duplicates a Kerf catalog id',
      'toolbar uses unknown entry unknown',
    ]);
  });
});
