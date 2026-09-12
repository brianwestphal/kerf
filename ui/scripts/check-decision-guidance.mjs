import { access, readFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

const root = fileURLToPath(new URL('..', import.meta.url));
const selectionPath = resolve(root, 'docs/component-selection.md');
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

const [selection, indexSource, catalogSource, packageSource] = await Promise.all([
  readFile(selectionPath, 'utf8'),
  readFile(resolve(root, 'src/index.ts'), 'utf8'),
  readFile(resolve(root, 'ux-demo/catalog.ts'), 'utf8'),
  readFile(resolve(root, 'package.json'), 'utf8'),
]);
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
  if (!catalogSource.includes(`id: '${id}'`)) fail(`decision overlap ${id} is missing from the UX catalog`);
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
];
for (const phrase of requiredPhrases) {
  if (!selection.includes(phrase)) fail(`component-selection.md is missing required decision guidance: ${phrase}`);
}

const importPattern = /`(@kerfjs\/ui(?:\/[a-z0-9./*-]+)?)`/g;
for (const path of requiredDocs) {
  const contents = await readFile(path, 'utf8');
  for (const match of contents.matchAll(importPattern)) {
    const specifier = match[1];
    if (specifier.includes('*')) continue;
    const subpath = specifier === '@kerfjs/ui' ? '.' : `.${specifier.slice('@kerfjs/ui'.length)}`;
    if (!(subpath in packageJson.exports)) fail(`${relative(root, path)} contains stale package import ${specifier}`);
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
