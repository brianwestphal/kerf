import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';
import { createRequire } from 'node:module';
import process from 'node:process';

const PROFILE = '.kerf-ui-profile.json';
const cache = new Map();
const loadCommonJs = createRequire(import.meta.url);

export const UI_CONTRACT_LOAD_CODE = 'KUI-L090';

// A catalog entry's `publicExports` mixes the component render function with
// helpers the component's props consume (`Select` ships `uiColor`, `List`
// ships `px`/`rem`/`flex`). Only the render function stands for the entry, so
// only it may carry the entry's contracts. A component export is one whose
// name starts with an uppercase letter: JSX itself treats a lowercase tag as an
// intrinsic element, so a lowercase export can never be a component tag, and
// `@kerfjs/ui`'s catalog check (`check-component-catalog.mjs`) enforces the
// converse for the package: every uppercase runtime export returns `SafeHtml`
// and every lowercase one does not. A default import has no name to inspect
// and keeps its subpath's entry.
export function isComponentExport(name) {
  return name === 'default' || /^[A-Z]/.test(name);
}

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

// The directory whose package.json names `packageName`, searched upward from a
// catalog file; a catalog's `source` paths are relative to that package root.
function packageRootOf(start, packageName) {
  for (let directory = dirname(start); ; directory = dirname(directory)) {
    const manifest = resolve(directory, 'package.json');
    if (existsSync(manifest)) {
      try {
        if (readJson(manifest).name === packageName) return directory;
      } catch {
        // An unreadable manifest is not the owner; keep searching.
      }
    }
    if (dirname(directory) === directory) return dirname(start);
  }
}

const exportName = (item) => (typeof item === 'string' ? item : item?.name);

// Application and third-party composition catalogs a profile declares, beyond
// the @kerfjs/ui catalog the rules load directly. Their entries join the
// contract, and their components resolve by package subpath (a bare import)
// or by source file (an app's relative import).
function profileCatalogs(loadedProfile, basePackage) {
  const catalogs = [];
  for (const catalog of loadedProfile.profile?.catalogs ?? []) {
    if (catalog.package === basePackage) continue;
    const owner = loadedProfile.provenance?.[`$catalogs.${catalog.package}`];
    if (!owner || !catalog.composition?.path || owner.startsWith('<')) continue;
    const path = resolve(dirname(owner), catalog.composition.path);
    const artifact = readJson(path);
    catalogs.push({ artifact, root: packageRootOf(path, catalog.package) });
  }
  return catalogs;
}

