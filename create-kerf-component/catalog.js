#!/usr/bin/env node

import {
  existsSync,
  readFileSync,
  realpathSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const CONFIG_KEY = 'kerfComponentCatalog';
const ignoredDirectories = new Set(['.git', 'dist', 'node_modules']);
const scriptRoot = dirname(fileURLToPath(import.meta.url));
const metadataSchema = JSON.parse(
  readFileSync(join(scriptRoot, 'component-metadata.schema.json'), 'utf8'),
);
const catalogSchema = JSON.parse(
  readFileSync(join(scriptRoot, 'component-catalog-v2.schema.json'), 'utf8'),
);

export class CatalogError extends Error {
  constructor(diagnostics) {
    super(diagnostics.join('\n'));
    this.name = 'CatalogError';
    this.diagnostics = diagnostics;
  }
}

function readJson(path, label, diagnostics) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    diagnostics.push(`${label}: ${error.message}`);
    return null;
  }
}

function schemaReference(rootSchema, reference) {
  if (!reference.startsWith('#/'))
    throw new Error(`unsupported schema reference ${reference}`);
  return reference
    .slice(2)
    .split('/')
    .map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce((value, part) => value?.[part], rootSchema);
}

function schemaTypeMatches(value, type) {
  if (type === 'array') return Array.isArray(value);
  if (type === 'object')
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (type === 'integer') return Number.isInteger(value);
  return typeof value === type;
}

function validateSchemaValue(value, rule, path, rootSchema, diagnostics) {
  if (rule.$ref) {
    const referenced = schemaReference(rootSchema, rule.$ref);
    if (!referenced) {
      diagnostics.push(`${path}: schema reference ${rule.$ref} does not exist`);
      return;
    }
    validateSchemaValue(value, referenced, path, rootSchema, diagnostics);
    return;
  }
  if (rule.allOf) {
    for (const candidate of rule.allOf)
      validateSchemaValue(value, candidate, path, rootSchema, diagnostics);
  }
  if (rule.anyOf) {
    const alternatives = rule.anyOf.map((candidate) => {
      const failures = [];
      validateSchemaValue(value, candidate, path, rootSchema, failures);
      return failures;
    });
    if (alternatives.every((failures) => failures.length))
      diagnostics.push(`${path}: does not match any allowed schema variant`);
    return;
  }
  if (rule.const !== undefined && value !== rule.const)
    diagnostics.push(`${path}: expected ${JSON.stringify(rule.const)}`);
  if (rule.enum && !rule.enum.includes(value))
    diagnostics.push(
      `${path}: expected one of ${rule.enum.map((item) => JSON.stringify(item)).join(', ')}`,
    );
  if (rule.type && !schemaTypeMatches(value, rule.type)) {
    diagnostics.push(`${path}: expected ${rule.type}`);
    return;
  }
  if (typeof value === 'string') {
    if (rule.minLength !== undefined && value.length < rule.minLength)
      diagnostics.push(
        `${path}: expected at least ${rule.minLength} character(s)`,
      );
    if (rule.pattern && !new RegExp(rule.pattern).test(value))
      diagnostics.push(`${path}: must match ${rule.pattern}`);
  }
  if (typeof value === 'number' && rule.minimum !== undefined) {
    if (value < rule.minimum)
      diagnostics.push(`${path}: expected a value >= ${rule.minimum}`);
  }
  if (Array.isArray(value)) {
    if (rule.minItems !== undefined && value.length < rule.minItems)
      diagnostics.push(`${path}: expected at least ${rule.minItems} item(s)`);
    if (rule.uniqueItems) {
      const serialized = value.map((item) => JSON.stringify(item));
      if (new Set(serialized).size !== serialized.length)
        diagnostics.push(`${path}: expected unique items`);
    }
    if (rule.items)
      value.forEach((item, index) =>
        validateSchemaValue(
          item,
          rule.items,
          `${path}[${index}]`,
          rootSchema,
          diagnostics,
        ),
      );
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of rule.required ?? [])
      if (!(key in value)) diagnostics.push(`${path}.${key}: is required`);
    const properties = rule.properties ?? {};
    for (const [key, item] of Object.entries(value)) {
      if (key in properties)
        validateSchemaValue(
          item,
          properties[key],
          `${path}.${key}`,
          rootSchema,
          diagnostics,
        );
      else if (rule.additionalProperties === false)
        diagnostics.push(`${path}.${key}: additional property is not allowed`);
    }
  }
}

