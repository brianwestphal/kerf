import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { createRuleTester } from '../helpers/rule-tester.js';
import { profile, uiSettings } from '../helpers/ui-contract-fixture.js';

import composition from '../../lib/rules/ui-composition.js';
import preferences from '../../lib/rules/ui-preferences.js';
import boundaries from '../../lib/rules/ui-public-boundaries.js';
import wiring from '../../lib/rules/ui-wiring.js';
import cssValues from '../../lib/rules/ui-css-values.js';
import exceptionalShorthands from '../../lib/rules/ui-exceptional-shorthands.js';

const tester = createRuleTester();
const settings = uiSettings();
// The catalogs @kerfjs/ui actually ships, so documented public anatomy is
// checked against the real contract rather than the fixture.
const shippedUiSettings = uiSettings({
  catalog: undefined,
  selectionCatalog: undefined,
  catalogPath: join(
    import.meta.dirname,
    '../../../ui/ai/component-composition.json',
  ),
  selectionCatalogPath: join(
    import.meta.dirname,
    '../../../ui/ai/component-catalog.json',
  ),
});
const thirdPartyCatalog = {
  schemaVersion: 1,
  package: '@acme/ui',
  entries: [
    {
      key: '@acme/ui:stack',
      package: '@acme/ui',
      id: 'stack',
      name: 'Stack',
      parents: { mode: 'any', entries: [] },
      wiring: { required: false, helpers: [] },
      boundaries: { publicClasses: [], publicTokens: [] },
      cssValueProps: [
        {
          path: 'gap',
          grammar: 'length',
          helpers: ['rem'],
          shorthands: ['tight'],
          canonicalShorthands: ['tight'],
          exceptionalShorthands: [],
          rawPolicy: 'forbid',
          examples: ['gap="tight"'],
        },
      ],
    },
  ],
};
const thirdPartySettings = uiSettings({
  catalog: thirdPartyCatalog,
  selectionCatalog: {
    schemaVersion: 1,
    package: '@acme/ui',
    entries: [
      {
        id: 'stack',
        publicExports: ['Stack', 'rem'],
        delivery: { browserImport: '@acme/ui/stack' },
        wiring: [],
      },
    ],
  },
  profile: { schemaVersion: 1, scope: 'package' },
});

// A synthetic catalog whose Card declares inset-free children while
// mode="bare" and whose Note declares `plain` as its inset-free form.
const insetEntry = (id, name, overrides = {}) => ({
  key: `@acme/ui:${id}`,
  package: '@acme/ui',
  id,
  name,
  parents: { mode: 'any', entries: [] },
  wiring: { required: false, helpers: [] },
  boundaries: { publicClasses: [], publicTokens: [] },
  layout: {
    roles: ['structure'],
    geometry: { margin: 'self', border: 'self', padding: 'self' },
  },
  ...overrides,
});
const insetCatalogSettings = uiSettings({
  catalog: {
    schemaVersion: 1,
    package: '@acme/ui',
    entries: [
      insetEntry('card', 'Card', {
        insetFreeChildren: [{ prop: 'mode', equals: 'bare' }],
      }),
      insetEntry('note', 'Note', {
        insetFreeWhen: [{ prop: 'plain', equals: true }],
      }),
    ],
  },
  selectionCatalog: {
    schemaVersion: 1,
    package: '@acme/ui',
    entries: [
      { id: 'card', publicExports: ['Card'], wiring: [] },
      { id: 'note', publicExports: ['Note'], wiring: [] },
    ],
  },
  profile: { schemaVersion: 1, scope: 'package' },
});

const wiringRoot = mkdtempSync(join(tmpdir(), 'kerf-wiring-'));
const wiringEntry = join(wiringRoot, 'main.tsx');
const wiringEntryTwo = join(wiringRoot, 'other.tsx');
const wiringLeaf = join(wiringRoot, 'leaf.tsx');
const wiringApp = join(wiringRoot, 'app.tsx');
const wiringInit = join(wiringRoot, 'init.ts');
const wiringRootHelper = join(wiringRoot, 'search-field.tsx');
const currencyLeaf = join(wiringRoot, 'currencies-view.tsx');
const registrationEntry = join(wiringRoot, 'registration-entry.tsx');
const registrationLeaf = join(wiringRoot, 'registration-leaf.tsx');
const registrationInit = join(wiringRoot, 'registration-init.ts');
const registrationUnrelated = join(wiringRoot, 'registration-unrelated.ts');
writeFileSync(
  wiringEntry,
  "import './leaf'; import '@kerfjs/ui/select/register'; import { wireSearchFields } from '@kerfjs/ui/wire-search-fields'; const dispose = wireSearchFields(root);\n",
);
writeFileSync(
  wiringLeaf,
  "import { SearchField, Select } from '@kerfjs/ui'; export const View = () => <><SearchField /><Select /></>;\n",
);
writeFileSync(wiringEntryTwo, "import('./leaf');\n");
writeFileSync(
  currencyLeaf,
  "import { SearchField } from '@kerfjs/ui/search-field'; export const CurrenciesView = () => <SearchField id='currency-filter' />;\n",
);
writeFileSync(wiringApp, "import { init } from './init.js'; init();\n");
writeFileSync(
  wiringInit,
  "import './currencies-view.js'; import { wireShellSearch } from './search-field.js'; export function init() { void wireShellSearch(root); }\n",
);
writeFileSync(
  wiringRootHelper,
  "import { wireSearchFields } from '@kerfjs/ui/wire-search-fields'; export function wireShellSearch(root) { return wireSearchFields(root, { onEdit({ id }) { if (id === 'currency-filter') updateFilter(); } }); }\n",
);
writeFileSync(
  registrationEntry,
  "import './registration-leaf'; import './registration-init';\n",
);
writeFileSync(
  registrationLeaf,
  "import { Select } from '@kerfjs/ui'; export const View = () => <Select />;\n",
);
writeFileSync(registrationInit, "import '@kerfjs/ui/select/register';\n");
writeFileSync(
  registrationUnrelated,
  "import '@kerfjs/ui/popup-menu/register';\n",
);
const entrySettings = uiSettings({
  workspaceRoot: wiringRoot,
  profile: { ...profile, wiring: { entries: ['main.tsx'] } },
});
const rootHelperSettings = uiSettings({
  workspaceRoot: wiringRoot,
  profile: { ...profile, wiring: { entries: ['app.tsx'] } },
});
const registrationSettings = uiSettings({
  workspaceRoot: wiringRoot,
  profile: { ...profile, wiring: { entries: ['registration-entry.tsx'] } },
});
const twoEntrySettings = uiSettings({
  workspaceRoot: wiringRoot,
  profile: { ...profile, wiring: { entries: ['main.tsx', 'other.tsx'] } },
});
const moduleScopeSettings = uiSettings({
  workspaceRoot: wiringRoot,
  profile: { ...profile, wiring: { entries: ['main.tsx'] } },
  catalog: {
    ...settings.kerfjs.ui.catalog,
    entries: settings.kerfjs.ui.catalog.entries.map((entry) =>
      entry.id === 'search-field'
        ? { ...entry, wiring: { ...entry.wiring, scope: 'module' } }
        : entry,
    ),
  },
});
const catalogProviderSettings = uiSettings({
  catalog: {
    ...settings.kerfjs.ui.catalog,
    entries: settings.kerfjs.ui.catalog.entries.map((entry) =>
      entry.id === 'pane'
        ? {
            ...entry,
            wiring: { required: true, helpers: ['wireScrollDividers'] },
          }
        : entry,
    ),
  },
});