// The files a relative import specifier may name, in the order TypeScript's
// ESM resolution tries them (a `.js` specifier also names its `.ts`/`.tsx`).
const SCRIPT_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js', '.mts', '.mjs'];
export function relativeImportCandidates(fromFile, specifier) {
  const base = resolve(dirname(fromFile), specifier);
  const extension = extname(base);
  const stem = SCRIPT_EXTENSIONS.includes(extension)
    ? base.slice(0, -extension.length)
    : base;
  return [
    base,
    ...SCRIPT_EXTENSIONS.map((candidate) => `${stem}${candidate}`),
    ...SCRIPT_EXTENSIONS.map((candidate) => resolve(base, `index${candidate}`)),
  ];
}

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
        settings.catalogPath ?? packageAsset(cwd, 'component-composition.json'),
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
    // Declared application/third-party components: `packageExports` maps
    // `<package or package/subpath>\0<Export>` and `sourceExports` maps
    // `<absolute source file>\0<Export>` to the entry key.
    const packageExports = new Map();
    const sourceExports = new Map();
    // Source files of declared components: a wrapper's own source may render
    // the element it wraps (Kerf's PopupMenu renders `wa-dropdown`).
    const componentSources = new Set();
    // Every cataloged entry whose public classes may be a component's rendered
    // anatomy: the base catalog's (exports from the selection catalog) and each
    // declared application/third-party catalog's (exports on the entry).
    const classOwnerEntries = catalog.entries.map((entry) => ({
      key: entry.key,
      name: entry.name,
      boundaries: entry.boundaries,
      exports: (
        selection.entries.find(({ id }) => id === entry.id)?.publicExports ?? []
      ).map(exportName),
    }));
    for (const { artifact, root } of profileCatalogs(
      loadedProfile,
      selection.package,
    ))
      for (const entry of artifact.entries ?? []) {
        const key = entry.key ?? `${artifact.package}:${entry.id}`;
        entries.set(key, entry);
        classOwnerEntries.push({
          key,
          name: entry.name,
          boundaries: entry.boundaries,
          exports: (entry.publicExports ?? []).map(exportName),
        });
        for (const item of entry.publicExports ?? []) {
          const name = exportName(item);
          if (!name || !isComponentExport(name)) continue;
          const subpath = typeof item === 'string' ? '.' : item.subpath;
          // A private application's export has no subpath: it is never
          // imported by package name, only through its source file below.
          if (typeof subpath === 'string') {
            const specifier =
              subpath !== '.'
                ? `${entry.package ?? artifact.package}/${subpath.replace(/^\.\//, '')}`
                : (entry.package ?? artifact.package);
            packageExports.set(`${specifier}\0${name}`, key);
          }
          if (entry.source) {
            sourceExports.set(`${resolve(root, entry.source)}\0${name}`, key);
            componentSources.add(resolve(root, entry.source));
          }
        }
      }
    const imports = new Map();
    const exports = new Map();
    // Custom-element tag -> entry key, for elements authored directly in JSX
    // (`<wa-dropdown>`) rather than through an imported component.
    const customElements = new Map();
    const helperSources = new Map();
    const addHelperSource = (name, source) => {
      const sources = helperSources.get(name) ?? new Set();
      sources.add(source);
      helperSources.set(name, sources);
    };
    for (const entry of selection.entries) {
      const key = `${selection.package}:${entry.id}`;
      if (entry.customElement) customElements.set(entry.customElement, key);
      if (entry.delivery?.browserImport)
        imports.set(entry.delivery.browserImport, key);
      if (entry.delivery?.moduleImport)
        imports.set(entry.delivery.moduleImport, key);
      for (const name of entry.publicExports ?? []) {
        if (isComponentExport(name)) exports.set(name, key);
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
      packageExports,
      sourceExports,
      componentSources,
      customElements,
      helperSources,
      profile,
      cwd,
      publicClasses: new Set(
        catalog.entries.flatMap((entry) => entry.boundaries.publicClasses),
      ),
      componentClasses: componentClassOwners(classOwnerEntries),
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

// Public classes that are a component's rendered anatomy — `@kerfjs/ui`'s
// `kui-*` classes and any class a declared application or third-party catalog
// lists (`acme-meter`) — mapped to the entry and the export that renders it. A
// class the catalog lists in `boundaries.placeableClasses` (layout utilities,
// the document root, item geometry on a non-div carrier) is the application's
// to place and is absent — unless the entry names the `rootElement` its
// component renders around those classes: then the class maps with that
// `element`, because a plain `<div class="kui-content-item">` is exactly what
// `ContentItem` renders, while a `<ul>` or `<footer>` carrying the geometry
// stays the application's. The first catalog to claim a class owns it, so the
// base catalog wins over a declared one.
function componentClassOwners(classOwnerEntries) {
  const owners = new Map();
  for (const entry of classOwnerEntries) {
    const placeable = new Set(entry.boundaries?.placeableClasses ?? []);
    const rootElement = entry.boundaries?.rootElement;
    const exports = entry.exports.filter(
      (name) => name && /^[A-Z]/.test(name) && !name.endsWith('Props'),
    );
    if (exports.length === 0) continue;
    for (const className of entry.boundaries?.publicClasses ?? []) {
      if (placeable.has(className) && !rootElement) continue;
      if (owners.has(className)) continue;
      owners.set(className, {
        key: entry.key,
        render: rendererOf(className, entry.name, exports),
        ...(placeable.has(className) ? { element: rootElement } : {}),
      });
    }
  }
  return owners;
}

// The export named after the class's block, tried from the whole block down to
// its last word (`kui-toolbar-action-link` is ToolbarActionLink,
// `kui-pane__content` is Pane, `acme-meter__bar` is Meter), else the entry's
// own export, else every component export the entry lists.
function rendererOf(className, entryName, exports) {
  const words = className.replace(/(?:__|--).*$/, '').split('-');
  for (let start = 0; start < words.length; start += 1) {
    const candidate = words
      .slice(start)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
    if (exports.includes(candidate)) return [candidate];
  }
  if (exports.includes(entryName)) return [entryName];
  return [...new Set(exports)];
}

export function importRegistry(program, contract, filename) {
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
      const key = !isComponentExport(imported)
        ? undefined
        : (directKey ??
          (source === contract.package
            ? contract.exports?.get(imported)
            : declaredComponentKey(contract, source, imported, filename)));
      if (key) locals.set(specifier.local.name, key);
      helpers.set(specifier.local.name, { imported, source });
    }
  }
  return { locals, namespaces, helpers, sources };
}

