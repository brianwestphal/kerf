import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  componentOwnershipFacts,
  configurationFor,
  type OwnershipCatalogEntry,
  privateVariableOwner,
  reportGap,
  restyledComponents,
  typedPropForToken,
} from '../../analyzer/component-ownership.mjs';
import { analyzeUiProject } from '../../analyzer/index.mjs';

const composition = JSON.parse(
  await readFile(
    resolve(import.meta.dirname, '../../ai/component-composition.json'),
    'utf8',
  ),
) as { entries: OwnershipCatalogEntry[] };
const facts = componentOwnershipFacts(composition.entries);
const foreign = () => true;
const restyled = (selector: string) =>
  restyledComponents(selector, facts, foreign).map(
    ({ entry, via, name }) => `${entry.key} ${via} ${name}`,
  );

describe('downstream component ownership rules', () => {
  it('reports a selector whose subject is a cataloged component', () => {
    expect(restyled('.kui-toolbar')).toEqual([
      '@kerfjs/ui:toolbar class .kui-toolbar',
    ]);
    expect(restyled('.shell .kui-list-item:hover')).toEqual([
      '@kerfjs/ui:list-item class .kui-list-item',
    ]);
    expect(restyled('.kui-toolbar__leading::before')).toEqual([
      '@kerfjs/ui:toolbar class .kui-toolbar__leading',
    ]);
    expect(restyled('[data-component="pane"]')).toEqual([
      '@kerfjs/ui:pane data-component [data-component="pane"]',
    ]);
    expect(restyled(':is(.kui-row, .app-row)')).toEqual([
      '@kerfjs/ui:row class .kui-row',
    ]);
    expect(restyled('wa-button')).toEqual([
      '@kerfjs/ui:wa-button tag wa-button',
    ]);
    // Excluding the kerf Select still leaves a themed Web Awesome component.
    expect(restyled('.app wa-select:not(.kui-select)')).toEqual([
      '@kerfjs/ui:wa-select tag wa-select',
    ]);
  });

  it('allows an application element styled in a component context', () => {
    expect(restyled('.kui-toolbar > .my-widget')).toEqual([]);
    expect(restyled('.kui-pane .my-empty-copy')).toEqual([]);
    expect(restyled('.shell:has(> .kui-select[open])')).toEqual([]);
    expect(restyled('.list > :not(.kui-list-item)')).toEqual([]);
    // An application class scopes a Web Awesome tag to the app's own element.
    expect(restyled('wa-button.my-save')).toEqual([]);
    // Shadow parts belong to the part rule (KUI-L011).
    expect(restyled('wa-dialog::part(body)')).toEqual([]);
    expect(restyled('.app-panel')).toEqual([]);
  });

  it('catches raw descendants of cataloged anatomy without treating app content as component-owned', () => {
    expect(
      restyled('.ticket-inspector__tabs .kui-app-tab__select > svg'),
    ).toEqual(['@kerfjs/ui:tabs descendant .kui-app-tab__select']);
    expect(restyled('.kui-app-tab__select svg path')).toEqual([
      '@kerfjs/ui:tabs descendant .kui-app-tab__select',
    ]);
    expect(restyled('.kui-app-tab__select > .app-icon')).toEqual([]);
    expect(restyled('.kui-app-tab__select .app-icon > svg')).toEqual([]);
    expect(restyled('.kui-app-tab > svg')).toEqual([]);
    expect(restyled('.kui-app-tab__select:has(> svg)')).toEqual([
      '@kerfjs/ui:tabs class .kui-app-tab__select',
    ]);
    expect(
      restyledComponents('.kui-app-tab__select > svg', facts, () => false),
    ).toEqual([]);
  });

  it('never reports a component the stylesheet itself owns', () => {
    expect(restyledComponents('.kui-toolbar', facts, () => false)).toHaveLength(
      0,
    );
  });

  it('names private variables after their component', () => {
    expect(privateVariableOwner('--_kui-list-gap', facts)?.key).toBe(
      '@kerfjs/ui:list',
    );
    expect(
      privateVariableOwner('--_kui-toolbar-control-group-slot', facts)?.key,
    ).toBe('@kerfjs/ui:toolbar-control-group');
    // A reserved kerf prefix with no cataloged owner is still kerf's.
    expect(privateVariableOwner('--_kui-floating-covered', facts)).toBeNull();
    expect(privateVariableOwner('--_app-gap', facts)).toBeUndefined();
    expect(privateVariableOwner('--kui-list-gap', facts)).toBeUndefined();
  });

  it('maps a component token to the typed prop that sets it', () => {
    expect(typedPropForToken('--kui-list-gap', facts)).toMatchObject({
      entry: { key: '@kerfjs/ui:list' },
      path: 'gap',
    });
    expect(typedPropForToken('--kui-floating-toolbar-inset', facts)?.path).toBe(
      'inset',
    );
    expect(typedPropForToken('--kui-disclosure-arrow-size', facts)?.path).toBe(
      'size',
    );
    expect(
      typedPropForToken('--kui-list-divider-color', facts),
    ).toBeUndefined();
    expect(typedPropForToken('--kui-color-surface', facts)).toBeUndefined();
  });

  it('points each finding at configuration and the component-gap route', () => {
    const list = composition.entries.find(
      (entry) => entry.key === '@kerfjs/ui:list',
    );
    expect(configurationFor(list)).toContain('`gap`');
    expect(configurationFor(list)).toContain('`--kui-list-divider-color`');
    expect(configurationFor(undefined)).toBe(
      'its documented props and variants',
    );
    expect(reportGap(list)).toBe(
      'If no configuration covers this need, report the component gap to @kerfjs/ui (open a feature request) instead of overriding it.',
    );
  });
});

