import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  diffComponentDocs,
  headingSlug,
  renderComponentDocs,
  signatureModules,
} from '../../scripts/lib/component-docs.mjs';

const root = resolve(import.meta.dirname, '../..');
const read = (path: string) => readFile(resolve(root, path), 'utf8');

const catalog = {
  package: '@kerfjs/ui',
  entries: [
    {
      id: 'stack',
      name: 'Stack',
      category: 'Structure',
      kind: 'component',
      source: 'kerf',
      description: 'A fixture stack.',
      uses: ['item'],
      purpose: 'Show one view at a time.',
      publicExports: ['Stack'],
      useWhen: ['A compact surface drills into details.'],
      avoidWhen: ['Do not use it for side-by-side <panes>.'],
      alternatives: [
        { id: 'item', relationship: 'nearest', when: 'Only one row.' },
      ],
      appOwns: ['view order'],
      variants: ['pushed detail view'],
      accessibility: ['Label the stack region.'],
      geometry: { margin: 'none', border: 'self', padding: 'child' },
      delivery: {
        moduleImport: '@kerfjs/ui/stack',
        manualCssImport: '@kerfjs/ui/stack.css',
        sideEffects: ['manual-css'],
      },
      wiring: [
        {
          export: 'wireStack',
          import: '@kerfjs/ui/wire-stack',
          required: true,
        },
      ],
      cssValueProps: [
        {
          path: 'gap',
          grammar: 'length',
          helpers: ['px'],
          shorthands: ['xs', 'xl'],
          canonicalShorthands: ['xs'],
          exceptionalShorthands: ['xl'],
          rawPolicy: 'forbid',
          examples: ['gap="xs"'],
        },
      ],
      publicClasses: ['kui-stack'],
      publicTokens: ['--kui-stack-duration'],
      links: {
        catalogRoute: '?component=stack',
        documentation: 'docs/app-layouts.md',
        recipe: 'docs/app-layouts.md#stack',
      },
    },
    {
      id: 'item',
      name: 'Item',
      category: 'Structure',
      kind: 'component',
      source: 'webawesome',
      uses: [],
      purpose: 'A fixture element.',
      customElement: 'wa-item',
      useWhen: ['A fixture element.'],
      avoidWhen: [],
      recommendation: 'avoid',
      delivery: {
        registrationImport: '@awesome.me/webawesome/item.js',
        themeCssImport: '@kerfjs/ui/webawesome.css',
        sideEffects: ['custom-element-registration'],
      },
      links: {
        catalogRoute: '?component=item',
        documentation: 'docs/webawesome-theme.md',
        recipe: 'docs/webawesome-theme.md',
      },
    },
  ],
};

const baseContract = (id: string) => ({
  key: `@kerfjs/ui:${id}`,
  id,
  parents: { mode: 'any', entries: [] },
  contexts: ['application-ui'],
  zones: [],
  children: { mode: 'any', concepts: [], requiredConcepts: [] },
  state: [],
  wiring: {
    required: false,
    helpers: [],
    obligations: [],
    stateAttributes: [],
  },
  responsive: { owner: 'not-applicable', behaviors: [] },
  layout: {
    roles: ['structure'],
    geometry: { margin: 'none', border: 'self', padding: 'self' },
  },
  accessibility: { obligations: [] },
  cssValueProps: [],
  boundaries: { rootClass: null, publicClasses: [], publicTokens: [] },
  diagnostics: [],
});

const composition = {
  entries: [
    {
      ...baseContract('stack'),
      parents: { mode: 'listed', entries: ['@kerfjs/ui:item'] },
      zones: [
        {
          id: 'views',
          jsx: { prop: 'views' },
          accepts: ['item'],
          cardinality: { min: 1, max: 'unbounded' },
          exclusiveWith: [],
        },
        {
          id: 'rail',
          accepts: ['panel-region'],
          cardinality: { min: 0, max: 1 },
          exclusiveWith: ['views'],
        },
      ],
      children: {
        mode: 'listed',
        concepts: ['item'],
        requiredConcepts: ['item'],
      },
      state: [
        { id: 'view order', owner: 'application', required: false },
        { id: 'open state', owner: 'controlled', required: true },
      ],
      wiring: {
        required: true,
        helpers: ['wireStack'],
        obligations: ['Call wireStack once after mount.'],
        stateAttributes: [
          {
            name: 'data-stack-exiting',
            on: 'kui-stack__view',
            helper: 'wireStack',
            meaning: 'Present while a view slides out.',
          },
        ],
      },
      accessibility: { obligations: ['Label the stack region.'] },
      boundaries: {
        rootClass: 'kui-stack',
        publicClasses: ['kui-stack'],
        publicTokens: ['--kui-stack-duration'],
      },
      diagnostics: [
        {
          id: 'KUI-C999',
          severity: 'error',
          when: 'a view is not an Item',
          message: 'Wrap each view in Item.',
        },
      ],
    },
    baseContract('item'),
  ],
};

const signatures =
  '# Signatures\n\n## `@kerfjs/ui/stack`\n\n```ts\n```\n\n## `kerfjs/actions`\n';

