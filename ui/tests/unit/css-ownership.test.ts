import { execFile } from 'node:child_process';
import { access, readdir, readFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import { execPath } from 'node:process';
import { promisify } from 'node:util';

import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

import {
  applyExceptions,
  buildOwnershipModel,
  checkPackageStylesheet,
  ownershipExceptions,
} from '../../scripts/lib/css-ownership.mjs';

const execFileAsync = promisify(execFile);
const uiRoot = resolve(import.meta.dirname, '../..');

async function cssFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) return cssFiles(path);
      return entry.name.endsWith('.css') ? [path] : [];
    }),
  );
  return files.flat();
}

function ownsClass(rootClass: string, candidate: string) {
  return (
    candidate === rootClass ||
    candidate.startsWith(`${rootClass}__`) ||
    candidate.startsWith(`${rootClass}--`)
  );
}

function ownedMarkupClasses(source: string) {
  const owned = new Set<string>();
  for (const match of source.matchAll(
    /<([a-z][a-z0-9-]*)\b[^>]*?\bclass\s*=\s*(?:["']([^"']+)["']|\{`([^`]+)`[^}]*\})/gi,
  )) {
    if (match[1].startsWith('wa-')) continue;
    for (const classMatch of (match[2] ?? match[3] ?? '').matchAll(
      /\b(kui-catalog[a-z0-9_-]*)\b/gi,
    ))
      owned.add(classMatch[1]);
  }
  return owned;
}

describe('CSS ownership gate', { timeout: 30_000 }, () => {
  it('keeps the TabNavigator source rename paired with its stable DOM class', () => {
    const filename = 'components/navigation/tab-navigator/tab-navigator.css';
    const css =
      '.kui-tab-scaffold__scene { --_kui-tab-scaffold-safe-block-start: 0px; }';
    const model = buildOwnershipModel({
      stylesheets: [{ filename, source: css }],
      sources: [
        {
          filename: 'components/navigation/tab-navigator/tab-navigator.tsx',
          source:
            'export function TabNavigator() { return <section class="kui-tab-scaffold" data-component="tab-scaffold" />; }',
        },
      ],
    });

    expect(checkPackageStylesheet(model, filename, css)).toEqual([]);
  });

  it('keeps application styles out of package component internals', async () => {
    const script = resolve(
      import.meta.dirname,
      '../../scripts/check-css-ownership.mjs',
    );
    const { stdout } = await execFileAsync(execPath, [script]);

    expect(stdout).toContain('[check-css-ownership] OK');
  });

  it('keeps catalog entrypoints thin and every catalog stylesheet paired with its component', async () => {
    const entrypoint = await readFile(
      resolve(uiRoot, 'src/catalog.tsx'),
      'utf8',
    );
    const statements = entrypoint
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .split(';')
      .map((statement) => statement.trim())
      .filter(Boolean);
    expect(statements.length).toBeGreaterThan(0);
    expect(
      statements.every((statement) =>
        /^export\s+(?:type\s+)?(?:\*|\{[\s\S]*\})\s+from\s+['"]\.\/catalog\/[a-z0-9./-]+\.js['"]$/i.test(
          statement,
        ),
      ),
    ).toBe(true);

    const compatibilityCss = postcss.parse(
      await readFile(resolve(uiRoot, 'src/catalog.css'), 'utf8'),
    );
    expect(
      compatibilityCss.nodes
        .filter((node) => node.type !== 'comment')
        .every((node) => node.type === 'atrule' && node.name === 'import'),
    ).toBe(true);

    await expect(
      access(resolve(uiRoot, 'src/catalog-component.css')),
    ).rejects.toThrow();

    const componentDirectory = resolve(uiRoot, 'src/catalog/components');
    const entries = await readdir(componentDirectory, { withFileTypes: true });
    const componentNames = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.tsx'))
      .map((entry) => basename(entry.name, '.tsx'));
    const stylesheetNames = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.css'))
      .map((entry) => basename(entry.name, '.css'));
    expect(componentNames.length).toBeGreaterThan(0);
    // Every stylesheet pairs with a component; a component composed purely
    // from kerf ui components (the dogfooding default) has none.
    for (const name of stylesheetNames) expect(componentNames).toContain(name);
    for (const componentName of componentNames) {
      const expectedComponent = componentName
        .split('-')
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join('');
      const source = await readFile(
        resolve(componentDirectory, `${componentName}.tsx`),
        'utf8',
      );
      const declaredComponents = [
        ...source.matchAll(/\bfunction\s+([A-Z][A-Za-z0-9]*)\s*\(/g),
      ].map(([, name]) => name);
      expect(
        declaredComponents.filter((name) => name !== expectedComponent),
      ).toEqual([]);
    }
  });

  it('keeps demo and recipe styles with their same-basename owners', async () => {
    for (const aggregate of [
      'demos/demo-components.css',
      'recipes/recipe-components.css',
      'recipes/recipes.css',
    ]) {
      await expect(
        access(resolve(uiRoot, 'ux-demo', aggregate)),
      ).rejects.toThrow();
    }

    for (const stylesheet of await cssFiles(resolve(uiRoot, 'ux-demo'))) {
      if (stylesheet === resolve(uiRoot, 'ux-demo/style.css')) continue;
      const componentSource = stylesheet.replace(/\.css$/, '.tsx');
      const source = await readFile(componentSource, 'utf8');
      const stylesheetName = basename(stylesheet);
      expect(source).toMatch(
        new RegExp(
          `import\\s+["']\\./${stylesheetName.replace('.', '\\.')}["']`,
        ),
      );
    }
  });

  it('limits each catalog component stylesheet to its same-name class root', async () => {
    const componentDirectory = resolve(uiRoot, 'src/catalog/components');
    const entries = await readdir(componentDirectory, { withFileTypes: true });
    const stylesheets = entries
      .filter((entry) => entry.isFile() && extname(entry.name) === '.css')
      .map((entry) => resolve(componentDirectory, entry.name));
    const claimedRoots = new Set<string>();

    for (const stylesheet of stylesheets) {
      const componentName = basename(stylesheet, '.css');
      const componentSource = await readFile(
        resolve(componentDirectory, `${componentName}.tsx`),
        'utf8',
      );
      const markupRoots = ownedMarkupClasses(componentSource);
      const source = await readFile(stylesheet, 'utf8');
      const allowedRoots = new Set(markupRoots);
      for (const match of source.matchAll(
        /css-ownership:\s*allow-root\s+\.?((?:kui)-[a-z0-9_-]+)\s+--\s+([^*\n]{20,})/gi,
      ))
        allowedRoots.add(match[1]);

      for (const rootClass of allowedRoots) {
        expect(claimedRoots.has(rootClass)).toBe(false);
        claimedRoots.add(rootClass);
      }

      const selectors: string[] = [];
      postcss.parse(source).walkRules((rule) => {
        selectors.push(rule.selector);
      });
      expect(
        selectors.some((selector) =>
          [...allowedRoots].some((rootClass) =>
            selector.includes(`.${rootClass}`),
          ),
        ),
      ).toBe(true);
      const selectedClasses = selectors.flatMap((selector) =>
        [...selector.matchAll(/\.([a-z][a-z0-9_-]*)/gi)].map(
          ([, name]) => name,
        ),
      );
      expect(
        selectedClasses.every((name) =>
          [...allowedRoots].some((rootClass) => ownsClass(rootClass, name)),
        ),
      ).toBe(true);
    }
  });
});

