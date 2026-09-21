'use strict';

const { existsSync, readFileSync } = require('node:fs');
const { dirname, isAbsolute, relative, resolve } = require('node:path');

const record = (provenance, source, prefix, value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  for (const key of Object.keys(value)) provenance[`${prefix}.${key}`] = source;
};

function mergeApplicationUiProfiles(layers) {
  if (!layers.length)
    throw new Error('At least one application UI profile is required.');
  const profile = { schemaVersion: 1, scope: 'package' };
  const provenance = {};
  const catalogs = new Map();
  const exceptions = new Map();
  for (const { source, profile: layer } of layers) {
    if (!layer || typeof layer !== 'object' || Array.isArray(layer)) continue;
    profile.schemaVersion = layer.schemaVersion;
    profile.scope = layer.scope;
    provenance.$schemaVersion = source;
    provenance.$scope = source;
    if (layer.$schema) profile.$schema = layer.$schema;
    for (const catalog of Array.isArray(layer.catalogs) ? layer.catalogs : []) {
      if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog))
        continue;
      catalogs.set(catalog.package, catalog);
      provenance[`$catalogs.${catalog.package}`] = source;
    }
    for (const field of ['preferences', 'theme', 'tokens', 'layout'])
      if (
        layer[field] &&
        typeof layer[field] === 'object' &&
        !Array.isArray(layer[field])
      ) {
        profile[field] = { ...profile[field], ...layer[field] };
        record(provenance, source, `$${field}`, layer[field]);
      }
    for (const exception of Array.isArray(layer.exceptions)
      ? layer.exceptions
      : []) {
      if (
        !exception ||
        typeof exception !== 'object' ||
        Array.isArray(exception)
      )
        continue;
      exceptions.set(exception.id, exception);
      provenance[`$exceptions.${exception.id}`] = source;
    }
  }
  if (catalogs.size) profile.catalogs = [...catalogs.values()];
  if (
    exceptions.size ||
    layers.some(({ profile: layer }) => Array.isArray(layer?.exceptions))
  )
    profile.exceptions = [...exceptions.values()];
  return { profile, provenance };
}

function validateApplicationUiProfileLayers(layers) {
  const diagnostics = [];
  const ranks = { package: 0, workspace: 1, directory: 2 };
  const counts = new Map();
  let previousRank = -1;
  let previousDirectory;
  for (const { source, profile } of layers) {
    const rank = ranks[profile?.scope];
    counts.set(profile?.scope, (counts.get(profile?.scope) ?? 0) + 1);
    if (rank === undefined || rank < previousRank)
      diagnostics.push({
        code: 'KUI-P027',
        source,
        path: '$.scope',
        message:
          'Profile layers must be ordered package, workspace, then parent-to-child directory.',
      });
    if (rank !== undefined) previousRank = Math.max(previousRank, rank);
    if (profile?.scope === 'directory') {
      const currentDirectory = dirname(source);
      if (
        previousDirectory &&
        relative(previousDirectory, currentDirectory).startsWith('..')
      )
        diagnostics.push({
          code: 'KUI-P029',
          source,
          path: '$.scope',
          message: 'Directory profiles must be ordered from parent to child.',
        });
      previousDirectory = currentDirectory;
    }
  }
  for (const scope of ['package', 'workspace'])
    if ((counts.get(scope) ?? 0) > 1)
      diagnostics.push({
        code: 'KUI-P028',
        source: layers.findLast(({ profile }) => profile.scope === scope)
          .source,
        path: '$.scope',
        message: `At most one ${scope} profile layer is allowed.`,
      });
  if ((counts.get('package') ?? 0) !== 1)
    diagnostics.push({
      code: 'KUI-P028',
      source: layers[0]?.source ?? '<profiles>',
      path: '$.scope',
      message: 'Exactly one package profile must be the first layer.',
    });
  return diagnostics;
}

const stringList = (value) =>
  Array.isArray(value) &&
  value.every((item) => typeof item === 'string' && item.length > 0) &&
  new Set(value).size === value.length;