tester.run('ui-public-boundaries', boundaries, {
  valid: [
    // A component's own root class on that component is not a recreation.
    {
      code: 'import { Toolbar } from \'@kerfjs/ui\'; <Toolbar className="kui-toolbar" />;',
      settings,
    },
    // Placeable classes: layout utilities, the document root, item geometry
    // on a non-div carrier, and a Web Awesome modifier class.
    {
      code: '<main class="kui-content kui-scroll-owner"><p class="kui-inline-metadata" /></main>;',
      settings: shippedUiSettings,
    },
    {
      code: '<section class="app-palette kui-content"><ul class="kui-content-item" /><footer class="kui-control-cluster kui-content-item kui-content-item--framed" /></section>;',
      settings: shippedUiSettings,
    },
    {
      code: 'import { Text } from \'@kerfjs/ui/text\'; <Text class="kui-content-item" />;',
      settings: shippedUiSettings,
    },
    {
      code: '<wa-dialog class="hide-actions" />;',
      settings: shippedUiSettings,
    },
    // ContentItem itself (its own element), a class only an interpolation
    // completes, and item geometry in a template literal on a non-div carrier.
    {
      code: 'import { ContentItem } from \'@kerfjs/ui/content-item\'; <ContentItem className="kui-content-item" />;',
      settings: shippedUiSettings,
    },
    {
      code: 'const size = "x"; <div class={`kui-toolbar-${size} app-row`} />;',
      settings,
    },
    {
      code: 'const extra = "x"; <ul class={`kui-content-item ${extra}`} />;',
      settings: shippedUiSettings,
    },
    {
      code: '<div class="kui-toolbar" />;',
      filename: `${process.cwd()}/legacy/view.tsx`,
      settings: uiSettings({
        profile: {
          ...profile,
          exceptions: [
            {
              id: 'legacy-toolbar',
              rules: ['KUI-L103'],
              target: 'legacy',
              rationale: 'Migration boundary.',
            },
          ],
        },
      }),
    },
    // The documented @kerfjs/ui/document.css mount container (ui/README.md,
    // ui/docs/document-baseline.md), in the exact downstream shape.
    {
      code: '<div id="app" class="kui-app-root" />;',
      settings: shippedUiSettings,
    },
    {
      code: '<div id="app" className="kui-app-root" />;',
      settings: shippedUiSettings,
    },
    { code: "const css = 'color: var(--kui-color-border)';", settings },
    {
      code: "const paneStyle = '--kui-pane-scrollbar-gutter: stable';",
      settings: shippedUiSettings,
    },
    {
      code: "const css = 'width: var(--kui-workbench-rail-width); height: var(--kui-workbench-drawer-height)';",
      settings,
    },
    {
      code: '<div class="kui-private" />;',
      filename: `${process.cwd()}/legacy/view.tsx`,
      settings: uiSettings({
        profile: {
          ...profile,
          exceptions: [
            {
              id: 'legacy-class',
              rules: ['KUI-L101'],
              target: 'legacy',
              rationale: 'Migration boundary.',
            },
          ],
        },
      }),
    },
  ],
  invalid: [
    // Recreating a component by its anatomy classes instead of rendering it.
    {
      code: '<div class="kui-toolbar" />;',
      settings,
      errors: [
        {
          messageId: 'component',
          data: {
            name: 'kui-toolbar',
            component: 'Toolbar',
            render: '`Toolbar`',
          },
        },
      ],
    },
    {
      code: '<div class="kui-workbench kui-workbench__rail kui-workbench__main" />;',
      settings,
      errors: [
        {
          messageId: 'component',
          data: {
            name: 'kui-workbench',
            component: 'Workbench',
            render: '`Workbench`',
          },
        },
        {
          messageId: 'component',
          data: {
            name: 'kui-workbench__rail',
            component: 'Workbench',
            render: '`Workbench`',
          },
        },
        {
          messageId: 'component',
          data: {
            name: 'kui-workbench__main',
            component: 'Workbench',
            render: '`Workbench`',
          },
        },
      ],
    },
    {
      code: '<aside class="kui-pane"><nav className={"kui-pane__content kui-content"} /></aside>;',
      settings: shippedUiSettings,
      errors: [
        {
          messageId: 'component',
          data: { name: 'kui-pane', component: 'Pane', render: '`Pane`' },
        },
        {
          messageId: 'component',
          data: {
            name: 'kui-pane__content',
            component: 'Pane',
            render: '`Pane`',
          },
        },
      ],
    },
    {
      code: '<wa-dropdown class="kui-popup-menu"><a class="kui-toolbar-action-link" /></wa-dropdown>;',
      settings: shippedUiSettings,
      errors: [
        {
          messageId: 'component',
          data: {
            name: 'kui-popup-menu',
            component: 'PopupMenu',
            render: '`PopupMenu`',
          },
        },
        {
          messageId: 'component',
          data: {
            name: 'kui-toolbar-action-link',
            component: 'ToolbarActionLink',
            render: '`ToolbarActionLink`',
          },
        },
      ],
    },
    // A plain div carrying item geometry is exactly what ContentItem renders.
    {
      code: '<section class="kui-content"><div class="kui-content-item">Summary</div></section>;',
      settings: shippedUiSettings,
      errors: [
        {
          messageId: 'componentRoot',
          data: {
            name: 'kui-content-item',
            element: 'div',
            component: 'ContentItem',
            render: '`ContentItem`',
          },
        },
      ],
    },
    {
      code: 'const extra = "x"; <div className={`kui-content-item kui-content-item--framed ${extra}`} />;',
      settings: shippedUiSettings,
      errors: [
        {
          messageId: 'componentRoot',
          data: {
            name: 'kui-content-item',
            element: 'div',
            component: 'ContentItem',
            render: '`ContentItem`',
          },
        },
        {
          messageId: 'componentRoot',
          data: {
            name: 'kui-content-item--framed',
            element: 'div',
            component: 'ContentItem',
            render: '`ContentItem`',
          },
        },
      ],
    },
    {
      code: '<div class="kui-content-item--pill" />;',
      filename: `${process.cwd()}/legacy/view.tsx`,
      settings: {
        ...shippedUiSettings,
        kerfjs: {
          ui: {
            ...shippedUiSettings.kerfjs.ui,
            profile: {
              ...profile,
              exceptions: [
                {
                  id: 'legacy-class',
                  rules: ['KUI-L101'],
                  target: 'legacy',
                  rationale: 'An L101 exception does not excuse L103.',
                },
              ],
            },
          },
        },
      },
      errors: [{ messageId: 'componentRoot' }],
    },
    // Anatomy classes in a template literal are recreated anatomy too.
    {
      code: 'const extra = "x"; <div class={`kui-toolbar ${extra}`} />;',
      settings,
      errors: [
        {
          messageId: 'component',
          data: {
            name: 'kui-toolbar',
            component: 'Toolbar',
            render: '`Toolbar`',
          },
        },
      ],
    },
    {
      code: 'const extra = "x"; <div class={`kui-private ${extra}`} />;',
      settings,
      errors: [{ messageId: 'class', data: { name: 'kui-private' } }],
    },
    // Another component's anatomy class as a hook on a component's root.
    {
      code: 'import { Text } from \'@kerfjs/ui/text\'; <Text class="kui-toolbar-text" />;',
      settings: shippedUiSettings,
      errors: [
        {
          messageId: 'component',
          data: {
            name: 'kui-toolbar-text',
            component: 'ToolbarText',
            render: '`ToolbarText`',
          },
        },
      ],
    },
    {
      code: '<div className="kui-private" />;',
      settings,
      errors: [{ messageId: 'class' }],
    },
    {
      code: '<div id="app" class="kui-app-root kui-private" />;',
      settings: shippedUiSettings,
      errors: [{ messageId: 'class', data: { name: 'kui-private' } }],
    },
    {
      code: "const css = 'color: var(--kui-secret)';",
      settings,
      errors: [{ messageId: 'token' }],
    },
  ],
});