export function validateDocumentAgainstSchema(value, schema, path) {
  const diagnostics = [];
  validateSchemaValue(value, schema, path, schema, diagnostics);
  return diagnostics;
}

function expandWorkspace(root, pattern) {
  const normalized = pattern.replaceAll('/', sep);
  if (!normalized.includes('*')) return [resolve(root, normalized)];
  const star = normalized.indexOf('*');
  const parent = resolve(root, normalized.slice(0, star));
  const suffix = normalized.slice(star + 1);
  if (!existsSync(parent)) return [];
  return readdirSync(parent, { withFileTypes: true })
    .filter(
      (entry) => entry.isDirectory() && !ignoredDirectories.has(entry.name),
    )
    .map((entry) => resolve(parent, entry.name + suffix))
    .filter((path) => existsSync(path) && statSync(path).isDirectory());
}

function configuredPackages(root, diagnostics) {
  const rootPackagePath = join(root, 'package.json');
  const rootPackage = readJson(rootPackagePath, rootPackagePath, diagnostics);
  if (!rootPackage) return [];
  const packages = rootPackage[CONFIG_KEY] ? [root] : [];
  const workspacePatterns = Array.isArray(rootPackage.workspaces)
    ? rootPackage.workspaces
    : (rootPackage.workspaces?.packages ?? []);
  for (const pattern of workspacePatterns) {
    for (const packageRoot of expandWorkspace(root, pattern)) {
      const packagePath = join(packageRoot, 'package.json');
      if (!existsSync(packagePath)) continue;
      const packageJson = readJson(packagePath, packagePath, diagnostics);
      if (packageJson?.[CONFIG_KEY]) packages.push(packageRoot);
    }
  }
  return [...new Set(packages)].sort();
}

function valueAt(value, path) {
  return path.split('.').reduce((current, part) => current?.[part], value);
}

function requireDecision(component, path, at, diagnostics) {
  const value = valueAt(component, path);
  if (value === undefined || value === null || value === '') {
    diagnostics.push(
      `${at}.${path}: author decision required; the generator does not infer semantics or geometry from rendered appearance`,
    );
  }
}

let typescript;

function typescriptApi() {
  if (typescript) return typescript;
  try {
    typescript = createRequire(import.meta.url)('typescript');
    return typescript;
  } catch {
    throw new Error(
      'TypeScript is required for syntax-aware export verification; run npm install before catalog generation.',
    );
  }
}

function hasModifier(ts, node, kind) {
  return Boolean(node.modifiers?.some((modifier) => modifier.kind === kind));
}

function bindingNames(ts, name, names) {
  if (ts.isIdentifier(name)) names.add(name.text);
  else
    for (const element of name.elements ?? [])
      if (!ts.isOmittedExpression(element))
        bindingNames(ts, element.name, names);
}

export function exportedNamesFromSource(source, fileName = 'component.tsx') {
  const ts = typescriptApi();
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith('.tsx') || fileName.endsWith('.jsx')
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS,
  );
  if (sourceFile.parseDiagnostics.length) {
    const diagnostic = sourceFile.parseDiagnostics[0];
    const point = sourceFile.getLineAndCharacterOfPosition(
      diagnostic.start ?? 0,
    );
    throw new Error(
      `${fileName}:${point.line + 1}:${point.character + 1}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`,
    );
  }
  const names = new Set();
  for (const statement of sourceFile.statements) {
    if (ts.isExportDeclaration(statement)) {
      if (!statement.exportClause) continue;
      if (ts.isNamedExports(statement.exportClause))
        for (const element of statement.exportClause.elements)
          names.add(element.name.text);
      continue;
    }
    if (
      !hasModifier(ts, statement, ts.SyntaxKind.ExportKeyword) ||
      hasModifier(ts, statement, ts.SyntaxKind.DefaultKeyword)
    )
      continue;
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations)
        bindingNames(ts, declaration.name, names);
    } else if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isEnumDeclaration(statement) ||
        ts.isModuleDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement)) &&
      statement.name
    )
      names.add(statement.name.text);
  }
  return names;
}