function validateApplicationUiProfile(profile, options = {}) {
  const {
    source = '<profile>',
    knownComponents,
    knownTokens,
    knownRules,
  } = options;
  const diagnostics = [];
  const componentSet = knownComponents && new Set(knownComponents);
  const tokenSet = knownTokens && new Set(knownTokens);
  const ruleSet = knownRules && new Set(knownRules);
  const add = (code, path, message) =>
    diagnostics.push({ code, source, path, message });
  const objectAt = (value, path) => {
    if (value === undefined) return undefined;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      add('KUI-P030', path, 'Expected an object.');
      return undefined;
    }
    return value;
  };
  const arrayAt = (value, path) => {
    if (value === undefined) return [];
    if (!Array.isArray(value)) {
      add('KUI-P030', path, 'Expected an array.');
      return [];
    }
    return value;
  };
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    add('KUI-P030', '$', 'Expected a profile object.');
    return diagnostics;
  }
  const rejectUnknown = (value, allowed, path) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    for (const key of Object.keys(value))
      if (!allowed.includes(key))
        add('KUI-P023', `${path}.${key}`, `Unknown profile property ${key}.`);
  };
  rejectUnknown(
    profile,
    [
      '$schema',
      'schemaVersion',
      'scope',
      'catalogs',
      'preferences',
      'theme',
      'tokens',
      'layout',
      'exceptions',
    ],
    '$',
  );
  if (profile.schemaVersion !== 1)
    add('KUI-P001', '$.schemaVersion', 'schemaVersion must equal 1.');
  if (!['package', 'workspace', 'directory'].includes(profile.scope))
    add(
      'KUI-P002',
      '$.scope',
      'scope must be package, workspace, or directory.',
    );
  const catalogs = arrayAt(profile.catalogs, '$.catalogs');
  const preferences = objectAt(profile.preferences, '$.preferences') ?? {};
  const theme = objectAt(profile.theme, '$.theme');
  const tokens = objectAt(profile.tokens, '$.tokens') ?? {};
  const layout = objectAt(profile.layout, '$.layout');
  const exceptions = arrayAt(profile.exceptions, '$.exceptions');
  const packages = new Set();
  for (const [index, catalog] of catalogs.entries()) {
    const path = `$.catalogs[${index}]`;
    if (!objectAt(catalog, path)) continue;
    rejectUnknown(catalog, ['package', 'selection', 'composition'], path);
    if (!catalog.package)
      add('KUI-P003', `${path}.package`, 'Catalog package is required.');
    if (packages.has(catalog.package))
      add(
        'KUI-P004',
        `${path}.package`,
        `Catalog package ${catalog.package} is duplicated.`,
      );
    packages.add(catalog.package);
    if (catalog.package === '@kerfjs/ui' && !catalog.selection)
      add(
        'KUI-P005',
        `${path}.selection`,
        'The @kerfjs/ui catalog requires its v1 selection location.',
      );
    for (const kind of ['selection', 'composition']) {
      if (kind === 'selection' && !catalog[kind]) continue;
      rejectUnknown(
        catalog[kind],
        ['path', 'schemaVersion'],
        `${path}.${kind}`,
      );
      if (
        !catalog[kind]?.path ||
        !Number.isInteger(catalog[kind]?.schemaVersion)
      )
        add(
          'KUI-P005',
          `${path}.${kind}`,
          `${kind} requires a path and integer schemaVersion.`,
        );
    }
  }
  for (const [concept, raw] of Object.entries(preferences)) {
    const path = `$.preferences.${concept}`;
    const preference = objectAt(raw, path);
    rejectUnknown(preference, ['preferred', 'avoid', 'rationale'], path);
    if (!/^[a-z][a-z0-9-]*$/.test(concept))
      add(
        'KUI-P024',
        path,
        'Preference concept keys must be lowercase kebab-case.',
      );
    if (!preference?.preferred)
      add(
        'KUI-P006',
        `${path}.preferred`,
        'A preferred package:id is required.',
      );
    if (!stringList(preference?.avoid ?? []))
      add(
        'KUI-P007',
        `${path}.avoid`,
        'avoid must contain unique package:id values.',
      );
    if ((preference?.avoid ?? []).includes(preference?.preferred))
      add(
        'KUI-P008',
        path,
        `${preference.preferred} cannot be both preferred and avoided.`,
      );
    for (const [field, refs] of [
      ['preferred', preference?.preferred ? [preference.preferred] : []],
      ['avoid', preference?.avoid ?? []],
    ])
      for (const reference of refs)
        if (!/^.+:.+$/.test(reference))
          add(
            'KUI-P024',
            `${path}.${field}`,
            `${reference} must use package:id identity.`,
          );
        else if (componentSet && !componentSet.has(reference))
          add(
            'KUI-P009',
            `${path}.${field}`,
            `Unknown or stale component reference ${reference}.`,
          );
  }
  rejectUnknown(
    theme,
    ['colorScheme', 'allowedColorSchemes', 'density', 'allowedDensities'],
    '$.theme',
  );
  const colorSchemes = ['light', 'dark', 'invert', 'system'];
  const densities = ['standard', 'compact'];
  if (
    theme?.colorScheme &&
    Array.isArray(theme.allowedColorSchemes) &&
    !theme.allowedColorSchemes.includes(theme.colorScheme)
  )
    add(
      'KUI-P010',
      '$.theme.colorScheme',
      'colorScheme must be included in allowedColorSchemes.',
    );
  if (
    theme?.density &&
    Array.isArray(theme.allowedDensities) &&
    !theme.allowedDensities.includes(theme.density)
  )
    add(
      'KUI-P011',
      '$.theme.density',
      'density must be included in allowedDensities.',
    );
  if (theme?.colorScheme && !colorSchemes.includes(theme.colorScheme))
    add('KUI-P026', '$.theme.colorScheme', 'Unknown color scheme.');
  if (theme?.density && !densities.includes(theme.density))
    add('KUI-P026', '$.theme.density', 'Unknown density.');
  for (const value of arrayAt(
    theme?.allowedColorSchemes,
    '$.theme.allowedColorSchemes',
  ))
    if (!colorSchemes.includes(value))
      add(
        'KUI-P026',
        '$.theme.allowedColorSchemes',
        `Unknown color scheme ${value}.`,
      );
  for (const value of arrayAt(
    theme?.allowedDensities,
    '$.theme.allowedDensities',
  ))
    if (!densities.includes(value))
      add('KUI-P026', '$.theme.allowedDensities', `Unknown density ${value}.`);
  for (const token of Object.keys(tokens)) {
    if (!token.startsWith('--kui-'))
      add(
        'KUI-P012',
        `$.tokens.${token}`,
        'Only --kui-* semantic tokens may be overridden.',
      );
    else if (tokenSet && !tokenSet.has(token))
      add(
        'KUI-P013',
        `$.tokens.${token}`,
        `Unknown or private semantic token ${token}.`,
      );
    if (typeof tokens[token] !== 'string' || !tokens[token])
      add(
        'KUI-P025',
        `$.tokens.${token}`,
        'Token override must be a non-empty string.',
      );
  }
  rejectUnknown(
    layout,
    [
      'shell',
      'pane',
      'responsiveStrategy',
      'compactNavigation',
      'scrollOwnership',
      'spacingScale',
    ],
    '$.layout',
  );
  for (const field of ['shell', 'pane']) {
    const reference = layout?.[field];
    if (reference && !/^.+:.+$/.test(reference))
      add(
        'KUI-P024',
        `$.layout.${field}`,
        `${reference} must use package:id identity.`,
      );
    else if (reference && componentSet && !componentSet.has(reference))
      add(
        'KUI-P014',
        `$.layout.${field}`,
        `Unknown or stale component reference ${reference}.`,
      );
  }
  const ids = new Set();
  for (const [index, exception] of exceptions.entries()) {
    const path = `$.exceptions[${index}]`;
    if (!objectAt(exception, path)) continue;
    rejectUnknown(exception, ['id', 'rules', 'target', 'rationale'], path);
    if (!exception.id || ids.has(exception.id))
      add(
        'KUI-P015',
        `${path}.id`,
        'Exception ids must be present and unique.',
      );
    ids.add(exception.id);
    if (!stringList(exception.rules) || !exception.rules.length)
      add(
        'KUI-P016',
        `${path}.rules`,
        'An exception must name at least one exact rule id.',
      );
    for (const rule of exception.rules ?? [])
      if (ruleSet && !ruleSet.has(rule))
        add('KUI-P022', `${path}.rules`, `Unknown or stale rule id ${rule}.`);
    if (
      !exception.target ||
      isAbsolute(exception.target) ||
      exception.target.includes('..') ||
      /[*?]/.test(exception.target) ||
      ['.', 'src', 'ui'].includes(exception.target.replace(/\/$/, ''))
    )
      add(
        'KUI-P017',
        `${path}.target`,
        'Exception target must be a narrow relative path without traversal or wildcards.',
      );
    if (!exception.rationale || exception.rationale.trim().length < 12)
      add(
        'KUI-P018',
        `${path}.rationale`,
        'Exception rationale must explain the narrow need.',
      );
  }
  return diagnostics;
}