// An application or third-party component declared in a profile catalog.
function declaredComponentKey(contract, source, imported, filename) {
  const byPackage = contract.packageExports?.get(`${source}\0${imported}`);
  if (byPackage) return byPackage;
  if (!filename || !source.startsWith('.') || !contract.sourceExports?.size)
    return undefined;
  return sourceComponentKey(contract, filename, source, imported, new Set());
}

// A relative import names a cataloged component by its defining source file,
// or through relative re-exports (`export { X } from './x.js'`, `export * from
// './x.js'`, chains of either) that reach one: apps commonly import wrappers
// through a components barrel. Anything else — a bare re-export, a local
// definition, a file that cannot be read — stays unresolved.
const MAX_REEXPORT_VISITS = 64;
function sourceComponentKey(contract, fromFile, specifier, imported, seen) {
  const candidates = relativeImportCandidates(fromFile, specifier);
  for (const candidate of candidates) {
    const key = contract.sourceExports.get(`${candidate}\0${imported}`);
    if (key) return key;
  }
  // `seen` holds each (file, name) already followed: it breaks re-export
  // cycles and bounds the work a pathological barrel graph can cost.
  if (seen.size >= MAX_REEXPORT_VISITS) return undefined;
  for (const candidate of candidates) {
    const reExports = relativeReExports(candidate);
    if (!reExports) continue;
    const visit = `${candidate}\0${imported}`;
    if (seen.has(visit)) return undefined;
    seen.add(visit);
    for (const { name, local, from } of reExports) {
      if (name !== undefined && name !== imported) continue;
      const key = sourceComponentKey(
        contract,
        candidate,
        from,
        name === undefined ? imported : local,
        seen,
      );
      if (key) return key;
    }
    // The first file that exists is the one the import resolves to.
    return undefined;
  }
  return undefined;
}

// The relative value re-exports of one module file, read from its source text:
// `{ name, local, from }` for `export { local as name } from`, and
// `{ from }` (every name) for `export * from`. Type-only re-exports and
// namespace re-exports (`export * as ns`) are skipped. Cached by modification
// time, so a long-lived editor session sees barrel edits. Undefined when the
// file does not exist.
const reExportCache = new Map();
function relativeReExports(file) {
  let mtime;
  try {
    const stats = statSync(file);
    if (!stats.isFile()) return undefined;
    mtime = stats.mtimeMs;
  } catch {
    return undefined;
  }
  const cached = reExportCache.get(file);
  if (cached?.mtime === mtime) return cached.reExports;
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return undefined;
  }
  const code = text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:\\])\/\/[^\n]*/g, '$1');
  const reExports = [];
  const named = /\bexport\s+(type\s+)?\{([^}]*)\}\s*from\s*(['"])([^'"]+)\3/g;
  for (const match of code.matchAll(named)) {
    const [, typeOnly, list, , from] = match;
    if (typeOnly || !from.startsWith('.')) continue;
    for (const raw of list.split(',')) {
      const part = raw.trim();
      if (!part || /^type\s/.test(part)) continue;
      const [local, name = local] = part.split(/\s+as\s+/).map((x) => x.trim());
      reExports.push({ name, local, from });
    }
  }
  const star = /\bexport\s+\*\s+from\s*(['"])([^'"]+)\1/g;
  for (const match of code.matchAll(star)) {
    const from = match[2];
    if (from.startsWith('.')) reExports.push({ from });
  }
  reExportCache.set(file, { mtime, reExports });
  return reExports;
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

// A custom element authored directly as a lowercase JSX tag resolves to its
// selection-catalog entry. Kept separate from `jsxKey` so composition rules
// keep treating raw elements as application-owned markup.
export function customElementKey(name, contract) {
  if (name.type !== 'JSXIdentifier' || !name.name.includes('-')) return;
  return contract.customElements?.get(name.name);
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
