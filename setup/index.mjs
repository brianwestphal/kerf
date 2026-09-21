import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import {
  access,
  mkdir,
  readFile,
  realpath,
  readdir,
  rename,
  rm,
  rmdir,
  lstat,
  writeFile,
} from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  applyJsoncEdits,
  jsoncInsertProperties,
  jsoncValueEdit,
  parseJsoncDocument,
} from './jsonc.mjs';

const execFileAsync = promisify(execFile);
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const marker = '<!-- KERF-APP-CANONICAL-END · your customizations below -->';

const exists = async (path) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const portable = (root, path) =>
  relative(root, path).replaceAll('\\', '/') || '.';
const contained = (root, path) => {
  const offset = relative(root, path);
  return (
    offset === '' ||
    (!offset.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) &&
      offset !== '..' &&
      !isAbsolute(offset))
  );
};
const stableJson = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) =>
  createHash('sha256').update(value, 'utf8').digest('hex');
const redactText = (value) =>
  String(value).replace(
    /([a-z][a-z0-9+.-]*:\/\/)[^\s/@:]+(?::[^\s/@]*)?@/gi,
    '$1<redacted>@',
  );
const describeValue = (key, value) =>
  /token|secret|password|credential/i.test(key)
    ? '<redacted>'
    : redactText(JSON.stringify(value));

async function readText(path) {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return null;
  }
}

async function readJson(path) {
  const source = await readText(path);
  if (source === null) return null;
  return JSON.parse(source);
}

function validateSetupState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state))
    throw new Error('.kerf-ai-setup.json must be an object.');
  if (![1, 2].includes(state.schemaVersion))
    throw new Error(
      `Unsupported .kerf-ai-setup.json schemaVersion ${state.schemaVersion}.`,
    );
  if (
    typeof state.setupVersion !== 'string' ||
    !['npm', 'pnpm', 'yarn'].includes(state.packageManager) ||
    (state.packageManagerVersion !== undefined &&
      typeof state.packageManagerVersion !== 'string')
  )
    throw new Error(
      '.kerf-ai-setup.json has invalid version or package-manager metadata.',
    );
  const packageStates =
    state.schemaVersion === 2 ? state.packages : { [state.packagePath]: state };
  if (!packageStates || typeof packageStates !== 'object')
    throw new Error('.kerf-ai-setup.json packages must be an object.');
  for (const [key, value] of Object.entries(packageStates)) {
    if (
      !value ||
      typeof value !== 'object' ||
      value.packagePath !== key ||
      typeof value.package !== 'string' ||
      !['core', 'ui'].includes(value.mode) ||
      !value.managed ||
      typeof value.managed !== 'object' ||
      !value.resolutions ||
      typeof value.resolutions !== 'object'
    )
      throw new Error(`Invalid setup state for package ${key}.`);
    for (const resolution of Object.values(value.resolutions ?? {}))
      if (!['keep', 'kerf'].includes(resolution))
        throw new Error(`Invalid persisted resolution for package ${key}.`);
    for (const item of Object.values(value.managed ?? {}))
      if (!item || !/^[a-f0-9]{64}$/.test(item.sha256 ?? ''))
        throw new Error(`Invalid managed-value hash for package ${key}.`);
  }
}

function dependencies(manifest) {
  return {
    ...(manifest.dependencies ?? {}),
    ...(manifest.devDependencies ?? {}),
    ...(manifest.peerDependencies ?? {}),
  };
}

function allowsVersion(range, version) {
  if (typeof range !== 'string') return false;
  if (range === version || range === '*' || range === 'latest') return true;
  const requested = version
    .match(/^(\d+)\.(\d+)\.(\d+)/)
    ?.slice(1)
    .map(Number);
  const declared = range.match(/^(\^|~|>=)\s*(\d+)\.(\d+)\.(\d+)/);
  if (!requested || !declared) return false;
  const base = declared.slice(2).map(Number);
  const compare =
    requested[0] - base[0] || requested[1] - base[1] || requested[2] - base[2];
  if (compare < 0) return false;
  if (declared[1] === '^') return requested[0] === base[0];
  if (declared[1] === '~')
    return requested[0] === base[0] && requested[1] === base[1];
  return true;
}

