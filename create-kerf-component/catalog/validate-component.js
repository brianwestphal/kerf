// Semantic checks on one component's author metadata, beyond what its JSON
// schema can express: explicit author decisions, unique ids, files and exports
// that actually exist, and composition facts that agree with each other.
import { existsSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import {
  exportedNamesFromFile,
  sourceEntryForExport,
} from './export-discovery.js';

function valueAt(value, path) {
  return path.split('.').reduce((current, part) => current?.[part], value);
}

// Paths where an explicit `null` is itself the author's decision: a component
// whose root element belongs to another catalog (a `rendersAs` wrapper) or that
// exposes no public root class.
const NULLABLE_DECISIONS = new Set(['boundaries.rootClass']);

// The facts the generator never infers from rendered appearance.
const DECISION_PATHS = [
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
];

function requireDecision(component, path, at, diagnostics) {
  const value = valueAt(component, path);
  const explicitNull =
    value === null &&
    NULLABLE_DECISIONS.has(path) &&
    Object.hasOwn(
      valueAt(component, path.slice(0, path.lastIndexOf('.'))) ?? {},
      path.slice(path.lastIndexOf('.') + 1),
    );
  if (explicitNull) return;
  if (value === undefined || value === null || value === '') {
    diagnostics.push(
      `${at}.${path}: author decision required; the generator does not infer semantics or geometry from rendered appearance`,
    );
  }
}

export function validateStringList(
  value,
  at,
  diagnostics,
  { nonempty = false } = {},
) {
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

function validateZone(zone, at, zoneIds, zoneProps, diagnostics) {
  const zoneAt = `${at}.composition.zones.${zone?.id ?? '<unknown>'}`;
  if (!zone?.id || zoneIds.has(zone.id))
    diagnostics.push(`${zoneAt}.id: expected a unique non-empty id`);
  zoneIds.add(zone?.id);
  const prop = zone?.jsx?.prop;
  if (prop !== undefined) {
    if (zoneProps.has(prop))
      diagnostics.push(
        `${zoneAt}.jsx.prop: ${prop} already fills another zone`,
      );
    zoneProps.add(prop);
  }
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

function validateParentsAndZones(composition, at, diagnostics) {
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
  const zoneProps = new Set();
  for (const zone of composition.zones ?? [])
    validateZone(zone, at, zoneIds, zoneProps, diagnostics);
  for (const zone of composition.zones ?? [])
    for (const other of zone?.exclusiveWith ?? [])
      if (other === zone.id || !zoneIds.has(other))
        diagnostics.push(
          `${at}.composition.zones.${zone.id}.exclusiveWith: unknown or self-referential zone ${other}`,
        );
}

function validateChildren(composition, at, diagnostics) {
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
}

function validateState(composition, at, diagnostics) {
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
}

// Each wiring helper source names a listed helper that its file exports.
function validateWiringSources(wiring, at, packageRoot, diagnostics) {
  const seen = new Set();
  for (const helperSource of wiring?.sources ?? []) {
    const sourceAt = `${at}.composition.wiring.sources.${helperSource?.export}`;
    if (seen.has(helperSource?.export))
      diagnostics.push(`${sourceAt}: declared more than once`);
    seen.add(helperSource?.export);
    if (!wiring.helpers?.includes(helperSource?.export))
      diagnostics.push(
        `${sourceAt}: ${helperSource?.export} is not listed in composition.wiring.helpers`,
      );
    if (
      helperSource?.returnsDisposer !== undefined &&
      typeof helperSource.returnsDisposer !== 'boolean'
    )
      diagnostics.push(`${sourceAt}.returnsDisposer: expected boolean`);
    const file = resolve(packageRoot, helperSource?.source ?? '');
    if (!helperSource?.source || !existsSync(file))
      diagnostics.push(
        `${sourceAt}.source: file does not exist: ${helperSource?.source}`,
      );
    else if (!exportedNamesFromFile(file).has(helperSource.export))
      diagnostics.push(
        `${sourceAt}: ${helperSource.export} is not exported by ${helperSource.source}`,
      );
  }
}

// Each `data-*` state attribute a wiring helper maintains is declared once.
function validateStateAttributes(wiring, at, diagnostics) {
  const stateAttributes = wiring?.stateAttributes;
  if (stateAttributes !== undefined && !Array.isArray(stateAttributes))
    diagnostics.push(
      `${at}.composition.wiring.stateAttributes: expected an array`,
    );
  const names = new Set();
  for (const attribute of Array.isArray(stateAttributes)
    ? stateAttributes
    : []) {
    const name = attribute?.name;
    const attributeAt = `${at}.composition.wiring.stateAttributes.${name}`;
    if (typeof name !== 'string' || !/^data-[a-z0-9]+(-[a-z0-9]+)*$/.test(name))
      diagnostics.push(`${attributeAt}.name: expected a data-* attribute name`);
    if (names.has(name))
      diagnostics.push(`${attributeAt}.name: declared more than once`);
    names.add(name);
    for (const field of ['on', 'meaning'])
      if (typeof attribute?.[field] !== 'string' || !attribute[field])
        diagnostics.push(
          `${attributeAt}.${field}: expected a non-empty string`,
        );
    if (!wiring.helpers?.includes(attribute?.helper))
      diagnostics.push(
        `${attributeAt}.helper: ${attribute?.helper} is not listed in composition.wiring.helpers`,
      );
  }
}

function validateWiring(composition, at, packageRoot, diagnostics) {
  const wiring = composition.wiring;
  if (typeof wiring?.required !== 'boolean')
    diagnostics.push(`${at}.composition.wiring.required: expected boolean`);
  validateStringList(
    wiring?.helpers,
    `${at}.composition.wiring.helpers`,
    diagnostics,
  );
  if ('actions' in (wiring ?? {}))
    validateStringList(
      wiring.actions,
      `${at}.composition.wiring.actions`,
      diagnostics,
    );
  // Required wiring names something the app must do: a helper to call, or a
  // root-delegated data-action to handle.
  if (
    wiring?.required === true &&
    Array.isArray(wiring.helpers) &&
    !wiring.helpers.length &&
    !wiring.actions?.length
  )
    diagnostics.push(
      `${at}.composition.wiring: required wiring names at least one helper or action`,
    );
  validateStringList(
    wiring?.obligations,
    `${at}.composition.wiring.obligations`,
    diagnostics,
  );
  validateWiringSources(wiring, at, packageRoot, diagnostics);
  validateStateAttributes(wiring, at, diagnostics);
}

const GEOMETRY_OWNERS = [
  'self',
  'parent',
  'child',
  'none',
  'conditional',
  'composed',
];

function validateResponsiveAndLayout(composition, at, diagnostics) {
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
  for (const dimension of ['margin', 'border', 'padding'])
    if (!GEOMETRY_OWNERS.includes(composition.layout?.geometry?.[dimension]))
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

/** Check a component's `composition` block; `at` prefixes each diagnostic. */
export function validateComposition(component, at, diagnostics, packageRoot) {
  const composition = component.composition ?? {};
  validateParentsAndZones(composition, at, diagnostics);
  validateChildren(composition, at, diagnostics);
  validateState(composition, at, diagnostics);
  validateWiring(composition, at, packageRoot, diagnostics);
  validateResponsiveAndLayout(composition, at, diagnostics);
}

// One `publicExports` item of a published package must be a package.json
// subpath whose src/ entry exports the name. A private application
// (package.json#private) is bundled, never imported by package name, and has
// no per-file dist entries: its items may omit `subpath`, and each name is
// then verified against the component's own `source` file, which is how the
// Kerf UI rules resolve its wrappers.
function validatePublicExport(item, context, seen, diagnostics) {
  const { at, packageRoot, packageJson, component, sourcePath } = context;
  const exportAt = `${at}.publicExports`;
  const exports = packageJson.exports ?? {};
  const sourceOnly =
    packageJson.private === true &&
    Boolean(item?.name) &&
    !Object.hasOwn(item, 'subpath');
  if (!item?.name || (!sourceOnly && typeof item?.subpath !== 'string')) {
    diagnostics.push(
      `${exportAt}: every export requires name and subpath (only a private application, package.json#private, may omit subpath)`,
    );
    return;
  }
  const key = sourceOnly
    ? `source:${item.name}`
    : `${item.subpath}:${item.name}`;
  if (seen.has(key))
    diagnostics.push(`${exportAt}: duplicate ${sourceOnly ? item.name : key}`);
  seen.add(key);
  if (sourceOnly) {
    if (
      existsSync(sourcePath) &&
      !exportedNamesFromFile(sourcePath).has(item.name)
    )
      diagnostics.push(
        `${exportAt}: ${item.name} is not exported by ${component.source}`,
      );
    return;
  }
  if (!(item.subpath in exports))
    diagnostics.push(
      `${exportAt}: package.json does not export subpath ${item.subpath}`,
    );
  const sourceEntry = sourceEntryForExport(packageRoot, exports[item.subpath]);
  if (!sourceEntry)
    diagnostics.push(
      `${exportAt}: cannot map ${item.subpath} to an existing src/ entry`,
    );
  else if (!exportedNamesFromFile(sourceEntry).has(item.name))
    diagnostics.push(
      `${exportAt}: ${item.name} is not exported by ${relative(packageRoot, sourceEntry)}`,
    );
}

function validatePublicExports(context, diagnostics) {
  const { component, at } = context;
  if (
    !Array.isArray(component.publicExports) ||
    !component.publicExports.length
  ) {
    diagnostics.push(`${at}.publicExports: expected a non-empty array`);
    return;
  }
  const seen = new Set();
  for (const item of component.publicExports)
    validatePublicExport(item, context, seen, diagnostics);
}

function validateSourceLinks(component, at, packageRoot, diagnostics) {
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
}

function validateBoundaries(component, at, diagnostics) {
  const boundaries = component.boundaries;
  validateStringList(
    boundaries?.publicClasses,
    `${at}.boundaries.publicClasses`,
    diagnostics,
  );
  if (
    boundaries?.rootClass !== null &&
    (typeof boundaries?.rootClass !== 'string' ||
      !boundaries.publicClasses?.includes(boundaries.rootClass))
  )
    diagnostics.push(
      `${at}.boundaries.rootClass: expected null or one publicClasses entry`,
    );
  // An application may place only the declared subset of public classes on
  // its own elements; every other public class is the component's rendered
  // anatomy (eslint-plugin-kerfjs KUI-L103). `rootElement` names the element
  // the component renders around its placeable classes.
  if (boundaries && 'placeableClasses' in boundaries) {
    validateStringList(
      boundaries.placeableClasses,
      `${at}.boundaries.placeableClasses`,
      diagnostics,
    );
    for (const className of Array.isArray(boundaries.placeableClasses)
      ? boundaries.placeableClasses
      : [])
      if (!boundaries.publicClasses?.includes(className))
        diagnostics.push(
          `${at}.boundaries.placeableClasses: ${className} is not one of publicClasses`,
        );
  }
  if (
    boundaries?.rootElement !== undefined &&
    !boundaries.placeableClasses?.length
  )
    diagnostics.push(
      `${at}.boundaries.rootElement: requires a non-empty placeableClasses`,
    );
  validateStringList(
    boundaries?.publicTokens,
    `${at}.boundaries.publicTokens`,
    diagnostics,
  );
}

// Diagnostic ids are unique across the whole package, not per component.
function validateDiagnostics(component, at, diagnosticIds, diagnostics) {
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

/**
 * Check one component of `packageJson`'s author metadata. `ids` and
 * `diagnosticIds` accumulate across the package's components so duplicates
 * are reported.
 */
export function validateComponent(
  component,
  packageRoot,
  packageJson,
  ids,
  diagnosticIds,
  diagnostics,
) {
  const at = `${packageJson.name}:${component?.id ?? '<unknown>'}`;
  for (const path of DECISION_PATHS)
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

  validatePublicExports(
    { at, packageRoot, packageJson, component, sourcePath },
    diagnostics,
  );
  validateSourceLinks(component, at, packageRoot, diagnostics);
  validateComposition(component, at, diagnostics, packageRoot);
  validateBoundaries(component, at, diagnostics);
  validateStringList(
    component.accessibility?.obligations,
    `${at}.accessibility.obligations`,
    diagnostics,
  );
  validateDiagnostics(component, at, diagnosticIds, diagnostics);
}