tester.run('ui-composition', composition, {
  valid: [
    {
      code: "import { Toolbar, ToolbarControlGroup, ToolbarActionLink as Link } from '@kerfjs/ui'; <Toolbar trailing={<ToolbarControlGroup><Link href='/report' label='Report' /></ToolbarControlGroup>} />;",
      settings: shippedUiSettings,
    },
    {
      code: "import { Toolbar } from '@kerfjs/ui'; <Toolbar trailing={<wa-button variant='brand'>New ticket</wa-button>} />;",
      settings: shippedUiSettings,
    },
    {
      code: "import { Toolbar } from '@kerfjs/ui'; <Toolbar leading={<button type='button'>Save</button>} center={<input aria-label='Search' />} trailing={<wa-button variant='brand'>New ticket</wa-button>} />;",
      settings: shippedUiSettings,
    },
    {
      code: "import { Toolbar } from '@kerfjs/ui'; const Action = () => <button />; <Toolbar trailing={<Action />} />;",
      settings: shippedUiSettings,
    },
    {
      code: "import * as UI from '@kerfjs/ui'; <UI.Toolbar trailing={<UI.ToolbarControlGroup><UI.ToolbarActionLink href='/report' label='Report' /></UI.ToolbarControlGroup>} />;",
      settings: shippedUiSettings,
    },
    {
      code: "import { Toolbar, ToolbarControlGroup as Group } from '@kerfjs/ui'; <Toolbar leading={<Group />} />;",
      settings,
    },
    {
      code: "import { Toolbar, ToolbarText } from '@kerfjs/ui'; <Toolbar center={<ToolbarText />} />;",
      settings,
    },
    {
      code: "import { ToolbarControlGroup as Group } from 'other-ui'; <Group />;",
      settings,
    },
    {
      code: "import { Pane, Toolbar as Bar } from '@kerfjs/ui'; const body = getContent(); <Pane header={<Bar />}>{body}</Pane>;",
      settings,
    },
    {
      code: "import { Pane, SegmentedControl } from '@kerfjs/ui'; <Pane footer={<SegmentedControl />} />;",
      settings,
    },
    {
      code: "import * as UI from '@kerfjs/ui'; const alternate = true; <UI.TabBar>{alternate ? <UI.TabBarItem /> : [<UI.TabBarItem />, <UI.TabBarItem />]}</UI.TabBar>;",
      settings,
    },
    {
      code: "import { TabBar as Tabs } from '@kerfjs/ui/tab-bar'; import { TabBarItem as Tab } from '@kerfjs/ui/tab-bar-item'; const ready = true; <Tabs>{ready && <Tab />}</Tabs>;",
      settings,
    },
    {
      code: "import { TabBar, TabBarItem } from '@kerfjs/ui'; <TabBar trailing={<wa-button>Add tab</wa-button>} end={<wa-button variant='brand'>New ticket</wa-button>}><TabBarItem /></TabBar>;",
      settings: shippedUiSettings,
    },
    {
      code: "import { TabBar, TabBarItem, ToolbarControlGroup } from '@kerfjs/ui'; <TabBar leading={<ToolbarControlGroup />} trailing={<ToolbarControlGroup />} end={<ToolbarControlGroup />}><TabBarItem /></TabBar>;",
      settings: shippedUiSettings,
    },
    // Zone validation deliberately stops at a local binding.
    {
      code: "import { TabBar, TabBarItem } from '@kerfjs/ui'; const actions = <div><wa-button>New ticket</wa-button></div>; <TabBar trailing={actions}><TabBarItem /></TabBar>;",
      settings: shippedUiSettings,
    },
    {
      code: "import { SplitView } from '@kerfjs/ui'; const list = getList(); const detail = getDetail(); <SplitView list={list} detail={detail} />;",
      settings,
    },
  ],
  invalid: [
    {
      code: "import { Toolbar, ToolbarActionLink } from '@kerfjs/ui'; <Toolbar trailing={<ToolbarActionLink href='/report' label='Report' />} />;",
      settings: shippedUiSettings,
      errors: [{ messageId: 'parent' }],
    },
    {
      code: "import { Toolbar, ToolbarActionLink } from '@kerfjs/ui'; <Toolbar><ToolbarActionLink href='/report' label='Report' /></Toolbar>;",
      settings: shippedUiSettings,
      errors: [{ messageId: 'parent' }],
    },
    {
      code: "import { Toolbar, SegmentedControl } from '@kerfjs/ui'; <Toolbar leading={<SegmentedControl />} />;",
      settings,
      errors: [{ messageId: 'zone' }],
    },
    {
      code: "import { Toolbar, ToolbarControlGroup } from '@kerfjs/ui'; <Toolbar center={<ToolbarControlGroup />} />;",
      settings,
      errors: [{ messageId: 'zone' }],
    },
    {
      code: "import { Toolbar } from '@kerfjs/ui'; <Toolbar leading={<button>Save</button>} />;",
      settings,
      errors: [{ messageId: 'zone' }],
    },
    {
      code: "import { Toolbar } from '@kerfjs/ui'; const Action = () => <button />; <Toolbar trailing={<Action />} />;",
      settings,
      errors: [{ messageId: 'zone' }],
    },
    {
      code: "import { TabBar } from '@kerfjs/ui'; <TabBar />;",
      settings,
      errors: [{ messageId: 'cardinality' }],
    },
    {
      code: "import { TabBar, ToolbarText } from '@kerfjs/ui'; <TabBar><ToolbarText /></TabBar>;",
      settings,
      errors: [{ messageId: 'zone' }],
    },
    {
      code: "import { TabBar, TabBarItem } from '@kerfjs/ui'; <TabBar end={<div><wa-button>New ticket</wa-button></div>}><TabBarItem /></TabBar>;",
      settings: shippedUiSettings,
      errors: [{ messageId: 'zone' }],
    },
    {
      code: "import { TabBarItem, LucideIcon } from '@kerfjs/ui'; <div><TabBarItem closeIcon={<><LucideIcon /><LucideIcon /></>} /></div>;",
      settings,
      errors: [{ messageId: 'parent' }, { messageId: 'cardinality' }],
    },
    {
      code: "import { SplitView } from '@kerfjs/ui'; <SplitView />;",
      settings,
      errors: [{ messageId: 'cardinality' }, { messageId: 'cardinality' }],
    },
    {
      code: "import { Toolbar, ToolbarText } from '@kerfjs/ui'; <Toolbar center={<><ToolbarText /><ToolbarText /></>} />;",
      settings,
      errors: [{ messageId: 'cardinality' }],
    },
    {
      code: "import * as UI from '@kerfjs/ui'; <UI.SegmentedControl><UI.ToolbarControlGroup /></UI.SegmentedControl>;",
      settings,
      errors: [{ messageId: 'parent' }],
    },
    {
      code: "import { ToolbarControlGroup } from '@kerfjs/ui'; <div><ToolbarControlGroup /></div>;",
      settings,
      errors: [{ messageId: 'parent' }],
    },
  ],
});

// An application workspace whose profile declares its own component catalog
// and a third-party one, so wrapper components resolve like they would in a
// real app: relative imports by source file, bare imports by package subpath.
const appRoot = mkdtempSync(join(tmpdir(), 'kerf-renders-as-'));
const wrapper = (id, name, rendersAs, extra = {}) => ({
  key: `karwan-app:${id}`,
  package: 'karwan-app',
  id,
  name,
  source: `src/${id}.tsx`,
  publicExports: [{ name, subpath: '.' }],
  ...(rendersAs ? { rendersAs } : {}),
  parents: { mode: 'any', entries: [] },
  wiring: { required: false, helpers: [] },
  boundaries: { publicClasses: [], publicTokens: [] },
  ...extra,
});
const writeJson = (path, value) =>
  writeFileSync(join(appRoot, path), JSON.stringify(value));
mkdirSync(join(appRoot, 'src'), { recursive: true });
mkdirSync(join(appRoot, 'vendor/acme'), { recursive: true });
writeJson('package.json', { name: 'karwan-app' });
writeJson('vendor/acme/package.json', { name: '@acme/bits' });
writeJson('component-composition.json', {
  schemaVersion: 1,
  package: 'karwan-app',
  entries: [
    wrapper(
      'demand-segments-control',
      'DemandSegmentsControl',
      ['@kerfjs/ui:toolbar-control-group'],
      {
        parents: { mode: 'listed', entries: ['@kerfjs/ui:toolbar'] },
      },
    ),
    wrapper('view-segmented-control', 'ViewSegmentedControl', [
      '@kerfjs/ui:toolbar-control-group',
      '@kerfjs/ui:toolbar-text',
    ]),
    wrapper('title-text', 'TitleText', ['@kerfjs/ui:toolbar-text']),
    wrapper('app-toolbar', 'AppToolbar', ['@kerfjs/ui:toolbar']),
    wrapper('status-chip', 'StatusChip', ['@kerfjs/ui:segmented-control']),
    // An application component with its own cataloged anatomy class.
    wrapper('plain-widget', 'PlainWidget', undefined, {
      boundaries: {
        rootClass: 'karwan-widget',
        publicClasses: ['karwan-widget'],
        publicTokens: [],
      },
    }),
    // A private, bundled application declares an export by name alone: it
    // resolves through its source file, never through a package subpath.
    wrapper(
      'source-only-group',
      'SourceOnlyGroup',
      ['@kerfjs/ui:toolbar-control-group'],
      { publicExports: [{ name: 'SourceOnlyGroup' }] },
    ),
    // Required wiring that is a root-delegated action, not a named helper.
    wrapper('board-card', 'BoardCard', undefined, {
      publicExports: [{ name: 'BoardCard' }],
      wiring: { required: true, helpers: [], actions: ['open-card'] },
    }),
    wrapper('ticket-search', 'TicketSearch', undefined, {
      publicExports: [{ name: 'TicketSearch' }],
      wiring: {
        required: true,
        helpers: ['wireTicketSearch'],
        sources: [
          {
            export: 'wireTicketSearch',
            source: 'src/interactions/ticket-search.ts',
          },
        ],
      },
    }),
  ],
});
writeJson('vendor/acme/catalog.json', {
  schemaVersion: 1,
  package: '@acme/bits',
  entries: [
    {
      ...wrapper('group-wrap', 'GroupWrap', [
        '@kerfjs/ui:toolbar-control-group',
      ]),
      key: '@acme/bits:group-wrap',
      package: '@acme/bits',
      publicExports: [{ name: 'GroupWrap', subpath: './group-wrap' }],
    },
    // A third-party component package's own anatomy classes: Meter renders
    // them all; Card's item geometry is placeable except on the <section>
    // Card itself renders.
    {
      ...wrapper('meter', 'Meter'),
      key: '@acme/bits:meter',
      package: '@acme/bits',
      publicExports: [
        { name: 'Meter', subpath: './meter' },
        { name: 'MeterProps', subpath: './meter' },
      ],
      boundaries: {
        rootClass: 'acme-meter',
        publicClasses: ['acme-meter', 'acme-meter__bar'],
        publicTokens: [],
      },
    },
    {
      ...wrapper('card', 'Card'),
      key: '@acme/bits:card',
      package: '@acme/bits',
      publicExports: [{ name: 'Card', subpath: './card' }],
      boundaries: {
        rootClass: 'acme-card',
        publicClasses: ['acme-card', 'acme-card--framed'],
        placeableClasses: ['acme-card', 'acme-card--framed'],
        rootElement: 'section',
        publicTokens: [],
      },
    },
  ],
});
writeJson('.kerf-ui-profile.json', {
  schemaVersion: 1,
  scope: 'workspace',
  catalogs: [
    {
      package: 'karwan-app',
      composition: { path: './component-composition.json', schemaVersion: 1 },
    },
    {
      package: '@acme/bits',
      composition: { path: './vendor/acme/catalog.json', schemaVersion: 1 },
    },
  ],
  wiring: { entries: ['src/wiring-entry.tsx'] },
});
// Barrels that re-export cataloged wrappers (and one that is not cataloged),
// as an app imports them: `import { X } from './components/index.js'`.
const writeSource = (path, text) => {
  mkdirSync(dirname(join(appRoot, path)), { recursive: true });
  writeFileSync(join(appRoot, path), text);
};
writeSource(
  'src/components/index.ts',
  [
    "/* export { SourceOnlyGroup } from '../source-only-group.js'; */",
    "export { DemandSegmentsControl } from '../demand-segments-control.js';",
    "export { TitleText as HeadingText, type TitleTextProps } from '../title-text.js';",
    "export type { StatusChipProps } from '../status-chip.js';",
    "export { Mystery } from '../mystery.js';",
    "export { LocalGroup } from './local-group.js';",
  ].join('\n'),
);
writeSource(
  'src/components/local-group.tsx',
  'export function LocalGroup() { return null; }\n',
);
writeSource(
  'src/segments.ts',
  "// A star re-export barrel.\nexport * from './view-segmented-control.js';\n",
);
writeSource('src/barrel/index.ts', "export * from '../components/index.js';\n");
writeSource(
  'src/namespace.ts',
  "export * as widgets from './demand-segments-control.js';\n",
);
writeSource('src/cycle-a.ts', "export * from './cycle-b.js';\n");
writeSource('src/cycle-b.ts', "export * from './cycle-a.js';\n");
writeSource(
  'src/interactions/ticket-search.ts',
  'export function wireTicketSearch() {}\n',
);
writeSource(
  'src/interactions/index.ts',
  "export { wireTicketSearch } from './ticket-search.js';\n",
);
writeSource(
  'src/interactions/alias.ts',
  "export { wireTicketSearch as wire } from './ticket-search.js';\n",
);
writeSource(
  'src/other-interactions.ts',
  'export function wireTicketSearch() {}\n',
);
writeSource(
  'src/wiring-view.tsx',
  "import { TicketSearch } from './ticket-search.js'; export const View = () => <TicketSearch />;\n",
);
writeSource(
  'src/wiring-start.ts',
  "import { wireTicketSearch as wire } from './interactions/index.js'; export function start() { return wire(root); }\n",
);
writeSource(
  'src/wiring-start-alias.ts',
  "import { wire } from './interactions/alias.js'; export function start() { return wire(root); }\n",
);
writeSource(
  'src/wiring-commented.ts',
  "import { wireTicketSearch } from './interactions/ticket-search.js'; // wireTicketSearch(root)\nexport const example = 'wireTicketSearch(root)';\n",
);
// The component renders its own data-action (and here even imports delegate);
// its source never counts as the application's handler.
writeSource(
  'src/board-card.tsx',
  'import { delegate } from \'kerfjs\'; export function BoardCard() { return <article data-action="open-card" />; }\n',
);
writeSource(
  'src/board-view.tsx',
  "import { BoardCard } from './board-card.js'; export const Board = () => <BoardCard />;\n",
);
writeSource(
  'src/board-actions.ts',
  "import { delegateActions } from 'kerfjs/actions'; export function wireBoard(root) { return delegateActions(root, 'click', { 'open-card': () => {} }); }\n",
);
writeSource(
  'src/board-actions-other.ts',
  "import { delegate } from 'kerfjs'; // 'open-card' is handled elsewhere\nexport function wireOther(root) { return delegate(root, 'click', '[data-action=\"close-card\"]', () => {}); }\n",
);
const appSettings = uiSettings({
  profile: undefined,
  workspaceRoot: appRoot,
  // The package-defaults layer an installed @kerfjs/ui would supply.
  profileDefaultsPath: join(
    import.meta.dirname,
    '../../../ui/ai/application-ui-profile.defaults.json',
  ),
});
const appFile = join(appRoot, 'src/view.tsx');
const appCase = (code, extra = {}) => ({
  code: `import { Toolbar, ToolbarControlGroup, SegmentedControl } from '@kerfjs/ui'; ${code}`,
  filename: appFile,
  settings: appSettings,
  ...extra,
});

