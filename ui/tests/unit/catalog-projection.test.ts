import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

import {
  projectCatalogEntries,
  projectConsumerCatalog,
} from '../../catalog-projection.mjs';

const run = promisify(execFile);
const cli = resolve(import.meta.dirname, '../../catalog-projection-cli.mjs');
const example = resolve(
  import.meta.dirname,
  '../../docs/examples/component-catalog-extension.json',
);

describe('catalog demo projection', () => {
  it('keeps the shared row shape and uses extension paths before templates', () => {
    const extension = {
      package: '@acme/ui',
      entries: [
        {
          id: 'filter-chip',
          name: 'FilterChip',
          kind: 'component',
          purpose: 'Shows a removable filter.',
          uses: ['chip'],
          source: 'src/filter-chip.tsx',
          demoSource: 'demos/filter-chip.tsx',
          documentation: 'docs/filter-chip.md',
        },
        {
          id: 'inspector',
          name: 'Inspector',
          kind: 'composition',
          purpose: 'Shows record details.',
          uses: ['filter-chip'],
          documentation: 'docs/inspector.md',
        },
      ],
    };
    const rows = projectConsumerCatalog(
      extension,
      { entries: [{ id: 'chip' }] },
      {
        sourceTemplate: 'src/{id}.tsx',
        demoTemplate: 'demos/{id}.tsx',
        designTemplate: 'design/{id}.svg',
      },
    );
    expect(rows[0]).toEqual({
      id: 'filter-chip',
      name: 'FilterChip',
      category: 'Application',
      kind: 'component',
      source: 'consumer',
      description: 'Shows a removable filter.',
      uses: ['chip'],
      demoSource: 'demos/filter-chip.tsx',
      componentSource: 'src/filter-chip.tsx',
      designTemplate: 'design/filter-chip.svg',
      documentation: 'docs/filter-chip.md',
    });
    expect(rows[1]).toMatchObject({
      uses: ['filter-chip'],
      componentSource: 'src/inspector.tsx',
      demoSource: 'demos/inspector.tsx',
    });
    expect(
      projectConsumerCatalog(extension, { entries: [{ id: 'chip' }] })[0],
    ).not.toHaveProperty('designTemplate');
    expect(
      projectCatalogEntries(extension.entries, { identity: () => 'kerf' })[0],
    ).toMatchObject({
      source: 'kerf',
      description: 'Shows a removable filter.',
    });
  });

  it('rejects stale references, paths, and missing documentation', () => {
    const entry = {
      id: 'card',
      name: 'Card',
      kind: 'component',
      purpose: 'A card.',
      demoSource: 'demos/card.tsx',
    };
    const extension = { package: '@acme/ui', entries: [entry] };
    const kerf = { entries: [{ id: 'chip' }] };
    expect(() => projectConsumerCatalog(extension, kerf)).toThrow(
      'card requires documentation',
    );
    expect(() =>
      projectConsumerCatalog(
        {
          ...extension,
          entries: [
            { ...entry, documentation: 'docs/card.md', source: '../card.tsx' },
          ],
        },
        kerf,
      ),
    ).toThrow('invalid repository-relative source');
    expect(() =>
      projectConsumerCatalog(
        { ...extension, entries: [{ ...entry, uses: ['typo'] }] },
        kerf,
      ),
    ).toThrow('card uses unknown entry typo');
    expect(() =>
      projectConsumerCatalog(
        {
          ...extension,
          entries: [
            { ...entry, documentation: 'docs/card.md' },
            { ...entry, documentation: 'docs/card.md' },
          ],
        },
        kerf,
      ),
    ).toThrow('card duplicates a consumer catalog id');
  });

  it('writes and checks a consumer module through the CLI', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'kerf-catalog-demo-'));
    const output = resolve(directory, 'catalog.generated.ts');
    const args = [
      cli,
      '--extension',
      example,
      '--out',
      output,
      '--repo-base',
      'https://example.com/app/blob/main',
      '--source-template',
      'src/{id}.tsx',
    ];
    try {
      await run(process.execPath, [...args, '--write']);
      const generated = await readFile(output, 'utf8');
      expect(generated).toContain('generatedConsumerCatalog');
      expect(generated).toContain('https://example.com/app/blob/main/');
      expect(generated).toContain('"componentSource": "src/filter-chip.tsx"');
      await run(process.execPath, [...args, '--check']);
      await writeFile(output, `${generated}\n`);
      await expect(run(process.execPath, [...args, '--check'])).rejects.toThrow(
        'is stale',
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
