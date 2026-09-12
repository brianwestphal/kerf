import { access, readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

const root = fileURLToPath(new URL('..', import.meta.url));
const [artifactSource, schemaSource, packageSource, indexSource, manifestSource, selectionGuide, readme, llms] = await Promise.all([
  readFile(resolve(root, 'ai/component-catalog.json'), 'utf8'),
  readFile(resolve(root, 'ai/component-catalog.schema.json'), 'utf8'),
  readFile(resolve(root, 'package.json'), 'utf8'),
  readFile(resolve(root, 'src/index.ts'), 'utf8'),
  readFile(resolve(root, 'node_modules/@awesome.me/webawesome/dist/custom-elements.json'), 'utf8'),
  readFile(resolve(root, 'docs/component-selection.md'), 'utf8'),
  readFile(resolve(root, 'README.md'), 'utf8'),
  readFile(resolve(root, 'llms.txt'), 'utf8'),
]);
const artifact = JSON.parse(artifactSource);
const schema = JSON.parse(schemaSource);
const packageJson = JSON.parse(packageSource);
const manifest = JSON.parse(manifestSource);
const failures = [];

function fail(message) {
  failures.push(message);
}

function schemaAt(reference) {
  if (!reference.startsWith('#/')) throw new Error(`Unsupported schema reference ${reference}`);
  return reference.slice(2).split('/').reduce((value, key) => value[key], schema);
}

function validateSchema(value, rule, path = '$') {
  if (rule.$ref) return validateSchema(value, schemaAt(rule.$ref), path);
  if ('const' in rule && value !== rule.const) fail(`${path} must equal ${JSON.stringify(rule.const)}`);
  if (rule.enum && !rule.enum.includes(value)) fail(`${path} must be one of ${rule.enum.join(', ')}`);
  if (rule.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) { fail(`${path} must be an object`); return; }
    for (const key of rule.required ?? []) if (!(key in value)) fail(`${path} is missing required property ${key}`);
    for (const [key, child] of Object.entries(value)) {
      if (key in (rule.properties ?? {})) validateSchema(child, rule.properties[key], `${path}.${key}`);
      else if (rule.additionalProperties === false) fail(`${path} has unknown property ${key}`);
    }
  } else if (rule.type === 'array') {
    if (!Array.isArray(value)) { fail(`${path} must be an array`); return; }
    if (rule.minItems && value.length < rule.minItems) fail(`${path} must contain at least ${rule.minItems} item(s)`);
    if (rule.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) fail(`${path} must contain unique items`);
    if (rule.items) value.forEach((item, index) => validateSchema(item, rule.items, `${path}[${index}]`));
  } else if (rule.type && typeof value !== rule.type) {
    fail(`${path} must be a ${rule.type}`);
  } else if (rule.type === 'string' && rule.minLength && value.length < rule.minLength) {
    fail(`${path} must contain at least ${rule.minLength} character(s)`);
  }
}

validateSchema(artifact, schema);

if (artifact.schemaVersion !== 1 || artifact.package !== '@kerfjs/ui' || !Array.isArray(artifact.entries)) {
  fail('artifact root must declare schemaVersion 1, package @kerfjs/ui, and entries');
}
if (packageJson.exports['./ai/*'] !== './ai/*') fail('package must export the shipped ai/component-catalog.json artifact and schema');
if (!llms.includes('[Machine-readable component catalog](./ai/component-catalog.json)')) fail('llms.txt must link the shipped machine-readable catalog');

const entries = artifact.entries ?? [];
const ids = entries.map((entry) => entry.id);
const idSet = new Set(ids);
if (idSet.size !== ids.length) fail('entry ids must be unique');

for (const entry of entries) {
  for (const field of ['id', 'name', 'source', 'kind', 'category', 'purpose']) {
    if (typeof entry[field] !== 'string' || !entry[field]) fail(`${entry.id ?? '<unknown>'} is missing ${field}`);
  }
  if (!Array.isArray(entry.useWhen) || entry.useWhen.length === 0) fail(`${entry.id} is missing useWhen guidance`);
  if (!Array.isArray(entry.avoidWhen) || entry.avoidWhen.length === 0) fail(`${entry.id} is missing avoidWhen guidance`);
  if (!entry.delivery || !Array.isArray(entry.delivery.sideEffects)) fail(`${entry.id} is missing delivery side-effect metadata`);
  if (!entry.links?.catalogRoute || !entry.links?.documentation || !entry.links?.recipe) fail(`${entry.id} is missing catalog/documentation/recipe links`);
  if (entry.links?.catalogRoute !== `?component=${entry.id}`) fail(`${entry.id} has stale catalog route ${entry.links?.catalogRoute}`);
  for (const dependency of entry.uses ?? []) {
    if (!idSet.has(dependency)) fail(`${entry.id} uses unknown entry ${dependency}`);
  }
  for (const alternative of entry.alternatives ?? []) {
    if (!idSet.has(alternative.id)) fail(`${entry.id} names unknown alternative ${alternative.id}`);
  }
}