async function workspacePackages(root) {
  const rootManifest = await readJson(resolve(root, 'package.json'));
  if (!rootManifest) throw new Error(`${root} has no package.json.`);
  const packages = [{ directory: root, manifest: rootManifest }];
  const patterns = Array.isArray(rootManifest.workspaces)
    ? rootManifest.workspaces
    : (rootManifest.workspaces?.packages ?? []);
  const pnpmWorkspace = await readText(resolve(root, 'pnpm-workspace.yaml'));
  for (const match of pnpmWorkspace?.matchAll(
    /^\s*-\s*['"]?([^'"#]+)['"]?\s*$/gm,
  ) ?? [])
    if (!patterns.includes(match[1].trim())) patterns.push(match[1].trim());
  for (const pattern of patterns) {
    if (typeof pattern !== 'string') continue;
    if (
      isAbsolute(pattern) ||
      pattern.split(/[\\/]/).includes('..') ||
      pattern.startsWith('!')
    )
      throw new Error(`Unsafe workspace pattern ${pattern}.`);
    if (pattern.includes('**') || /[{}]/.test(pattern))
      throw new Error(
        `Unsupported workspace pattern ${pattern}; use explicit or single-* paths.`,
      );
    const star = pattern.indexOf('*');
    if (star < 0) {
      const directory = resolve(root, pattern);
      if (!contained(root, directory))
        throw new Error(`Workspace package escapes the workspace: ${pattern}.`);
      const manifest = await readJson(resolve(directory, 'package.json'));
      if (manifest) {
        const actual = await realpath(directory);
        if (!contained(await realpath(root), actual))
          throw new Error(
            `Workspace package symlink escapes the workspace: ${pattern}.`,
          );
        packages.push({ directory, manifest });
      }
      continue;
    }
    const prefix = pattern.slice(0, star);
    const suffix = pattern.slice(star + 1);
    const parent = resolve(root, prefix);
    try {
      for (const entry of await readdir(parent, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const directory = resolve(parent, entry.name, suffix);
        const manifest = await readJson(resolve(directory, 'package.json'));
        if (manifest) {
          const actual = await realpath(directory);
          if (!contained(await realpath(root), actual))
            throw new Error(
              `Workspace package symlink escapes the workspace: ${pattern}.`,
            );
          packages.push({ directory, manifest });
        }
      }
    } catch {
      // Empty workspace globs are valid.
    }
  }
  return packages;
}

function declaredMode(manifest) {
  const deps = dependencies(manifest);
  if (deps['@kerfjs/ui']) return 'ui';
  if (deps.kerfjs) return 'core';
  return null;
}

async function sourceMode(directory) {
  const queue = [resolve(directory, 'src')];
  let inspected = 0;
  let core = false;
  while (queue.length && inspected < 200) {
    const current = queue.shift();
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) queue.push(path);
      else if (/\.(?:[cm]?[jt]sx?)$/.test(entry.name)) {
        inspected += 1;
        const source = await readText(path);
        if (/['"]@kerfjs\/ui(?:\/[^'"]*)?['"]/.test(source)) return 'ui';
        if (/['"]kerfjs(?:\/[^'"]*)?['"]/.test(source)) core = true;
      }
    }
  }
  return core ? 'core' : null;
}

async function detectMode(candidate) {
  return declaredMode(candidate.manifest) ?? sourceMode(candidate.directory);
}

async function selectPackage(root, selector, requestedMode) {
  const packages = await workspacePackages(root);
  if (selector) {
    const direct = resolve(root, selector);
    const selected = packages.find(
      ({ directory, manifest }) =>
        directory === direct || manifest.name === selector,
    );
    if (!selected)
      throw new Error(`Workspace package ${selector} was not found.`);
    return selected;
  }
  const candidates = [];
  for (const candidate of packages)
    if ((await detectMode(candidate)) || requestedMode)
      candidates.push(candidate);
  if (candidates.length === 1) return candidates[0];
  if (!candidates.length)
    throw new Error('No Kerf package detected; pass --core or --ui.');
  throw new Error(
    `Multiple Kerf packages detected (${candidates
      .map(({ manifest }) => manifest.name ?? '<unnamed>')
      .join(', ')}); pass --package <name|path>.`,
  );
}

function splitCanonical(source) {
  const first = source.indexOf(marker);
  if (first < 0) return { error: 'missing canonical marker' };
  if (source.indexOf(marker, first + marker.length) >= 0)
    return { error: 'multiple canonical markers' };
  const end = first + marker.length + (source[first + marker.length] === '\n');
  return { canonical: source.slice(0, end), append: source.slice(end) };
}

function mergeCanonical(current, bundled, history, version) {
  if (current === null) return { value: bundled };
  const local = splitCanonical(current);
  if (local.error) return { conflict: local.error };
  const localVersion = current
    .slice(0, 512)
    .match(/kerf-skill-version:\s*([\w.-]+)/)?.[1];
  if (!localVersion) return { conflict: 'missing kerf-skill-version' };
  const expected =
    localVersion === version ? sha256(bundled) : history[localVersion];
  if (!expected || sha256(local.canonical) !== expected)
    return { conflict: 'canonical content was customized above the marker' };
  return { value: bundled + local.append };
}

const hashValue = (value) => sha256(JSON.stringify(value) ?? 'undefined');

function reconcileValue({
  target,
  key,
  value,
  id,
  conflicts,
  managedBefore,
  managedAfter,
  resolutions,
  activeConflictIds,
  knownResolutionIds,
}) {
  knownResolutionIds.add(id);
  const current = target[key];
  const previouslyManaged = managedBefore[id]?.sha256 === hashValue(current);
  const divergent = key in target && current !== value && !previouslyManaged;
  if (divergent) activeConflictIds.add(id);
  const resolution = resolutions[id];
  if (divergent && !resolution) {
    conflicts.push({
      id,
      message: `existing value ${describeValue(id, current)} differs from ${describeValue(id, value)}`,
    });
    return;
  }
  if (divergent && resolution === 'keep') return;
  target[key] = value;
  managedAfter[id] = { sha256: hashValue(value) };
}

