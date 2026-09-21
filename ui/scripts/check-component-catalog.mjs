import { access, readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

import { validateCatalogV2 } from './component-catalog-v2-validation.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const [
  artifactSource,
  schemaSource,
  packageSource,
  indexSource,
  webAwesomeTypesSource,
  manifestSource,
  selectionGuide,
  readme,
  llms,
  extensionSchemaSource,
  extensionExampleSource,
  catalogAuthoringSource,
  catalogAuthoringSchemaSource,
  catalogV2Source,
  catalogV2SchemaSource,
  consumerV2SchemaSource,
  consumerV2ExampleSource,
] = await Promise.all([
  readFile(resolve(root, 'ai/component-catalog.json'), 'utf8'),
  readFile(resolve(root, 'ai/component-catalog.schema.json'), 'utf8'),
  readFile(resolve(root, 'package.json'), 'utf8'),
  readFile(resolve(root, 'src/index.ts'), 'utf8'),
  readFile(resolve(root, 'src/webawesome.ts'), 'utf8'),
  readFile(
    resolve(
      root,
      'node_modules/@awesome.me/webawesome/dist/custom-elements.json',
    ),
    'utf8',
  ),
  readFile(resolve(root, 'docs/component-selection.md'), 'utf8'),
  readFile(resolve(root, 'README.md'), 'utf8'),
  readFile(resolve(root, 'llms.txt'), 'utf8'),
  readFile(resolve(root, 'ai/component-catalog-extension.schema.json'), 'utf8'),
  readFile(
    resolve(root, 'docs/examples/component-catalog-extension.json'),
    'utf8',
  ),
  readFile(resolve(root, 'ai/catalog-authoring.json'), 'utf8'),
  readFile(resolve(root, 'ai/catalog-authoring.schema.json'), 'utf8'),
  readFile(resolve(root, 'ai/component-catalog-v2.json'), 'utf8'),
  readFile(resolve(root, 'ai/component-catalog-v2.schema.json'), 'utf8'),
  readFile(
    resolve(root, 'ai/component-catalog-extension-v2.schema.json'),
    'utf8',
  ),
  readFile(
    resolve(root, 'docs/examples/component-catalog-extension-v2.json'),
    'utf8',
  ),
]);
const artifact = JSON.parse(artifactSource);
const schema = JSON.parse(schemaSource);
const packageJson = JSON.parse(packageSource);
const manifest = JSON.parse(manifestSource);
const extensionSchema = JSON.parse(extensionSchemaSource);
const extensionExample = JSON.parse(extensionExampleSource);
const catalogAuthoring = JSON.parse(catalogAuthoringSource);
const catalogAuthoringSchema = JSON.parse(catalogAuthoringSchemaSource);
const catalogV2 = JSON.parse(catalogV2Source);
const catalogV2Schema = JSON.parse(catalogV2SchemaSource);
const consumerV2Schema = JSON.parse(consumerV2SchemaSource);
const consumerV2Example = JSON.parse(consumerV2ExampleSource);
const failures = [];

function fail(message) {
  failures.push(message);
}

function schemaAt(activeSchema, reference) {
  if (!reference.startsWith('#/'))
    throw new Error(`Unsupported schema reference ${reference}`);
  return reference
    .slice(2)
    .split('/')
    .reduce((value, key) => value[key], activeSchema);
}

function validateSchema(value, rule, path = '$', activeSchema = schema) {
  if (rule.$ref)
    return validateSchema(
      value,
      schemaAt(activeSchema, rule.$ref),
      path,
      activeSchema,
    );
  if ('const' in rule && value !== rule.const)
    fail(`${path} must equal ${JSON.stringify(rule.const)}`);
  if (rule.enum && !rule.enum.includes(value))
    fail(`${path} must be one of ${rule.enum.join(', ')}`);
  if (rule.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      fail(`${path} must be an object`);
      return;
    }
    for (const key of rule.required ?? [])
      if (!(key in value)) fail(`${path} is missing required property ${key}`);
    for (const [key, child] of Object.entries(value)) {
      if (key in (rule.properties ?? {}))
        validateSchema(
          child,
          rule.properties[key],
          `${path}.${key}`,
          activeSchema,
        );
      else if (rule.additionalProperties === false)
        fail(`${path} has unknown property ${key}`);
    }
  } else if (rule.type === 'array') {
    if (!Array.isArray(value)) {
      fail(`${path} must be an array`);
      return;
    }
    if (rule.minItems && value.length < rule.minItems)
      fail(`${path} must contain at least ${rule.minItems} item(s)`);
    if (
      rule.uniqueItems &&
      new Set(value.map((item) => JSON.stringify(item))).size !== value.length
    )
      fail(`${path} must contain unique items`);
    if (rule.items)
      value.forEach((item, index) =>
        validateSchema(item, rule.items, `${path}[${index}]`, activeSchema),
      );
  } else if (rule.type === 'integer' && !Number.isInteger(value)) {
    fail(`${path} must be an integer`);
  } else if (
    rule.type &&
    rule.type !== 'integer' &&
    typeof value !== rule.type
  ) {
    fail(`${path} must be a ${rule.type}`);
  } else if (
    rule.type === 'string' &&
    rule.minLength &&
    value.length < rule.minLength
  ) {
    fail(`${path} must contain at least ${rule.minLength} character(s)`);
  }
}