// The shipped catalog declares Disclosure's embedded appearance as expecting
// inset-free children, and Text's flush/span forms as inset-free.
const embedded = (children, props = "appearance='embedded'") => ({
  code: `import { ContentItem, Disclosure, List, Text, ValueTable } from '@kerfjs/ui'; const ready = true; <ContentItem><Disclosure title='AI Feedback' ${props}>${children}</Disclosure></ContentItem>;`,
  settings: shippedUiSettings,
});
const insetMessage = (child, fix) =>
  `KUI-L204: \`@kerfjs/ui:${child}\` brings its own content-item inset (1px border + 8px padding) into \`@kerfjs/ui:disclosure\` with \`appearance="embedded"\`, which expects inset-free content and double-insets it; ${fix}.`;
tester.run('ui-composition inset-free children', composition, {
  valid: [
    embedded('<Text flush>Group Export.</Text>'),
    embedded('<Text flush={true}>Group Export.</Text>'),
    embedded("<Text variant='span'>Group Export.</Text>"),
    embedded('Group Export and Share in one control group.'),
    embedded('<strong>Group</strong> Export.'),
    // A List owns no inset of its own, and only direct children are checked.
    embedded('<List><Text>One</Text></List>'),
    // Other appearances keep the geometry block content lands on.
    embedded('<Text>Proxy and retry limits.</Text>', ''),
    embedded('<Text>Proxy.</Text>', "appearance='framed'"),
    embedded('<ValueTable rows={[]} />', "appearance='sunken'"),
    // Values the rule cannot read statically are not reported.
    embedded('<Text>Proxy.</Text>', 'appearance={appearance}'),
    embedded('<Text>Proxy.</Text>', '{...props}'),
    embedded('<Text flush={compact}>Proxy.</Text>'),
    embedded('<Text {...textProps}>Proxy.</Text>'),
  ],
  invalid: [
    {
      ...embedded('<Text>Group Export and Share.</Text>'),
      errors: [
        { message: insetMessage('text', 'set `flush` or `variant="span"`') },
      ],
    },
    {
      ...embedded(
        "<Text flush={false} tone='quiet'>Group Export.</Text>",
        'appearance={"embedded"}',
      ),
      errors: [{ messageId: 'inset' }],
    },
    {
      ...embedded("<Text variant='h3'>Title</Text>", 'appearance={`embedded`}'),
      errors: [{ messageId: 'inset' }],
    },
    {
      ...embedded('<ValueTable rows={[]} />'),
      errors: [
        {
          message: insetMessage(
            'value-table',
            'use an inset-free child such as `Text flush`, or inline content',
          ),
        },
      ],
    },
    // Fragments, arrays, and conditional branches are direct children too.
    {
      ...embedded('<><Text flush>Fine</Text><Text>Inset</Text></>'),
      errors: [{ messageId: 'inset' }],
    },
    {
      ...embedded(
        '{ready ? <Text>Inset</Text> : <Text flush>Fine</Text>}{[<ContentItem />]}',
      ),
      errors: [{ messageId: 'inset' }, { messageId: 'inset' }],
    },
  ],
});

// The check is catalog-driven: it applies to any entry that declares it.
tester.run('ui-composition catalog-declared inset-free children', composition, {
  valid: [
    {
      code: "import { Card, Note } from '@acme/ui'; <Card mode='bare'><Note plain /></Card>;",
      settings: insetCatalogSettings,
    },
    {
      code: "import { Card, Note } from '@acme/ui'; <Card><Note /></Card>;",
      settings: insetCatalogSettings,
    },
  ],
  invalid: [
    {
      code: "import { Card, Note } from '@acme/ui'; <Card mode='bare'><Note /><Card /></Card>;",
      settings: insetCatalogSettings,
      errors: [
        {
          message:
            'KUI-L204: `@acme/ui:note` brings its own content-item inset (1px border + 8px padding) into `@acme/ui:card` with `mode="bare"`, which expects inset-free content and double-insets it; set `plain`.',
        },
        { messageId: 'inset' },
      ],
    },
  ],
});