function exportedNamesFromFile(path) {
  return exportedNamesFromSource(readFileSync(path, 'utf8'), path);
}

function sourceEntryForExport(packageRoot, definition) {
  const target =
    typeof definition === 'string'
      ? definition
      : (definition?.import ?? definition?.default);
  if (typeof target !== 'string' || !target.startsWith('./dist/')) return null;
  const stem = target.slice('./dist/'.length).replace(/\.(?:mjs|cjs|js)$/, '');
  for (const extension of ['.ts', '.tsx', '.mts', '.js', '.jsx', '.mjs']) {
    const candidate = join(packageRoot, 'src', `${stem}${extension}`);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function validateStringList(value, at, diagnostics, { nonempty = false } = {}) {
  if (
    !Array.isArray(value) ||
    (nonempty && value.length === 0) ||
    value.some((item) => typeof item !== 'string' || item.length === 0) ||
    new Set(value).size !== value.length
  )
    diagnostics.push(
      `${at}: expected a${nonempty ? ' non-empty' : ''} unique string list`,
    );
}

function validateComposition(component, at, diagnostics) {
  const composition = component.composition ?? {};
  if (!['any', 'root', 'listed'].includes(composition.parents?.mode))
    diagnostics.push(`${at}.composition.parents.mode: invalid parent mode`);
  validateStringList(
    composition.parents?.entries,
    `${at}.composition.parents.entries`,
    diagnostics,
    { nonempty: composition.parents?.mode === 'listed' },
  );
  validateStringList(
    composition.contexts,
    `${at}.composition.contexts`,
    diagnostics,
  );
  if (!Array.isArray(composition.zones))
    diagnostics.push(`${at}.composition.zones: expected an array`);
  const zoneIds = new Set();
  for (const zone of composition.zones ?? []) {
    const zoneAt = `${at}.composition.zones.${zone?.id ?? '<unknown>'}`;
    if (!zone?.id || zoneIds.has(zone.id))
      diagnostics.push(`${zoneAt}.id: expected a unique non-empty id`);
    zoneIds.add(zone?.id);
    validateStringList(zone?.accepts, `${zoneAt}.accepts`, diagnostics, {
      nonempty: true,
    });
    const { min, max } = zone?.cardinality ?? {};
    if (!Number.isInteger(min) || min < 0)
      diagnostics.push(
        `${zoneAt}.cardinality.min: expected a non-negative integer`,
      );
    if (max !== 'unbounded' && (!Number.isInteger(max) || max < 1 || max < min))
      diagnostics.push(
        `${zoneAt}.cardinality.max: expected unbounded or an integer >= min`,
      );
    validateStringList(
      zone?.exclusiveWith,
      `${zoneAt}.exclusiveWith`,
      diagnostics,
    );
  }
  for (const zone of composition.zones ?? [])
    for (const other of zone?.exclusiveWith ?? [])
      if (other === zone.id || !zoneIds.has(other))
        diagnostics.push(
          `${at}.composition.zones.${zone.id}.exclusiveWith: unknown or self-referential zone ${other}`,
        );

  if (!['any', 'none', 'listed'].includes(composition.children?.mode))
    diagnostics.push(`${at}.composition.children.mode: invalid child mode`);
  validateStringList(
    composition.children?.concepts,
    `${at}.composition.children.concepts`,
    diagnostics,
    { nonempty: composition.children?.mode === 'listed' },
  );
  validateStringList(
    composition.children?.requiredConcepts,
    `${at}.composition.children.requiredConcepts`,
    diagnostics,
  );
  for (const required of composition.children?.requiredConcepts ?? [])
    if (!composition.children.concepts?.includes(required))
      diagnostics.push(
        `${at}.composition.children.requiredConcepts: ${required} is not an allowed concept`,
      );

  if (!Array.isArray(composition.state))
    diagnostics.push(`${at}.composition.state: expected an array`);
  const stateIds = new Set();
  for (const state of composition.state ?? []) {
    if (!state?.id || stateIds.has(state.id))
      diagnostics.push(
        `${at}.composition.state: state ids must be unique and non-empty`,
      );
    stateIds.add(state?.id);
    if (!['application', 'controlled', 'component'].includes(state?.owner))
      diagnostics.push(
        `${at}.composition.state.${state?.id}.owner: invalid owner`,
      );
    if (typeof state?.required !== 'boolean')
      diagnostics.push(
        `${at}.composition.state.${state?.id}.required: expected boolean`,
      );
  }
  if (typeof composition.wiring?.required !== 'boolean')
    diagnostics.push(`${at}.composition.wiring.required: expected boolean`);
  validateStringList(
    composition.wiring?.helpers,
    `${at}.composition.wiring.helpers`,
    diagnostics,
    { nonempty: composition.wiring?.required === true },
  );
  validateStringList(
    composition.wiring?.obligations,
    `${at}.composition.wiring.obligations`,
    diagnostics,
  );
  if (
    !['application', 'component', 'shared', 'not-applicable'].includes(
      composition.responsive?.owner,
    )
  )
    diagnostics.push(`${at}.composition.responsive.owner: invalid owner`);
  validateStringList(
    composition.responsive?.behaviors,
    `${at}.composition.responsive.behaviors`,
    diagnostics,
  );
  validateStringList(
    composition.layout?.roles,
    `${at}.composition.layout.roles`,
    diagnostics,
    { nonempty: true },
  );
  const geometryOwners = [
    'self',
    'parent',
    'child',
    'none',
    'conditional',
    'composed',
  ];
  for (const dimension of ['margin', 'border', 'padding'])
    if (!geometryOwners.includes(composition.layout?.geometry?.[dimension]))
      diagnostics.push(
        `${at}.composition.layout.geometry.${dimension}: invalid geometry owner`,
      );
  if ('notes' in (composition.layout?.geometry ?? {}))
    validateStringList(
      composition.layout.geometry.notes,
      `${at}.composition.layout.geometry.notes`,
      diagnostics,
    );
}

function validateComponent(
  component,
  packageRoot,
  packageJson,
  ids,
  diagnosticIds,
  diagnostics,
) {
  const at = `${packageJson.name}:${component?.id ?? '<unknown>'}`;
  for (const path of [
    'id',
    'name',
    'kind',
    'purpose',
    'source',
    'publicExports',
    'sourceLinks',
    'composition.parents.mode',
    'composition.parents.entries',
    'composition.contexts',
    'composition.zones',
    'composition.children.mode',
    'composition.children.concepts',
    'composition.children.requiredConcepts',
    'composition.state',
    'composition.wiring.required',
    'composition.wiring.helpers',
    'composition.wiring.obligations',
    'composition.responsive.owner',
    'composition.responsive.behaviors',
    'composition.layout.roles',
    'composition.layout.geometry.margin',
    'composition.layout.geometry.border',
    'composition.layout.geometry.padding',
    'boundaries.rootClass',
    'boundaries.publicClasses',
    'boundaries.publicTokens',
    'accessibility.obligations',
    'diagnostics',
    'provenance.selection',
    'provenance.composition',
  ])
    requireDecision(component, path, at, diagnostics);

  if (!component?.id) return;
  if (ids.has(component.id))
    diagnostics.push(`${at}.id: duplicate component id`);
  ids.add(component.id);
  if (!['component', 'composition', 'recipe'].includes(component.kind))
    diagnostics.push(`${at}.kind: expected component, composition, or recipe`);
  const sourcePath = resolve(packageRoot, component.source ?? '');
  if (!component.source || !existsSync(sourcePath))
    diagnostics.push(`${at}.source: file does not exist: ${component.source}`);

  const exports = packageJson.exports ?? {};
  if (
    !Array.isArray(component.publicExports) ||
    !component.publicExports.length
  )
    diagnostics.push(`${at}.publicExports: expected a non-empty array`);
  else {
    const seen = new Set();
    for (const item of component.publicExports) {
      const exportAt = `${at}.publicExports`;
      if (!item?.name || typeof item?.subpath !== 'string') {
        diagnostics.push(`${exportAt}: every export requires name and subpath`);
        continue;
      }
      const key = `${item.subpath}:${item.name}`;
      if (seen.has(key)) diagnostics.push(`${exportAt}: duplicate ${key}`);
      seen.add(key);
      if (!(item.subpath in exports))
        diagnostics.push(
          `${exportAt}: package.json does not export subpath ${item.subpath}`,
        );
      const sourceEntry = sourceEntryForExport(
        packageRoot,
        exports[item.subpath],
      );
      if (!sourceEntry)
        diagnostics.push(
          `${exportAt}: cannot map ${item.subpath} to an existing src/ entry`,
        );
      else if (!exportedNamesFromFile(sourceEntry).has(item.name))
        diagnostics.push(
          `${exportAt}: ${item.name} is not exported by ${relative(packageRoot, sourceEntry)}`,
        );
    }
  }
  validateStringList(component.sourceLinks, `${at}.sourceLinks`, diagnostics, {
    nonempty: true,
  });
  for (const link of component.sourceLinks ?? []) {
    if (/^[a-z]+:/i.test(link)) continue;
    const localPath = link.split('#')[0];
    if (localPath && !existsSync(resolve(packageRoot, localPath)))
      diagnostics.push(
        `${at}.sourceLinks: local source link does not exist: ${link}`,
      );
  }
  validateComposition(component, at, diagnostics);
  validateStringList(
    component.boundaries?.publicClasses,
    `${at}.boundaries.publicClasses`,
    diagnostics,
  );
  if (
    component.boundaries?.rootClass !== null &&
    (typeof component.boundaries?.rootClass !== 'string' ||
      !component.boundaries.publicClasses?.includes(
        component.boundaries.rootClass,
      ))
  )
    diagnostics.push(
      `${at}.boundaries.rootClass: expected null or one publicClasses entry`,
    );
  validateStringList(
    component.boundaries?.publicTokens,
    `${at}.boundaries.publicTokens`,
    diagnostics,
  );
  validateStringList(
    component.accessibility?.obligations,
    `${at}.accessibility.obligations`,
    diagnostics,
  );
  if (!Array.isArray(component.diagnostics))
    diagnostics.push(`${at}.diagnostics: expected an array`);
  for (const diagnostic of component.diagnostics ?? []) {
    if (
      !/^KUI-C[0-9]{3}$/.test(diagnostic?.id ?? '') ||
      diagnosticIds.has(diagnostic.id)
    )
      diagnostics.push(`${at}.diagnostics: ids must be unique KUI-C### values`);
    diagnosticIds.add(diagnostic?.id);
    if (!['error', 'warning'].includes(diagnostic?.severity))
      diagnostics.push(
        `${at}.diagnostics.${diagnostic?.id}.severity: invalid severity`,
      );
    if (!diagnostic?.when || !diagnostic?.message)
      diagnostics.push(
        `${at}.diagnostics.${diagnostic?.id}: when and message are required`,
      );
  }
}

function toEntry(packageName, component) {
  return {
    key: `${packageName}:${component.id}`,
    package: packageName,
    id: component.id,
    name: component.name,
    kind: component.kind,
    purpose: component.purpose,
    publicExports: component.publicExports,
    sourceLinks: component.sourceLinks,
    source: component.source,
    parents: component.composition.parents,
    contexts: component.composition.contexts,
    zones: component.composition.zones,
    children: component.composition.children,
    state: component.composition.state,
    wiring: component.composition.wiring,
    responsive: component.composition.responsive,
    layout: component.composition.layout,
    accessibility: component.accessibility,
    boundaries: component.boundaries,
    diagnostics: component.diagnostics,
    provenance: component.provenance,
  };
}

export function generateCatalogs(root = process.cwd()) {
  const diagnostics = [];
  const packages = configuredPackages(resolve(root), diagnostics);
  if (!packages.length && !diagnostics.length)
    diagnostics.push(
      `${relative(process.cwd(), resolve(root)) || '.'}: no package declares package.json#${CONFIG_KEY}`,
    );
  const results = [];
  const packageNames = new Set();
  for (const packageRoot of packages) {
    const packagePath = join(packageRoot, 'package.json');
    const packageJson = readJson(packagePath, packagePath, diagnostics);
    if (!packageJson) continue;
    const config = packageJson[CONFIG_KEY];
    if (!packageJson.name)
      diagnostics.push(`${packagePath}: package name is required`);
    if (packageNames.has(packageJson.name))
      diagnostics.push(
        `${packagePath}: duplicate configured package name ${packageJson.name}`,
      );
    packageNames.add(packageJson.name);
    for (const key of ['source', 'output'])
      if (!config?.[key])
        diagnostics.push(`${packagePath}#${CONFIG_KEY}.${key}: is required`);
    if (!config?.source || !config?.output) continue;
    const metadataPath = resolve(packageRoot, config.source);
    const metadata = readJson(metadataPath, metadataPath, diagnostics);
    if (!metadata) continue;
    const metadataDiagnostics = validateDocumentAgainstSchema(
      metadata,
      metadataSchema,
      metadataPath,
    );
    diagnostics.push(...metadataDiagnostics);
    if (metadataDiagnostics.length) {
      continue;
    }
    const ids = new Set();
    const diagnosticIds = new Set();
    for (const component of metadata.components)
      validateComponent(
        component,
        packageRoot,
        packageJson,
        ids,
        diagnosticIds,
        diagnostics,
      );
    const entries = [...metadata.components]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((component) => toEntry(packageJson.name, component));
    const catalog = {
      $schema:
        'https://raw.githubusercontent.com/brianwestphal/kerf/main/ui/ai/component-catalog-extension-v2.schema.json',
      schemaVersion: 2,
      package: packageJson.name,
      compatibility: {
        v1Catalog: metadata.v1Catalog ?? 'not-applicable',
        identity: 'package:id',
      },
      entries,
    };
    diagnostics.push(
      ...validateDocumentAgainstSchema(
        catalog,
        catalogSchema,
        resolve(packageRoot, config.output),
      ),
    );
    results.push({
      packageRoot,
      outputPath: resolve(packageRoot, config.output),
      catalog,
    });
  }
  if (diagnostics.length) throw new CatalogError(diagnostics.sort());
  return results;
}

export function formatCatalog(catalog) {
  return `${JSON.stringify(catalog, null, 2)}\n`;
}

export function runCatalogCommand({
  root = process.cwd(),
  check = false,
} = {}) {
  const results = generateCatalogs(root);
  const diagnostics = [];
  for (const result of results) {
    const expected = formatCatalog(result.catalog);
    if (check) {
      if (!existsSync(result.outputPath))
        diagnostics.push(`${result.outputPath}: generated catalog is missing`);
      else {
        const actualSource = readFileSync(result.outputPath, 'utf8');
        const actual = readJson(
          result.outputPath,
          result.outputPath,
          diagnostics,
        );
        if (actual)
          diagnostics.push(
            ...validateDocumentAgainstSchema(
              actual,
              catalogSchema,
              result.outputPath,
            ),
          );
        if (actualSource !== expected)
          diagnostics.push(
            `${result.outputPath}: generated catalog is stale; run catalog:generate`,
          );
      }
    } else {
      writeFileSync(result.outputPath, expected);
    }
  }
  if (diagnostics.length) throw new CatalogError(diagnostics);
  return results;
}

function parseArgs(argv) {
  let root = process.cwd();
  let check = false;
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--check') check = true;
    else if (arg === '--write') check = false;
    else if (arg === '--root' && argv[index + 1]) root = resolve(argv[++index]);
    else if (arg === '--help' || arg === '-h') {
      process.stdout.write(
        'Usage: kerf-component-catalog [--write|--check] [--root <package-or-workspace>]\n',
      );
      process.exit(0);
    } else throw new CatalogError([`unknown argument: ${arg}`]);
  }
  return { root, check };
}

const isMain =
  process.argv[1] &&
  realpathSync(process.argv[1]) ===
    realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  try {
    const options = parseArgs(process.argv);
    const results = runCatalogCommand(options);
    const verb = options.check ? 'verified' : 'wrote';
    for (const result of results)
      process.stdout.write(
        `${verb} ${relative(options.root, result.outputPath)}\n`,
      );
  } catch (error) {
    const diagnostics =
      error instanceof CatalogError ? error.diagnostics : [error.message];
    for (const diagnostic of diagnostics)
      process.stderr.write(`kerf-component-catalog: ${diagnostic}\n`);
    process.exitCode = 1;
  }
}