validateSchema(artifact, schema);
validateSchema(
  extensionExample,
  extensionSchema,
  '$extension',
  extensionSchema,
);
validateSchema(catalogV2, catalogV2Schema, '$v2', catalogV2Schema);
validateSchema(
  consumerV2Example,
  catalogV2Schema,
  '$consumerV2',
  catalogV2Schema,
);
for (const failure of validateCatalogV2(catalogV2, { v1: artifact }))
  fail(`v2: ${failure}`);
for (const failure of validateCatalogV2(consumerV2Example))
  fail(`consumer v2 example: ${failure}`);
if (catalogV2Schema.properties?.schemaVersion?.const !== 2)
  fail('v2 schema must require schemaVersion 2');
if (consumerV2Schema.allOf?.[0]?.$ref !== './component-catalog-v2.schema.json')
  fail('consumer v2 schema must reuse the shipped v2 composition contract');
validateSchema(
  catalogAuthoring,
  catalogAuthoringSchema,
  '$catalogAuthoring',
  catalogAuthoringSchema,
);

if (
  JSON.stringify(extensionSchema.$defs.geometry) !==
    JSON.stringify(schema.$defs.geometry) ||
  JSON.stringify(extensionSchema.$defs.geometryOwner) !==
    JSON.stringify(schema.$defs.geometryOwner)
)
  fail('consumer extension geometry contract must match the shipped catalog');
if (
  extensionExample.entries.some(
    ({ geometry }) =>
      Object.values(geometry).includes('conditional') &&
      !geometry.notes?.length,
  )
)
  fail('consumer extension conditional geometry requires explanatory notes');
if (
  new Set(extensionExample.entries.map(({ id }) => id)).size !==
  extensionExample.entries.length
)
  fail('consumer extension example ids must be unique');

if (
  artifact.schemaVersion !== 1 ||
  artifact.package !== '@kerfjs/ui' ||
  !Array.isArray(artifact.entries)
) {
  fail(
    'artifact root must declare schemaVersion 1, package @kerfjs/ui, and entries',
  );
}
if (packageJson.exports['./ai/*'] !== './ai/*')
  fail(
    'package must export the shipped ai/component-catalog.json artifact and schema',
  );
if (!readme.includes('[`catalog-authoring.json`](./ai/catalog-authoring.json)'))
  fail('README must link the Catalog authoring discovery artifact');
if (
  !readme.includes(
    '[`component-catalog-v2.json`](./ai/component-catalog-v2.json)',
  )
)
  fail('README must link the v2 composition catalog');
if (
  !llms.includes(
    '[Machine-readable component catalog](./ai/component-catalog.json)',
  )
)
  fail('llms.txt must link the shipped machine-readable catalog');
if (
  !llms.includes(
    '[Consumer catalog extension schema](./ai/component-catalog-extension.schema.json)',
  )
)
  fail('llms.txt must link the consumer catalog extension schema');
if (!llms.includes('[Composition catalog v2](./ai/component-catalog-v2.json)'))
  fail('llms.txt must link the v2 composition catalog');

const entries = artifact.entries ?? [];
const ids = entries.map((entry) => entry.id);
const idSet = new Set(ids);
if (idSet.size !== ids.length) fail('entry ids must be unique');

const geometryOwners = new Set([
  'self',
  'parent',
  'child',
  'none',
  'conditional',
]);