tester.run('ui-composition rendersAs wrappers', composition, {
  valid: [
    // A wrapper that renders a ToolbarControlGroup (or nothing) fits trailing.
    appCase(
      "import { DemandSegmentsControl } from './demand-segments-control.js'; <Toolbar trailing={<DemandSegmentsControl />} />;",
    ),
    // Each root of a multi-root wrapper is accepted by leading.
    appCase(
      "import { ViewSegmentedControl } from './view-segmented-control'; <Toolbar leading={<ViewSegmentedControl />} />;",
    ),
    // A third-party wrapper resolves by its package subpath.
    appCase(
      "import { GroupWrap } from '@acme/bits/group-wrap'; <Toolbar trailing={<><GroupWrap /><GroupWrap /></>} />;",
    ),
    // A subpath-less private-application export resolves by source file.
    appCase(
      "import { SourceOnlyGroup } from './source-only-group.js'; <Toolbar trailing={<SourceOnlyGroup />} />;",
    ),
    // A wrapper imported through a barrel's named re-export.
    appCase(
      "import { DemandSegmentsControl } from './components/index.js'; <Toolbar trailing={<DemandSegmentsControl />} />;",
    ),
    // A renamed re-export resolves to the cataloged export it renames.
    appCase(
      "import { HeadingText } from './components/index.js'; <Toolbar center={<HeadingText />} />;",
    ),
    // A star re-export, and a chain through a directory index.
    appCase(
      "import { ViewSegmentedControl } from './segments.js'; <Toolbar leading={<ViewSegmentedControl />} />;",
    ),
    appCase(
      "import { DemandSegmentsControl } from './barrel'; <Toolbar trailing={<DemandSegmentsControl />} />;",
    ),
    // Wrappers may render nothing, so two in a max-1 zone are not a certain overflow.
    appCase(
      "import { TitleText } from './title-text.js'; <Toolbar center={<><TitleText /><TitleText /></>} />;",
    ),
    // A wrapper used as a parent counts as its root: a ToolbarControlGroup
    // needs a Toolbar parent, and AppToolbar renders one.
    appCase(
      "import { AppToolbar } from './app-toolbar.js'; <AppToolbar><ToolbarControlGroup /></AppToolbar>;",
    ),
  ],
  invalid: [
    // The wrapper's root is not a toolbar zone child.
    appCase(
      "import { StatusChip } from './status-chip.js'; <Toolbar trailing={<StatusChip />} />;",
      { errors: [{ messageId: 'zone' }] },
    ),
    // center accepts ToolbarText only; one root (the group) does not fit.
    appCase(
      "import { ViewSegmentedControl } from './view-segmented-control.js'; <Toolbar center={<ViewSegmentedControl />} />;",
      { errors: [{ messageId: 'zone' }] },
    ),
    // An undeclared app component keeps today's KUI-L202 behavior.
    appCase(
      "import { PlainWidget } from './plain-widget.js'; <Toolbar trailing={<PlainWidget />} />;",
      { errors: [{ messageId: 'zone' }] },
    ),
    // A subpath-less export registers no package-name import.
    appCase(
      "import { SourceOnlyGroup } from 'karwan-app'; <Toolbar trailing={<SourceOnlyGroup />} />;",
      { errors: [{ messageId: 'zone' }] },
    ),
    // An import that does not name the cataloged source file stays unresolved.
    appCase(
      "import { DemandSegmentsControl } from '../elsewhere/demand-segments-control.js'; <Toolbar trailing={<DemandSegmentsControl />} />;",
      { errors: [{ messageId: 'zone' }] },
    ),
    // A barrel's re-export of a non-cataloged component stays unresolved, as
    // does a component the barrel reaches through a non-cataloged local file.
    appCase(
      "import { Mystery } from './components/index.js'; <Toolbar trailing={<Mystery />} />;",
      { errors: [{ messageId: 'zone' }] },
    ),
    appCase(
      "import { LocalGroup } from './components/index.js'; <Toolbar trailing={<LocalGroup />} />;",
      { errors: [{ messageId: 'zone' }] },
    ),
    // A renamed re-export is reachable only by its new name.
    appCase(
      "import { TitleText } from './components/index.js'; <Toolbar trailing={<TitleText />} />;",
      { errors: [{ messageId: 'zone' }] },
    ),
    // Commented-out and namespace re-exports are not followed.
    appCase(
      "import { SourceOnlyGroup } from './components/index.js'; <Toolbar trailing={<SourceOnlyGroup />} />;",
      { errors: [{ messageId: 'zone' }] },
    ),
    appCase(
      "import { DemandSegmentsControl } from './namespace.js'; <Toolbar trailing={<DemandSegmentsControl />} />;",
      { errors: [{ messageId: 'zone' }] },
    ),
    // A re-export cycle terminates without resolving.
    appCase(
      "import { DemandSegmentsControl } from './cycle-a.js'; <Toolbar trailing={<DemandSegmentsControl />} />;",
      { errors: [{ messageId: 'zone' }] },
    ),
    // A wrapper parent that renders a group is not the Toolbar the child needs.
    appCase(
      "import { DemandSegmentsControl } from './demand-segments-control.js'; <DemandSegmentsControl><ToolbarControlGroup /></DemandSegmentsControl>;",
      { errors: [{ messageId: 'parent' }] },
    ),
    // The wrapper and rendered ToolbarControlGroup both require Toolbar;
    // the placement gets one diagnostic, not two.
    appCase(
      "import { DemandSegmentsControl } from './demand-segments-control.js'; <div><DemandSegmentsControl /></div>;",
      { errors: [{ messageId: 'parent' }] },
    ),
    // Distinct listed requirements from multiple roots still yield one
    // diagnostic at the placement.
    appCase(
      "import { ViewSegmentedControl } from './view-segmented-control.js'; <div><ViewSegmentedControl /></div>;",
      { errors: [{ messageId: 'parent' }] },
    ),
  ],
});

// A declared component package's anatomy classes on an application-owned
// element are reported with the component to render, like @kerfjs/ui's.
// `kerfjs/html` tagged templates write the same markup without JSX; their
// static class attributes carry the same KUI-L101 / KUI-L103 contract.
const htmlCase = (code, extra = {}) => ({
  code: `import { html } from 'kerfjs/html';\n${code}`,
  settings: shippedUiSettings,
  ...extra,
});
const contentItemRoot = (name = 'kui-content-item') => ({
  messageId: 'componentRoot',
  data: {
    name,
    element: 'div',
    component: 'ContentItem',
    render: '`ContentItem`',
  },
});
const paneAnatomy = (name) => ({
  messageId: 'component',
  data: { name, component: 'Pane', render: '`Pane`' },
});
tester.run('ui-public-boundaries kerfjs/html templates', boundaries, {
  valid: [
    // Placeable classes, and item geometry on a non-div carrier.
    htmlCase(
      'html`<main class="kui-content kui-scroll-owner"><ul class="kui-content-item"></ul></main>`;',
    ),
    // A hole is a whole class value: unknown, so never reported.
    htmlCase('const cls = "kui-pane"; html`<aside class=${cls}></aside>`;'),
    htmlCase('const cls = "kui-pane"; html`<aside class="${cls}"></aside>`;'),
    // A name a hole completes is not known.
    htmlCase('const s = "x"; html`<div class="kui-toolbar-${s}"></div>`;'),
    // Comments, text, other attributes, and closing tags are not class values.
    htmlCase(
      'html`<!-- <div class="kui-pane"> --><p title="class=kui-pane">class="kui-pane"</p></div>`;',
    ),
    // `className` is not an HTML attribute name; html writes names verbatim.
    htmlCase('html`<div data-class="kui-pane" classname-x="kui-pane"></div>`;'),
    // Only the kerfjs/html tag: another `html` tag is not kerf markup.
    {
      code: 'const html = String.raw; html`<aside class="kui-pane"></aside>`;',
      settings: shippedUiSettings,
    },
    {
      code: 'import { html } from \'lit\'; html`<aside class="kui-pane"></aside>`;',
      settings: shippedUiSettings,
    },
    // A profile exception for KUI-L103 covers the template too.
    htmlCase('html`<aside class="kui-pane"></aside>`;', {
      filename: `${process.cwd()}/legacy/view.ts`,
      settings: uiSettings({
        ...shippedUiSettings.kerfjs.ui,
        profile: {
          ...profile,
          exceptions: [
            {
              id: 'legacy-pane',
              rules: ['KUI-L103'],
              target: 'legacy',
              rationale: 'Migration boundary.',
            },
          ],
        },
      }),
    }),
  ],
  invalid: [
    // The ContentItem root-element case: a plain <div> is ContentItem.
    htmlCase(
      'html`<section class="kui-content"><div class="kui-content-item">Unread</div></section>`;',
      { errors: [contentItemRoot()] },
    ),
    // Tag and attribute names are case-insensitive; single quotes and
    // unquoted static values count.
    htmlCase(
      "html`<DIV CLASS='kui-content-item kui-content-item--framed'></DIV><aside class=kui-pane></aside>`;",
      {
        errors: [
          contentItemRoot(),
          contentItemRoot('kui-content-item--framed'),
          paneAnatomy('kui-pane'),
        ],
      },
    ),
    htmlCase(
      'html`<aside class="kui-pane">\n  <nav class="kui-pane__content kui-content">Inbox</nav>\n</aside>`;',
      { errors: [paneAnatomy('kui-pane'), paneAnatomy('kui-pane__content')] },
    ),
    // Classes in later static parts, after holes, and in nested templates.
    htmlCase(
      'const label = "Mail"; const open = true; html`<p>${label}</p><aside aria-label=${label} class="kui-pane">${open ? html`<div class="kui-content-item"></div>` : ""}</aside>`;',
      { errors: [paneAnatomy('kui-pane'), contentItemRoot()] },
    ),
    // Complete static names before a hole count (the runtime rejects this
    // partial value, but the names are known).
    htmlCase(
      'const extra = "x"; html`<aside class="kui-pane ${extra}"></aside>`;',
      {
        errors: [paneAnatomy('kui-pane')],
      },
    ),
    // A namespace import of kerfjs/html.
    {
      code: 'import * as k from \'kerfjs/html\'; k.html`<aside class="kui-pane"></aside>`;',
      settings: shippedUiSettings,
      errors: [paneAnatomy('kui-pane')],
    },
    // An aliased import, and KUI-L101 private anatomy.
    {
      code: 'import { html as h } from \'kerfjs/html\'; h`<div class="kui-private"></div>`;',
      settings: shippedUiSettings,
      errors: [{ messageId: 'class', data: { name: 'kui-private' } }],
    },
    // Tokens in the template are reported once (by TemplateElement).
    htmlCase(
      'html`<div style="color: var(--kui-private-token)" class="kui-pane"></div>`;',
      {
        errors: [
          paneAnatomy('kui-pane'),
          { messageId: 'token', data: { name: '--kui-private-token' } },
        ],
      },
    ),
  ],
});