const unique = (diagnostics) => [
  ...new Map(
    diagnostics.map((item) => [
      `${item.code}\0${item.source}\0${item.path}`,
      item,
    ]),
  ).values(),
];

function catalogFacts(resolved, fallbackCatalogs, seedRules) {
  const diagnostics = [];
  const knownComponents = new Set();
  const knownTokens = new Set();
  const knownRules = new Set(seedRules);
  const addComposition = (artifact) => {
    for (const entry of artifact?.entries ?? []) {
      knownComponents.add(entry.key ?? `${artifact.package}:${entry.id}`);
      for (const token of entry.boundaries?.publicTokens ?? [])
        knownTokens.add(token);
      for (const diagnostic of entry.diagnostics ?? [])
        knownRules.add(diagnostic.id);
    }
  };
  if (!(resolved.profile.catalogs ?? []).length)
    for (const artifact of fallbackCatalogs) addComposition(artifact);
  for (const [index, catalog] of (resolved.profile.catalogs ?? []).entries()) {
    const owner = resolved.provenance[`$catalogs.${catalog.package}`];
    if (!owner) continue;
    for (const kind of ['selection', 'composition']) {
      const location = catalog[kind];
      if (!location?.path) continue;
      const path = resolve(dirname(owner), location.path);
      try {
        const artifact = JSON.parse(readFileSync(path, 'utf8'));
        if (
          artifact.package !== catalog.package ||
          artifact.schemaVersion !== location.schemaVersion
        )
          diagnostics.push({
            code: 'KUI-P020',
            source: owner,
            path: `$.catalogs[${index}].${kind}`,
            message: `Catalog ${path} does not match package ${catalog.package} schemaVersion ${location.schemaVersion}.`,
          });
        if (kind === 'composition') addComposition(artifact);
      } catch (error) {
        diagnostics.push({
          code: 'KUI-P021',
          source: owner,
          path: `$.catalogs[${index}].${kind}.path`,
          message: `Cannot load catalog ${path}: ${error.message}`,
        });
      }
    }
  }
  return { diagnostics, knownComponents, knownTokens, knownRules };
}

