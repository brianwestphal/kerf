import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import ts from 'typescript';
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

// Path segments are object keys or array indexes; `id:<id>` picks the array
// element with that `id`, so a fixture keeps addressing the same catalog entry
// when entries are inserted before it.
const childAt = (value: unknown, part: string): unknown => {
  if (Array.isArray(value) && part.startsWith('id:')) {
    const found = value.find(
      (item) => (item as { id?: unknown }).id === part.slice(3),
    );
    if (found === undefined) throw new Error(`No entry with ${part}`);
    return found;
  }
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
  it('accepts declared helper sources and rejects unknown or duplicate exports', async () => {
    const composition = await readJson<ComponentComposition>(
      '../../ai/component-composition.json',
    );
    const entry = composition.entries.find(
      (item) => item.id === 'search-field',
    )!;
    entry.wiring.sources = [
      { export: entry.wiring.helpers[0], source: 'src/interactions/search.ts' },
    ];
    expect(validateComposition(composition)).toEqual([]);
    entry.wiring.sources.push({ ...entry.wiring.sources[0] });
    expect(validateComposition(composition)).toContain(
      `${entry.key} wiring source export ${entry.wiring.helpers[0]} is declared twice`,
    );
    entry.wiring.sources = [
      { export: 'unknown', source: 'src/interactions/search.ts' },
    ];
    expect(validateComposition(composition)).toContain(
      `${entry.key} wiring source export unknown must name a wiring helper`,
    );
  });

  it('declares the embedded Disclosure inset-free children contract and validates its conditions', async () => {
    const composition = await readJson<ComponentComposition>(
      '../../ai/component-composition.json',
    );
    const entry = (id: string) =>
      composition.entries.find((item) => item.id === id)!;
    expect(entry('disclosure').insetFreeChildren).toEqual([
      { prop: 'appearance', equals: 'embedded' },
    ]);
    expect(entry('text').insetFreeWhen).toEqual([
      { prop: 'flush', equals: true },
      { prop: 'variant', equals: 'span' },
    ]);
    // The children it constrains are the entries owning all three sides.
    expect(entry('text').layout.geometry).toMatchObject({
      margin: 'self',
      border: 'self',
      padding: 'self',
    });
    expect(validateComposition(composition)).toEqual([]);
    for (const invalid of [
      [],
      [{ prop: 'appearance' }],
      [{ prop: 'appearance', equals: null }],
      [{ prop: 'data-appearance', equals: 'embedded' }],
      [{ prop: 'appearance', equals: 'embedded', extra: true }],
    ]) {
      Object.assign(entry('disclosure'), { insetFreeChildren: invalid });
      expect(validateComposition(composition)).toContain(
        '@kerfjs/ui:disclosure insetFreeChildren must be a non-empty list of { prop, equals } conditions',
      );
    }
  });

  it('accepts required wiring that is root-delegated actions and rejects empty required wiring', async () => {
    const composition = await readJson<ComponentComposition>(
      '../../ai/component-composition.json',
    );
    const entry = composition.entries.find(
      (item) => item.id === 'search-field',
    )!;
    entry.wiring = {
      ...entry.wiring,
      required: true,
      helpers: [],
      sources: undefined,
      stateAttributes: [],
      actions: ['open-card'],
    };
    expect(validateComposition(composition)).toEqual([]);
    entry.wiring.actions = [];
    expect(validateComposition(composition)).toContain(
      `${entry.key} required wiring must name a helper, import, or action`,
    );
    entry.wiring.actions = ['open-card', 'open-card'];
    expect(validateComposition(composition)).toContain(
      `${entry.key} wiring.actions must contain unique non-empty strings`,
    );
  });

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

  it("names only real component props as JSX zones, required exactly when the zone's minimum is non-zero", async () => {
    // A zone naming a renamed or removed prop makes kerf-ui-doctor report an
    // error no consumer can satisfy (MessageComposer `actions` → `trailing`).
    const composition = await readJson<ComponentComposition>(
      '../../ai/component-composition.json',
    );
    const uiRoot = resolve(import.meta.dirname, '../..');
    const config = ts.readConfigFile(resolve(uiRoot, 'tsconfig.json'), (path) =>
      ts.sys.readFile(path),
    );
    const { options } = ts.parseJsonConfigFileContent(
      config.config,
      ts.sys,
      uiRoot,
    );
    const componentsDir = resolve(uiRoot, 'src/components');
    const rootNames = (await readdir(componentsDir, { recursive: true }))
      .filter((file) => /\.tsx?$/.test(file))
      .map((file) => resolve(componentsDir, file));
    const program = ts.createProgram(rootNames, { ...options, noEmit: true });
    const checker = program.getTypeChecker();
    const propsTypes = new Map<string, ts.Type>();
    for (const file of program.getSourceFiles()) {
      if (!file.fileName.startsWith(componentsDir)) continue;
      const moduleSymbol = checker.getSymbolAtLocation(file);
      if (moduleSymbol === undefined) continue;
      for (const exported of checker.getExportsOfModule(moduleSymbol)) {
        if (exported.name.endsWith('Props')) {
          propsTypes.set(
            exported.name,
            checker.getDeclaredTypeOfSymbol(exported),
          );
        }
      }
    }

    const mismatches: string[] = [];
    for (const entry of composition.entries) {
      if (entry.source !== 'kerf') continue;
      for (const zone of entry.zones) {
        const prop = zone.jsx?.prop;
        if (prop === undefined) continue;
        const propsType = propsTypes.get(`${entry.name}Props`);
        if (propsType === undefined) {
          mismatches.push(`${entry.name}: no exported ${entry.name}Props`);
          continue;
        }
        const variants = propsType.isUnion() ? propsType.types : [propsType];
        const declared = variants
          .map((variant) => checker.getPropertyOfType(variant, prop))
          .filter((symbol) => symbol !== undefined);
        if (declared.length === 0) {
          mismatches.push(`${entry.name}: zone prop \`${prop}\` is not a prop`);
          continue;
        }
        const optional = declared.every(
          (symbol) => (symbol.flags & ts.SymbolFlags.Optional) !== 0,
        );
        if (optional === zone.cardinality.min > 0) {
          mismatches.push(
            `${entry.name}: zone \`${zone.id}\` min ${zone.cardinality.min} but prop \`${prop}\` is ${optional ? 'optional' : 'required'}`,
          );
        }
      }
    }
    expect(mismatches).toEqual([]);
  }, 30_000);

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
      'wireScrollDividers:data-header-overlay',
    ]);
    // Chrome a List draws from when named in wireScrollDividers targets.
    expect(owned('list')).toEqual([
      'wireScrollDividers:data-scroll-overflow',
      'wireScrollDividers:data-scroll-divider',
      'wireScrollDividers:data-header-overlay',
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
      children: { mode: 'any', concepts: [] },
      provenance: {
        composition: 'docs/component-selection.md#toolbar-composition',
      },
    });
    expect(toolbar.diagnostics).toEqual([]);
    for (const zone of toolbar.zones)
      expect(zone.accepts).toEqual(['KerfUiContent']);
    const diagnosticIds = await readJson<{
      ids: string[];
      retired: Record<string, string>;
    }>('../../ai/application-ui-diagnostic-ids-v1.json');
    expect(diagnosticIds.ids).toContain('KUI-C101');
    expect(diagnosticIds.retired['KUI-C101']).toContain('KerfUiContent');
    expect(
      composition.entries.find((entry) => entry.id === 'toolbar-control-group')
        ?.parents,
    ).toEqual({
      mode: 'listed',
      entries: [
        '@kerfjs/ui:toolbar',
        '@kerfjs/ui:floating-toolbar',
        '@kerfjs/ui:tab-bar',
      ],
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
      toast: ['kerf-toasts', 'kerf-toast', 'kui-toast-exit'],
      tooltip: ['kerf-tooltip', 'kui-tooltip-exit'],
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
        .filter((entry) => entry.boundaries.placeableClasses?.length)
        .map((entry) => [entry.id, entry.boundaries.rootElement]),
    );
    // A plain <div class="kui-content-item"> is exactly ContentItem, so
    // KUI-L103 reports it there while a <ul> or <footer> carrier keeps it.
    expect(roots).toEqual({ 'content-item': 'div' });
    const { ContentItem } =
      await import('../../src/components/surfaces/content-item/content-item.js');
    expect(ContentItem({}).toString()).toMatch(
      new RegExp(`^<${roots['content-item']}[\\s>]`),
    );
    const spinner = composition.entries.find(
      (entry) => entry.id === 'loading-spinner',
    );
    expect(spinner?.boundaries.rootElement).toBe('svg');
    const lucide = composition.entries.find(
      (entry) => entry.id === 'lucide-icon',
    );
    expect(lucide?.boundaries.rootElement).toBe('svg');
    expect(lucide?.boundaries.descendantElements).toContain('path');
    expect(lucide?.boundaries.descendantRootAttribute).toBe('data-lucide');
    const { LoadingSpinner } =
      await import('../../src/components/feedback/loading-spinner/loading-spinner.js');
    expect(LoadingSpinner({}).toString()).toMatch(/^<svg[\s>]/);
    const item = composition.entries.find(
      (entry) => entry.id === 'content-item',
    )!;
    item.boundaries.rootElement = 'Div';
    if (lucide) lucide.boundaries.descendantRootAttribute = 'class';
    expect(validateComposition(composition)).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'rootElement must be a lowercase element tag name',
        ),
        expect.stringContaining(
          'descendantRootAttribute requires a rootElement and a data-* attribute name',
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