for (const entry of entries) {
  for (const field of ['id', 'name', 'source', 'kind', 'category', 'purpose']) {
    if (typeof entry[field] !== 'string' || !entry[field])
      fail(`${entry.id ?? '<unknown>'} is missing ${field}`);
  }
  if (!Array.isArray(entry.useWhen) || entry.useWhen.length === 0)
    fail(`${entry.id} is missing useWhen guidance`);
  if (!Array.isArray(entry.avoidWhen) || entry.avoidWhen.length === 0)
    fail(`${entry.id} is missing avoidWhen guidance`);
  if (!entry.delivery || !Array.isArray(entry.delivery.sideEffects))
    fail(`${entry.id} is missing delivery side-effect metadata`);
  if (entry.kind !== 'recipe') {
    if (!entry.geometry) fail(`${entry.id} is missing geometry ownership`);
    for (const dimension of ['margin', 'border', 'padding']) {
      if (!geometryOwners.has(entry.geometry?.[dimension]))
        fail(`${entry.id} has invalid ${dimension} geometry ownership`);
    }
    if (
      Object.values(entry.geometry ?? {}).includes('conditional') &&
      !entry.geometry?.notes?.length
    )
      fail(`${entry.id} uses conditional geometry without explanatory notes`);
  }
  if (
    !entry.links?.catalogRoute ||
    !entry.links?.documentation ||
    !entry.links?.recipe
  )
    fail(`${entry.id} is missing catalog/documentation/recipe links`);
  if (entry.links?.catalogRoute !== `?component=${entry.id}`)
    fail(`${entry.id} has stale catalog route ${entry.links?.catalogRoute}`);
  for (const dependency of entry.uses ?? []) {
    if (!idSet.has(dependency))
      fail(`${entry.id} uses unknown entry ${dependency}`);
  }
  for (const alternative of entry.alternatives ?? []) {
    if (!idSet.has(alternative.id))
      fail(`${entry.id} names unknown alternative ${alternative.id}`);
  }
}

const sourceFile = ts.createSourceFile(
  'index.ts',
  indexSource,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);
const runtimeExports = [];
for (const statement of sourceFile.statements) {
  if (
    !ts.isExportDeclaration(statement) ||
    !statement.exportClause ||
    !ts.isNamedExports(statement.exportClause)
  )
    continue;
  for (const element of statement.exportClause.elements) {
    if (!element.isTypeOnly) runtimeExports.push(element.name.text);
  }
}
const catalogExports = entries.flatMap((entry) => entry.publicExports ?? []);
for (const name of runtimeExports) {
  if (!catalogExports.includes(name))
    fail(`public runtime export ${name} is absent from catalog metadata`);
  if (!selectionGuide.includes(`\`${name}\``))
    fail(`public runtime export ${name} is absent from AI decision guidance`);
}
for (const name of catalogExports) {
  if (!runtimeExports.includes(name))
    fail(`catalog names stale public export ${name}`);
}
if (new Set(catalogExports).size !== catalogExports.length)
  fail('public exports must be owned by exactly one catalog entry');

const browserImports = Object.entries(packageJson.exports)
  .filter(
    ([, target]) => target && typeof target === 'object' && 'browser' in target,
  )
  .map(([subpath]) => `@kerfjs/ui/${subpath.slice(2)}`)
  .sort();
const catalogBrowserImports = entries
  .flatMap((entry) =>
    entry.delivery.browserImport ? [entry.delivery.browserImport] : [],
  )
  .sort();
if (JSON.stringify(browserImports) !== JSON.stringify(catalogBrowserImports)) {
  fail(
    'catalog browser imports must match every package browser-condition subpath exactly',
  );
}
for (const specifier of catalogBrowserImports) {
  if (!readme.includes(`\`${specifier}\``))
    fail(`README component inventory is missing ${specifier}`);
}
for (const entry of entries.filter(
  (candidate) =>
    candidate.source === 'kerf' &&
    !candidate.delivery.browserImport &&
    candidate.delivery.manualCssImport,
)) {
  if (!readme.includes(entry.delivery.manualCssImport))
    fail(
      `README composition inventory is missing ${entry.delivery.manualCssImport}`,
    );
}

