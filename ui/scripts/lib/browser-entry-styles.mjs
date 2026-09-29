import { access, readFile } from 'node:fs/promises';
import { posix } from 'node:path';

/**
 * The CSS-aware `browser` entry graph. A component subpath's `browser`
 * condition resolves to a generated wrapper that imports `foundation.css`, the
 * stylesheet of every UI module reachable from the component's source imports
 * (dependencies first), then re-exports the CSS-free module. Composites such as
 * Catalog and Workbench render internal components (List, Pane, Toolbar, …)
 * whose styles would otherwise depend on unrelated application imports, so the
 * list is derived from the source import graph and can never drift.
 */

const defaultSourceRoot = new URL('../../src/', import.meta.url);

/**
 * Package subpaths whose module reaches a stylesheet but must stay CSS-free:
 * `webawesome` carries type-only JSX declarations, and `webawesome.css` is the
 * separate opt-in theme bridge an app imports deliberately.
 */
export const CSS_FREE_STYLED_SUBPATHS = new Map([
  [
    'webawesome',
    'type-only Web Awesome JSX declarations; the theme is the explicit webawesome.css opt-in',
  ],
]);

/**
 * Whether a styled subpath is deliberately CSS-free. `wire-*` helpers wire DOM
 * that the paired component already rendered through its own (CSS-aware)
 * subpath; they import component modules only for shared constants and types.
 */
export function isCssFreeSubpath(subpath) {
  return CSS_FREE_STYLED_SUBPATHS.has(subpath) || subpath.startsWith('wire-');
}

async function exists(url) {
  try {
    await access(url);
    return true;
  } catch {
    return false;
  }
}

async function sourceFor(moduleName, sourceRoot) {
  for (const extension of ['tsx', 'ts']) {
    const source = new URL(`${moduleName}.${extension}`, sourceRoot);
    if (await exists(source)) return source;
  }
  throw new Error(`Could not find source for browser component ${moduleName}`);
}

/** Relative value imports and value re-exports of one source module. */
export function relativeValueDependencies(moduleName, source) {
  // Follow both value imports AND value re-exports (`export { X } from './x.js'`,
  // `export * from …`) — a re-exported sibling pulls its runtime, so its CSS must
  // be reachable too. Skip type-only forms (`import type …`, `export type …`),
  // which erase at build and reference no CSS. Parent-relative specifiers
  // (`../../list.js`, used by the catalog's internal components) count too.
  const withoutComments = source.replace(/^\s*\/\/.*$/gm, '');
  return [
    ...withoutComments.matchAll(
      /import\s+(?!type\b)[^'"]*?from\s+['"](\.\.?\/[^'"]+)\.js['"]/g,
    ),
    ...withoutComments.matchAll(
      /export\s+(?!type\b)(?:\*|\{[^}]*\})\s+from\s+['"](\.\.?\/[^'"]+)\.js['"]/g,
    ),
  ].map((match) =>
    posix.normalize(posix.join(posix.dirname(moduleName), match[1])),
  );
}

/**
 * The stylesheets one module's own `.css` contributes. A pure aggregate — a
 * stylesheet made only of `@import` entries, such as the `catalog.css`
 * compatibility entry — expands to the files it imports so a wrapper never
 * loads the same rules twice.
 */
async function ownStyles(moduleName, sourceRoot) {
  const url = new URL(`${moduleName}.css`, sourceRoot);
  if (!(await exists(url))) return [];
  const css = (await readFile(url, 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '');
  const statements = css
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
  const imports = statements.map(
    (statement) => /^@import\s+["']\.\/([^"']+)\.css["']$/.exec(statement)?.[1],
  );
  if (imports.length === 0 || imports.some((target) => !target))
    return [moduleName];
  const expanded = [];
  for (const target of imports)
    expanded.push(
      ...(await ownStyles(
        posix.normalize(posix.join(posix.dirname(moduleName), target)),
        sourceRoot,
      )),
    );
  return expanded;
}

/**
 * Every stylesheet (as a `src/`-relative name without extension) reachable
 * from `moduleName`, in dependency order, each listed once.
 */
export async function reachableStyles(
  moduleName,
  { sourceRoot = defaultSourceRoot } = {},
) {
  const seen = new Set();
  const styles = [];
  async function visit(name) {
    if (seen.has(name)) return;
    seen.add(name);
    const source = await readFile(await sourceFor(name, sourceRoot), 'utf8');
    for (const dependency of relativeValueDependencies(name, source))
      await visit(dependency);
    styles.push(...(await ownStyles(name, sourceRoot)));
  }
  await visit(moduleName);
  return [...new Set(styles)];
}

/** Subpaths (without `./`) whose export declares a `browser` condition. */
export function browserEntrySubpaths(packageJson) {
  return Object.entries(packageJson.exports)
    .filter(
      ([, target]) =>
        typeof target === 'object' && target !== null && 'browser' in target,
    )
    .map(([subpath]) => subpath.slice(2));
}

/** The generated `dist/browser/<subpath>.js` wrapper source. */
export async function browserWrapperSource(moduleName, options) {
  const imports = [
    'foundation',
    ...(await reachableStyles(moduleName, options)),
  ]
    .map((style) => `import '../styles/${style}.css';`)
    .join('\n');
  return `${imports}\nexport * from '../${moduleName}.js';\n`;
}

/**
 * Module subpaths that reach component CSS but lack a `browser` condition —
 * importing them in a browser bundle would ship none of the styles they render.
 */
export async function styledSubpathsMissingBrowser(
  packageJson,
  { sourceRoot = defaultSourceRoot } = {},
) {
  const missing = [];
  for (const [subpath, target] of Object.entries(packageJson.exports)) {
    if (typeof target !== 'object' || target === null) continue;
    if ('browser' in target) continue;
    const name = subpath.slice(2);
    if (target.import !== `./dist/${name}.js`) continue;
    if (isCssFreeSubpath(name)) continue;
    let styles;
    try {
      styles = await reachableStyles(name, { sourceRoot });
    } catch {
      continue; // Not a src/ module (registration shims, analyzer, …).
    }
    if (styles.length > 0) missing.push({ subpath: name, styles });
  }
  return missing;
}
