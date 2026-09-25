import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  catalog,
  catalogCategories,
  catalogEntriesUsing,
  catalogRepositoryBlobUrl,
  catalogRepositoryHref,
  catalogSections,
  findCatalogEntry,
  isCatalogId,
  isDiscouragedWebAwesome,
  kerfCatalog,
  webAwesomeCatalog,
  webAwesomeCatalogSections,
  webAwesomeCategories,
} from '../../ux-demo/catalog.js';

describe('UX catalog metadata', () => {
  it('keeps the consumer extension example on the shared geometry contract', async () => {
    const [catalogSchema, extensionSchema, extensionExample] =
      await Promise.all(
        [
          '../../ai/component-catalog.schema.json',
          '../../ai/component-catalog-extension.schema.json',
          '../../docs/examples/component-catalog-extension.json',
        ].map(async (path) =>
          JSON.parse(
            await readFile(resolve(import.meta.dirname, path), 'utf8'),
          ),
        ),
      );

    expect(extensionSchema.$defs.geometry).toEqual(
      catalogSchema.$defs.geometry,
    );
    expect(extensionSchema.$defs.geometryOwner).toEqual(
      catalogSchema.$defs.geometryOwner,
    );
    expect(extensionExample).toMatchObject({
      schemaVersion: 1,
      package: '@acme/ui',
    });
    expect(extensionExample.entries).toHaveLength(2);
    expect(extensionExample.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'acme-filter-chip',
          geometry: { margin: 'none', border: 'self', padding: 'self' },
        }),
        expect.objectContaining({
          id: 'acme-inspector',
          geometry: expect.objectContaining({
            margin: 'parent',
            border: 'child',
            padding: 'child',
          }),
        }),
      ]),
    );
  });

  it('projects the shipped machine-readable catalog without losing decision facts', async () => {
    const artifact = JSON.parse(
      await readFile(
        resolve(import.meta.dirname, '../../ai/component-catalog.json'),
        'utf8',
      ),
    ) as {
      schemaVersion: number;
      package: string;
      entries: Array<{
        id: string;
        kind: 'component' | 'composition' | 'recipe';
        recommendation?: string;
        publicExports?: string[];
        publicClasses?: string[];
        publicTokens?: string[];
        useWhen: string[];
        avoidWhen: string[];
        geometry?: {
          margin: string;
          border: string;
          padding: string;
          notes?: string[];
        };
        delivery: {
          moduleImport?: string;
          manualCssImport?: string;
          registrationImport?: string;
        };
        links: { catalogRoute: string; documentation: string; recipe: string };
      }>;
    };

    expect(artifact.schemaVersion).toBe(1);
    expect(artifact.package).toBe('@kerfjs/ui');
    expect(artifact.entries.map(({ id }) => id)).toEqual(
      catalog.map(({ id }) => id),
    );
    expect(findCatalogEntry('recipe-command-palette')).toBeUndefined();
    expect(isCatalogId('recipe-command-palette')).toBe(false);
    const foundationSource = await readFile(
      resolve(import.meta.dirname, '../../src/foundation.css'),
      'utf8',
    );
    const foundationTokens = [
      ...new Set(
        [...foundationSource.matchAll(/^\s*(--kui-[a-z0-9-]+)\s*:/gm)].map(
          (match) => match[1],
        ),
      ),
    ];
    expect(
      artifact.entries.find(({ id }) => id === 'foundation')?.publicTokens,
    ).toEqual(foundationTokens);
    const workbench = artifact.entries.find(({ id }) => id === 'workbench');
    const workbenchCss = await readFile(
      resolve(import.meta.dirname, '../../src/workbench.css'),
      'utf8',
    );
    expect(workbench).toMatchObject({
      publicExports: ['Workbench', 'WorkbenchPanel', 'WorkbenchProps'],
      delivery: {
        moduleImport: '@kerfjs/ui/workbench',
        manualCssImport: '@kerfjs/ui/workbench.css',
      },
      publicClasses: [
        ...new Set(
          [...workbenchCss.matchAll(/\.(kui-[a-z0-9_-]+)/g)].map(
            (match) => match[1],
          ),
        ),
      ],
      publicTokens: [
        ...new Set(
          [...workbenchCss.matchAll(/--kui-workbench-[a-z0-9-]+/g)].map(
            (match) => match[0],
          ),
        ),
      ],
    });
    expect(
      artifact.entries.find(({ id }) => id === 'split-view'),
    ).toMatchObject({
      publicExports: ['SplitView', 'SplitViewProps', 'SplitViewResizable'],
      publicTokens: ['--kui-split-view-list-width'],
      delivery: {
        moduleImport: '@kerfjs/ui/split-view',
        manualCssImport: '@kerfjs/ui/split-view.css',
      },
    });
    const appLayouts = [
      {
        id: 'nav-stack',
        exports: ['NavStackView', 'NavStackProps', 'NavStack'],
      },
      {
        id: 'split-view',
        exports: ['SplitView', 'SplitViewProps', 'SplitViewResizable'],
      },
      {
        id: 'tab-scaffold',
        exports: ['TabScaffoldTab', 'TabScaffoldProps', 'TabScaffold'],
      },
      {
        id: 'workbench',
        exports: ['Workbench', 'WorkbenchPanel', 'WorkbenchProps'],
      },
      {
        id: 'collapsible-panel',
        exports: [
          'CollapsiblePanelSide',
          'collapsiblePanelToggleIcon',
          'CollapsiblePanelToggleProps',
          'CollapsiblePanelToggle',
          'CollapsiblePanelProps',
          'CollapsiblePanel',
        ],
      },
    ] as const;
    for (const layout of appLayouts) {
      const entry = artifact.entries.find(({ id }) => id === layout.id);
      const css = await readFile(
        resolve(import.meta.dirname, `../../src/${layout.id}.css`),
        'utf8',
      );
      expect(entry).toMatchObject({
        publicExports: [...layout.exports],
        delivery: {
          moduleImport: `@kerfjs/ui/${layout.id}`,
          manualCssImport: `@kerfjs/ui/${layout.id}.css`,
        },
        publicClasses: [
          ...new Set(
            [...css.matchAll(/\.(kui-[a-z0-9_-]+)/g)].map((match) => match[1]),
          ),
        ],
        publicTokens: [
          ...new Set(
            [
              ...css.matchAll(new RegExp(`--kui-${layout.id}-[a-z0-9-]+`, 'g')),
            ].map((match) => match[0]),
          ),
        ],
        links: { catalogRoute: `?component=${layout.id}` },
      });
    }
    expect(
      artifact.entries.every(
        (entry) => entry.useWhen.length > 0 && entry.avoidWhen.length > 0,
      ),
    ).toBe(true);
    expect(
      artifact.entries
        .filter((entry) => entry.kind !== 'recipe')
        .every(
          (entry) =>
            entry.geometry?.margin &&
            entry.geometry.border &&
            entry.geometry.padding,
        ),
    ).toBe(true);
    expect(
      artifact.entries
        .filter((entry) => entry.kind === 'recipe')
        .every((entry) => entry.geometry === undefined),
    ).toBe(true);
    expect(
      artifact.entries.find((entry) => entry.id === 'wa-button')?.geometry,
    ).toEqual({
      margin: 'none',
      border: 'self',
      padding: 'self',
    });
    expect(
      artifact.entries.find((entry) => entry.id === 'wa-details')?.publicTokens,
    ).toEqual([
      '--kui-wa-surface-margin',
      '--kui-wa-surface-inset',
      '--kui-wa-sunken-background',
      '--kui-wa-sunken-radius',
    ]);
    expect(
      artifact.entries.find((entry) => entry.id === 'value-table')?.geometry,
    ).toEqual({
      margin: 'self',
      border: 'self',
      padding: 'self',
    });
    expect(
      artifact.entries.every(
        (entry) =>
          entry.links.catalogRoute === `?component=${entry.id}` &&
          entry.links.documentation &&
          entry.links.recipe,
      ),
    ).toBe(true);
    expect(
      artifact.entries.find(({ id }) => id === 'tab-bar')?.publicExports,
    ).toEqual(['TabBar', 'wireTabBars', 'reorderTabs']);
    expect(
      artifact.entries.find(({ id }) => id === 'application-tabs'),
    ).toMatchObject({
      kind: 'composition',
      uses: ['tabs', 'tab-bar', 'toolbar-control-group'],
      publicExports: [],
    });
    expect(
      artifact.entries.find(({ id }) => id === 'resize')?.publicExports,
    ).toEqual([
      'ResizableRegion',
      'clampRegionSize',
      'resizeRegionFromPointer',
      'wireResizableRegions',
    ]);
    expect(
      artifact.entries.find(({ id }) => id === 'token-search-field')
        ?.publicExports,
    ).toEqual([
      'TokenSearchField',
      'readTokenSearchField',
      'placeTokenSearchCaret',
      'wireTokenSearchFields',
    ]);
    expect(
      artifact.entries.find(({ id }) => id === 'select')?.delivery
        .registrationImport,
    ).toBe('@kerfjs/ui/select/register');
    expect(
      artifact.entries.find(({ id }) => id === 'wa-button')?.delivery
        .registrationImport,
    ).toBe('@awesome.me/webawesome/dist/components/button/button.js');
    expect(
      webAwesomeCatalog.filter(isDiscouragedWebAwesome).map(({ id }) => id),
    ).toEqual([
      'wa-button-group',
      'wa-dropdown',
      'wa-dropdown-item',
      'wa-option',
      'wa-select',
      'wa-split-panel',
      'wa-tab',
      'wa-tab-group',
      'wa-tab-panel',
      'wa-tree',
      'wa-tree-item',
      'wa-animated-image',
      'wa-comparison',
      'wa-icon',
      'wa-zoomable-frame',
    ]);
    expect(findCatalogEntry('wa-popup')?.recommendation).toBe('conditional');
  });

  it('keeps routes unique and dependency references valid', () => {
    const ids = catalog.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(
      catalog.every(
        (entry) =>
          entry.name &&
          entry.description &&
          entry.category &&
          entry.kind &&
          entry.source,
      ),
    ).toBe(true);
    expect(
      catalog.every(
        (entry) => entry.uses?.every((id) => ids.includes(id)) ?? true,
      ),
    ).toBe(true);
    expect(isCatalogId('toolbar')).toBe(true);
    expect(findCatalogEntry('webawesome-theme')).toBeUndefined();
    expect(isCatalogId('webawesome-theme')).toBe(false);
    expect(isCatalogId('missing')).toBe(false);
    expect(isCatalogId(null)).toBe(false);
  });

  it('projects deploy-safe source and guidance links for every catalog route', async () => {
    expect(findCatalogEntry('toolbar')).toMatchObject({
      demoSource: 'ui/ux-demo/demos/toolbar.tsx',
      componentSource: 'ui/src/toolbar.tsx',
      documentation: 'ui/docs/component-selection.md',
    });
    expect(findCatalogEntry('recipe-app-shell')).toMatchObject({
      demoSource: 'ui/ux-demo/recipes/app-shell.tsx',
      documentation: 'ui/docs/recipes.md#desktop-application-shell',
    });
    expect(findCatalogEntry('wa-button')).toMatchObject({
      demoSource: 'ui/ux-demo/webawesome-demos.tsx',
      documentation: 'ui/docs/webawesome-theme.md#coverage',
    });
    expect(findCatalogEntry('recipe-app-shell')).not.toHaveProperty(
      'componentSource',
    );
    expect(findCatalogEntry('wa-button')).not.toHaveProperty('componentSource');

    expect(catalogRepositoryBlobUrl).toBe(
      'https://github.com/brianwestphal/kerf/blob/main/',
    );
    for (const entry of catalog) {
      const paths: string[] = [entry.demoSource, entry.documentation];
      if ('componentSource' in entry) paths.push(entry.componentSource);
      for (const path of paths) {
        expect(path).toMatch(/^ui\//);
        expect(path).not.toMatch(/(?:^|\/)\.\.(?:\/|$)|:\/\//);
        expect(catalogRepositoryHref(path)).toBe(
          `${catalogRepositoryBlobUrl}${path}`,
        );
        await expect(
          access(resolve(import.meta.dirname, '../../..', path.split('#')[0])),
        ).resolves.toBeUndefined();
      }
    }
    expect(
      kerfCatalog
        .filter((entry) => entry.kind === 'component')
        .every((entry) => 'componentSource' in entry && entry.componentSource),
    ).toBe(true);
    expect(
      catalog
        .filter(
          (entry) => entry.kind !== 'component' || entry.source !== 'kerf',
        )
        .every((entry) => !('componentSource' in entry)),
    ).toBe(true);
  });

  it('groups Kerf and Web Awesome routes once in their respective reading orders', () => {
    expect(catalogSections.map((section) => section.category)).toEqual(
      catalogCategories,
    );
    expect(
      webAwesomeCatalogSections.map((section) => section.category),
    ).toEqual(webAwesomeCategories);
    const kerfIds = catalogSections.flatMap((section) =>
      section.entries.map((entry) => entry.id),
    );
    const webAwesomeIds = webAwesomeCatalogSections.flatMap((section) =>
      section.entries.map((entry) => entry.id),
    );
    expect(kerfIds).toHaveLength(kerfCatalog.length);
    expect(webAwesomeIds).toHaveLength(webAwesomeCatalog.length);
    expect(new Set([...kerfIds, ...webAwesomeIds])).toEqual(
      new Set(catalog.map((entry) => entry.id)),
    );
    expect(catalogSections.every((section) => section.entries.length > 0)).toBe(
      true,
    );
    expect(
      webAwesomeCatalogSections.every((section) => section.entries.length > 0),
    ).toBe(true);
    expect(catalogSections.at(-1)?.category).toBe('Recipes');
    for (const section of catalogSections) {
      const kinds = section.entries.map((entry) => entry.kind);
      if (section.category === 'Recipes') {
        expect(new Set(kinds)).toEqual(new Set(['recipe']));
        continue;
      }
      expect(kinds).toEqual(
        [...kinds].sort(
          (left, right) =>
            (left === 'component' ? 0 : 1) - (right === 'component' ? 0 : 1),
        ),
      );
    }
  });

  it('lists every public visual component plus composition demos', () => {
    expect(
      kerfCatalog
        .filter((entry) => entry.kind === 'component')
        .map((entry) => entry.name),
    ).toEqual([
      'LucideIcon',
      'DisclosureArrow',
      'Pane',
      'NavStack',
      'SplitView',
      'TabScaffold',
      'Workbench',
      'CollapsiblePanel',
      'SunkenPanel',
      'Toolbar',
      'ToolbarControlGroup',
      'Surface scaffolds',
      'FloatingToolbar',
      'ToolbarText',
      'Text',
      'ValueTable',
      'Row',
      'Grid',
      'Spacer',
      'List',
      'ListHeader',
      'ListActionRow',
      'ListItem',
      'ListInsetControl',
      'ListInsetText',
      'AppTab',
      'TabBar',
      'SegmentedControl',
      'TokenSearchField',
      'ResizableRegion',
      'Select',
      'StateBanner',
      'EmptyState',
      'LoadingSpinner',
      'Skeleton',
    ]);
    expect(
      kerfCatalog
        .filter((entry) => entry.kind === 'composition')
        .map((entry) => [entry.id, entry.name]),
    ).toEqual([
      ['foundation', 'Foundation tokens'],
      ['layout', 'Application layout'],
      ['headers', 'Headers'],
      ['application-tabs', 'Application tabs'],
      ['feedback', 'Feedback'],
    ]);
    expect(
      kerfCatalog
        .filter((entry) => entry.kind === 'composition')
        .every((entry) => !/composition/i.test(entry.name)),
    ).toBe(true);
    expect(webAwesomeCatalog).toHaveLength(70);
    expect(
      webAwesomeCatalog.every(
        (entry) => entry.source === 'webawesome' && entry.kind === 'component',
      ),
    ).toBe(true);
    expect(webAwesomeCatalog.map((entry) => entry.id)).toContain('wa-button');
    expect(webAwesomeCatalog.map((entry) => entry.id)).toContain(
      'wa-resize-observer',
    );
  });

  it('resolves both sides of component relationships', () => {
    expect(findCatalogEntry('empty-state')?.uses).toEqual([
      'lucide-icon',
      'loading-spinner',
    ]);
    expect(findCatalogEntry('toolbar-control-group')?.uses).toEqual([
      'lucide-icon',
      'segmented-control',
    ]);
    expect(findCatalogEntry('missing')).toBeUndefined();
    expect(
      catalogEntriesUsing('loading-spinner').map((entry) => entry.id),
    ).toEqual([
      'list-action-row',
      'list-item',
      'feedback',
      'empty-state',
      'recipe-list-workspace-states',
    ]);
    expect(catalogEntriesUsing('resize').map((entry) => entry.id)).toEqual([
      'split-view',
      'recipe-app-shell',
    ]);
    expect(findCatalogEntry('wa-select')?.uses).toEqual([
      'wa-icon',
      'wa-popup',
      'wa-tag',
      'wa-option',
    ]);
    expect(catalogEntriesUsing('wa-select').map((entry) => entry.id)).toEqual([
      'select',
    ]);
    expect(
      catalogEntriesUsing('wa-carousel-item').map((entry) => entry.id),
    ).toEqual(['wa-carousel']);
    expect(
      catalogEntriesUsing('segmented-control').map((entry) => entry.id),
    ).toEqual([
      'toolbar-control-group',
      'recipe-compact-toolbar',
      'recipe-loading-inspector',
    ]);
    expect(findCatalogEntry('token-search-field')?.uses).toEqual([
      'lucide-icon',
    ]);
    expect(findCatalogEntry('list-action-row')?.uses).toEqual([
      'lucide-icon',
      'loading-spinner',
    ]);
    expect(
      catalogEntriesUsing('list-action-row').map((entry) => entry.id),
    ).toEqual(['list']);
  });

  it('marks supported ecosystem alternatives without presenting them as defaults', () => {
    expect(findCatalogEntry('wa-popup')?.description).toContain(
      'Preferred low-level anchored positioning',
    );
    expect(findCatalogEntry('wa-split-panel')?.description).toContain(
      'prefer Kerf ResizableRegion',
    );
    expect(findCatalogEntry('wa-button-group')?.description).toContain(
      'prefer Kerf SegmentedControl',
    );
    expect(findCatalogEntry('wa-icon')?.description).toContain(
      'use Kerf LucideIcon',
    );
    expect(findCatalogEntry('wa-zoomable-frame')?.description).toContain(
      'Avoid for application UI',
    );
    expect(webAwesomeCatalog.filter(isDiscouragedWebAwesome)).toHaveLength(15);
  });
});