tester.run('ui-public-boundaries declared component packages', boundaries, {
  valid: [
    // The component's own source writes its anatomy; that is not a recreation.
    {
      ...appCase(
        'export function PlainWidget() { return <div class="karwan-widget" />; }',
      ),
      filename: join(appRoot, 'src/plain-widget.tsx'),
    },
    // The package's own component element carries its own root class.
    appCase(
      'import { Meter } from \'@acme/bits/meter\'; <Meter className="acme-meter" />;',
    ),
    // Placeable item geometry on a carrier other than the element Card renders.
    appCase('<ul class="acme-card acme-card--framed" />;'),
    // Uncataloged application classes are the application's own.
    appCase('<div class="acme-meterish app-row" />;'),
  ],
  invalid: [
    appCase('<div class="acme-meter"><span class="acme-meter__bar" /></div>;', {
      errors: [
        {
          messageId: 'component',
          data: { name: 'acme-meter', component: 'Meter', render: '`Meter`' },
        },
        {
          messageId: 'component',
          data: {
            name: 'acme-meter__bar',
            component: 'Meter',
            render: '`Meter`',
          },
        },
      ],
    }),
    appCase('<section class="acme-card acme-card--framed" />;', {
      errors: ['acme-card', 'acme-card--framed'].map((name) => ({
        messageId: 'componentRoot',
        data: { name, element: 'section', component: 'Card', render: '`Card`' },
      })),
    }),
    // Another component's source does not own the class.
    {
      ...appCase('export const Other = () => <div class="karwan-widget" />;'),
      filename: join(appRoot, 'src/title-text.tsx'),
      errors: [{ messageId: 'component' }],
    },
    // An application catalog's class (no subpath export) names its component.
    appCase('<div class="karwan-widget" />;', {
      errors: [
        {
          messageId: 'component',
          data: {
            name: 'karwan-widget',
            component: 'PlainWidget',
            render: '`PlainWidget`',
          },
        },
      ],
    }),
    // Another package's anatomy class as a hook on a Kerf UI component.
    appCase('<Toolbar className="acme-meter" />;', {
      errors: [
        {
          messageId: 'component',
          data: { name: 'acme-meter', component: 'Meter', render: '`Meter`' },
        },
      ],
    }),
  ],
});

tester.run('ui-preferences', preferences, {
  valid: [
    {
      code: "import { SegmentedControl as Choice } from '@kerfjs/ui'; <Choice />;",
      settings,
    },
    {
      code: "import { WaButtonGroup } from 'other-ui'; <WaButtonGroup />;",
      settings,
    },
  ],
  invalid: [
    {
      code: "import { WaButtonGroup as Choice } from '@kerfjs/ui'; <Choice />;",
      settings,
      errors: [{ messageId: 'preferred' }],
    },
    {
      code: "import * as UI from '@kerfjs/ui'; <UI.WaButtonGroup />;",
      settings,
      errors: [{ messageId: 'preferred' }],
    },
  ],
});

// The shipped catalogs plus the shipped package-default profile: every
// Discouraged Web Awesome element authored directly as a JSX tag reports
// KUI-L301, while a declared wrapper's own source may render what it wraps.
const shippedDefaultsSettings = uiSettings({
  catalog: undefined,
  selectionCatalog: undefined,
  catalogPath: join(
    import.meta.dirname,
    '../../../ui/ai/component-composition.json',
  ),
  selectionCatalogPath: join(
    import.meta.dirname,
    '../../../ui/ai/component-catalog.json',
  ),
  profile: undefined,
  workspaceRoot: appRoot,
  profileDefaultsPath: join(
    import.meta.dirname,
    '../../../ui/ai/application-ui-profile.defaults.json',
  ),
});
const shippedDefaults = JSON.parse(
  readFileSync(
    join(
      import.meta.dirname,
      '../../../ui/ai/application-ui-profile.defaults.json',
    ),
    'utf8',
  ),
);
const discouragedTags = [
  ['wa-button-group', 'segmented-control'],
  ['wa-dropdown', 'popup-menu'],
  ['wa-dropdown-item', 'popup-menu'],
  ['wa-option', 'select'],
  ['wa-select', 'select'],
  ['wa-split-panel', 'resize'],
  ['wa-tab', 'tab-bar'],
  ['wa-tab-group', 'tab-bar'],
  ['wa-tab-panel', 'tab-bar'],
  ['wa-tree', 'list'],
  ['wa-tree-item', 'list'],
  ['wa-animated-image', 'content-item'],
  ['wa-comparison', 'content-item'],
  ['wa-icon', 'lucide-icon'],
  ['wa-zoomable-frame', 'content-item'],
  ['wa-button', 'button'],
  ['wa-input', 'text-field'],
  ['wa-textarea', 'text-field'],
  ['wa-checkbox', 'checkbox'],
  ['wa-checkbox-group', 'checkbox-group'],
  ['wa-radio-group', 'radio-group'],
  ['wa-radio', 'radio-group'],
  ['wa-switch', 'switch'],
  ['wa-dialog', 'surface-scaffold'],
  ['wa-badge', 'badge'],
  ['wa-tag', 'chip'],
  ['wa-spinner', 'loading-spinner'],
  ['wa-skeleton', 'skeleton'],
  ['wa-drawer', 'surface-scaffold'],
  ['wa-card', 'content-item'],
  ['wa-page', 'recipe-app-shell'],
  ['wa-callout', 'state-banner'],
  ['wa-popover', 'anchored-surface'],
  ['wa-popup', 'anchored-surface'],
  ['wa-toast', 'toast'],
  ['wa-toast-item', 'toast'],
  ['wa-tooltip', 'tooltip'],
  ['wa-details', 'disclosure'],
  ['wa-accordion', 'disclosure'],
  ['wa-accordion-item', 'disclosure'],
  ['wa-progress-bar', 'progress-bar'],
  ['wa-progress-ring', 'progress-ring'],
  ['wa-slider', 'slider'],
  ['wa-tag-input', 'tag-field'],
  ['wa-color-picker', 'color-field'],
];

tester.run('ui-preferences discouraged Web Awesome tags', preferences, {
  valid: [
    // Integration elements no Kerf component replaces stay allowed.
    ...['wa-qr-code', 'wa-copy-button', 'wa-carousel', 'wa-rating'].map(
      (tag) => ({
        code: `<div><${tag} /></div>;`,
        filename: appFile,
        settings: shippedDefaultsSettings,
      }),
    ),
    // Unknown custom elements and plain HTML are application-owned.
    {
      code: '<my-widget><div /></my-widget>;',
      filename: appFile,
      settings: shippedDefaultsSettings,
    },
    // A declared wrapper's own source renders the element it wraps.
    {
      code: 'export const StatusChip = () => <wa-button-group />;',
      filename: join(appRoot, 'src/status-chip.tsx'),
      settings: shippedDefaultsSettings,
    },
  ],
  invalid: discouragedTags.map(([tag, preferred]) => {
    const [concept, preference] = Object.entries(
      shippedDefaults.preferences,
    ).find(([, entry]) => entry.avoid?.includes(`@kerfjs/ui:${tag}`));
    return {
      code: `<div><${tag} /></div>;`,
      filename: appFile,
      settings: shippedDefaultsSettings,
      errors: [
        {
          messageId: 'preferred',
          data: {
            actual: `@kerfjs/ui:${tag}`,
            concept,
            preferred: `@kerfjs/ui:${preferred}`,
            rationale: preference.rationale,
          },
        },
      ],
    };
  }),
});

