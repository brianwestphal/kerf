// Catalog generation: author metadata in, deterministic composition (and
// optional selection) catalogs out, every problem collected into one
// CatalogError rather than stopping at the first.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import process from 'node:process';

import { validateDocumentAgainstSchema } from './schema-validate.js';
import { catalogSchema, metadataSchema, selectionSchema } from './schemas.js';
import { buildSelectionCatalog, posixRelative } from './selection.js';
import { validateComponent } from './validate-component.js';
import {
  CatalogError,
  CONFIG_KEY,
  configuredPackages,
  readJson,
} from './workspace.js';

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
    ...(component.composition.rendersAs
      ? { rendersAs: component.composition.rendersAs }
      : {}),
    ...(component.composition.insetFreeChildren
      ? { insetFreeChildren: component.composition.insetFreeChildren }
      : {}),
    ...(component.composition.insetFreeWhen
      ? { insetFreeWhen: component.composition.insetFreeWhen }
      : {}),
    ...(component.composition.content
      ? { content: component.composition.content }
      : {}),
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

// The catalog keys a package's `rendersAs` may name: entries generated in this
// run, or those of an installed dependency's shipped catalog (its
// package.json#kerfComponentCatalog.output, or @kerfjs/ui's ai/ catalog).
function dependencyCatalogKeys(packageRoot, packageName, cache) {
  const cacheKey = `${packageRoot}\0${packageName}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  let keys;
  for (let dir = packageRoot; ; dir = dirname(dir)) {
    const manifestPath = join(dir, 'node_modules', packageName, 'package.json');
    if (existsSync(manifestPath)) {
      keys = installedCatalogKeys(manifestPath);
      break;
    }
    if (dirname(dir) === dir) break;
  }
  cache.set(cacheKey, keys);
  return keys;
}

// The entry keys of one installed package's catalog; undefined when it has
// none that can be read.
function installedCatalogKeys(manifestPath) {
  const dependencyRoot = dirname(manifestPath);
  let catalogPath;
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (manifest[CONFIG_KEY]?.output)
      catalogPath = resolve(dependencyRoot, manifest[CONFIG_KEY].output);
  } catch {
    // An unreadable manifest falls back to the @kerfjs/ui catalog location.
  }
  catalogPath ??= join(dependencyRoot, 'ai', 'component-composition.json');
  try {
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
    return new Set(
      (catalog.entries ?? []).map(
        (entry) => entry.key ?? `${catalog.package}:${entry.id}`,
      ),
    );
  } catch {
    // No readable catalog: the package stays unresolved.
    return undefined;
  }
}

function validateRendersAs(results, diagnostics) {
  const generated = new Map(
    results.map(({ catalog }) => [
      catalog.package,
      new Set(catalog.entries.map((entry) => entry.key)),
    ]),
  );
  const cache = new Map();
  for (const { packageRoot, metadataPath, catalog } of results)
    for (const entry of catalog.entries)
      for (const root of entry.rendersAs ?? []) {
        const at = `${metadataPath}: components.${entry.id}.composition.rendersAs`;
        const rootPackage = root.slice(0, root.lastIndexOf(':'));
        if (root === entry.key) {
          diagnostics.push(`${at}: ${root} names the component itself`);
          continue;
        }
        const keys =
          generated.get(rootPackage) ??
          dependencyCatalogKeys(packageRoot, rootPackage, cache);
        if (!keys)
          diagnostics.push(
            `${at}: cannot resolve a component catalog for package ${rootPackage}; install it or generate its catalog`,
          );
        else if (!keys.has(root))
          diagnostics.push(
            `${at}: ${root} is not an entry in ${rootPackage}'s catalog`,
          );
      }
}

// A package's `kerfComponentCatalog` settings: `source` and `output` are
// required, and a `selectionOutput` must be a path distinct from `output`.
function validatePackageConfig(
  packageRoot,
  packagePath,
  packageJson,
  packageNames,
  diagnostics,
) {
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
  if (
    config?.selectionOutput !== undefined &&
    (typeof config.selectionOutput !== 'string' ||
      !config.selectionOutput ||
      resolve(packageRoot, config.selectionOutput) ===
        resolve(packageRoot, config.output ?? ''))
  )
    diagnostics.push(
      `${packagePath}#${CONFIG_KEY}.selectionOutput: expected a path distinct from output`,
    );
  return config;
}

