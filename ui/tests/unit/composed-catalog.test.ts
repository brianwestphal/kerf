import { describe, expect, it, vi } from 'vitest';

import {
  catalogEntryId,
  type CatalogPackage,
  composeCatalog,
} from '../../src/catalog/packages/compose.js';
import { kerfCatalogPackage } from '../../src/catalog-library.js';

const row = { id: 'button', name: 'Button', category: 'Actions' };
const donor: CatalogPackage = {
  package: 'donor',
  label: 'Donor',
  entries: [row],
};
const library: CatalogPackage = {
  package: 'library',
  label: 'Library',
  imports: [donor],
  entries: [{ ...row, uses: [{ package: 'donor', id: 'button' }] }],
};
const app: CatalogPackage = {
  package: 'app',
  label: 'App',
  imports: [library, donor],
  entries: [
    {
      ...row,
      id: 'screen',
      uses: ['button', { package: 'library', id: 'button' }, 'button'],
    },
    row,
  ],
};

describe('package catalog graph', () => {
  it('indexes diamond imports once, qualifies duplicate names and builds both relationship directions', () => {
    const { groups, entries } = composeCatalog(app);
    expect(groups.map(({ id, expanded }) => [id, expanded])).toEqual([
      ['app', true],
      ['library', false],
      ['donor', false],
    ]);
    expect(groups[0]!.sections[0]!.entries.map(({ id }) => id)).toEqual([
      'app:screen',
      'app:button',
    ]);
    expect([...entries.keys()]).toEqual([
      'app:screen',
      'app:button',
      'library:button',
      'donor:button',
    ]);
    expect(entries.get('library:button')?.related).toEqual([
      {
        id: 'app:screen',
        name: 'Button',
        description: 'app',
        group: 'Used by',
      },
      {
        id: 'donor:button',
        name: 'Button',
        description: 'donor',
        group: 'Uses',
      },
    ]);
    expect(entries.get('app:button')?.related).toHaveLength(1);
    expect(catalogEntryId('@scope/lib', 'path:space ?')).toBe(
      '@scope/lib:path:space ?',
    );
  });
  it('rejects invalid identities, conflicting definitions, cycles, and unresolved local or qualified references', () => {
    const catalog = (overrides: Partial<CatalogPackage>) =>
      composeCatalog({ ...app, ...overrides });
    for (const bad of ['', 'a:b']) {
      expect(() => catalog({ package: bad })).toThrow(
        'Invalid catalog package',
      );
      expect(() => catalogEntryId(bad, 'x')).toThrow('nonempty');
    }
    expect(() => catalogEntryId('pkg', '')).toThrow('nonempty');
    expect(() => catalog({ entries: [row, row] })).toThrow(
      'Duplicate catalog entry: app:button',
    );
    expect(() => catalog({ imports: [library, { ...donor }] })).toThrow(
      'Conflicting catalog package: donor',
    );
    const cycle = { ...donor, imports: [] as CatalogPackage[] };
    cycle.imports.push({ ...library, imports: [cycle] });
    expect(() => composeCatalog(cycle)).toThrow('donor -> library -> donor');
    for (const [ref, id] of [
      ['missing', 'app:missing'],
      [{ package: 'absent', id: 'row' }, 'absent:row'],
    ] as const) {
      expect(() => catalog({ entries: [{ ...row, uses: [ref] }] })).toThrow(
        `Missing catalog reference from app:button to ${id}`,
      );
    }
  });
  it('defers previews, retries rejection, and coalesces parallel and subsequent loads', async () => {
    const preview = () => undefined;
    const load = vi
      .fn<() => Promise<typeof preview>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(preview);
    const graph = composeCatalog({
      ...app,
      entries: [{ ...row, loadPreview: load }],
    });
    expect(load).not.toHaveBeenCalled();
    expect(await graph.loadPreview('unknown')).toBeUndefined();
    expect(await graph.loadPreview('library:button')).toBeUndefined();
    await expect(graph.loadPreview('app:button')).rejects.toThrow('offline');
    expect(
      await Promise.all([
        graph.loadPreview('app:button'),
        graph.loadPreview('app:button'),
      ]),
    ).toEqual([preview, preview]);
    expect(await graph.loadPreview('app:button')).toBe(preview);
    expect(load).toHaveBeenCalledTimes(2);
  });
  it('ships the actual three-level metadata and owner-specific resource links', () => {
    const graph = composeCatalog({
      ...app,
      imports: [kerfCatalogPackage],
      entries: [
        { ...row, uses: [{ package: '@kerfjs/ui', id: 'popup-menu' }] },
      ],
    });
    expect(graph.groups.map(({ id }) => id)).toEqual([
      'app',
      '@kerfjs/ui',
      '@awesome.me/webawesome',
    ]);
    expect(graph.entries.get('@kerfjs/ui:popup-menu')?.related).toContainEqual(
      expect.objectContaining({ group: 'Used by', id: 'app:button' }),
    );
    expect(
      graph.entries.get('@awesome.me/webawesome:wa-button')?.related,
    ).toContainEqual(
      expect.objectContaining({
        group: 'Uses',
        id: '@awesome.me/webawesome:wa-icon',
      }),
    );
    expect(graph.entries.get('@kerfjs/ui:select')?.related).toContainEqual(
      expect.objectContaining({
        group: 'Used by',
        id: '@awesome.me/webawesome:wa-animation',
      }),
    );
    expect(
      graph.entries.get('@kerfjs/ui:popup-menu')?.resources,
    ).toContainEqual(
      expect.objectContaining({
        label: 'Component Source',
        href: expect.stringContaining('/ui/src/components/actions/popup-menu/'),
      }),
    );
  });
});