function addMapValues(target, additions, path, context) {
  for (const [key, value] of Object.entries(additions)) {
    reconcileValue({ target, key, value, id: `${path}.${key}`, ...context });
  }
}

function eslintTemplate(mode, format = 'module') {
  const preset = mode === 'ui' ? 'recommended-ui' : 'recommended';
  if (format === 'commonjs')
    return `module.exports = (async () => {\n  const { default: parser } = await import('@typescript-eslint/parser');\n  const { default: kerfjs } = await import('eslint-plugin-kerfjs');\n  return [\n    { files: ['**/*.{ts,tsx}'], languageOptions: { parser } },\n    kerfjs.configs['${preset}'],\n  ];\n})();\n`;
  return `import parser from '@typescript-eslint/parser';\nimport kerfjs from 'eslint-plugin-kerfjs';\n\nexport default [\n  { files: ['**/*.{ts,tsx}'], languageOptions: { parser } },\n  kerfjs.configs['${preset}'],\n];\n`;
}

function mergeEslintConfig(source, mode) {
  const imported = source.match(
    /^\s*import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]eslint-plugin-kerfjs['"]\s*;?\s*$/m,
  );
  if (imported) {
    const preset = mode === 'ui' ? 'recommended-ui' : 'recommended';
    const configured = new RegExp(
      `^\\s*${imported[1]}\\.configs\\[['"]${preset}['"]\\],?\\s*$`,
      'm',
    );
    if (configured.test(source)) return { value: source };
  }
  const match = source.match(/^\s*export\s+default\s*\[/m);
  if (!match || (source.includes('`') && !imported))
    return {
      conflict: 'config does not use a provable static export default array',
    };
  const preset = mode === 'ui' ? 'recommended-ui' : 'recommended';
  const importLine = imported
    ? ''
    : "import kerfjs from 'eslint-plugin-kerfjs';\n";
  const binding = imported?.[1] ?? 'kerfjs';
  return {
    value: `${importLine}${source.slice(0, match.index + match[0].length)}\n  ${binding}.configs['${preset}'],${source.slice(match.index + match[0].length)}`,
  };
}

function profileTemplate(packageName, catalogPath) {
  return {
    $schema:
      'https://raw.githubusercontent.com/brianwestphal/kerf/main/ui/ai/application-ui-profile.schema.json',
    schemaVersion: 1,
    scope: 'workspace',
    catalogs: [
      {
        package: packageName,
        composition: { path: catalogPath, schemaVersion: 2 },
      },
    ],
  };
}

function metadataTemplate() {
  return {
    $schema:
      './node_modules/create-kerf-component/component-metadata.schema.json',
    schemaVersion: 1,
    v1Catalog: 'not-applicable',
    components: [],
  };
}

async function packageManagerInfo(root) {
  const manifest = await readJson(resolve(root, 'package.json'));
  const declared = manifest?.packageManager?.match(/^(npm|pnpm|yarn)@(.+)$/);
  if (declared) return { name: declared[1], version: declared[2] };
  if (await exists(resolve(root, 'pnpm-lock.yaml'))) return { name: 'pnpm' };
  if (await exists(resolve(root, 'yarn.lock'))) return { name: 'yarn' };
  return { name: 'npm' };
}

async function installedVersion(directory, name) {
  try {
    const require = createRequire(resolve(directory, 'package.json'));
    let current = dirname(require.resolve(name));
    while (dirname(current) !== current) {
      const manifest = await readJson(resolve(current, 'package.json'));
      if (manifest?.name === name) return manifest.version;
      current = dirname(current);
    }
  } catch {
    return null;
  }
  return null;
}

function mergeProfile(current, recommended, context) {
  if (current === undefined) {
    for (const key of ['$schema', 'schemaVersion', 'scope'])
      context.managedAfter[`.kerf-ui-profile.json#${key}`] = {
        sha256: hashValue(recommended[key]),
      };
    const local = recommended.catalogs[0];
    context.managedAfter[`.kerf-ui-profile.json#catalogs.${local.package}`] = {
      sha256: hashValue(local),
    };
    return recommended;
  }
  const idPrefix = '.kerf-ui-profile.json';
  if (!current || typeof current !== 'object' || Array.isArray(current)) {
    context.knownResolutionIds.add(idPrefix);
    context.activeConflictIds.add(idPrefix);
    if (!context.resolutions[idPrefix]) {
      context.conflicts.push({
        id: idPrefix,
        message: 'profile root must be an object',
      });
      return current;
    }
    if (context.resolutions[idPrefix] === 'keep') return current;
    current = {};
  }
  const output = JSON.parse(JSON.stringify(current));
  for (const key of ['$schema', 'schemaVersion', 'scope']) {
    reconcileValue({
      target: output,
      key,
      value: recommended[key],
      id: `.kerf-ui-profile.json#${key}`,
      ...context,
    });
  }
  if (output.catalogs !== undefined && !Array.isArray(output.catalogs)) {
    const id = `${idPrefix}#catalogs`;
    context.knownResolutionIds.add(id);
    context.activeConflictIds.add(id);
    if (!context.resolutions[id]) {
      context.conflicts.push({ id, message: 'catalogs must be an array' });
      return output;
    }
    if (context.resolutions[id] === 'keep') return output;
    output.catalogs = [];
  }
  output.catalogs ??= [];
  const local = recommended.catalogs[0];
  const existing = output.catalogs.find(
    (item) => item.package === local.package,
  );
  const id = `.kerf-ui-profile.json#catalogs.${local.package}`;
  context.knownResolutionIds.add(id);
  if (!existing) {
    output.catalogs.push(local);
    context.managedAfter[id] = { sha256: hashValue(local) };
  } else {
    const previouslyManaged =
      context.managedBefore[id]?.sha256 === hashValue(existing);
    const divergent =
      JSON.stringify(existing) !== JSON.stringify(local) && !previouslyManaged;
    if (divergent) context.activeConflictIds.add(id);
    if (divergent && !context.resolutions[id])
      context.conflicts.push({
        id,
        message: 'existing catalog declaration differs',
      });
    else if (!divergent || context.resolutions[id] === 'kerf') {
      output.catalogs[output.catalogs.indexOf(existing)] = local;
      context.managedAfter[id] = { sha256: hashValue(local) };
    }
  }
  return output;
}

export async function planKerfSetup({
  root = process.cwd(),
  package: selector,
  mode: requestedMode,
  version,
  resolutions = {},
} = {}) {
  root = resolve(root);
  const selected = await selectPackage(root, selector, requestedMode);
  const detectedMode = await detectMode(selected);
  const mode = requestedMode ?? detectedMode;
  if (!mode) throw new Error('Pass --core or --ui for a new Kerf package.');
  if (requestedMode && detectedMode && requestedMode !== detectedMode)
    throw new Error(
      `Requested ${requestedMode} conflicts with detected ${detectedMode} usage.`,
    );
  const ownManifest = await readJson(resolve(packageRoot, 'package.json'));
  const setupVersion = version ?? ownManifest.version;
  const conflicts = [];
  const actions = [];
  const generatedPaths = [];
  const statePath = resolve(root, '.kerf-ai-setup.json');
  const priorState = (await readJson(statePath)) ?? {};
  if (Object.keys(priorState).length) validateSetupState(priorState);
  const packageKey = portable(root, selected.directory);
  const legacyPackageState =
    priorState.packagePath === packageKey ? priorState : {};
  const priorPackageState =
    priorState.packages?.[packageKey] ?? legacyPackageState;
  if (
    priorPackageState.package &&
    priorPackageState.package !== (selected.manifest.name ?? packageKey)
  )
    throw new Error(`Setup state package identity changed at ${packageKey}.`);
  const requestedResolutions = { ...resolutions };
  resolutions = { ...(priorPackageState.resolutions ?? {}), ...resolutions };
  const managedBefore = priorPackageState.managed ?? {};
  const managedAfter = {};
  const knownResolutionIds = new Set();
  const activeConflictIds = new Set();
  const context = {
    conflicts,
    managedBefore,
    managedAfter,
    resolutions,
    knownResolutionIds,
    activeConflictIds,
  };
  const addAction = async (path, value, kind = 'write') => {
    const before = await readText(path);
    if (before !== value)
      actions.push({
        path: portable(root, path),
        absolutePath: path,
        before,
        after: value,
        kind,
      });
  };

  const aiManifest = await readJson(resolve(packageRoot, 'ai/manifest.json'));
  const projectKerfVersion = await installedVersion(
    selected.directory,
    'kerfjs',
  );
  knownResolutionIds.add('kerfjs-version');
  if (projectKerfVersion && projectKerfVersion !== setupVersion) {
    activeConflictIds.add('kerfjs-version');
    if (!resolutions['kerfjs-version'])
      conflicts.push({
        id: 'kerfjs-version',
        message: `running setup ${setupVersion} differs from installed kerfjs ${projectKerfVersion}; rerun with kerfjs@${projectKerfVersion}, or choose keep to retain project declarations or kerf to update them`,
      });
  }
  for (const file of aiManifest.files) {
    if (
      file.name === 'cursorrules' &&
      !(await exists(resolve(root, '.cursor'))) &&
      !(await exists(resolve(root, '.cursorrules')))
    )
      continue;
    const destination = resolve(root, file.dest);
    const bundled = await readFile(resolve(packageRoot, file.bundle), 'utf8');
    const merged = mergeCanonical(
      await readText(destination),
      bundled,
      file.history ?? {},
      file.version,
    );
    knownResolutionIds.add(file.dest);
    if (merged.conflict) {
      activeConflictIds.add(file.dest);
      if (!resolutions[file.dest])
        conflicts.push({ id: file.dest, message: merged.conflict });
      else if (resolutions[file.dest] === 'kerf') {
        const local = splitCanonical((await readText(destination)) ?? '');
        const replacement = local.error ? bundled : bundled + local.append;
        await addAction(destination, replacement, 'canonical');
        managedAfter[file.dest] = { sha256: sha256(bundled) };
      }
    } else {
      await addAction(destination, merged.value, 'canonical');
      managedAfter[file.dest] = {
        sha256: sha256(splitCanonical(merged.value).canonical),
      };
    }
  }

  const packagePath = resolve(selected.directory, 'package.json');
  const nextManifest = JSON.parse(JSON.stringify(selected.manifest));
  nextManifest.scripts ??= {};
  nextManifest.devDependencies ??= {};
  nextManifest.dependencies ??= {};
  const workspaceDoctorArgs =
    selected.directory === root
      ? ''
      : ` --root ${portable(selected.directory, root)} --package ${nextManifest.name}`;
  addMapValues(
    nextManifest.scripts,
    mode === 'ui'
      ? {
          'kerf:check': 'tsc --noEmit && eslint .',
          'kerf:doctor': `kerf-ui-doctor --full${workspaceDoctorArgs}`,
          'kerf:doctor:changed': `kerf-ui-doctor --changed${workspaceDoctorArgs}`,
          'catalog:generate': 'kerf-component-catalog --write',
          'catalog:check': 'kerf-component-catalog --check',
        }
      : { 'kerf:check': 'tsc --noEmit && eslint .' },
    'package.json#scripts',
    context,
  );
  addMapValues(
    nextManifest.devDependencies,
    {
      'eslint-plugin-kerfjs': setupVersion,
      '@typescript-eslint/parser': '^8.0.0',
      eslint: '^9.0.0',
      typescript: '^5.0.0 || ^6.0.0',
      ...(mode === 'ui' ? { 'create-kerf-component': setupVersion } : {}),
    },
    'package.json#devDependencies',
    context,
  );
  const reconcileDependency = (name) => {
    const section =
      ['dependencies', 'devDependencies', 'peerDependencies'].find(
        (candidate) => name in (nextManifest[candidate] ?? {}),
      ) ?? 'dependencies';
    nextManifest[section] ??= {};
    const id = `package.json#${section}.${name}`;
    if (
      allowsVersion(nextManifest[section][name], setupVersion) &&
      managedBefore[id]?.sha256 !== hashValue(nextManifest[section][name])
    ) {
      knownResolutionIds.add(id);
      return;
    }
    const dependencyContext =
      name === 'kerfjs' && resolutions['kerfjs-version']
        ? {
            ...context,
            resolutions: {
              ...resolutions,
              [id]: resolutions['kerfjs-version'],
            },
          }
        : context;
    reconcileValue({
      target: nextManifest[section],
      key: name,
      value: setupVersion,
      id,
      ...dependencyContext,
    });
  };
  reconcileDependency('kerfjs');
  if (mode === 'ui') reconcileDependency('@kerfjs/ui');
  if (mode === 'ui') {
    reconcileValue({
      target: nextManifest,
      key: 'kerfComponentCatalog',
      value: {
        source: './kerf.components.json',
        output: './component-catalog-v2.json',
      },
      id: 'package.json#kerfComponentCatalog',
      ...context,
    });
    for (const [key, configuredPath] of Object.entries(
      nextManifest.kerfComponentCatalog,
    ))
      if (
        typeof configuredPath !== 'string' ||
        !contained(
          selected.directory,
          resolve(selected.directory, configuredPath),
        )
      )
        throw new Error(
          `kerfComponentCatalog.${key} must stay inside the selected package.`,
        );
  }
  await addAction(packagePath, stableJson(nextManifest), 'json');

  const tsconfigPath = resolve(selected.directory, 'tsconfig.json');
  const tsconfigSource = await readText(tsconfigPath);
  const tsconfigRecommendations = {
    target: 'ES2022',
    module: 'ESNext',
    moduleResolution: 'Bundler',
    strict: true,
    jsx: 'react-jsx',
    jsxImportSource: 'kerfjs',
  };
  if (tsconfigSource === null) {
    const tsconfig = { compilerOptions: {}, include: ['src'] };
    addMapValues(
      tsconfig.compilerOptions,
      tsconfigRecommendations,
      'tsconfig.json#compilerOptions',
      context,
    );
    await addAction(tsconfigPath, stableJson(tsconfig), 'json');
  } else {
    const parsed = parseJsoncDocument(tsconfigSource, 'tsconfig.json');
    const rootId = 'tsconfig.json';
    if (parsed.root.type !== 'object') {
      knownResolutionIds.add(rootId);
      activeConflictIds.add(rootId);
      if (!resolutions[rootId])
        conflicts.push({ id: rootId, message: 'root value must be an object' });
      else if (resolutions[rootId] === 'kerf') {
        const replacement = {
          compilerOptions: { ...tsconfigRecommendations },
          include: ['src'],
        };
        for (const [key, value] of Object.entries(tsconfigRecommendations))
          managedAfter[`tsconfig.json#compilerOptions.${key}`] = {
            sha256: hashValue(value),
          };
        await addAction(tsconfigPath, stableJson(replacement), 'json');
      }
    } else {
      const edits = [];
      const rootInsertions = [];
      const compilerProperty = parsed.root.properties.get('compilerOptions');
      if (compilerProperty && compilerProperty.valueNode.type !== 'object') {
        const id = 'tsconfig.json#compilerOptions';
        knownResolutionIds.add(id);
        activeConflictIds.add(id);
        if (!resolutions[id])
          conflicts.push({ id, message: 'existing value must be an object' });
        else if (resolutions[id] === 'kerf') {
          edits.push(
            jsoncValueEdit(
              compilerProperty.valueNode,
              tsconfigRecommendations,
              tsconfigSource,
            ),
          );
          for (const [key, value] of Object.entries(tsconfigRecommendations))
            managedAfter[`tsconfig.json#compilerOptions.${key}`] = {
              sha256: hashValue(value),
            };
        }
      } else {
        const compilerOptions = compilerProperty?.valueNode.value ?? {};
        const before = { ...compilerOptions };
        addMapValues(
          compilerOptions,
          tsconfigRecommendations,
          'tsconfig.json#compilerOptions',
          context,
        );
        if (compilerProperty) {
          const missing = [];
          for (const [key, value] of Object.entries(compilerOptions)) {
            const property = compilerProperty.valueNode.properties.get(key);
            if (!property) missing.push([key, value]);
            else if (before[key] !== value)
              edits.push(
                jsoncValueEdit(property.valueNode, value, tsconfigSource),
              );
          }
          edits.push(
            ...jsoncInsertProperties(
              tsconfigSource,
              compilerProperty.valueNode,
              missing,
            ),
          );
        } else {
          rootInsertions.push(['compilerOptions', compilerOptions]);
        }
      }
      if (!parsed.root.properties.has('include'))
        rootInsertions.push(['include', ['src']]);
      edits.push(
        ...jsoncInsertProperties(tsconfigSource, parsed.root, rootInsertions),
      );
      await addAction(
        tsconfigPath,
        applyJsoncEdits(tsconfigSource, edits),
        'jsonc',
      );
    }
  }

  const eslintNames = [
    'eslint.config.js',
    'eslint.config.mjs',
    'eslint.config.cjs',
  ];
  let eslintPath;
  for (const name of eslintNames)
    if (await exists(resolve(selected.directory, name))) {
      eslintPath = resolve(selected.directory, name);
      break;
    }
  if (!eslintPath) {
    const generatedPath = resolve(selected.directory, 'eslint.config.mjs');
    const generated = eslintTemplate(mode);
    await addAction(generatedPath, generated);
    managedAfter[portable(root, generatedPath)] = { sha256: sha256(generated) };
  } else {
    const source = await readText(eslintPath);
    const id = portable(root, eslintPath);
    knownResolutionIds.add(id);
    const commonjs =
      eslintPath.endsWith('.cjs') ||
      (eslintPath.endsWith('.js') && nextManifest.type !== 'module');
    const template = eslintTemplate(mode, commonjs ? 'commonjs' : 'module');
    const wasManaged = managedBefore[id]?.sha256 === sha256(source);
    const wasEditedManaged = Boolean(managedBefore[id]) && !wasManaged;
    const merged = wasManaged
      ? { value: template }
      : wasEditedManaged
        ? { conflict: 'setup-authored config was customized' }
        : commonjs
          ? {
              conflict:
                'CommonJS config requires an explicit Kerf preset merge',
            }
          : mergeEslintConfig(source, mode);
    if (merged.conflict) {
      activeConflictIds.add(id);
      if (!resolutions[id])
        conflicts.push({
          id,
          message: `${merged.conflict}; choose keep or kerf`,
        });
      else if (resolutions[id] === 'kerf') {
        const generated = template;
        await addAction(eslintPath, generated);
        managedAfter[id] = { sha256: sha256(generated) };
      }
    } else {
      await addAction(eslintPath, merged.value);
      if (wasManaged) managedAfter[id] = { sha256: sha256(merged.value) };
    }
  }
  if (mode === 'ui') {
    if (!nextManifest.name)
      throw new Error(
        'UI setup requires package.json name for catalog identity.',
      );
    const profilePath = resolve(root, '.kerf-ui-profile.json');
    const currentProfileSource = await readText(profilePath);
    const currentProfile =
      currentProfileSource === null
        ? undefined
        : JSON.parse(currentProfileSource);
    const catalogRelative = portable(
      root,
      resolve(selected.directory, 'component-catalog-v2.json'),
    );
    const profile = mergeProfile(
      currentProfile,
      profileTemplate(
        nextManifest.name,
        catalogRelative.startsWith('.')
          ? catalogRelative
          : `./${catalogRelative}`,
      ),
      context,
    );
    await addAction(profilePath, stableJson(profile), 'json');
    const metadataPath = resolve(selected.directory, 'kerf.components.json');
    if (!(await exists(metadataPath)))
      await addAction(metadataPath, stableJson(metadataTemplate()), 'json');
    generatedPaths.push(
      resolve(selected.directory, nextManifest.kerfComponentCatalog.output),
    );
  }

  for (const [id, resolution] of Object.entries(requestedResolutions)) {
    if (!['keep', 'kerf'].includes(resolution))
      throw new Error(`Resolution ${id} must be keep or kerf.`);
    if (!knownResolutionIds.has(id))
      throw new Error(`Unknown resolution id ${id}.`);
    if (!activeConflictIds.has(id))
      throw new Error(
        `Stale resolution id ${id}; the value no longer conflicts.`,
      );
  }
  const manager = await packageManagerInfo(root);
  const state = {
    schemaVersion: 2,
    setupVersion,
    packageManager: manager.name,
    ...(manager.version ? { packageManagerVersion: manager.version } : {}),
    packages: {
      ...(priorState.packages ??
        (priorState.packagePath
          ? {
              [priorState.packagePath]: {
                mode: priorState.mode,
                package: priorState.package,
                packagePath: priorState.packagePath,
                managed: priorState.managed ?? {},
                resolutions: priorState.resolutions ?? {},
              },
            }
          : {})),
      [packageKey]: {
        mode,
        package: nextManifest.name ?? packageKey,
        packagePath: packageKey,
        managed: managedAfter,
        resolutions: Object.fromEntries(
          [...activeConflictIds]
            .filter((id) => resolutions[id] === 'keep')
            .map((id) => [id, resolutions[id]]),
        ),
      },
    },
  };
  await addAction(statePath, stableJson(state), 'state');
  return {
    schemaVersion: 1,
    root,
    packageRoot: selected.directory,
    packageName: nextManifest.name ?? packageKey,
    packageManager: state.packageManager,
    packageManagerVersion: manager.version,
    mode,
    setupVersion,
    actions,
    conflicts,
    generatedPaths,
  };
}

export function formatSetupPlan(plan) {
  const lines = [
    `Kerf AI setup: ${plan.mode} package ${portable(plan.root, plan.packageRoot)}`,
  ];
  let shown = 0;
  const render = (key, value) =>
    /token|secret|password|credential/i.test(key)
      ? '<redacted>'
      : value === undefined
        ? '<missing>'
        : redactText(JSON.stringify(value));
  const leaves = (value, prefix = '$', output = new Map()) => {
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value))
        leaves(
          child,
          Array.isArray(value) ? `${prefix}[${key}]` : `${prefix}.${key}`,
          output,
        );
    } else output.set(prefix, value);
    return output;
  };
  for (const action of plan.actions) {
    lines.push(
      `${action.before === null ? 'CREATE' : 'UPDATE'} ${action.path}`,
    );
    if (shown >= 120) continue;
    if (
      action.kind === 'json' ||
      action.kind === 'jsonc' ||
      action.kind === 'state'
    ) {
      const before = leaves(
        action.before === null
          ? {}
          : action.kind === 'jsonc'
            ? parseJsoncDocument(action.before, action.path).value
            : JSON.parse(action.before),
      );
      const after = leaves(
        action.kind === 'jsonc'
          ? parseJsoncDocument(action.after, action.path).value
          : JSON.parse(action.after),
      );
      const keys = new Set([...before.keys(), ...after.keys()]);
      for (const key of keys) {
        if (action.kind === 'state' && key.includes('.managed.')) continue;
        if (JSON.stringify(before.get(key)) === JSON.stringify(after.get(key)))
          continue;
        if (shown++ >= 120) break;
        lines.push(
          `  ${key}: ${render(key, before.get(key))} -> ${render(key, after.get(key))}`,
        );
      }
    } else {
      const beforeLines = action.before?.split('\n').length ?? 0;
      const afterLines = action.after.split('\n').length;
      lines.push(`  content: ${beforeLines} line(s) -> ${afterLines} line(s)`);
      shown += 1;
    }
  }
  if (shown >= 120) lines.push('  … additional changes omitted');
  for (const conflict of plan.conflicts)
    lines.push(
      `CONFLICT ${conflict.id}: ${conflict.message} (use --resolve ${conflict.id}=keep|kerf)`,
    );
  if (!plan.actions.length && !plan.conflicts.length) lines.push('No changes.');
  return lines.join('\n');
}