const sourceFile = ts.createSourceFile('index.ts', indexSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const runtimeExports = [];
for (const statement of sourceFile.statements) {
  if (!ts.isExportDeclaration(statement) || !statement.exportClause || !ts.isNamedExports(statement.exportClause)) continue;
  for (const element of statement.exportClause.elements) {
    if (!element.isTypeOnly) runtimeExports.push(element.name.text);
  }
}
const catalogExports = entries.flatMap((entry) => entry.publicExports ?? []);
for (const name of runtimeExports) {
  if (!catalogExports.includes(name)) fail(`public runtime export ${name} is absent from catalog metadata`);
  if (!selectionGuide.includes(`\`${name}\``)) fail(`public runtime export ${name} is absent from AI decision guidance`);
}
for (const name of catalogExports) {
  if (!runtimeExports.includes(name)) fail(`catalog names stale public export ${name}`);
}
if (new Set(catalogExports).size !== catalogExports.length) fail('public exports must be owned by exactly one catalog entry');

const browserImports = Object.entries(packageJson.exports)
  .filter(([, target]) => target && typeof target === 'object' && 'browser' in target)
  .map(([subpath]) => `@kerfjs/ui/${subpath.slice(2)}`)
  .sort();
const catalogBrowserImports = entries.flatMap((entry) => entry.delivery.browserImport ? [entry.delivery.browserImport] : []).sort();
if (JSON.stringify(browserImports) !== JSON.stringify(catalogBrowserImports)) {
  fail('catalog browser imports must match every package browser-condition subpath exactly');
}
for (const specifier of catalogBrowserImports) {
  if (!readme.includes(`\`${specifier}\``)) fail(`README component inventory is missing ${specifier}`);
}
for (const entry of entries.filter((candidate) => candidate.source === 'kerf' && !candidate.delivery.browserImport && candidate.delivery.manualCssImport)) {
  if (!readme.includes(entry.delivery.manualCssImport)) fail(`README composition inventory is missing ${entry.delivery.manualCssImport}`);
}

function packageSubpath(specifier) {
  return specifier === '@kerfjs/ui' ? '.' : `.${specifier.slice('@kerfjs/ui'.length)}`;
}
for (const entry of entries) {
  for (const key of ['browserImport', 'manualCssImport', 'registrationImport', 'themeCssImport']) {
    const specifier = entry.delivery[key];
    if (!specifier || !specifier.startsWith('@kerfjs/ui')) continue;
    const subpath = packageSubpath(specifier);
    if (!(subpath in packageJson.exports)) fail(`${entry.id} has stale ${key} ${specifier}`);
    if (key === 'manualCssImport') {
      const target = packageJson.exports[subpath];
      if (typeof target !== 'string') fail(`${entry.id} manual CSS export ${specifier} is not a file target`);
      else {
        try { await access(resolve(root, target)); } catch { fail(`${entry.id} manual CSS target ${target} does not exist`); }
      }
    }
  }
}

const manifestElements = manifest.modules.flatMap((module) =>
  (module.declarations ?? [])
    .filter((declaration) => declaration.customElement && declaration.tagName)
    .map((declaration) => ({ tag: declaration.tagName, module: module.path })),
);
const manifestTags = manifestElements.map(({ tag }) => tag).sort();
const webAwesomeEntries = entries.filter((entry) => entry.source === 'webawesome');
const catalogTags = webAwesomeEntries.map((entry) => entry.customElement).sort();
if (JSON.stringify(manifestTags) !== JSON.stringify(catalogTags)) fail('Web Awesome entries must exactly match the installed custom-elements manifest');
for (const entry of webAwesomeEntries) {
  const manifestEntry = manifestElements.find(({ tag }) => tag === entry.customElement);
  const expected = manifestEntry && `@awesome.me/webawesome/dist/${manifestEntry.module}`;
  if (entry.delivery.registrationImport !== expected) fail(`${entry.id} has stale Web Awesome registration import ${entry.delivery.registrationImport}`);
}

function githubSlug(heading) {
  return heading.trim().toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\p{Letter}\p{Number}\s-]/gu, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}
for (const entry of entries) {
  for (const key of ['documentation', 'recipe']) {
    const [path, fragment] = entry.links[key].split('#');
    const targetPath = resolve(root, path);
    let target;
    try { target = await readFile(targetPath, 'utf8'); } catch { fail(`${entry.id} has broken ${key} link ${entry.links[key]}`); continue; }
    if (fragment && ['.md', '.txt'].includes(extname(targetPath))) {
      const headings = [...target.matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => githubSlug(match[1]));
      if (!headings.includes(fragment)) fail(`${entry.id} has broken ${key} heading ${entry.links[key]}`);
    }
  }
}

for (const entry of entries.filter((candidate) => candidate.source === 'kerf')) {
  const cssImport = entry.delivery.manualCssImport;
  if (!cssImport) continue;
  const target = packageJson.exports[packageSubpath(cssImport)];
  const css = await readFile(resolve(root, target), 'utf8');
  for (const className of entry.publicClasses ?? []) {
    if (!css.includes(`.${className}`)) fail(`${entry.id} names missing public class ${className}`);
  }
  for (const token of entry.publicTokens ?? []) {
    if (!css.includes(token)) fail(`${entry.id} names missing public token ${token}`);
  }
}

if (failures.length > 0) {
  console.error('[check-component-catalog] Component catalog drifted:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`[check-component-catalog] OK — ${entries.length} entries, ${runtimeExports.length} public values, ${browserImports.length} browser subpaths, and ${manifestTags.length} Web Awesome elements are synchronized.`);
}