// Generate one configured package's catalogs; null when its metadata cannot
// be read or fails its schema (those diagnostics are already recorded).
function generatePackage(packageRoot, packageNames, diagnostics) {
  const packagePath = join(packageRoot, 'package.json');
  const packageJson = readJson(packagePath, packagePath, diagnostics);
  if (!packageJson) return null;
  const config = validatePackageConfig(
    packageRoot,
    packagePath,
    packageJson,
    packageNames,
    diagnostics,
  );
  if (!config?.source || !config?.output) return null;
  const metadataPath = resolve(packageRoot, config.source);
  const metadata = readJson(metadataPath, metadataPath, diagnostics);
  if (!metadata) return null;
  const metadataDiagnostics = validateDocumentAgainstSchema(
    metadata,
    metadataSchema,
    metadataPath,
  );
  diagnostics.push(...metadataDiagnostics);
  if (metadataDiagnostics.length) return null;

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
  const outputPath = resolve(packageRoot, config.output);
  const selectionOutputPath =
    typeof config.selectionOutput === 'string' && config.selectionOutput
      ? resolve(packageRoot, config.selectionOutput)
      : null;
  const selection = buildSelectionCatalog({
    packageRoot,
    packageJson,
    metadata,
    metadataPath,
    outputPath,
    selectionOutputPath,
    diagnostics,
  });
  const componentCatalog = selectionOutputPath
    ? posixRelative(dirname(outputPath), selectionOutputPath)
    : (metadata.componentCatalog ?? 'not-applicable');
  const catalog = {
    $schema:
      'https://raw.githubusercontent.com/brianwestphal/kerf/main/ui/ai/component-composition-extension.schema.json',
    schemaVersion: 1,
    package: packageJson.name,
    compatibility: {
      componentCatalog,
      identity: 'package:id',
    },
    entries,
  };
  diagnostics.push(
    ...validateDocumentAgainstSchema(catalog, catalogSchema, outputPath),
  );
  return {
    packageRoot,
    metadataPath,
    outputPath,
    catalog,
    ...(selection ? { selectionOutputPath, selection } : {}),
  };
}

/** Generate every configured package's catalogs under `root`, or throw. */
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
    const result = generatePackage(packageRoot, packageNames, diagnostics);
    if (result) results.push(result);
  }
  validateRendersAs(results, diagnostics);
  if (diagnostics.length) throw new CatalogError(diagnostics.sort());
  return results;
}

export function formatCatalog(catalog) {
  return `${JSON.stringify(catalog, null, 2)}\n`;
}

function checkOutput(path, catalog, schema, label, diagnostics) {
  if (!existsSync(path)) {
    diagnostics.push(`${path}: generated ${label} is missing`);
    return;
  }
  const actualSource = readFileSync(path, 'utf8');
  const actual = readJson(path, path, diagnostics);
  if (actual)
    diagnostics.push(...validateDocumentAgainstSchema(actual, schema, path));
  if (actualSource !== formatCatalog(catalog))
    diagnostics.push(
      `${path}: generated ${label} is stale; run catalog:generate`,
    );
}

/** Write (or with `check`, verify) every generated catalog under `root`. */
export function runCatalogCommand({
  root = process.cwd(),
  check = false,
} = {}) {
  const results = generateCatalogs(root);
  const diagnostics = [];
  for (const result of results) {
    const outputs = [
      [result.outputPath, result.catalog, catalogSchema, 'catalog'],
    ];
    if (result.selection)
      outputs.push([
        result.selectionOutputPath,
        result.selection,
        selectionSchema,
        'selection catalog',
      ]);
    for (const [path, catalog, schema, label] of outputs) {
      if (check) checkOutput(path, catalog, schema, label, diagnostics);
      else writeFileSync(path, formatCatalog(catalog));
    }
  }
  if (diagnostics.length) throw new CatalogError(diagnostics);
  return results;
}
