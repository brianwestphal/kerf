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
      code: "import * as UI from '@kerfjs/ui'; const alternate = true; <UI.TabBar>{alternate ? <UI.AppTab /> : [<UI.AppTab />, <UI.AppTab />]}</UI.TabBar>;",
      settings,
    },
    {
      code: "import { TabBar as Tabs } from '@kerfjs/ui/tab-bar'; import { AppTab as Tab } from '@kerfjs/ui/app-tab'; const ready = true; <Tabs>{ready && <Tab />}</Tabs>;",
      settings,
    },
    {
      code: "import { SplitView } from '@kerfjs/ui'; const list = getList(); const detail = getDetail(); <SplitView list={list} detail={detail} />;",
      settings,
    },
  ],
  invalid: [
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
      code: "import { AppTab, LucideIcon } from '@kerfjs/ui'; <div><AppTab closeIcon={<><LucideIcon /><LucideIcon /></>} /></div>;",
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
    wrapper('demand-segments-control', 'DemandSegmentsControl', [
      '@kerfjs/ui:toolbar-control-group',
    ]),
    wrapper('view-segmented-control', 'ViewSegmentedControl', [
      '@kerfjs/ui:toolbar-control-group',
      '@kerfjs/ui:toolbar-text',
    ]),
    wrapper('title-text', 'TitleText', ['@kerfjs/ui:toolbar-text']),
    wrapper('app-toolbar', 'AppToolbar', ['@kerfjs/ui:toolbar']),
    wrapper('status-chip', 'StatusChip', ['@kerfjs/ui:segmented-control']),
    wrapper('plain-widget', 'PlainWidget'),
    // A private, bundled application declares an export by name alone: it
    // resolves through its source file, never through a package subpath.
    wrapper(
      'source-only-group',
      'SourceOnlyGroup',
      ['@kerfjs/ui:toolbar-control-group'],
      { publicExports: [{ name: 'SourceOnlyGroup' }] },
    ),
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
    // The rendered ToolbarControlGroup still needs a Toolbar parent.
    appCase(
      "import { DemandSegmentsControl } from './demand-segments-control.js'; <div><DemandSegmentsControl /></div>;",
      { errors: [{ messageId: 'parent' }] },
    ),
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
];

tester.run('ui-preferences discouraged Web Awesome tags', preferences, {
  valid: [
    // Supported Web Awesome elements and the one encouraged conditional
    // primitive stay allowed.
    ...['wa-button', 'wa-popup', 'wa-dialog', 'wa-input'].map((tag) => ({
      code: `<div><${tag} /></div>;`,
      filename: appFile,
      settings: shippedDefaultsSettings,
    })),
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
      code: "import { TokenSearchField } from '@kerfjs/ui'; import { wireTokenSearchFields as wire } from '@kerfjs/ui/wire-token-search-fields'; const dispose = wire(root); <TokenSearchField />;",
      settings,
    },
    {
      code: "import { TokenSearchField } from '@kerfjs/ui'; import { wireTokenSearchFields } from '@kerfjs/ui/wire-token-search-fields'; void wireTokenSearchFields(root); <TokenSearchField />;",
      settings,
    },
    {
      code: "import { TokenSearchField, wireTokenSearchFields as wire } from '@kerfjs/ui'; const dispose = wire(root); <TokenSearchField />;",
      settings,
    },
    {
      code: "import * as UI from '@kerfjs/ui'; const dispose = UI.wireTokenSearchFields(root); <UI.TokenSearchField />;",
      settings,
    },
    {
      code: "import { TokenSearchField } from '@kerfjs/ui'; import * as Wiring from '@kerfjs/ui/wire-token-search-fields'; const dispose = Wiring.wireTokenSearchFields(root); <TokenSearchField />;",
      settings,
    },
    {
      code: "import * as Field from '@kerfjs/ui/token-search-field'; import * as UI from '@kerfjs/ui'; const dispose = UI.wireTokenSearchFields(root); <Field.TokenSearchField />;",
      settings,
    },
    {
      code: "import Select from '@kerfjs/ui/select'; import '@kerfjs/ui/select/register'; <Select />;",
      settings,
    },
  ],
  invalid: [
    {
      code: "import { TokenSearchField } from '@kerfjs/ui'; <TokenSearchField />;",
      settings,
      errors: [{ messageId: 'missing' }],
    },
    {
      code: "import { TokenSearchField } from '@kerfjs/ui'; import { wireTokenSearchFields } from 'other-ui'; const dispose = wireTokenSearchFields(root); <TokenSearchField />;",
      settings,
      errors: [{ messageId: 'missing' }],
    },
    {
      code: "import { TokenSearchField } from '@kerfjs/ui'; import { wireTokenSearchFields } from '@kerfjs/ui/wire-token-search-fields'; wireTokenSearchFields(root); <TokenSearchField />;",
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
  ],
  invalid: [
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
      code: 'import { List } from \'@kerfjs/ui\'; <List gap="xl" />;',
      settings,
      errors: [{ messageId: 'exceptional' }],
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

console.log('ui-contracts: OK');
