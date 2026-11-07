// An application workspace shared by the UI-contract rule tests, written to a
// temporary directory when this module is first imported.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { uiSettings } from './ui-contract-fixture.js';

// An application workspace whose profile declares its own component catalog
// and a third-party one, so wrapper components resolve like they would in a
// real app: relative imports by source file, bare imports by package subpath.
export const appRoot = mkdtempSync(join(tmpdir(), 'kerf-renders-as-'));
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
    wrapper('review-pane', 'ReviewPane', undefined, {
      publicExports: [{ name: 'ReviewPane' }],
      wiring: {
        required: true,
        helpers: ['mountReview'],
        sources: [
          {
            export: 'mountReview',
            source: 'src/interactions/review.ts',
            returnsDisposer: false,
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
  wiring: { entries: ['src/wiring-entry.tsx', 'src/review-entry.tsx'] },
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
  'src/interactions/review.ts',
  'export function mountReview(): void {}\n',
);
writeSource(
  'src/interactions/review-index.ts',
  "export { mountReview as startReview } from './review.js';\n",
);
writeSource(
  'src/review-view.tsx',
  "import { ReviewPane } from './review-pane.js'; export const View = () => <ReviewPane />;\n",
);
writeSource(
  'src/review-entry.tsx',
  "import './review-view.js'; import { startReview } from './interactions/review-index.js'; startReview();\n",
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
export const appSettings = uiSettings({
  profile: undefined,
  workspaceRoot: appRoot,
  // The package-defaults layer an installed @kerfjs/ui would supply.
  profileDefaultsPath: join(
    import.meta.dirname,
    '../../../ui/ai/application-ui-profile.defaults.json',
  ),
});
export const appFile = join(appRoot, 'src/view.tsx');
export const appCase = (code, extra = {}) => ({
  code: `import { Toolbar, ToolbarControlGroup, SegmentedControl } from '@kerfjs/ui'; ${code}`,
  filename: appFile,
  settings: appSettings,
  ...extra,
});