tester.run('ui-wiring', wiring, {
  valid: [
    {
      code: "import { Pane } from '@kerfjs/ui'; import { wireCatalog } from '@kerfjs/ui/wire-catalog'; const stop = wireCatalog(root, options); <Pane />;",
      settings: catalogProviderSettings,
    },
    {
      code: "import './wiring-view.js'; import { start } from './wiring-start.js'; const dispose = start();",
      filename: join(appRoot, 'src/wiring-entry.tsx'),
      settings: appSettings,
    },
    {
      code: "import './wiring-view.js'; import { start } from './wiring-start-alias.js'; const dispose = start();",
      filename: join(appRoot, 'src/wiring-entry.tsx'),
      settings: appSettings,
    },
    {
      code: "import { TicketSearch } from './ticket-search.js'; import { wire } from './interactions/alias.js'; const dispose = wire(root); <TicketSearch />;",
      filename: appFile,
      settings: appSettings,
    },
    // A required root-delegated action is satisfied by a reachable handler:
    // a delegateActions table key, or a delegate() selector in the same file.
    {
      code: "import './board-view.js'; import { wireBoard } from './board-actions.js'; const dispose = wireBoard(root);",
      filename: join(appRoot, 'src/wiring-entry.tsx'),
      settings: appSettings,
    },
    {
      code: "import { delegate } from 'kerfjs'; import { BoardCard } from './board-card.js'; const dispose = delegate(root, 'click', '[data-action=\"open-card\"]', () => {}); <BoardCard />;",
      filename: appFile,
      settings: appSettings,
    },
    {
      code: "import { delegateActions } from 'kerfjs/actions'; import { BoardCard } from './board-card.js'; const dispose = delegateActions(root, 'click', { openCard: () => {}, 'open-card': () => {} }); <BoardCard />;",
      filename: appFile,
      settings: appSettings,
    },
    {
      code: "import { TicketSearch } from './ticket-search.js'; import { wireTicketSearch as wire } from './interactions/index.js'; const dispose = wire(root); <TicketSearch />;",
      filename: appFile,
      settings: appSettings,
    },
    {
      code: "import './leaf'; import '@kerfjs/ui/select/register'; import { wireSearchFields } from '@kerfjs/ui/wire-search-fields'; const dispose = wireSearchFields(root);",
      filename: wiringEntry,
      settings: entrySettings,
    },
    {
      code: "import './registration-leaf'; import './registration-init';",
      filename: registrationEntry,
      settings: registrationSettings,
    },
    {
      code: "import { Select } from '@kerfjs/ui'; export const View = () => <Select />;",
      filename: registrationLeaf,
      settings: registrationSettings,
    },
    {
      code: "import { SearchField, Select } from '@kerfjs/ui'; <><SearchField /><Select /></>;",
      filename: wiringLeaf,
      settings: twoEntrySettings,
    },
    {
      code: "import { init } from './init.js'; init();",
      filename: wiringApp,
      settings: rootHelperSettings,
    },
    {
      code: "import { SearchField } from '@kerfjs/ui/search-field'; export const CurrenciesView = () => <SearchField id='currency-filter' />;",
      filename: currencyLeaf,
      settings: rootHelperSettings,
    },
    {
      code: "import { SearchField } from '@kerfjs/ui'; import { wireSearchFields as wire } from '@kerfjs/ui/wire-search-fields'; const dispose = wire(root); <SearchField />;",
      settings,
    },
    {
      code: "import { SearchField } from '@kerfjs/ui'; import { wireSearchFields } from '@kerfjs/ui/wire-search-fields'; void wireSearchFields(root); <SearchField />;",
      settings,
    },
    {
      code: "import { SearchField, wireSearchFields as wire } from '@kerfjs/ui'; const dispose = wire(root); <SearchField />;",
      settings,
    },
    {
      code: "import * as UI from '@kerfjs/ui'; const dispose = UI.wireSearchFields(root); <UI.SearchField />;",
      settings,
    },
    {
      code: "import { SearchField } from '@kerfjs/ui'; import * as Wiring from '@kerfjs/ui/wire-search-fields'; const dispose = Wiring.wireSearchFields(root); <SearchField />;",
      settings,
    },
    {
      code: "import * as Field from '@kerfjs/ui/search-field'; import * as UI from '@kerfjs/ui'; const dispose = UI.wireSearchFields(root); <Field.SearchField />;",
      settings,
    },
    {
      code: "import Select from '@kerfjs/ui/select'; import '@kerfjs/ui/select/register'; <Select />;",
      settings,
    },
  ],
  invalid: [
    {
      code: "import { Pane } from '@kerfjs/ui'; import { wireCatalog } from 'other-ui'; const stop = wireCatalog(root, options); <Pane />;",
      settings: catalogProviderSettings,
      errors: [{ messageId: 'missing' }],
    },
    {
      code: "import { wireTicketSearch } from './interactions/ticket-search.js'; wireTicketSearch(root);",
      filename: join(appRoot, 'src/wiring-start.ts'),
      settings: appSettings,
      errors: [{ messageId: 'cleanup' }],
    },
    {
      code: "import './wiring-view.js'; import './wiring-commented.js';",
      filename: join(appRoot, 'src/wiring-entry.tsx'),
      settings: appSettings,
      errors: [{ messageId: 'missing' }],
    },
    // Only the component's own source (which renders data-action and imports
    // delegate) and a comment mention are reachable: neither is a handler.
    {
      code: "import './board-view.js'; import { wireOther } from './board-actions-other.js'; const dispose = wireOther(root);",
      filename: join(appRoot, 'src/wiring-entry.tsx'),
      settings: appSettings,
      errors: [
        {
          messageId: 'action',
          data: { component: 'karwan-app:board-card', action: 'open-card' },
        },
      ],
    },
    // Naming the action without a Kerf delegation import is not handling it.
    {
      code: "import { BoardCard } from './board-card.js'; const action = 'open-card'; <BoardCard />;",
      filename: appFile,
      settings: appSettings,
      errors: [{ messageId: 'action' }],
    },
    {
      code: "import './wiring-view.js'; import { wireTicketSearch } from './other-interactions.js'; const dispose = wireTicketSearch(root);",
      filename: join(appRoot, 'src/wiring-entry.tsx'),
      settings: appSettings,
      errors: [{ messageId: 'missing' }],
    },
    {
      code: "import { TicketSearch } from './ticket-search.js'; import { wireTicketSearch } from './other-interactions.js'; const dispose = wireTicketSearch(root); <TicketSearch />;",
      filename: appFile,
      settings: appSettings,
      errors: [{ messageId: 'missing' }],
    },
    {
      code: "import('./leaf');",
      filename: wiringEntryTwo,
      settings: twoEntrySettings,
      errors: [{ messageId: 'missing' }, { messageId: 'missing' }],
    },
    {
      code: "import './leaf'; import { wireSearchFields } from '@kerfjs/ui/wire-search-fields'; const dispose = wireSearchFields(root);",
      filename: wiringEntry,
      settings: entrySettings,
      errors: [{ messageId: 'missing' }],
    },
    {
      code: "import './registration-leaf';",
      filename: registrationEntry,
      settings: registrationSettings,
      errors: [{ messageId: 'missing' }],
    },
    {
      code: "import './registration-leaf'; import './registration-unrelated';",
      filename: registrationEntry,
      settings: registrationSettings,
      errors: [{ messageId: 'missing' }],
    },
    {
      code: "import './leaf'; import '@kerfjs/ui/select/register'; import { wireSearchFields } from '@kerfjs/ui/wire-search-fields'; wireSearchFields(root);",
      filename: wiringEntry,
      settings: entrySettings,
      errors: [{ messageId: 'cleanup' }],
    },
    {
      code: "import { SearchField } from '@kerfjs/ui'; <SearchField />;",
      filename: wiringLeaf,
      settings: moduleScopeSettings,
      errors: [{ messageId: 'missing' }],
    },
    {
      code: "import { SearchField } from '@kerfjs/ui'; <SearchField />;",
      settings,
      errors: [{ messageId: 'missing' }],
    },
    {
      code: "import { SearchField } from '@kerfjs/ui'; import { wireSearchFields } from 'other-ui'; const dispose = wireSearchFields(root); <SearchField />;",
      settings,
      errors: [{ messageId: 'missing' }],
    },
    {
      code: "import { SearchField } from '@kerfjs/ui'; import { wireSearchFields } from '@kerfjs/ui/wire-search-fields'; wireSearchFields(root); <SearchField />;",
      settings,
      errors: [{ messageId: 'cleanup' }],
    },
    {
      code: "import Select from '@kerfjs/ui/select'; <Select />;",
      settings,
      errors: [{ messageId: 'missing' }],
    },
  ],
});