describe('AI-facing component markdown', { timeout: 30_000 }, () => {
  it('slugs module headings the way GitHub anchors them', () => {
    expect(headingSlug('`@kerfjs/ui/list-item`')).toBe('kerfjsuilist-item');
    expect([...signatureModules(signatures)]).toEqual([
      '@kerfjs/ui/stack',
      'kerfjs/actions',
    ]);
  });

  it('renders every contract section for a component page', async () => {
    const pages = await renderComponentDocs({
      catalog,
      composition,
      publicApiSignatures: signatures,
    });
    expect([...pages.keys()]).toEqual(['README.md', 'item.md', 'stack.md']);
    const page = pages.get('stack.md')!;
    for (const heading of [
      '# Stack',
      '## When to use',
      '## Imports',
      '## Props',
      '## Composition',
      '## State and wiring',
      '## Geometry',
      '## Accessibility',
      '## Styling boundary',
      '## Diagnostics',
      '## Related',
    ])
      expect(page).toContain(`${heading}\n`);
    expect(page).toContain('side-by-side \\<panes>');
    expect(page).toContain(
      '[`@kerfjs/ui/stack`](../public-api-signatures-v1.md#kerfjsuistack)',
    );
    expect(page).toContain('Parents: only inside [Item](./item.md).');
    expect(page).toContain(
      '`views` — JSX prop `views`; accepts [Item](./item.md); at least 1.',
    );
    expect(page).toContain(
      '`rail` — no declared JSX prop; accepts `panel-region`; 0–1; exclusive with `views`.',
    );
    expect(page).toContain('(required: [Item](./item.md))');
    expect(page).toContain('**The app owns:** view order.');
    expect(page).toContain('open state — controlled (required)');
    expect(page).toContain('`wireStack` is required');
    expect(page).toContain(
      '`data-stack-exiting` on `kui-stack__view` (`wireStack`): Present while a view slides out.',
    );
    expect(page).toContain('exceptional (justify) `xl`');
    expect(page).toContain('do not override its internals');
    expect(page).toContain('`KUI-L001`');
    expect(page).toContain(
      '`KUI-C999` (error) when a view is not an Item: Wrap each view in Item.',
    );
    expect(page).toContain(
      '[`docs/app-layouts.md#stack`](../../docs/app-layouts.md#stack)',
    );

    const element = pages.get('item.md')!;
    expect(element).toContain('recommendation: avoid');
    expect(element).toContain('`<wa-item>`');
    expect(element).toContain('webawesome-jsx-signatures-v1.md');
    expect(element).toContain('`KUI-L011`');
    expect(element).not.toContain('## Diagnostics');

    const index = pages.get('README.md')!;
    expect(index).toContain('## Kerf UI — Structure');
    expect(index).toContain('## Web Awesome — Structure');
    expect(index).toContain('[Stack](./stack.md) — Show one view at a time.');
    expect(index).toContain('[Item](./item.md) (avoid) — A fixture element.');
    expect(index).toContain('../component-catalog.json');
    expect(index).toContain('../public-api-signatures-v1.md');
  });

  it('refuses a catalog entry that has no composition contract', async () => {
    await expect(
      renderComponentDocs({
        catalog,
        composition: { entries: [baseContract('item')] },
        publicApiSignatures: signatures,
      }),
    ).rejects.toThrow('stack has no composition entry');
  });

  it('reports stale, missing, and orphaned pages', () => {
    const expected = new Map([
      ['README.md', 'index\n'],
      ['stack.md', 'stack\n'],
      ['item.md', 'item\n'],
    ]);
    expect(diffComponentDocs(expected, new Map(expected))).toEqual([]);
    expect(
      diffComponentDocs(
        expected,
        new Map([
          ['README.md', 'index\n'],
          ['stack.md', 'hand-edited\n'],
          ['old.md', 'removed entry\n'],
        ]),
      ),
    ).toEqual(['missing item.md', 'orphaned old.md', 'stale stack.md']);
  });

  it('keeps the shipped pages in sync with both catalogs', async () => {
    const [catalogSource, compositionSource, publicApiSignatures] =
      await Promise.all([
        read('ai/component-catalog.json'),
        read('ai/component-composition.json'),
        read('ai/public-api-signatures-v1.md'),
      ]);
    const expected = await renderComponentDocs({
      catalog: JSON.parse(catalogSource),
      composition: JSON.parse(compositionSource),
      publicApiSignatures,
    });
    const dir = resolve(root, 'ai/components');
    const current = new Map<string, string>();
    for (const name of (await readdir(dir)).filter((file) =>
      file.endsWith('.md'),
    ))
      current.set(name, await readFile(resolve(dir, name), 'utf8'));
    expect(diffComponentDocs(expected, current)).toEqual([]);
    expect(expected.size).toBe(JSON.parse(catalogSource).entries.length + 1);

    const packageJson = JSON.parse(await read('package.json')) as {
      files: string[];
    };
    expect(packageJson.files).toContain('ai');
  });
});