async function project(files: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), 'kerf-ui-ownership-'));
  for (const [path, source] of Object.entries(files)) {
    await mkdir(join(root, path, '..'), { recursive: true });
    await writeFile(join(root, path), source);
  }
  return root;
}

const ids = (report: Awaited<ReturnType<typeof analyzeUiProject>>) =>
  report.diagnostics.map(
    (item) => `${item.ruleId} ${item.location.file}:${item.location.line}`,
  );

describe('kerf-ui-analyze component ownership diagnostics', () => {
  it('derives selection-only BEM ownership from rendered classes and own styles', async () => {
    const root = await project({
      'package.json': JSON.stringify({ name: 'app' }),
      '.kerf-ui-profile.json': JSON.stringify({
        schemaVersion: 1,
        scope: 'workspace',
        catalogs: [
          {
            package: 'app',
            composition: { path: './composition.json', schemaVersion: 2 },
            selection: { path: './selection.json', schemaVersion: 1 },
          },
        ],
      }),
      'composition.json': JSON.stringify({
        schemaVersion: 2,
        package: 'app',
        entries: [],
      }),
      'selection.json': JSON.stringify({
        schemaVersion: 1,
        package: 'app',
        entries: [
          {
            id: 'ticket-row',
            name: 'TicketRow',
            source: 'src/ticket-row.tsx',
          },
        ],
      }),
      'src/ticket-row.tsx':
        'import \'./ticket-row.css\';\nexport const TicketRow = () => <article class="ticket-row ticket-row__title" />;\n',
      'src/ticket-row.css': '.ticket-row { color: blue; }\n',
      'src/header.css':
        '.ticket-row__title { color: red; }\n.unrelated__title { color: red; }\n',
    });
    expect(ids(await analyzeUiProject({ root }))).toEqual([]);
    expect(
      ids(await analyzeUiProject({ root, ownership: 'component' })),
    ).toEqual(['KUI-L019 src/header.css:1']);
  });

  it('can opt in to source modules as implicit owners without a catalog entry', async () => {
    const root = await project({
      'package.json': JSON.stringify({ name: 'app' }),
      'src/shell.tsx':
        'import \'./shell.css\';\nexport const Shell = () => <main class="app-shell app-shell__pane" />;\n',
      'src/shell.css': '.app-shell { color: blue; }\n',
      'src/other.css': '.app-shell__pane { color: red; }\n',
    });
    expect(
      ids(await analyzeUiProject({ root, ownership: 'component' })),
    ).toEqual([]);
    expect(
      ids(
        await analyzeUiProject({
          root,
          ownership: 'component',
          implicitComponentOwnership: true,
        }),
      ),
    ).toEqual(['KUI-L019 src/other.css:1']);
  });

  it('extends a composition entry beyond its enumerated root class', async () => {
    const root = await project({
      'package.json': JSON.stringify({ name: 'app' }),
      '.kerf-ui-profile.json': JSON.stringify({
        schemaVersion: 1,
        scope: 'workspace',
        catalogs: [
          {
            package: 'app',
            composition: { path: './composition.json', schemaVersion: 2 },
            selection: { path: './selection.json', schemaVersion: 1 },
          },
        ],
      }),
      'composition.json': JSON.stringify({
        schemaVersion: 2,
        package: 'app',
        entries: [
          {
            key: 'app:ticket-row',
            package: 'app',
            id: 'ticket-row',
            name: 'TicketRow',
            kind: 'component',
            source: 'application',
            boundaries: {
              rootClass: 'ticket-row',
              publicClasses: ['ticket-row'],
              publicTokens: [],
            },
          },
        ],
      }),
      'selection.json': JSON.stringify({
        schemaVersion: 1,
        package: 'app',
        entries: [
          {
            id: 'ticket-row',
            source: 'src/ticket-row.tsx',
            styleSources: ['src/ticket-row.css'],
          },
        ],
      }),
      'src/ticket-row.tsx':
        'export const TicketRow = () => <article className="ticket-row ticket-row__title ticket-row--selected" />;\n',
      'src/ticket-row.css': '.ticket-row { color: blue; }\n',
      'src/other.css':
        '.ticket-row__title { color: red; }\n.ticket-row--selected { color: red; }\n',
    });
    expect(
      ids(await analyzeUiProject({ root, ownership: 'component' })),
    ).toEqual(['KUI-L019 src/other.css:1', 'KUI-L019 src/other.css:2']);
  });

  it('resolves exact and wildcard TypeScript path aliases to cataloged component sources', async () => {
    const root = await project({
      'package.json': JSON.stringify({ name: 'app' }),
      'tsconfig.base.json': JSON.stringify({
        compilerOptions: {
          moduleResolution: 'bundler',
          module: 'esnext',
          baseUrl: '.',
          paths: {
            '@search': ['src/search.tsx'],
            '@app/*': ['src/*'],
          },
        },
      }),
      'tsconfig.json': JSON.stringify({ extends: './tsconfig.base.json' }),
      '.kerf-ui-profile.json': JSON.stringify({
        schemaVersion: 1,
        scope: 'workspace',
        catalogs: [
          {
            package: 'app',
            composition: { path: './composition.json', schemaVersion: 2 },
            selection: { path: './selection.json', schemaVersion: 1 },
          },
        ],
      }),
      'composition.json': JSON.stringify({
        schemaVersion: 2,
        package: 'app',
        entries: [
          {
            key: 'app:search',
            package: 'app',
            id: 'search',
            name: 'Search',
            kind: 'component',
            source: 'application',
            boundaries: {
              rootClass: 'search',
              publicClasses: ['search'],
              publicTokens: [],
            },
          },
        ],
      }),
      'selection.json': JSON.stringify({
        schemaVersion: 1,
        package: 'app',
        entries: [
          {
            id: 'search',
            source: 'src/search.tsx',
            styleSources: ['src/search.css'],
          },
        ],
      }),
      'src/search.tsx': 'export const Search = () => <div class="search" />;\n',
      'src/search.css': '.search { color: blue; }\n',
      'src/header.css': '.hook { color: red; }\n',
      'src/isolated/tsconfig.json': JSON.stringify({
        compilerOptions: {
          moduleResolution: 'bundler',
          module: 'esnext',
          baseUrl: '.',
          paths: { '@app/*': ['missing/*'] },
        },
      }),
      'src/isolated/header.tsx':
        "import '../header.css';\nimport { Search } from '@app/search';\nexport const Header = () => <Search className=\"hook\" />;\n",
      'src/header.tsx': [
        "import './header.css';",
        "import { Search as Exact } from '@search';",
        "import * as Widgets from '@app/search';",
        "import { Search as Unknown } from '@missing/search';",
        'export const Header = () => <><Exact className="hook" /><Widgets.Search className="hook" /><Unknown className="hook" /></>;',
        '',
      ].join('\n'),
    });
    const report = await analyzeUiProject({ root, ownership: 'component' });
    expect(ids(report)).toEqual([
      'KUI-L022 src/header.tsx:5',
      'KUI-L022 src/header.tsx:5',
    ]);
    expect(report.diagnostics.map((item) => item.evidence)).toMatchObject([
      { component: 'app:search' },
      { component: 'app:search' },
    ]);
  });

  it('optionally enforces ownership between components in one package', async () => {
    const entry = (id: string) => ({
      key: `app:${id}`,
      package: 'app',
      id,
      name: id === 'search' ? 'Search' : 'Sort',
      kind: 'component',
      source: 'application',
      boundaries: {
        rootClass: id,
        publicClasses: [id, `${id}__input`],
        publicTokens: [],
      },
    });
    const root = await project({
      'package.json': JSON.stringify({ name: 'app' }),
      '.kerf-ui-profile.json': JSON.stringify({
        schemaVersion: 1,
        scope: 'workspace',
        catalogs: [
          {
            package: 'app',
            composition: { path: './composition.json', schemaVersion: 2 },
            selection: { path: './selection.json', schemaVersion: 1 },
          },
        ],
      }),
      'composition.json': JSON.stringify({
        schemaVersion: 2,
        package: 'app',
        entries: [entry('search'), entry('sort')],
      }),
      'selection.json': JSON.stringify({
        schemaVersion: 1,
        package: 'app',
        entries: [
          {
            id: 'search',
            source: 'src/search.tsx',
            styleSources: ['src/search.css'],
          },
          {
            id: 'sort',
            source: 'src/sort.tsx',
            styleSources: ['src/sort.css'],
          },
        ],
      }),
      'src/search.css': '.search { color: blue; }\n.sort { color: red; }\n',
      'src/sort.css': '.sort { color: blue; }\n',
      'src/header.css': '.my-search { color: red; }\n',
      'src/header.tsx':
        "import './header.css';\nimport { Search } from './search.js';\nexport const Header = () => <Search className=\"my-search\" />;\n",
      'src/search.tsx': 'export const Search = () => <div class="search" />;\n',
      'src/sort.tsx': 'export const Sort = () => <div class="sort" />;\n',
    });
    expect(ids(await analyzeUiProject({ root }))).toEqual([]);
    expect(
      ids(await analyzeUiProject({ root, ownership: 'component' })),
    ).toEqual(['KUI-L022 src/header.tsx:3', 'KUI-L019 src/search.css:2']);
  });

  it('rejects application CSS that restyles, overrides, or hooks a component', async () => {
    const root = await project({
      'src/app.css': [
        '.kui-toolbar { padding: 0; }',
        '[data-component="pane"] { border: 0; }',
        'wa-button { border-radius: 0; }',
        '.app { --_kui-list-gap: 2px; }',
        '.app { --kui-list-gap: 4px; }',
        '.my-toolbar { background: red; }',
        '',
      ].join('\n'),
      'src/app.tsx': `import './app.css';
import { Toolbar } from '@kerfjs/ui/toolbar';
export const App = () => <Toolbar className="my-toolbar" />;
`,
    });
    const report = await analyzeUiProject({ root });

    expect(ids(report)).toEqual([
      'KUI-L019 src/app.css:1',
      'KUI-L019 src/app.css:2',
      'KUI-L019 src/app.css:3',
      'KUI-L020 src/app.css:4',
      'KUI-L021 src/app.css:5',
      'KUI-L022 src/app.tsx:3',
    ]);
    for (const item of report.diagnostics) {
      expect(item.severity).toBe('error');
      expect(item.message).toContain('report the component gap');
    }
    expect(report.diagnostics[4].message).toContain('`<List gap="xs" />`');
    expect(report.diagnostics[5].evidence).toMatchObject({
      component: '@kerfjs/ui:toolbar',
      className: 'my-toolbar',
      stylesheet: 'src/app.css',
      line: 6,
    });
    expect(JSON.stringify(report)).not.toContain(tmpdir());
  });

  it('reports a downstream override of raw AppTab anatomy in CSS', async () => {
    const root = await project({
      'src/ticket-inspector.css': [
        '.ticket-inspector__tabs .kui-app-tab__select > svg { width: 0.9rem; height: 0.9rem; }',
        '.ticket-inspector__tabs .kui-app-tab__select > .app-icon { width: 0.9rem; }',
        '',
      ].join('\n'),
    });
    const report = await analyzeUiProject({ root });
    const findings = report.diagnostics.filter(
      ({ ruleId }) => ruleId === 'KUI-L019',
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      location: { file: 'src/ticket-inspector.css', line: 1 },
      evidence: {
        component: '@kerfjs/ui:tabs',
        via: 'descendant',
        target: '.kui-app-tab__select',
        properties: ['width', 'height'],
      },
    });
  });

  it('accepts own elements in a component context, theming, and token configuration', async () => {
    const root = await project({
      'src/app.css': [
        '.kui-toolbar > .my-widget { margin-inline-start: auto; }',
        '.shell:has(.kui-select[open]) .my-status { opacity: 0.5; }',
        '.kui-list { --kui-list-divider-color: var(--kui-color-neutral-border-quiet); }',
        ':root { --kui-color-surface: white; }',
        '.my-wrapper { padding: 8px; }',
        '@keyframes fade { from { opacity: 0; } }',
        '',
      ].join('\n'),
      'src/app.tsx': `import './app.css';
import { Toolbar } from '@kerfjs/ui/toolbar';
export const App = () => (
  <div class="my-wrapper">
    <Toolbar className="my-toolbar" />
  </div>
);
`,
    });
    const report = await analyzeUiProject({ root });

    expect(
      report.diagnostics.filter(({ ruleId }) =>
        ['KUI-L019', 'KUI-L020', 'KUI-L021', 'KUI-L022'].includes(ruleId),
      ),
    ).toEqual([]);
  });

  it('reports ownership findings as review under --adoption', async () => {
    const root = await project({
      'src/app.css':
        '.kui-toolbar { padding: 0; }\n.app { --_kui-list-gap: 0; }\n',
    });
    const report = await analyzeUiProject({ root, adoption: true });

    expect(report.diagnostics).toEqual([
      expect.objectContaining({ ruleId: 'KUI-L019', severity: 'review' }),
      expect.objectContaining({ ruleId: 'KUI-L020', severity: 'review' }),
    ]);
    expect(report.summary.errors).toBe(0);
  });

  it('reports a forced component dimension once, as KUI-L019, and never for an ancestor', async () => {
    // KUI-L005 ('Forced component dimension') is retired: the component
    // subject reports once through KUI-L019, and a public class that is only
    // an ancestor sizes the application's own element, which is allowed.
    const root = await project({
      'src/app.css': [
        '.kui-pane { width: 300px; }',
        '.kui-state-banner { min-height: 44px; max-width: 40rem; }',
        '.kui-pane .app-sidebar { width: 240px; }',
        '.kui-toolbar > .my-widget { height: 32px; }',
        '',
      ].join('\n'),
    });
    const report = await analyzeUiProject({ root });

    expect(ids(report)).toEqual([
      'KUI-L019 src/app.css:1',
      'KUI-L019 src/app.css:2',
    ]);
    expect(report.diagnostics[1].evidence).toMatchObject({
      properties: ['min-height', 'max-width'],
    });
    expect(report.diagnostics.some(({ ruleId }) => ruleId === 'KUI-L005')).toBe(
      false,
    );

    const adoption = await analyzeUiProject({ root, adoption: true });
    expect(
      adoption.diagnostics.map(({ ruleId, severity }) => [ruleId, severity]),
    ).toEqual([
      ['KUI-L019', 'review'],
      ['KUI-L019', 'review'],
    ]);
  });

  it('still loads a profile exception that names the retired KUI-L005', async () => {
    const root = await project({
      '.kerf-ui-profile.json': JSON.stringify({
        schemaVersion: 1,
        scope: 'workspace',
        exceptions: [
          {
            id: 'legacy-sizing',
            rules: ['KUI-L005'],
            target: 'src/app.css',
            rationale: 'Written before KUI-L005 was folded into KUI-L019.',
          },
        ],
      }),
      'src/app.css': '.app { color: red; }\n',
    });
    const report = await analyzeUiProject({ root });

    expect(report.diagnostics).toEqual([]);
  });

  it('lets a component package style its own components in a kerf parent context', async () => {
    const acmeCatalog = {
      schemaVersion: 2,
      package: '@acme/widgets',
      entries: [
        {
          key: '@acme/widgets:meter',
          package: '@acme/widgets',
          id: 'meter',
          name: 'Meter',
          kind: 'component',
          source: 'src/meter.tsx',
          styleSources: ['src/meter.css'],
          publicExports: [{ name: 'Meter', subpath: '.' }],
          boundaries: {
            rootClass: 'acme-meter',
            publicClasses: ['acme-meter'],
            publicTokens: ['--acme-meter-gap'],
          },
          cssValueProps: [
            {
              path: 'gap',
              grammar: 'length',
              helpers: ['rem'],
              shorthands: ['s'],
              canonicalShorthands: ['s'],
              exceptionalShorthands: [],
              rawPolicy: 'forbid',
              examples: ['gap="s"'],
            },
          ],
        },
      ],
    };
    const profile = JSON.stringify({
      schemaVersion: 1,
      scope: 'workspace',
      catalogs: [
        {
          package: '@acme/widgets',
          composition: {
            path: './packages/widgets/component-composition.json',
            schemaVersion: 2,
          },
        },
      ],
    });
    const root = await project({
      '.kerf-ui-profile.json': profile,
      'packages/widgets/package.json': JSON.stringify({
        name: '@acme/widgets',
      }),
      'packages/widgets/component-composition.json':
        JSON.stringify(acmeCatalog),
      // The package's own stylesheet: itself, in a kerf parent's context, with
      // its own private variables and its own public token.
      'packages/widgets/src/meter.css': [
        '.acme-meter { --_acme-meter-gap: var(--acme-meter-gap, 8px); gap: var(--_acme-meter-gap); }',
        '.kui-toolbar > .acme-meter { --_acme-meter-gap: 4px; }',
        '.acme-meter { --acme-meter-gap: 8px; }',
        '',
      ].join('\n'),
      // An application restyling the package's component.
      'apps/web/package.json': JSON.stringify({ name: 'web' }),
      'apps/web/src/app.css': [
        '.acme-meter { color: red; }',
        '.app { --_acme-meter-gap: 2px; --acme-meter-gap: 2px; }',
        '',
      ].join('\n'),
    });
    const report = await analyzeUiProject({ root });

    expect(ids(report)).toEqual([
      'KUI-L019 apps/web/src/app.css:1',
      'KUI-L020 apps/web/src/app.css:2',
      'KUI-L021 apps/web/src/app.css:2',
    ]);
    expect(report.diagnostics[0].message).toContain(
      'report the component gap to @acme/widgets',
    );
    expect(report.diagnostics[2].message).toContain('`<Meter gap="s" />`');
    expect(
      ids(await analyzeUiProject({ root, ownership: 'component' })),
    ).toEqual(ids(report));
  });
});