tester.run('ui-css-values', cssValues, {
  valid: [
    // KUI-L017 (exceptional shorthand) is a review finding reported by
    // ui-exceptional-shorthands at `warn`; the contract rule stays silent.
    {
      code: 'import { List } from \'@kerfjs/ui\'; <List gap="xl" />;',
      settings,
    },
    {
      code: 'import { List, rem, flex } from \'@kerfjs/ui\'; <List gap="xs" flex={flex(1, 1, rem(20))} />;',
      settings,
    },
    {
      code: "import { List, calc, plus, rem, px } from '@kerfjs/ui'; List({ gap: calc(plus(rem(1), px(2))) });",
      settings,
    },
    {
      code: "import { Skeleton, em } from '@kerfjs/ui'; <Skeleton width={em(12)} />;",
      settings,
    },
    {
      code: "import { Select, uiColor } from '@kerfjs/ui'; <Select choices={[{ label: 'A', value: 'a', color: uiColor('accent') }]} />;",
      settings,
    },
    {
      code: "import { List } from '@kerfjs/ui'; const gap = getGap(); <List gap={gap} />;",
      settings,
    },
    {
      code: 'import { List } from \'other-ui\'; <List gap="12px" />;',
      settings,
    },
    {
      code: "import { Stack, rem } from '@acme/ui'; <Stack gap={rem(1)} />;",
      settings: thirdPartySettings,
    },
    // Helper exports share a catalog entry with a component (`List` ships
    // `flex`/`uiColor`), but a helper is not that component: an object
    // argument whose keys match a contract path must not inherit it.
    {
      code: "import { flex, uiColor } from '@kerfjs/ui'; flex({ gap: '12px', flex: 'grow' }); uiColor({ gap: 'xl' });",
      settings,
    },
    {
      code: "import * as ui from '@kerfjs/ui'; ui.flex({ gap: '12px' });",
      settings,
    },
    {
      code: "import { uiColor } from '@kerfjs/ui/select'; uiColor({ choices: [{ label: 'A', value: 'a', color: 'red' }] });",
      settings,
    },
    // Object-member paths (`iconTile.color`) walk into an object literal; a
    // tone string has no members, and `foreground` takes foreground helpers.
    {
      code: "import { ListItem } from '@kerfjs/ui/list-item'; import { fillColor, foregroundColor, uiColor } from '@kerfjs/ui'; <ListItem label=\"A\" iconTile={{ color: fillColor('#e5484d'), foreground: foregroundColor('white') }} />; <ListItem label=\"B\" iconTile={{ color: uiColor('brand-fill-loud') }} />; <ListItem label=\"C\" iconTile=\"brand\" />;",
      settings: shippedUiSettings,
    },
    // Helpers resolve from ANY `@kerfjs/ui` subpath — the documented
    // `@kerfjs/ui/css-values` path included — by named, aliased, default, or
    // namespace import, exactly as kerf-ui-analyze resolves them.
    {
      code: "import { ListItem } from '@kerfjs/ui/list-item'; import { fillColor, foregroundColor as fg } from '@kerfjs/ui/css-values'; import * as css from '@kerfjs/ui/css-values'; <ListItem label=\"A\" iconTile={{ color: fillColor('#e5484d'), foreground: fg('white') }} />; <ListItem label=\"B\" iconTile={{ color: css.uiColor('brand-fill-loud'), foreground: css.foregroundColor('white') }} />;",
      settings: shippedUiSettings,
    },
    {
      code: "import { List } from '@kerfjs/ui/list'; import { calc, plus, rem, px, flex } from '@kerfjs/ui/css-values'; <List gap={calc(plus(rem(1), px(2)))} flex={flex(1, 1, rem(20))} />;",
      settings: shippedUiSettings,
    },
    // A same-named helper from outside the package (or a package that merely
    // shares the prefix) is not a cataloged helper.
    {
      code: "import { ListItem } from '@kerfjs/ui/list-item'; import { foregroundColor } from 'other-ui/css-values'; import { flex } from '@kerfjs/ui-extras'; <ListItem label=\"A\" iconTile={{ color: foregroundColor('#000') }} />; <ListItem label=\"B\" iconTile={{ color: flex(1) }} />;",
      settings: shippedUiSettings,
    },
  ],
  invalid: [
    {
      code: "import { ListItem } from '@kerfjs/ui/list-item'; import { foregroundColor } from '@kerfjs/ui/css-values'; <ListItem label=\"A\" iconTile={{ color: foregroundColor('#e5484d') }} />;",
      settings: shippedUiSettings,
      errors: [
        {
          message:
            'KUI-L014: `foregroundColor()` produces the wrong grammar for `ListItem.iconTile.color`; use `fillColor()` or `uiColor()` or `colorVar()`.',
        },
      ],
    },
    {
      code: "import { ListItem } from '@kerfjs/ui/list-item'; import { foregroundColor as fg } from '@kerfjs/ui/css-values'; <ListItem label=\"A\" iconTile={{ color: fg('#e5484d') }} />;",
      settings: shippedUiSettings,
      errors: [{ messageId: 'helper' }],
    },
    {
      code: "import { ListItem } from '@kerfjs/ui/list-item'; import * as css from '@kerfjs/ui/css-values'; ListItem({ label: 'A', iconTile: { color: css.foregroundColor('#e5484d') } });",
      settings: shippedUiSettings,
      errors: [{ messageId: 'helper' }],
    },
    {
      code: "import { ChoiceChips } from '@kerfjs/ui/choice-chips'; import { foregroundColor } from '@kerfjs/ui/css-values'; <ChoiceChips choices={[{ label: 'A', value: 'a', swatch: foregroundColor('#000') }]} />;",
      settings: shippedUiSettings,
      errors: [{ messageId: 'helper' }],
    },
    {
      code: "import { List } from '@kerfjs/ui/list'; import { plus, rem, px } from '@kerfjs/ui/css-values'; <List gap={plus(rem(1), px(2))} />;",
      settings: shippedUiSettings,
      errors: [{ messageId: 'expression' }],
    },
    {
      code: "import { List } from '@kerfjs/ui/list'; import * as css from '@kerfjs/ui/css-values'; List({ gap: css.plus(css.rem(1), css.px(2)) });",
      settings: shippedUiSettings,
      errors: [{ messageId: 'expression' }],
    },
    {
      code: "import { ListItemLink } from '@kerfjs/ui/list-item'; import { foregroundColor } from '@kerfjs/ui'; <ListItemLink href=\"/a\" label=\"A\" iconTile={{ color: foregroundColor('#e5484d') }} />;",
      settings: shippedUiSettings,
      errors: [
        {
          message:
            'KUI-L014: `foregroundColor()` produces the wrong grammar for `ListItem.iconTile.color`; use `fillColor()` or `uiColor()` or `colorVar()`.',
        },
      ],
    },
    {
      code: "import { ListActionRow } from '@kerfjs/ui/list-action-row'; import { fillColor } from '@kerfjs/ui'; ListActionRow({ label: 'A', iconTile: { color: fillColor('#000000'), foreground: fillColor('#ffffff') } });",
      settings: shippedUiSettings,
      errors: [{ messageId: 'helper' }],
    },
    {
      code: 'import { List } from \'@kerfjs/ui\'; <List gap="12px" />;',
      settings,
      errors: [{ messageId: 'raw' }],
    },
    {
      code: "import { List } from '@kerfjs/ui'; List({ gap: 'xxs' });",
      settings,
      errors: [{ messageId: 'raw' }],
    },
    {
      code: "import { List, flex } from '@kerfjs/ui'; <List gap={flex(1)} />;",
      settings,
      errors: [{ messageId: 'helper' }],
    },
    {
      code: "import { List, plus, rem, px } from '@kerfjs/ui'; <List gap={plus(rem(1), px(2))} />;",
      settings,
      errors: [{ messageId: 'expression' }],
    },
    {
      code: 'import { ListItem } from \'@kerfjs/ui\'; <ListItem style="color: red" />;',
      settings,
      errors: [{ messageId: 'declarations' }],
    },
    {
      code: "import { ListItem } from '@kerfjs/ui'; const declarations = getStyle(); <ListItem style={declarations} />;",
      settings,
      errors: [{ messageId: 'declarations' }],
    },
    {
      code: "import { Skeleton, uiColor } from '@kerfjs/ui'; <Skeleton width={uiColor('accent')} />;",
      settings,
      errors: [{ messageId: 'helper' }],
    },
    {
      code: "import { Select } from '@kerfjs/ui'; <Select choices={[{ label: 'A', value: 'a', color: '#fff' }]} />;",
      settings,
      errors: [{ messageId: 'raw' }],
    },
    {
      // Pins the full text so every suggested helper stays wrapped in its own
      // balanced pair of backticks.
      code: "import { Select, flex } from '@kerfjs/ui'; <Select choices={[{ label: 'A', value: 'a', color: flex(1) }]} />;",
      settings,
      errors: [
        {
          message:
            'KUI-L014: `flex()` produces the wrong grammar for `Select.choices[].color`; use `uiColor()` or `colorVar()`.',
        },
      ],
    },
    {
      code: "import { Select } from '@kerfjs/ui'; <Select choices={[{ label: 'A', value: 'a', color: 'red' }]} />;",
      settings,
      errors: [
        {
          message:
            'KUI-L013: `Select.choices[].color` uses color grammar; replace raw `red` with `uiColor()` or `colorVar()`.',
        },
      ],
    },
    {
      code: 'import { Stack } from \'@acme/ui\'; <Stack gap="12px" />;',
      settings: thirdPartySettings,
      errors: [{ messageId: 'raw' }],
    },
    // The same shapes still flag through the real component.
    {
      code: "import { List, flex } from '@kerfjs/ui'; flex({ gap: '12px' }); List({ gap: '12px' });",
      settings,
      errors: [{ messageId: 'raw', line: 1, column: 77 }],
    },
    {
      code: "import * as ui from '@kerfjs/ui'; ui.flex({ gap: '12px' }); ui.List({ gap: '13px' });",
      settings,
      errors: [{ messageId: 'raw', column: 76 }],
    },
    {
      code: "import { Select, uiColor } from '@kerfjs/ui/select'; uiColor({ choices: [{ color: 'red' }] }); Select({ choices: [{ color: 'blue' }] });",
      settings,
      errors: [{ messageId: 'raw', column: 124 }],
    },
  ],
});

tester.run('ui-exceptional-shorthands', exceptionalShorthands, {
  valid: [
    {
      code: 'import { List, rem } from \'@kerfjs/ui\'; <List gap="xs" />; <List gap={rem(1)} />;',
      settings,
    },
    // Contract violations belong to ui-css-values, never to the review rule.
    {
      code: 'import { List, flex } from \'@kerfjs/ui\'; <List gap="12px" />; <List gap={flex(1)} />;',
      settings,
    },
    {
      code: 'import { ListItem } from \'@kerfjs/ui\'; <ListItem style="color: red" />;',
      settings,
    },
    {
      code: 'import { List } from \'other-ui\'; <List gap="xl" />;',
      settings,
    },
  ],
  invalid: [
    {
      // Pins the full text: kerf-ui-analyze emits the identical message so
      // kerf-ui-doctor merges the two reports into one review finding.
      code: 'import { List } from \'@kerfjs/ui\'; <List gap="xl" />;',
      settings,
      errors: [
        {
          message:
            'KUI-L017: `xl` is an exceptional shorthand for `List.gap`; prefer `none` or `2xs` or `xs` or `m` or `l` or `px()` or `rem()` or `em()` or `pct()` or `space()` or `lengthVar()` or `calc()` unless the off-scale choice is deliberate.',
        },
      ],
    },
    {
      code: "import { List } from '@kerfjs/ui'; List({ gap: 's' });",
      settings,
      errors: [{ messageId: 'exceptional' }],
    },
  ],
});

console.log('ui-contracts: OK');
