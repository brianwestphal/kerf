import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { createRequire } from 'node:module';
import process from 'node:process';

const PROFILE = '.kerf-ui-profile.json';
const cache = new Map();
const loadCommonJs = createRequire(import.meta.url);

export const UI_CONTRACT_LOAD_CODE = 'KUI-L090';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

function packageAsset(cwd, name) {
  try {
    return createRequire(resolve(cwd, 'package.json')).resolve(
      `@kerfjs/ui/ai/${name}`,
    );
  } catch {
    return undefined;
  }
}

function discoveredProfiles(cwd, filename, settings) {
  if (settings.profile)
    return [
      {
        source: '<eslint settings kerfjs.ui.profile>',
        profile: settings.profile,
      },
    ];
  const layers = [];
  const add = (path, expectedScope) => {
    const profile = readJson(path);
    if (profile.scope !== expectedScope)
      throw new Error(
        `${path} must have profile scope ${expectedScope}, received ${profile.scope ?? 'missing'}`,
      );
    layers.push({ source: path, profile });
  };
  const defaultsPath =
    settings.profileDefaultsPath ??
    packageAsset(cwd, 'application-ui-profile.defaults.json');
  if (defaultsPath && existsSync(defaultsPath)) add(defaultsPath, 'package');
  const workspace = resolve(settings.workspaceRoot ?? cwd);
  const target = resolve(dirname(filename));
  if (relative(workspace, target).startsWith('..')) return layers;
  const directories = [];
  let directory = target;
  while (true) {
    directories.push(directory);
    if (directory === workspace) break;
    directory = dirname(directory);
  }
  for (const candidate of directories.reverse()) {
    const path = resolve(candidate, PROFILE);
    if (existsSync(path))
      add(path, candidate === workspace ? 'workspace' : 'directory');
  }
  return layers;
}

export function loadUiContract(context) {
  const settings = context.settings?.kerfjs?.ui ?? {};
  const cwd = settings.workspaceRoot ?? context.cwd ?? process.cwd();
  const filename = context.filename ?? context.getFilename();
  const key = JSON.stringify([cwd, filename, settings]);
  if (cache.has(key)) return cache.get(key);
  try {
    const catalog =
      settings.catalog ??
      readJson(
        settings.catalogPath ?? packageAsset(cwd, 'component-catalog-v2.json'),
      );
    const selection =
      settings.selectionCatalog ??
      readJson(
        settings.selectionCatalogPath ??
          packageAsset(cwd, 'component-catalog.json'),
      );
    const profiles = settings.profilePath
      ? [
          {
            source: settings.profilePath,
            profile: readJson(settings.profilePath),
          },
        ]
      : discoveredProfiles(cwd, filename, settings);
    const profileContractPath =
      settings.profileContractPath ??
      packageAsset(cwd, 'application-ui-profile-sync.cjs');
    if (!profileContractPath)
      throw new Error(
        'Cannot resolve @kerfjs/ui/ai/application-ui-profile-sync.cjs; install @kerfjs/ui or set kerfjs.ui.profileContractPath.',
      );
    const { loadApplicationUiProfileSync } = loadCommonJs(profileContractPath);
    const diagnosticRegistryPath =
      settings.diagnosticRegistryPath ??
      resolve(
        dirname(profileContractPath),
        'application-ui-diagnostic-ids-v1.json',
      );
    const diagnosticRegistry = readJson(diagnosticRegistryPath);
    if (
      diagnosticRegistry.schemaVersion !== 1 ||
      !Array.isArray(diagnosticRegistry.ids)
    )
      throw new Error(
        `${diagnosticRegistryPath} must be an application UI diagnostic registry with schemaVersion 1.`,
      );
    const loadedProfile = loadApplicationUiProfileSync(profiles, {
      fallbackCatalogs: [catalog],
      knownRules: diagnosticRegistry.ids,
    });
    if (loadedProfile.diagnostics.length) {
      const diagnostic = loadedProfile.diagnostics[0];
      throw new Error(
        `${diagnostic.source} ${diagnostic.path} ${diagnostic.code}: ${diagnostic.message}`,
      );
    }
    const profile = loadedProfile.profile;
    const entries = new Map(catalog.entries.map((entry) => [entry.key, entry]));
    const imports = new Map();
    const exports = new Map();
    const helperSources = new Map();
    const addHelperSource = (name, source) => {
      const sources = helperSources.get(name) ?? new Set();
      sources.add(source);
      helperSources.set(name, sources);
    };
    for (const entry of selection.entries) {
      const key = `${selection.package}:${entry.id}`;
      if (entry.delivery?.browserImport)
        imports.set(entry.delivery.browserImport, key);
      if (entry.delivery?.moduleImport)
        imports.set(entry.delivery.moduleImport, key);
      for (const name of entry.publicExports ?? []) {
        exports.set(name, key);
        addHelperSource(name, selection.package);
      }
      for (const wiring of entry.wiring ?? [])
        addHelperSource(wiring.export, wiring.import);
    }
    const value = {
      entries,
      package: selection.package,
      imports,
      exports,
      helperSources,
      profile,
      cwd,
      publicClasses: new Set(
        catalog.entries.flatMap((entry) => entry.boundaries.publicClasses),
      ),
      publicTokens: new Set(
        catalog.entries.flatMap((entry) => entry.boundaries.publicTokens),
      ),
      error: undefined,
    };
    cache.set(key, value);
    return value;
  } catch (error) {
    const value = { error: error.message };
    cache.set(key, value);
    return value;
  }
}

