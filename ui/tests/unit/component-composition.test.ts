import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { ComponentComposition } from '../../ai/component-composition.js';
import type { ConsumerComponentComposition } from '../../ai/component-composition-extension.js';
import { validateComposition } from '../../scripts/component-composition-validation.mjs';

type InvalidFixture = {
  name: string;
  path: string;
  value?: unknown;
  copyFrom?: string;
  message: string;
};

const readJson = async <T>(path: string): Promise<T> =>
  JSON.parse(await readFile(resolve(import.meta.dirname, path), 'utf8')) as T;

const childAt = (value: unknown, part: string): unknown => {
  if (Array.isArray(value)) return value[Number(part)];
  return (value as Record<string, unknown>)[part];
};

const assignPath = (
  target: Record<string, unknown>,
  path: string,
  value: unknown,
) => {
  const parts = path.split('.');
  const key = parts.pop()!;
  let owner: unknown = target;
  for (const part of parts) owner = childAt(owner, part);
  if (Array.isArray(owner)) owner[Number(key)] = value;
  else (owner as Record<string, unknown>)[key] = value;
};

const readPath = (target: Record<string, unknown>, path: string) =>
  path.split('.').reduce<unknown>(childAt, target);

describe('component composition catalog contract', () => {
  it('projects every live v1 entry with package-qualified identity and complete boundaries', async () => {
    const [v1, composition] = await Promise.all([
      readJson<{ package: string; entries: Array<{ id: string }> }>(
        '../../ai/component-catalog.json',
      ),
      readJson<ComponentComposition>('../../ai/component-composition.json'),
    ]);
    expect(validateComposition(composition, { v1 })).toEqual([]);
    expect(composition.entries).toHaveLength(v1.entries.length);
    expect(
      composition.entries.every(
        (entry) => entry.key === `${entry.package}:${entry.id}`,
      ),
    ).toBe(true);
    expect(
      composition.entries.every(
        (entry) =>
          entry.parents &&
          entry.children &&
          entry.state &&
          entry.wiring &&
          entry.responsive &&
          entry.layout &&
          entry.accessibility &&
          entry.boundaries &&
          (entry.boundaries.rootClass === null ||
            entry.boundaries.publicClasses.includes(
              entry.boundaries.rootClass,
            )) &&
          entry.provenance,
      ),
    ).toBe(true);
    const controlGroup = composition.entries.find(
      (entry) => entry.id === 'toolbar-control-group',
    );
    expect(controlGroup?.boundaries.rootClass).toBe(
      'kui-toolbar-control-group',
    );
    expect(controlGroup?.boundaries.publicClasses).toContain(
      'kui-toolbar-action-link',
    );
  });

  it('declares wiring-owned state attributes on every entry, flattened with their helper', async () => {
    const composition = await readJson<ComponentComposition>(
      '../../ai/component-composition.json',
    );
    expect(
      composition.entries.every((entry) =>
        Array.isArray(entry.wiring.stateAttributes),
      ),
    ).toBe(true);
    const owned = (id: string) =>
      composition.entries
        .find((entry) => entry.id === id)!
        .wiring.stateAttributes!.map(({ name, helper }) => `${helper}:${name}`);
    expect(owned('resize')).toEqual([
      'wireResizableRegions:data-handle-inset',
      'wireResizableRegions:data-resizing',
    ]);
    // A composed layout lists the attributes of every helper it needs.
    expect(owned('split-view')).toEqual(
      expect.arrayContaining([
        'wireResizableRegions:data-handle-inset',
        'wireNavStack:data-nav-exiting',
      ]),
    );
    expect(owned('collapsible-panel')).toEqual([
      'wireSidebar:data-collapsible-responsive',
      'wireSidebar:data-collapsible-overlay',
      'wireSidebar:data-morph-preserve',
      'wireScrollDividers:data-scroll-overflow',
      'wireScrollDividers:data-scroll-divider',
    ]);
    // Chrome a List draws from when named in wireScrollDividers targets.
    expect(owned('list')).toEqual([
      'wireScrollDividers:data-scroll-overflow',
      'wireScrollDividers:data-scroll-divider',
    ]);
  });

  it('keeps permissive defaults distinct from authoritative enforceable overrides', async () => {
    const composition = await readJson<ComponentComposition>(
      '../../ai/component-composition.json',
    );
    const toolbar = composition.entries.find(
      (entry) => entry.id === 'toolbar',
    )!;
    const icon = composition.entries.find(
      (entry) => entry.id === 'lucide-icon',
    )!;
    expect(toolbar).toMatchObject({
      zones: expect.arrayContaining([
        expect.objectContaining({
          id: 'leading',
          jsx: { prop: 'leading' },
        }),
      ]),
      children: {
        mode: 'listed',
        concepts: ['toolbar-text', 'toolbar-control-group'],
      },
      provenance: {
        composition: 'docs/component-selection.md#toolbar-composition',
      },
    });
    expect(toolbar.diagnostics[0].id).toBe('KUI-C101');
    expect(
      composition.entries.find((entry) => entry.id === 'toolbar-control-group')
        ?.parents,
    ).toEqual({
      mode: 'listed',
      entries: ['@kerfjs/ui:toolbar', '@kerfjs/ui:floating-toolbar'],
    });
    expect(
      composition.entries.find((entry) => entry.id === 'toolbar-control-group')
        ?.jsxExports?.ToolbarActionLink,
    ).toEqual({
      parents: {
        mode: 'listed',
        entries: ['@kerfjs/ui:toolbar-control-group'],
      },
    });
    expect(icon).toMatchObject({
      parents: { mode: 'any', entries: [] },
      provenance: { composition: 'generated-permissive-default' },
    });
    expect(icon.diagnostics).toEqual([]);

    expect(
      composition.entries.find((entry) => entry.id === 'wa-details')?.boundaries
        .publicTokens,
    ).toEqual([
      '--kui-wa-surface-margin',
      '--kui-wa-surface-inset',
      '--kui-wa-sunken-background',
      '--kui-wa-sunken-radius',
    ]);

    const pane = composition.entries.find((entry) => entry.id === 'pane')!;
    const tabBar = composition.entries.find((entry) => entry.id === 'tab-bar')!;
    const workbench = composition.entries.find(
      (entry) => entry.id === 'workbench',
    )!;
    expect(pane.zones.map(({ id, jsx }) => [id, jsx?.prop])).toEqual([
      ['header', 'header'],
      ['content', 'children'],
      ['footer', 'footer'],
    ]);
    expect(tabBar.zones[0]).toMatchObject({
      id: 'tabs',
      jsx: { prop: 'children' },
      accepts: ['tabs'],
    });
    expect(tabBar.zones.map(({ id, jsx }) => [id, jsx?.prop])).toEqual([
      ['tabs', 'children'],
      ['leading', 'leading'],
      ['trailing', 'trailing'],
      ['end', 'end'],
    ]);
    expect(workbench.zones).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'main', jsx: { prop: 'main' } }),
        expect.objectContaining({ id: 'left-rail' }),
      ]),
    );
    expect('jsx' in workbench.zones.find(({ id }) => id === 'left-rail')!).toBe(
      false,
    );
    expect(
      composition.entries.find((entry) => entry.id === 'list')?.cssValueProps,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'gap',
          grammar: 'length',
          canonicalShorthands: expect.arrayContaining(['xs', 'm']),
          exceptionalShorthands: ['s', 'xl'],
          nonStandaloneHelpers: ['plus'],
          rawPolicy: 'forbid',
        }),
      ]),
    );
  });

  it('rejects contradictory CSS value classifications', async () => {
    const composition = await readJson<ComponentComposition>(
      '../../ai/component-composition.json',
    );
    const list = composition.entries.find((entry) => entry.id === 'list')!;
    list.cssValueProps![0]!.exceptionalShorthands.push('xs');
    expect(validateComposition(composition)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('canonical and exceptional shorthands overlap'),
      ]),
    );
  });

  it("keeps placeableClasses a subset of each entry's public classes", async () => {
    const composition = await readJson<ComponentComposition>(
      '../../ai/component-composition.json',
    );
    const placeable = Object.fromEntries(
      composition.entries
        .filter((entry) => entry.boundaries.placeableClasses)
        .map((entry) => [entry.id, entry.boundaries.placeableClasses]),
    );
    // Only class-only contracts, item geometry, and Web Awesome modifiers
    // are the application's to place; everything else is rendered anatomy.
    expect(placeable).toEqual({
      'document-baseline': ['kui-app-root'],
      layout: [
        'kui-content',
        'kui-control-cluster',
        'kui-inline-metadata',
        'kui-scroll-owner',
      ],
      'content-item': [
        'kui-content-item',
        'kui-content-item--pill',
        'kui-content-item--framed',
      ],
      'wa-dialog': ['hide-actions'],
    });
    const toolbar = composition.entries.find(
      (entry) => entry.id === 'toolbar',
    )!;
    toolbar.boundaries.placeableClasses = ['kui-toolbar', 'kui-not-public'];
    expect(validateComposition(composition)).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'placeableClasses names kui-not-public, which is not one of its publicClasses',
        ),
      ]),
    );
    toolbar.boundaries.placeableClasses = ['kui-toolbar', 'kui-toolbar'];
    expect(validateComposition(composition)).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'placeableClasses must be a unique string list',
        ),
      ]),
    );
  });

  it('names the element a component renders around its own placeable classes', async () => {
    const composition = await readJson<ComponentComposition>(
      '../../ai/component-composition.json',
    );
    const roots = Object.fromEntries(
      composition.entries
        .filter((entry) => entry.boundaries.rootElement)
        .map((entry) => [entry.id, entry.boundaries.rootElement]),
    );
    // A plain <div class="kui-content-item"> is exactly ContentItem, so
    // KUI-L103 reports it there while a <ul> or <footer> carrier keeps it.
    expect(roots).toEqual({ 'content-item': 'div' });
    const { ContentItem } = await import('../../src/content-item.js');
    expect(ContentItem({}).toString()).toMatch(
      new RegExp(`^<${roots['content-item']}[\\s>]`),
    );
    const item = composition.entries.find(
      (entry) => entry.id === 'content-item',
    )!;
    item.boundaries.rootElement = 'Div';
    expect(validateComposition(composition)).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'rootElement must be a lowercase element tag name',
        ),
      ]),
    );
  });

  it('rejects adversarial invalid fixtures with stable actionable findings', async () => {
    const [composition, fixtures] = await Promise.all([
      readJson<ComponentComposition>('../../ai/component-composition.json'),
      readJson<InvalidFixture[]>(
        '../fixtures/component-composition-invalid.json',
      ),
    ]);
    for (const fixture of fixtures) {
      const invalid = JSON.parse(
        JSON.stringify(composition),
      ) as ComponentComposition;
      const value = fixture.copyFrom
        ? readPath(
            invalid as unknown as Record<string, unknown>,
            fixture.copyFrom,
          )
        : fixture.value;
      assignPath(
        invalid as unknown as Record<string, unknown>,
        fixture.path,
        value,
      );
      expect(validateComposition(invalid), fixture.name).toEqual(
        expect.arrayContaining([expect.stringContaining(fixture.message)]),
      );
    }
  });

  it('provides a package-qualified consumer composition example without weakening Kerf identity', async () => {
    const consumer = await readJson<ComponentComposition>(
      '../../docs/examples/component-composition-extension.json',
    );
    const typedConsumer: ConsumerComponentComposition = consumer;
    expect(validateComposition(consumer)).toEqual([]);
    expect(typedConsumer.package).toBe('@acme/ui');
    expect(consumer.entries[0].key).toBe('@acme/ui:inspector');
    expect(consumer.entries[0].parents.entries).toContain('@kerfjs/ui:layout');
  });

  it('validates generated consumer selection and source metadata when present', async () => {
    const consumer = await readJson<ComponentComposition>(
      '../../docs/examples/component-composition-extension.json',
    );
    const entry = consumer.entries[0];
    entry.purpose = 'Compose the record inspector.';
    entry.publicExports = [{ name: 'Inspector', subpath: './inspector' }];
    entry.sourceLinks = ['docs/inspector.md'];
    expect(validateComposition(consumer)).toEqual([]);

    entry.purpose = '';
    entry.publicExports.push({ name: 'Inspector', subpath: './inspector' });
    entry.sourceLinks.push('docs/inspector.md');
    expect(validateComposition(consumer)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('purpose must be a non-empty string'),
        expect.stringContaining('public exports must be unique'),
        expect.stringContaining('sourceLinks must be a unique string list'),
      ]),
    );
  });
});
