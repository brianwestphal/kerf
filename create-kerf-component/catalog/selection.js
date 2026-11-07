// The selection catalog (the @kerfjs/ui component-catalog extension) shares
// identity, purpose, boundaries, and geometry with the composition metadata,
// so only the selection-only facts live in each component's `selection` block.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

import { validateDocumentAgainstSchema } from './schema-validate.js';
import { selectionSchema } from './schemas.js';
import { CONFIG_KEY } from './workspace.js';

function selectionGeometry(component) {
  if (component.selection?.geometry) return component.selection.geometry;
  const { notes, ...owners } = component.composition.layout.geometry;
  return notes?.length ? { ...owners, notes } : owners;
}

function toSelectionEntry(component) {
  const { selection, boundaries } = component;
  return {
    id: component.id,
    name: component.name,
    kind: component.kind,
    purpose: component.purpose,
    useWhen: selection.useWhen,
    avoidWhen: selection.avoidWhen,
    publicClasses: boundaries.publicClasses,
    publicTokens: boundaries.publicTokens,
    ...(selection.uses ? { uses: selection.uses } : {}),
    source: component.source,
    ...(selection.styleSources ? { styleSources: selection.styleSources } : {}),
    ...(selection.demoSource ? { demoSource: selection.demoSource } : {}),
    geometry: selectionGeometry(component),
    ...(selection.documentation
      ? { documentation: selection.documentation }
      : {}),
  };
}

// The @kerfjs/ui selection catalog ids an installed copy ships, which a
// selection entry's `uses` may name alongside the package's own ids.
function kerfSelectionIds(packageRoot) {
  for (let dir = packageRoot; ; dir = dirname(dir)) {
    const catalogPath = join(
      dir,
      'node_modules',
      '@kerfjs',
      'ui',
      'ai',
      'component-catalog.json',
    );
    if (existsSync(catalogPath)) {
      try {
        const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
        return new Set((catalog.entries ?? []).map((entry) => entry.id));
      } catch {
        return null;
      }
    }
    if (dirname(dir) === dir) return null;
  }
}

function localPathExists(packageRoot, link) {
  if (/^[a-z]+:/i.test(link)) return true;
  const localPath = link.split('#')[0];
  return !localPath || existsSync(resolve(packageRoot, localPath));
}

/** `to` relative to `from`, POSIX-separated and always `./`-prefixed. */
export function posixRelative(from, to) {
  const path = relative(from, to).split(sep).join('/');
  return path.startsWith('.') ? path : `./${path}`;
}

// Without a configured selectionOutput, selection-only metadata has nowhere to
// go, so it is an error rather than silently dropped.
function rejectUnusedSelection(metadata, at, diagnostics) {
  if (metadata.description !== undefined)
    diagnostics.push(
      `${at}: description is emitted only to a selection catalog; configure package.json#${CONFIG_KEY}.selectionOutput or remove it`,
    );
  for (const component of metadata.components)
    if (component.selection)
      diagnostics.push(
        `${at}: components.${component.id}.selection is emitted only to a selection catalog; configure package.json#${CONFIG_KEY}.selectionOutput or remove it`,
      );
}

function validatePackageSelection(
  metadata,
  at,
  outputPath,
  selectionOutputPath,
  diagnostics,
) {
  if (!metadata.description)
    diagnostics.push(
      `${at}.description: author decision required; the selection catalog needs a package description`,
    );
  const derived = posixRelative(dirname(outputPath), selectionOutputPath);
  if (
    metadata.componentCatalog !== undefined &&
    metadata.componentCatalog !== 'not-applicable' &&
    metadata.componentCatalog !== derived
  )
    diagnostics.push(
      `${at}.componentCatalog: ${metadata.componentCatalog} disagrees with the configured selectionOutput (${derived}); remove it or set it to "not-applicable"`,
    );
}

// One component's `selection` block. `kerfIds` lazily resolves the installed
// @kerfjs/ui ids only when a `uses` entry is not one of the package's own.
function validateComponentSelection(
  component,
  at,
  packageRoot,
  ownIds,
  kerfIds,
  diagnostics,
) {
  const componentAt = `${at}: components.${component.id}.selection`;
  if (component.kind === 'recipe') {
    if (component.selection)
      diagnostics.push(
        `${componentAt}: recipes are not selection catalog entries; remove it`,
      );
    return;
  }
  if (!component.selection) {
    diagnostics.push(
      `${componentAt}: author decision required; selectionOutput is configured, so every component and composition needs useWhen and avoidWhen`,
    );
    return;
  }
  const { selection } = component;
  if (
    !selection.geometry &&
    Object.values(component.composition.layout.geometry).includes('composed')
  )
    diagnostics.push(
      `${componentAt}.geometry: required because composition.layout.geometry uses "composed", which the selection catalog cannot express`,
    );
  for (const path of [
    ...(selection.styleSources ?? []),
    ...(selection.demoSource ? [selection.demoSource] : []),
    ...(selection.documentation ? [selection.documentation] : []),
  ])
    if (!localPathExists(packageRoot, path))
      diagnostics.push(`${componentAt}: local path does not exist: ${path}`);
  for (const use of selection.uses ?? []) {
    if (use === component.id)
      diagnostics.push(
        `${componentAt}.uses: ${use} names the component itself`,
      );
    else if (!ownIds.has(use)) {
      const ids = kerfIds();
      if (!ids)
        diagnostics.push(
          `${componentAt}.uses: cannot resolve ${use}; install @kerfjs/ui so its selection catalog ids can be checked`,
        );
      else if (!ids.has(use))
        diagnostics.push(
          `${componentAt}.uses: ${use} is neither a component in this package nor a @kerfjs/ui catalog entry`,
        );
    }
  }
}

/**
 * The package's selection catalog, or null when no selectionOutput is
 * configured. Problems are pushed onto `diagnostics`.
 */
export function buildSelectionCatalog({
  packageRoot,
  packageJson,
  metadata,
  metadataPath,
  outputPath,
  selectionOutputPath,
  diagnostics,
}) {
  const at = metadataPath;
  if (!selectionOutputPath) {
    rejectUnusedSelection(metadata, at, diagnostics);
    return null;
  }
  validatePackageSelection(
    metadata,
    at,
    outputPath,
    selectionOutputPath,
    diagnostics,
  );

  const selected = metadata.components.filter(
    (component) => component.kind !== 'recipe',
  );
  const ownIds = new Set(selected.map((component) => component.id));
  let resolvedKerfIds;
  let resolved = false;
  const kerfIds = () => {
    if (!resolved) {
      resolvedKerfIds = kerfSelectionIds(packageRoot);
      resolved = true;
    }
    return resolvedKerfIds;
  };
  for (const component of metadata.components)
    validateComponentSelection(
      component,
      at,
      packageRoot,
      ownIds,
      kerfIds,
      diagnostics,
    );
  if (ownIds.size)
    for (const id of ownIds)
      if (kerfIds()?.has(id))
        diagnostics.push(
          `${at}: components.${id}.id duplicates a @kerfjs/ui catalog id, which the selection catalog cannot disambiguate`,
        );

  const catalog = {
    $schema:
      'https://raw.githubusercontent.com/brianwestphal/kerf/main/ui/ai/component-catalog-extension.schema.json',
    schemaVersion: 1,
    package: packageJson.name,
    description: metadata.description,
    entries: selected
      .filter((component) => component.selection)
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(toSelectionEntry),
  };
  diagnostics.push(
    ...validateDocumentAgainstSchema(
      catalog,
      selectionSchema,
      selectionOutputPath,
    ),
  );
  return catalog;
}