function packageSubpath(specifier) {
  return specifier === '@kerfjs/ui'
    ? '.'
    : `.${specifier.slice('@kerfjs/ui'.length)}`;
}
for (const entry of entries) {
  for (const key of [
    'browserImport',
    'manualCssImport',
    'registrationImport',
    'themeCssImport',
  ]) {
    const specifier = entry.delivery[key];
    if (!specifier || !specifier.startsWith('@kerfjs/ui')) continue;
    const subpath = packageSubpath(specifier);
    if (!(subpath in packageJson.exports))
      fail(`${entry.id} has stale ${key} ${specifier}`);
    if (key === 'manualCssImport') {
      const target = packageJson.exports[subpath];
      if (typeof target !== 'string')
        fail(`${entry.id} manual CSS export ${specifier} is not a file target`);
      else {
        try {
          await access(resolve(root, target));
        } catch {
          fail(`${entry.id} manual CSS target ${target} does not exist`);
        }
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
const webAwesomeEntries = entries.filter(
  (entry) => entry.source === 'webawesome',
);
const catalogTags = webAwesomeEntries
  .map((entry) => entry.customElement)
  .sort();
if (JSON.stringify(manifestTags) !== JSON.stringify(catalogTags))
  fail(
    'Web Awesome entries must exactly match the installed custom-elements manifest',
  );
const declaredTags = [...webAwesomeTypesSource.matchAll(/^\s+'(wa-[^']+)':/gm)]
  .map((match) => match[1])
  .sort();
if (new Set(declaredTags).size !== declaredTags.length)
  fail('Web Awesome JSX declarations must not contain duplicate tags');
if (JSON.stringify(declaredTags) !== JSON.stringify(catalogTags))
  fail('Web Awesome JSX declarations must exactly match the supported catalog');
const typesSubpath = packageSubpath('@kerfjs/ui/webawesome');
const typesExport = packageJson.exports[typesSubpath];
if (
  !typesExport ||
  typeof typesExport !== 'object' ||
  typesExport.types !== './dist/webawesome.d.ts' ||
  typesExport.import !== './dist/webawesome.js'
) {
  fail(
    'Web Awesome JSX declarations must be exported from the side-effect-free @kerfjs/ui/webawesome subpath',
  );
}
for (const entry of webAwesomeEntries) {
  const manifestEntry = manifestElements.find(
    ({ tag }) => tag === entry.customElement,
  );
  const expected =
    manifestEntry && `@awesome.me/webawesome/dist/${manifestEntry.module}`;
  if (entry.delivery.registrationImport !== expected)
    fail(
      `${entry.id} has stale Web Awesome registration import ${entry.delivery.registrationImport}`,
    );
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

async function validateDocumentLink(owner, key, link) {
  const [path, fragment] = link.split('#');
  const targetPath = resolve(root, path);
  let target;
  try {
    target = await readFile(targetPath, 'utf8');
  } catch {
    fail(`${owner} has broken ${key} link ${link}`);
    return;
  }
  if (fragment && ['.md', '.txt'].includes(extname(targetPath))) {
    const headings = [...target.matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) =>
      githubSlug(match[1]),
    );
    if (!headings.includes(fragment))
      fail(`${owner} has broken ${key} heading ${link}`);
  }
}

for (const entry of entries) {
  for (const key of ['documentation', 'recipe']) {
    await validateDocumentLink(entry.id, key, entry.links[key]);
  }
}
for (const entry of catalogV2.entries) {
  if (entry.provenance.composition !== 'generated-permissive-default')
    await validateDocumentLink(
      entry.key,
      'composition provenance',
      entry.provenance.composition,
    );
}
await validateDocumentLink(
  'Catalog authoring discovery',
  'authoritativeGuide',
  catalogAuthoring.authoritativeGuide,
);
await validateDocumentLink(
  'Catalog authoring discovery',
  'apiSignatures',
  catalogAuthoring.apiSignatures,
);

for (const entry of entries.filter(
  (candidate) => candidate.source === 'kerf',
)) {
  const cssImport = entry.delivery.manualCssImport;
  if (!cssImport) continue;
  const target = packageJson.exports[packageSubpath(cssImport)];
  const file = cssImport.slice('@kerfjs/ui/'.length);
  if (target !== `./dist/styles/${file}`)
    fail(`${entry.id} has stale generated CSS export ${String(target)}`);
  const css = await readFile(resolve(root, 'src', file), 'utf8');
  for (const className of entry.publicClasses ?? []) {
    if (!css.includes(`.${className}`))
      fail(`${entry.id} names missing public class ${className}`);
  }
  for (const token of entry.publicTokens ?? []) {
    if (!css.includes(token))
      fail(`${entry.id} names missing public token ${token}`);
  }
}

if (failures.length > 0) {
  console.error('[check-component-catalog] Component catalog drifted:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `[check-component-catalog] OK — ${entries.length} entries (${entries.filter(({ kind }) => kind !== 'recipe').length} with geometry ownership), ${runtimeExports.length} public values, ${browserImports.length} browser subpaths, and ${manifestTags.length} Web Awesome elements/declarations are synchronized.`,
  );
}