function loadApplicationUiProfileSync(layers, options = {}) {
  const diagnostics = validateApplicationUiProfileLayers(layers);
  let facts;
  for (let index = 0; index < layers.length; index += 1) {
    const prefix = mergeApplicationUiProfiles(layers.slice(0, index + 1));
    facts = catalogFacts(
      prefix,
      options.fallbackCatalogs ?? [],
      options.knownRules ?? [],
    );
    diagnostics.push(
      ...facts.diagnostics,
      ...validateApplicationUiProfile(layers[index].profile, {
        source: layers[index].source,
        ...facts,
      }),
    );
  }
  const resolved = mergeApplicationUiProfiles(layers);
  diagnostics.push(
    ...validateApplicationUiProfile(resolved.profile, {
      source: layers.at(-1).source,
      ...facts,
    }),
  );
  return { layers, ...resolved, diagnostics: unique(diagnostics) };
}

function discoverApplicationUiProfileFilesSync({
  workspaceRoot,
  startDirectory,
  packageProfile,
}) {
  const root = resolve(workspaceRoot);
  const start = resolve(startDirectory);
  const outside = relative(root, start);
  if (
    outside === '..' ||
    outside.startsWith(`..${require('node:path').sep}`) ||
    isAbsolute(outside)
  )
    throw new Error(`startDirectory must be inside workspaceRoot: ${start}`);
  const files = [resolve(packageProfile)];
  const directories = [];
  let directory = start;
  while (true) {
    directories.push(directory);
    if (directory === root) break;
    directory = dirname(directory);
  }
  for (const candidate of directories.reverse()) {
    const path = resolve(candidate, '.kerf-ui-profile.json');
    if (existsSync(path) && !files.includes(path)) files.push(path);
  }
  return files;
}

module.exports = {
  discoverApplicationUiProfileFilesSync,
  loadApplicationUiProfileSync,
  mergeApplicationUiProfiles,
  validateApplicationUiProfile,
  validateApplicationUiProfileLayers,
};