describe('CSS ownership rules', () => {
  const sources = [
    {
      filename: 'popup-menu.tsx',
      source: `export function PopupMenu() {
  return (
    <wa-dropdown class="kui-popup-menu" data-component="popup-menu">
      <wa-button slot="trigger">x</wa-button>
      <wa-dropdown-item>y</wa-dropdown-item>
    </wa-dropdown>
  );
}`,
    },
    {
      filename: 'select.tsx',
      source: `import { Badge } from './badge.js';
export function Select() {
  return (
    <wa-select class={\`kui-select \${className}\`.trim()} data-component="select">
      <Badge text="2" className="kui-select__count" />
      <wa-option value="a">A</wa-option>
    </wa-select>
  );
}`,
    },
    {
      filename: 'badge.tsx',
      source: `export function Badge() { return <span class="kui-badge" />; }`,
    },
    {
      filename: 'toolbar-control-group.tsx',
      source: `export function ToolbarControlGroup() {
  return <div class="kui-toolbar-control-group" data-component="toolbar-control-group" />;
}`,
    },
    {
      filename: 'toolbar-text.tsx',
      source: `export function ToolbarText() { return <span class="kui-toolbar-text" />; }`,
    },
    {
      filename: 'nav-stack.tsx',
      source: `import { ToolbarText } from './toolbar-text.js';
export function NavStack() {
  return (
    <section class="kui-nav-stack">
      <div class="kui-nav-stack__chrome">
        <ToolbarText text={title} className="kui-nav-stack__title" />
      </div>
    </section>
  );
}`,
    },
  ];
  const stylesheets = [
    { filename: 'popup-menu.css', source: '' },
    {
      filename: 'select.css',
      source: '.kui-select { width: var(--kui-select-width, auto); }',
    },
    { filename: 'badge.css', source: '' },
    { filename: 'toolbar-control-group.css', source: '' },
    { filename: 'toolbar-text.css', source: '' },
    { filename: 'nav-stack.css', source: '' },
    { filename: 'webawesome.css', source: '' },
  ];
  const model = buildOwnershipModel({ stylesheets, sources });
  const rules = (filename: string, css: string) =>
    checkPackageStylesheet(model, filename, css).map(({ rule }) => rule);

  it.each([
    [
      'a descendant wa-button a PopupMenu renders as its trigger',
      'toolbar-control-group.css',
      '.kui-toolbar-control-group wa-button { line-height: 0; }',
      'owned-wa-tag',
    ],
    [
      'a PopupMenu host by its wa-dropdown tag alone',
      'toolbar-control-group.css',
      '.kui-toolbar-control-group > wa-dropdown { display: inline-flex; }',
      'owned-wa-tag',
    ],
    [
      "a Select's host part by its wa-select tag",
      'toolbar-control-group.css',
      '.kui-toolbar-control-group wa-select::part(combobox) { padding: 0; }',
      'owned-wa-tag',
    ],
    [
      "a Select's internal wa-option",
      'toolbar-control-group.css',
      '.kui-toolbar-control-group wa-option { padding: 0; }',
      'owned-wa-tag',
    ],
    [
      "a PopupMenu trigger's slotted icon, reached through its wa-button",
      'toolbar-control-group.css',
      '.kui-toolbar-control-group wa-button > svg { width: 16px; }',
      'owned-wa-tag',
    ],
    [
      'another component by its class',
      'toolbar-control-group.css',
      '.kui-toolbar-control-group > .kui-popup-menu { margin: 0; }',
      'foreign-class',
    ],
    [
      'another component by its data-component',
      'toolbar-control-group.css',
      '.kui-toolbar-control-group > [data-component="select"] { margin: 0; }',
      'foreign-class',
    ],
    [
      "another component's private variable",
      'toolbar-control-group.css',
      '.kui-toolbar-control-group { --_kui-select-slot-height: 40px; }',
      'foreign-variable',
    ],
    [
      'a private variable not named after this component',
      'toolbar-control-group.css',
      '.kui-toolbar-control-group { --_kui-floating-covered: hidden; }',
      'foreign-variable',
    ],
    [
      "another component's public token that it reads",
      'toolbar-control-group.css',
      '.kui-toolbar-control-group { --kui-select-width: 10rem; }',
      'foreign-variable',
    ],
    [
      'context written onto any child',
      'toolbar-control-group.css',
      '.kui-toolbar-control-group > * { --kui-edge-inset-inline-start: 0px; }',
      'context-on-child',
    ],
    [
      'a hook class on a composed child root',
      'nav-stack.css',
      '.kui-nav-stack__title { flex: 1 1 auto; }',
      'hook-class',
    ],
    [
      'a hook class used as context for the child internals',
      'select.css',
      '.kui-select__count > span { margin: 0; }',
      'hook-class',
    ],
  ])('rejects %s', (_name, filename, css, rule) => {
    expect(rules(filename, css)).toContain(rule);
  });

  it.each([
    [
      'raw wa-dropdown children, excluding a PopupMenu by class',
      'toolbar-control-group.css',
      '.kui-toolbar-control-group > wa-dropdown:not(.kui-popup-menu) > wa-button::part(base) { min-width: 40px; }',
    ],
    [
      'raw wa-button descendants, excluding a PopupMenu trigger',
      'toolbar-control-group.css',
      '.kui-toolbar-control-group wa-button:not(:where(.kui-popup-menu > *))::part(label) { gap: 4px; }',
    ],
    [
      'direct raw children, which cannot be a PopupMenu trigger',
      'toolbar-control-group.css',
      '.kui-toolbar-control-group > :is(button, wa-button):hover, .kui-toolbar-control-group > wa-button::part(base) { color: red; }',
    ],
    [
      'Web Awesome elements no kerf component renders',
      'toolbar-control-group.css',
      '.kui-toolbar-control-group > wa-tooltip { display: contents; }',
    ],
    [
      "its own element keyed on a composed child's state",
      'toolbar-control-group.css',
      '.kui-toolbar-control-group:has(> .kui-select[open]) { outline: none; }',
    ],
    [
      'its own private, public, and shared foundation variables',
      'toolbar-control-group.css',
      '.kui-toolbar-control-group { --_kui-toolbar-control-group-slot-height: 40px; --kui-toolbar-control-color: red; --kui-layout-item-padding: 5px; }',
    ],
    [
      'a child styling itself in the parent context',
      'popup-menu.css',
      '.kui-toolbar-control-group :where(wa-dropdown.kui-popup-menu) > wa-button::part(base) { min-width: 40px; } .kui-toolbar-control-group > wa-dropdown.kui-popup-menu { flex: none; }',
    ],
    [
      'its own unclassed internals',
      'select.css',
      '.kui-select wa-option::part(base) { padding: 0; }',
    ],
    [
      'its own trigger caret',
      'popup-menu.css',
      '.kui-popup-menu > wa-button::part(caret) { rotate: 0deg; }',
    ],
    [
      'a context value named after the parent that provides it',
      'select.css',
      '.kui-toolbar-control-group[data-size="compact"] > .kui-select { height: var(--_kui-toolbar-control-group-slot-height); }',
    ],
    [
      'its own element inside a composed child',
      'nav-stack.css',
      '.kui-nav-stack__chrome { background: white; }',
    ],
    [
      'Web Awesome tags in a non-component theme stylesheet',
      'webawesome.css',
      'wa-select { --wa-form-control-height: 44px; }',
    ],
  ])('allows %s', (_name, filename, css) => {
    expect(checkPackageStylesheet(model, filename, css)).toEqual([]);
  });

  it('excuses a finding only through a matching documented exception and reports stale ones', () => {
    const findings = checkPackageStylesheet(
      model,
      'toolbar-control-group.css',
      '.kui-toolbar-control-group > * { --kui-edge-inset-block-start: 0px; }',
    );
    const exception = {
      file: 'toolbar-control-group.css',
      rule: 'context-on-child' as const,
      selector: '.kui-toolbar-control-group > *',
      property: '--kui-edge-inset-',
      reason: 'test',
    };
    const stale = { ...exception, selector: '.kui-toolbar-control-group > p' };
    expect(
      applyExceptions('toolbar-control-group.css', findings, [exception]),
    ).toEqual({ violations: [], stale: [] });
    expect(
      applyExceptions('toolbar-control-group.css', findings, [stale]),
    ).toEqual({ violations: findings, stale: [stale] });
  });

  it('documents a reason for every package exception', () => {
    for (const exception of ownershipExceptions) {
      expect(exception.reason.length).toBeGreaterThan(20);
      expect(exception.selector ?? exception.property).toBeTruthy();
    }
  });
});
