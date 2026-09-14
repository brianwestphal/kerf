import { access, readFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

const root = fileURLToPath(new URL('..', import.meta.url));
const selectionPath = resolve(root, 'docs/component-selection.md');
const missingConceptPath = resolve(root, 'docs/examples/command-palette-adapter.tsx');
const requiredDocs = [
  selectionPath,
  resolve(root, 'ai/skill.md'),
  resolve(root, 'README.md'),
  resolve(root, 'llms.txt'),
  resolve(root, '../site/src/content/docs/docs/ui-package.md'),
];
const overlaps = [
  'wa-button', 'wa-button-group', 'wa-dropdown', 'wa-dropdown-item',
  'wa-input', 'wa-option', 'wa-select', 'wa-tag',
  'wa-tab', 'wa-tab-group', 'wa-tab-panel', 'wa-icon', 'wa-split-panel',
  'wa-spinner', 'wa-progress-bar', 'wa-progress-ring', 'wa-skeleton',
  'wa-callout', 'wa-toast', 'wa-toast-item', 'wa-popup', 'wa-tooltip',
  'wa-popover', 'wa-tree', 'wa-tree-item', 'wa-animated-image',
  'wa-comparison', 'wa-zoomable-frame',
];

const [selection, missingConcept, indexSource, componentCatalogSource, packageSource] = await Promise.all([
  readFile(selectionPath, 'utf8'),
  readFile(missingConceptPath, 'utf8'),
  readFile(resolve(root, 'src/index.ts'), 'utf8'),
  readFile(resolve(root, 'ai/component-catalog.json'), 'utf8'),
  readFile(resolve(root, 'package.json'), 'utf8'),
]);
const componentCatalog = JSON.parse(componentCatalogSource);
const packageJson = JSON.parse(packageSource);
const failures = [];

function fail(message) {
  failures.push(message);
}

const sourceFile = ts.createSourceFile('index.ts', indexSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const runtimeExports = [];
for (const statement of sourceFile.statements) {
  if (!ts.isExportDeclaration(statement) || !statement.exportClause || !ts.isNamedExports(statement.exportClause)) continue;
  for (const element of statement.exportClause.elements) {
    if (!element.isTypeOnly) runtimeExports.push(element.name.text);
  }
}
for (const name of runtimeExports) {
  if (!selection.includes(`\`${name}\``)) fail(`component-selection.md does not cover public runtime export ${name}`);
}

for (const id of overlaps) {
  if (!componentCatalog.entries.some((entry) => entry.id === id)) fail(`decision overlap ${id} is missing from the component catalog`);
  if (!selection.includes(`\`${id}\``)) fail(`component-selection.md does not decide supported overlap ${id}`);
}

const requiredPhrases = [
  'Search the',
  'Reuse a primitive',
  'Compose primitives',
  'thin application adapter',
  'Use custom markup only',
  'Problem-to-component matrix',
  'Correct composition and duplicated-markup trap',
  'Missing recurring concepts',
  'does not export a command-palette component',
  'recipe-command-palette',
];
for (const phrase of requiredPhrases) {
  if (!selection.includes(phrase)) fail(`component-selection.md is missing required decision guidance: ${phrase}`);
}

const menuEntry = componentCatalog.entries.find((entry) => entry.id === 'menu');
for (const className of ['kui-pane', 'kui-content', 'kui-content-item']) {
  if (!menuEntry?.publicClasses.includes(className)) fail(`menu catalog entry is missing public class ${className}`);
}
for (const token of [
  '--kui-layout-content-gap',
  '--kui-layout-inline-margin',
  '--kui-layout-item-padding',
  '--kui-layout-rounded-radius',
]) {
  if (!menuEntry?.publicTokens.includes(token)) fail(`menu catalog entry is missing public token ${token}`);
}
const layoutGuidance = `${selection}\n${await readFile(resolve(root, 'ai/skill.md'), 'utf8')}\n${await readFile(resolve(root, 'README.md'), 'utf8')}`;
for (const phrase of ['24px', '8px', '44px', 'content item']) {
  if (!layoutGuidance.includes(phrase)) fail(`layout decision guidance is missing the canonical ${phrase} contract`);
}

const missingConceptSource = ts.createSourceFile('command-palette-adapter.tsx', missingConcept, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
if (missingConceptSource.parseDiagnostics.length) fail('command-palette adapter example must parse as TSX');
for (const required of [
  "import '@kerfjs/ui/layout.css'",
  'class="app-command-palette kui-content"',
  'class="kui-control-cluster kui-content-item"',
  'delegateActions(',
  'mount(',
  'not an @kerfjs/ui export',
  'ranking, history, shortcuts, focus policy, command availability, and copy',
]) {
  if (!missingConcept.includes(required)) fail(`command-palette adapter example is missing ${required}`);
}
const contentItems = missingConcept.match(/\bkui-content-item\b/g) ?? [];
if (contentItems.length < 4) fail('command-palette adapter example must give each ordinary content child shared item geometry');
if (/from ['"]@kerfjs\/ui\/command-palette/.test(missingConcept)) fail('command-palette adapter must not invent a package export');

const importPattern = /`(@kerfjs\/ui(?:\/[a-z0-9./*-]+)?)`/g;
function packageExports(subpath) {
  return subpath in packageJson.exports || Object.keys(packageJson.exports).some((pattern) => pattern.endsWith('*') && subpath.startsWith(pattern.slice(0, -1)));
}
for (const path of requiredDocs) {
  const contents = await readFile(path, 'utf8');
  for (const match of contents.matchAll(importPattern)) {
    const specifier = match[1];
    if (specifier.includes('*')) continue;
    const subpath = specifier === '@kerfjs/ui' ? '.' : `.${specifier.slice('@kerfjs/ui'.length)}`;
    if (!packageExports(subpath)) fail(`${relative(root, path)} contains stale package import ${specifier}`);
  }
}

function githubSlug(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

for (const sourcePath of requiredDocs) {
  const contents = await readFile(sourcePath, 'utf8');
  for (const match of contents.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const href = match[1];
    if (/^(?:https?:|mailto:)/.test(href)) continue;
    const [relativePath, fragment] = href.split('#');
    const targetPath = resolve(dirname(sourcePath), relativePath || '.');
    try {
      await access(targetPath);
    } catch {
      fail(`${relative(root, sourcePath)} has broken link ${href}`);
      continue;
    }
    if (!fragment || !['.md', '.txt'].includes(extname(targetPath))) continue;
    const target = await readFile(targetPath, 'utf8');
    const headings = [...target.matchAll(/^#{1,6}\s+(.+)$/gm)].map((heading) => githubSlug(heading[1]));
    if (!headings.includes(fragment)) fail(`${relative(root, sourcePath)} has broken heading link ${href}`);
  }
}

if (failures.length > 0) {
  console.error('[check-decision-guidance] Decision guidance drifted:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`[check-decision-guidance] OK — ${runtimeExports.length} public values, ${overlaps.length} Web Awesome overlaps, imports, and recipe links are covered.`);
}