export function importRegistry(program, contract) {
  const locals = new Map();
  const namespaces = new Map();
  const helpers = new Map();
  const sources = new Set();
  for (const node of program.body) {
    if (node.type !== 'ImportDeclaration') continue;
    const source = node.source.value;
    sources.add(source);
    const directKey = contract.imports?.get(source);
    for (const specifier of node.specifiers) {
      if (specifier.type === 'ImportNamespaceSpecifier') {
        namespaces.set(specifier.local.name, source);
        continue;
      }
      const imported =
        specifier.type === 'ImportDefaultSpecifier'
          ? 'default'
          : (specifier.imported.name ?? specifier.imported.value);
      const key =
        directKey ??
        (source === contract.package
          ? contract.exports?.get(imported)
          : undefined);
      if (key) locals.set(specifier.local.name, key);
      helpers.set(specifier.local.name, { imported, source });
    }
  }
  return { locals, namespaces, helpers, sources };
}

export function jsxKey(name, registry, contract) {
  if (name.type === 'JSXIdentifier') return registry.locals.get(name.name);
  if (
    name.type === 'JSXMemberExpression' &&
    name.object.type === 'JSXIdentifier' &&
    name.property.type === 'JSXIdentifier' &&
    registry.namespaces.has(name.object.name)
  ) {
    const source = registry.namespaces.get(name.object.name);
    const exportedKey = contract.exports.get(name.property.name);
    if (source === contract.package) return exportedKey;
    if (contract.imports.get(source) === exportedKey) return exportedKey;
  }
  return undefined;
}

export function helperCall(callee, registry, contract) {
  let imported;
  let source;
  if (callee.type === 'Identifier') {
    ({ imported, source } = registry.helpers.get(callee.name) ?? {});
  } else if (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.object.type === 'Identifier' &&
    callee.property.type === 'Identifier'
  ) {
    imported = callee.property.name;
    source = registry.namespaces.get(callee.object.name);
  }
  if (!imported || !source) return undefined;
  return contract.helperSources.get(imported)?.has(source)
    ? { imported, source }
    : undefined;
}

export function isExcepted(contract, code, filename) {
  const projectPath = relative(contract.cwd, filename).replaceAll('\\', '/');
  return (contract.profile?.exceptions ?? []).some((exception) => {
    if (!exception.rules.includes(code)) return false;
    const target = exception.target.replace(/^\.\//, '').replace(/\/$/, '');
    return projectPath === target || projectPath.startsWith(`${target}/`);
  });
}

export const UI_RULE_SCHEMA = [
  {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
];
