const isStringList = (value) =>
  Array.isArray(value) &&
  value.every((item) => typeof item === 'string' && item.length > 0) &&
  new Set(value).size === value.length;

export function validateCatalogV2(catalog, options = {}) {
  const failures = [];
  const fail = (message) => failures.push(message);
  if (catalog?.schemaVersion !== 2) fail('schemaVersion must equal 2');
  if (typeof catalog?.package !== 'string' || !catalog.package)
    fail('package must be a non-empty string');
  if (catalog?.compatibility?.identity !== 'package:id')
    fail('compatibility.identity must equal package:id');
  if (!Array.isArray(catalog?.entries))
    return [...failures, 'entries must be an array'];

  const keys = new Set();
  const diagnosticIds = new Set();
  for (const entry of catalog.entries) {
    const at = entry?.key ?? '<unknown>';
    if (entry?.key !== `${entry?.package}:${entry?.id}`)
      fail(`${at} key must equal package:id`);
    if (entry?.package !== catalog.package)
      fail(`${at} package must match catalog package`);
    if (keys.has(entry?.key)) fail(`${at} key must be unique`);
    keys.add(entry?.key);
    if (!['component', 'composition', 'recipe'].includes(entry?.kind))
      fail(`${at} has invalid kind`);
    if (!['any', 'root', 'listed'].includes(entry?.parents?.mode))
      fail(`${at} has invalid parents.mode`);
    if (!isStringList(entry?.parents?.entries))
      fail(`${at} parents.entries must be a unique string list`);
    if (entry?.parents?.mode === 'listed' && !entry.parents.entries.length)
      fail(`${at} listed parents require at least one entry`);
    if (!isStringList(entry?.contexts))
      fail(`${at} contexts must be a unique string list`);
    if (!Array.isArray(entry?.zones)) fail(`${at} zones must be an array`);
    const zoneIds = new Set();
    for (const zone of entry?.zones ?? []) {
      if (!zone?.id || zoneIds.has(zone.id))
        fail(`${at} zone ids must be unique`);
      zoneIds.add(zone?.id);
      if (!isStringList(zone?.accepts) || !zone.accepts.length)
        fail(
          `${at}:${zone?.id} accepts must be a non-empty unique string list`,
        );
      const { min, max } = zone?.cardinality ?? {};
      if (!Number.isInteger(min) || min < 0)
        fail(
          `${at}:${zone?.id} cardinality.min must be a non-negative integer`,
        );
      if (
        max !== 'unbounded' &&
        (!Number.isInteger(max) || max < 1 || max < min)
      )
        fail(`${at}:${zone?.id} cardinality.max must be unbounded or >= min`);
      if (!isStringList(zone?.exclusiveWith))
        fail(`${at}:${zone?.id} exclusiveWith must be a unique string list`);
    }
    for (const zone of entry?.zones ?? [])
      for (const exclusive of zone.exclusiveWith ?? [])
        if (!zoneIds.has(exclusive) || exclusive === zone.id)
          fail(`${at}:${zone.id} has invalid exclusive zone ${exclusive}`);
    if (!['any', 'none', 'listed'].includes(entry?.children?.mode))
      fail(`${at} has invalid children.mode`);
    if (!isStringList(entry?.children?.concepts))
      fail(`${at} children.concepts must be a unique string list`);
    if (!isStringList(entry?.children?.requiredConcepts))
      fail(`${at} children.requiredConcepts must be a unique string list`);
    if (entry?.children?.mode === 'listed' && !entry.children.concepts.length)
      fail(`${at} listed children require concepts`);
    for (const concept of entry?.children?.requiredConcepts ?? [])
      if (!entry.children.concepts.includes(concept))
        fail(`${at} required child ${concept} must also be allowed`);
    if (!Array.isArray(entry?.state)) fail(`${at} state must be an array`);
    const stateIds = new Set();
    for (const state of entry?.state ?? []) {
      if (!state?.id || stateIds.has(state.id))
        fail(`${at} state ids must be unique`);
      stateIds.add(state?.id);
      if (!['application', 'controlled', 'component'].includes(state?.owner))
        fail(`${at}:${state?.id} has invalid state owner`);
      if (typeof state?.required !== 'boolean')
        fail(`${at}:${state?.id} required must be boolean`);
    }
    if (typeof entry?.wiring?.required !== 'boolean')
      fail(`${at} wiring.required must be boolean`);
    if (
      !isStringList(entry?.wiring?.helpers) ||
      !isStringList(entry?.wiring?.obligations)
    )
      fail(`${at} wiring lists must contain unique non-empty strings`);
    if (entry?.wiring?.required && !entry.wiring.helpers.length)
      fail(`${at} required wiring must name a helper or import`);
    if (
      !['application', 'component', 'shared', 'not-applicable'].includes(
        entry?.responsive?.owner,
      )
    )
      fail(`${at} has invalid responsive owner`);
    if (!isStringList(entry?.responsive?.behaviors))
      fail(`${at} responsive.behaviors must be a unique string list`);
    if (!isStringList(entry?.layout?.roles) || !entry.layout.roles.length)
      fail(`${at} layout.roles must be a non-empty unique string list`);
    for (const dimension of ['margin', 'border', 'padding'])
      if (
        ![
          'self',
          'parent',
          'child',
          'none',
          'conditional',
          'composed',
        ].includes(entry?.layout?.geometry?.[dimension])
      )
        fail(`${at} has invalid ${dimension} geometry owner`);
    if (!isStringList(entry?.accessibility?.obligations))
      fail(`${at} accessibility obligations must be a unique string list`);
    if (
      !isStringList(entry?.boundaries?.publicClasses) ||
      !isStringList(entry?.boundaries?.publicTokens)
    )
      fail(`${at} public boundaries must be unique string lists`);
    if (!Array.isArray(entry?.diagnostics))
      fail(`${at} diagnostics must be an array`);
    for (const diagnostic of entry?.diagnostics ?? []) {
      if (!/^KUI-C[0-9]{3}$/.test(diagnostic?.id ?? ''))
        fail(`${at} has invalid diagnostic id ${diagnostic?.id}`);
      if (diagnosticIds.has(diagnostic?.id))
        fail(`${diagnostic?.id} diagnostic id must be globally unique`);
      diagnosticIds.add(diagnostic?.id);
      if (!['error', 'warning'].includes(diagnostic?.severity))
        fail(`${diagnostic?.id} has invalid severity`);
      if (!diagnostic?.when || !diagnostic?.message)
        fail(`${diagnostic?.id} requires when and message`);
    }
    if (!entry?.provenance?.selection || !entry?.provenance?.composition)
      fail(`${at} must declare selection and composition provenance`);
  }

  if (options.v1) {
    const expected = options.v1.entries.map(
      (entry) => `${options.v1.package}:${entry.id}`,
    );
    const actual = catalog.entries.map((entry) => entry.key);
    if (JSON.stringify(actual) !== JSON.stringify(expected))
      fail('v2 entries must project every v1 entry once and in order');
  }
  return failures;
}