export async function applyKerfSetup(
  plan,
  { install = true, offline = false, runner = execFileAsync } = {},
) {
  if (plan.conflicts.length)
    throw new Error('Resolve setup conflicts before applying changes.');
  const written = [];
  const temporaryPaths = [];
  const createdDirectories = [];
  const lockPath = resolve(plan.root, '.kerf-ai-setup.lock');
  try {
    await mkdir(lockPath);
  } catch {
    throw new Error(
      'Another Kerf setup is already applying in this workspace.',
    );
  }
  const lockfiles = [
    ...new Set(
      [plan.root, plan.packageRoot].flatMap((directory) => [
        resolve(directory, 'package-lock.json'),
        resolve(directory, 'pnpm-lock.yaml'),
        resolve(directory, 'yarn.lock'),
      ]),
    ),
  ];
  const lockfileSnapshots = new Map();
  const generatedSnapshots = new Map();
  let actualPackageRoot;
  const isSymlink = async (path) => {
    try {
      return (await lstat(path)).isSymbolicLink();
    } catch {
      return false;
    }
  };
  const validateGeneratedPath = async (
    path,
    { allowLeafSymlink = false } = {},
  ) => {
    if (!contained(plan.packageRoot, path))
      throw new Error('A generated catalog path escapes the selected package.');
    let ancestor = dirname(path);
    while (!(await exists(ancestor))) ancestor = dirname(ancestor);
    if (!contained(actualPackageRoot, await realpath(ancestor)))
      throw new Error(
        'A generated catalog path traverses a symlink outside the selected package.',
      );
    if (!allowLeafSymlink && (await isSymlink(path)))
      throw new Error('Setup refuses a symlinked generated catalog output.');
  };
  try {
    const actualRoot = await realpath(plan.root);
    if (
      !contained(plan.root, plan.packageRoot) ||
      !contained(actualRoot, await realpath(plan.packageRoot))
    )
      throw new Error('Selected package escapes the setup workspace.');
    actualPackageRoot = await realpath(plan.packageRoot);
    for (const path of lockfiles) {
      if (!contained(plan.root, path))
        throw new Error('A lockfile path escapes the setup workspace.');
      lockfileSnapshots.set(path, await readText(path));
    }
    for (const path of plan.generatedPaths ?? []) {
      await validateGeneratedPath(path);
      generatedSnapshots.set(path, await readText(path));
    }
    for (const action of plan.actions) {
      const expectedPath = resolve(plan.root, action.path);
      if (
        action.absolutePath !== expectedPath ||
        !contained(plan.root, action.absolutePath)
      )
        throw new Error(`Setup action escapes the workspace: ${action.path}.`);
      let ancestor = dirname(action.absolutePath);
      while (!(await exists(ancestor))) ancestor = dirname(ancestor);
      if (!contained(actualRoot, await realpath(ancestor)))
        throw new Error(
          `Setup action traverses a symlink outside the workspace: ${action.path}.`,
        );
      if (
        (await exists(action.absolutePath)) &&
        (await lstat(action.absolutePath)).isSymbolicLink()
      )
        throw new Error(`Setup refuses to replace symlink ${action.path}.`);
      if ((await readText(action.absolutePath)) !== action.before)
        throw new Error(
          `Setup plan is stale for ${action.path}; rerun the dry-run.`,
        );
    }
    for (const action of plan.actions) {
      let directory = dirname(action.absolutePath);
      const missing = [];
      while (!(await exists(directory))) {
        missing.push(directory);
        directory = dirname(directory);
      }
      await mkdir(dirname(action.absolutePath), { recursive: true });
      createdDirectories.push(...missing);
      if (!contained(actualRoot, await realpath(dirname(action.absolutePath))))
        throw new Error(
          `Setup action traverses a symlink outside the workspace: ${action.path}.`,
        );
      const temporary = `${action.absolutePath}.kerf-setup-${process.pid}-${randomUUID()}.tmp`;
      temporaryPaths.push(temporary);
      await writeFile(temporary, action.after);
      if ((await readText(action.absolutePath)) !== action.before)
        throw new Error(
          `Setup plan became stale for ${action.path}; rerun the dry-run.`,
        );
      await rename(temporary, action.absolutePath);
      written.push(action);
    }
    if (install) {
      const yarnMajor = Number(plan.packageManagerVersion?.split('.')[0]);
      const offlineArgs =
        offline && plan.packageManager === 'yarn' && yarnMajor >= 2
          ? ['--immutable-cache']
          : offline
            ? ['--offline']
            : [];
      const workspace = plan.packageRoot !== plan.root;
      let args;
      let installCwd = plan.root;
      if (!workspace) args = ['install', ...offlineArgs];
      else if (plan.packageManager === 'npm')
        args = ['install', '--workspace', plan.packageName, ...offlineArgs];
      else if (plan.packageManager === 'pnpm')
        args = ['--filter', plan.packageName, 'install', ...offlineArgs];
      else if (yarnMajor >= 2)
        args = ['workspaces', 'focus', plan.packageName, ...offlineArgs];
      else {
        args = ['install', '--focus', ...offlineArgs];
        installCwd = plan.packageRoot;
      }
      await runner(plan.packageManager, args, { cwd: installCwd });
      if (plan.mode === 'ui') {
        for (const path of plan.generatedPaths ?? [])
          await validateGeneratedPath(path);
        await runner(plan.packageManager, ['run', 'catalog:generate'], {
          cwd: plan.packageRoot,
        });
      }
    }
  } catch (error) {
    for (const action of written.reverse()) {
      if (action.before === null)
        await rm(action.absolutePath, { force: true });
      else await writeFile(action.absolutePath, action.before);
    }
    for (const [path, source] of lockfileSnapshots) {
      if (source === null) await rm(path, { force: true });
      else await writeFile(path, source);
    }
    for (const [path, source] of generatedSnapshots) {
      await validateGeneratedPath(path, { allowLeafSymlink: true });
      if (await isSymlink(path)) await rm(path, { force: true });
      if (source === null) await rm(path, { force: true });
      else await writeFile(path, source);
    }
    throw error;
  } finally {
    for (const path of temporaryPaths) await rm(path, { force: true });
    for (const path of [...new Set(createdDirectories)].sort(
      (left, right) => right.length - left.length,
    )) {
      try {
        await rmdir(path);
      } catch {
        // Preserve non-empty directories, including directories used by other tools.
      }
    }
    await rm(lockPath, { recursive: true, force: true });
  }
  return { changed: plan.actions.map(({ path }) => path) };
}
