import { readFile, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  contained,
  dependencies,
  describeValue,
  exists,
  parseJsonFile,
  portable,
  readJson,
  readText,
  redactText,
  sha256,
  shellArg,
  stableJson,
} from './common.mjs';
import { detectMode, packageManagerInfo, selectPackage } from './detect.mjs';
import {
  applyJsoncEdits,
  jsoncInsertProperties,
  jsoncValueEdit,
  parseJsoncDocument,
} from './jsonc.mjs';
import {
  uiAppFiles,
  uiDoctorConfig,
  uiEslintTemplate,
  uiPrettierConfig,
} from './ui-baseline.mjs';

export { applyKerfSetup } from './apply.mjs';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const marker = '<!-- KERF-APP-CANONICAL-END · your customizations below -->';

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
      typeof state.packageManagerVersion !== 'string') ||
    (state.packageManagerVariant !== undefined &&
      !['classic', 'berry'].includes(state.packageManagerVariant)) ||
    (state.packageManagerVariant !== undefined &&
      state.packageManager !== 'yarn')
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
      if (!['keep', 'kerf', 'skip'].includes(resolution))
        throw new Error(`Invalid persisted resolution for package ${key}.`);
    for (const item of Object.values(value.managed ?? {}))
      if (!item || !/^[a-f0-9]{64}$/.test(item.sha256 ?? ''))
        throw new Error(`Invalid managed-value hash for package ${key}.`);
  }
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
  activeProposalIds,
  knownResolutionIds,
}) {
  knownResolutionIds.add(id);
  const current = target[key];
  const previouslyManaged = managedBefore[id]?.sha256 === hashValue(current);
  const divergent = key in target && current !== value && !previouslyManaged;
  if (divergent) activeConflictIds.add(id);
  const resolution =
    resolutions[id] === 'skip' && divergent ? undefined : resolutions[id];
  if (divergent && !resolution) {
    conflicts.push({
      id,
      message: `existing value ${describeValue(id, current)} differs from ${describeValue(id, value)}`,
    });
    return;
  }
  if (divergent && resolution === 'keep') return;
  if (!divergent && hashValue(current) !== hashValue(value)) {
    activeProposalIds.add(id);
    if (resolution === 'skip') {
      if (previouslyManaged) managedAfter[id] = managedBefore[id];
      return;
    }
  }
  target[key] = value;
  managedAfter[id] = { sha256: hashValue(value) };
}

function addMapValues(target, additions, path, context) {
  for (const [key, value] of Object.entries(additions)) {
    reconcileValue({ target, key, value, id: `${path}.${key}`, ...context });
  }
}

function eslintTemplate(mode, format = 'module') {
  if (mode === 'ui') return uiEslintTemplate(format);
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

function profileTemplate(packageName, catalogPath, selectionPath) {
  return {
    $schema:
      'https://raw.githubusercontent.com/brianwestphal/kerf/main/ui/ai/application-ui-profile.schema.json',
    schemaVersion: 1,
    scope: 'workspace',
    catalogs: [
      {
        package: packageName,
        ...(selectionPath
          ? { selection: { path: selectionPath, schemaVersion: 1 } }
          : {}),
        composition: { path: catalogPath, schemaVersion: 1 },
      },
    ],
  };
}

function metadataTemplate() {
  return {
    $schema:
      './node_modules/create-kerf-component/component-metadata.schema.json',
    schemaVersion: 1,
    componentCatalog: 'not-applicable',
    components: [],
  };
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
  if (current === undefined) current = {};
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
    context.activeProposalIds.add(id);
    if (context.resolutions[id] !== 'skip') {
      output.catalogs.push(local);
      context.managedAfter[id] = { sha256: hashValue(local) };
    }
  } else {
    const previouslyManaged =
      context.managedBefore[id]?.sha256 === hashValue(existing);
    const divergent =
      JSON.stringify(existing) !== JSON.stringify(local) && !previouslyManaged;
    if (divergent) context.activeConflictIds.add(id);
    if (
      divergent &&
      (!context.resolutions[id] || context.resolutions[id] === 'skip')
    )
      context.conflicts.push({
        id,
        message: 'existing catalog declaration differs',
      });
    else if (!divergent || context.resolutions[id] === 'kerf') {
      if (hashValue(existing) !== hashValue(local)) {
        context.activeProposalIds.add(id);
        if (context.resolutions[id] === 'skip') {
          context.managedAfter[id] = context.managedBefore[id];
          return output;
        }
      }
      output.catalogs[output.catalogs.indexOf(existing)] = local;
      context.managedAfter[id] = { sha256: hashValue(local) };
    }
  }
  return output;
}

/**
 * Validates an explicit or remembered shared-guidance source and returns its
 * workspace-relative path (undefined when there is none).
 */
async function validatedGuidanceSource(root, guidanceSource) {
  if (!guidanceSource) return guidanceSource;
  const sourcePath = resolve(root, guidanceSource);
  if (!sourcePath.startsWith(`${root}/`))
    throw new Error(
      'Shared guidance source must be inside the workspace root.',
    );
  const actualSourcePath = await realpath(sourcePath).catch(() => null);
  if (
    actualSourcePath &&
    !actualSourcePath.startsWith(`${await realpath(root)}/`)
  )
    throw new Error(
      'Shared guidance source must resolve inside the workspace root.',
    );
  const source = await readText(sourcePath);
  if (
    !source ||
    !/\bkerf(?:js)?\b/i.test(source) ||
    !/(?:kerf:check|npm run check)/i.test(source)
  )
    throw new Error(
      'Shared guidance source must exist and describe Kerf and a project check command.',
    );
  return portable(root, sourcePath);
}

/**
 * The shared accumulator every planning phase writes into: planned file
 * actions, conflicts, managed hashes, and the resolution bookkeeping that
 * `reconcileValue` / `addMapValues` read through `context`.
 */
function createPlanAccumulator({
  root,
  selected,
  mode,
  setupVersion,
  resolutions,
  requestedResolutions,
  managedBefore,
}) {
  const plan = {
    root,
    selected,
    mode,
    setupVersion,
    resolutions,
    requestedResolutions,
    managedBefore,
    conflicts: [],
    actions: [],
    generatedPaths: [],
    managedAfter: {},
    knownResolutionIds: new Set(),
    activeConflictIds: new Set(),
    activeProposalIds: new Set(),
  };
  plan.context = {
    conflicts: plan.conflicts,
    managedBefore,
    managedAfter: plan.managedAfter,
    resolutions,
    knownResolutionIds: plan.knownResolutionIds,
    activeConflictIds: plan.activeConflictIds,
    activeProposalIds: plan.activeProposalIds,
  };
  plan.addAction = async (path, value, kind = 'write') => {
    const before = await readText(path);
    if (before !== value)
      plan.actions.push({
        path: portable(root, path),
        absolutePath: path,
        before,
        after: value,
        kind,
      });
  };
  return plan;
}

/** Conflicts when the running setup differs from the project's installed kerfjs. */
async function planKerfVersion(plan) {
  const { selected, setupVersion, resolutions } = plan;
  const projectKerfVersion = await installedVersion(
    selected.directory,
    'kerfjs',
  );
  plan.knownResolutionIds.add('kerfjs-version');
  if (projectKerfVersion && projectKerfVersion !== setupVersion) {
    plan.activeConflictIds.add('kerfjs-version');
    if (!resolutions['kerfjs-version'])
      plan.conflicts.push({
        id: 'kerfjs-version',
        message: `running setup ${setupVersion} differs from installed kerfjs ${projectKerfVersion}; rerun with kerfjs@${projectKerfVersion}, or choose keep to retain project declarations or kerf to update them`,
      });
  }
}

/** The canonical AI guidance files (skills, cursorrules) and shared-guidance imports. */
async function planAiFiles(plan, aiManifest, guidanceSource) {
  const { root, mode, resolutions, managedAfter } = plan;
  for (const file of aiManifest.files) {
    if (file.name === 'ui-skill' && mode !== 'ui') continue;
    if (
      file.name === 'cursorrules' &&
      !(await exists(resolve(root, '.cursor'))) &&
      !(await exists(resolve(root, '.cursorrules')))
    )
      continue;
    const destination = resolve(root, file.dest);
    const bundled = await readFile(resolve(packageRoot, file.bundle), 'utf8');
    if ((file.name === 'skill' || file.name === 'ui-skill') && guidanceSource) {
      const sourcePath = resolve(root, guidanceSource);
      const importPath = relative(dirname(destination), sourcePath).replaceAll(
        '\\',
        '/',
      );
      const shared =
        file.name === 'ui-skill'
          ? `---\nname: kerf-ui\ndescription: Use shared workspace guidance and the installed @kerfjs/ui instructions.\n---\n\n@${importPath}\n\nIn the selected package, read \`node_modules/@kerfjs/ui/llms.txt\` first, then \`node_modules/@kerfjs/ui/ai/skill.md\` and the component references they name.\n`
          : `---\nname: kerf-app\ndescription: Use the shared workspace guidance for Kerf application work.\n---\n\n@${importPath}\n`;
      const current = await readText(destination);
      plan.knownResolutionIds.add(file.dest);
      if (current !== null && current !== shared && !resolutions[file.dest]) {
        plan.activeConflictIds.add(file.dest);
        plan.conflicts.push({
          id: file.dest,
          message: 'shared guidance import differs from existing skill',
        });
      } else if (
        current === null ||
        current === shared ||
        resolutions[file.dest] === 'kerf'
      ) {
        await plan.addAction(destination, shared, 'canonical');
        managedAfter[file.dest] = { sha256: sha256(shared) };
      } else {
        plan.activeConflictIds.add(file.dest);
      }
      continue;
    }
    const merged = mergeCanonical(
      await readText(destination),
      bundled,
      file.history ?? {},
      file.version,
    );
    plan.knownResolutionIds.add(file.dest);
    if (merged.conflict) {
      plan.activeConflictIds.add(file.dest);
      if (!resolutions[file.dest])
        plan.conflicts.push({ id: file.dest, message: merged.conflict });
      else if (resolutions[file.dest] === 'kerf') {
        const local = splitCanonical((await readText(destination)) ?? '');
        const replacement = local.error ? bundled : bundled + local.append;
        await plan.addAction(destination, replacement, 'canonical');
        managedAfter[file.dest] = { sha256: sha256(bundled) };
      }
    } else {
      await plan.addAction(destination, merged.value, 'canonical');
      managedAfter[file.dest] = {
        sha256: sha256(splitCanonical(merged.value).canonical),
      };
    }
  }
  if (mode === 'ui') {
    const content = `---\nname: kerf-ui-design-mock\ndescription: Plan and review rendered Kerf UI screen concepts before implementation, using the installed package's design-mock workflow.\n---\n\nRead the selected project's installed \`node_modules/@kerfjs/ui/ai/design-mock/SKILL.md\` and follow it. Resolve that path from the selected package in a workspace. Read the same installed package's \`llms.txt\` and \`ai/skill.md\` as directed there so the design uses its actual component version.\n`;
    for (const provider of ['.claude', '.agents']) {
      const path = `${provider}/skills/kerf-ui-design-mock/SKILL.md`;
      const destination = resolve(root, path);
      const current = await readText(destination);
      plan.knownResolutionIds.add(path);
      if (current !== null && current !== content && !resolutions[path]) {
        plan.activeConflictIds.add(path);
        plan.conflicts.push({
          id: path,
          message:
            'design-mock skill entry differs from installed guidance pointer',
        });
      } else if (
        current === null ||
        current === content ||
        resolutions[path] === 'kerf'
      ) {
        await plan.addAction(destination, content, 'canonical');
        managedAfter[path] = { sha256: sha256(content) };
      } else {
        plan.activeConflictIds.add(path);
      }
    }
  }
}

/**
 * The selected package's package.json: scripts, tool devDependencies, the
 * kerfjs / @kerfjs/ui dependency reconciliation, and (UI) the component
 * catalog configuration. Returns the next manifest plus the facts later
 * phases share.
 */
async function planManifest(plan, priorPackageState, packageKey) {
  const {
    root,
    selected,
    mode,
    setupVersion,
    resolutions,
    requestedResolutions,
    managedBefore,
    context,
  } = plan;
  const packagePath = resolve(selected.directory, 'package.json');
  const nextManifest = JSON.parse(JSON.stringify(selected.manifest));
  const freshUiApp =
    mode === 'ui' &&
    !(await exists(resolve(selected.directory, 'src'))) &&
    !(await exists(resolve(selected.directory, 'index.html'))) &&
    !(await exists(resolve(selected.directory, 'vite.config.mjs'))) &&
    !(await exists(resolve(selected.directory, 'app')));
  const scaffoldUiApp =
    freshUiApp ||
    Boolean(
      priorPackageState.managed?.[
        `${packageKey === '.' ? '' : `${packageKey}/`}src/app/main.tsx`
      ],
    );
  nextManifest.scripts ??= {};
  nextManifest.devDependencies ??= {};
  nextManifest.dependencies ??= {};
  const packageDoctorConfig = resolve(
    selected.directory,
    '.kerf-ui-doctor.json',
  );
  const workspaceDoctorArgs =
    selected.directory === root
      ? ''
      : ` --root ${portable(selected.directory, root)} --package ${nextManifest.name}${
          mode === 'ui' || (await exists(packageDoctorConfig))
            ? ` --config ${shellArg(portable(root, packageDoctorConfig))}`
            : ''
        }`;
  addMapValues(
    nextManifest.scripts,
    mode === 'ui'
      ? {
          lint: 'prettier --check . --ignore-unknown && eslint . --max-warnings 0',
          typecheck: 'tsc --noEmit',
          check: `prettier --check . --ignore-unknown && eslint . --max-warnings 0 && tsc --noEmit && kerf-component-catalog --check && kerf-ui-doctor --full${workspaceDoctorArgs}${scaffoldUiApp ? ' && node --test tests/structure.test.mjs && vite build' : ''}`,
          'kerf:check': `prettier --check . --ignore-unknown && eslint . --max-warnings 0 && tsc --noEmit && kerf-component-catalog --check && kerf-ui-doctor --full${workspaceDoctorArgs}${scaffoldUiApp ? ' && node --test tests/structure.test.mjs && vite build' : ''}`,
          'kerf:doctor': `kerf-ui-doctor --full${workspaceDoctorArgs}`,
          'kerf:doctor:changed': `kerf-ui-doctor --changed${workspaceDoctorArgs}`,
          'catalog:generate': 'kerf-component-catalog --write',
          'catalog:check': 'kerf-component-catalog --check',
          ...(scaffoldUiApp
            ? {
                dev: 'vite',
                build: 'vite build',
                'test:structure': 'node --test tests/structure.test.mjs',
              }
            : {}),
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
      ...(mode === 'ui'
        ? {
            '@eslint/js': '^9.0.0',
            '@stylistic/eslint-plugin': '^5.0.0',
            'eslint-plugin-simple-import-sort': '^12.1.1',
            prettier: '^3.0.0',
            'typescript-eslint': '^8.65.0',
            ...(scaffoldUiApp ? { vite: '^7.0.0' } : {}),
          }
        : {}),
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
      plan.knownResolutionIds.add(id);
      return;
    }
    const dependencyContext =
      name === 'kerfjs' && resolutions['kerfjs-version']
        ? {
            ...context,
            resolutions: {
              ...resolutions,
              [id]: requestedResolutions[id] ?? resolutions['kerfjs-version'],
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
        output: './component-composition.json',
      },
      id: 'package.json#kerfComponentCatalog',
      ...context,
    });
    for (const [key, configuredPath] of Object.entries(
      nextManifest.kerfComponentCatalog ?? {},
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
  await plan.addAction(packagePath, stableJson(nextManifest), 'json');
  return { nextManifest, scaffoldUiApp, packageDoctorConfig };
}

/** tsconfig.json: create it, or merge the recommended compiler options as JSONC edits. */
async function planTsconfig(plan) {
  const { selected, mode, resolutions, managedAfter, context } = plan;
  const tsconfigPath = resolve(selected.directory, 'tsconfig.json');
  const tsconfigSource = await readText(tsconfigPath);
  const tsconfigRecommendations = {
    target: 'ES2022',
    module: 'ESNext',
    moduleResolution: 'Bundler',
    strict: true,
    ...(mode === 'ui' ? { noUncheckedIndexedAccess: true } : {}),
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
    await plan.addAction(tsconfigPath, stableJson(tsconfig), 'json');
    return;
  }
  const parsed = parseJsoncDocument(tsconfigSource, 'tsconfig.json');
  const rootId = 'tsconfig.json';
  if (parsed.root.type !== 'object') {
    plan.knownResolutionIds.add(rootId);
    plan.activeConflictIds.add(rootId);
    if (!resolutions[rootId])
      plan.conflicts.push({
        id: rootId,
        message: 'root value must be an object',
      });
    else if (resolutions[rootId] === 'kerf') {
      const replacement = {
        compilerOptions: { ...tsconfigRecommendations },
        include: ['src'],
      };
      for (const [key, value] of Object.entries(tsconfigRecommendations))
        managedAfter[`tsconfig.json#compilerOptions.${key}`] = {
          sha256: hashValue(value),
        };
      await plan.addAction(tsconfigPath, stableJson(replacement), 'json');
    }
    return;
  }
  const edits = [];
  const rootInsertions = [];
  const compilerProperty = parsed.root.properties.get('compilerOptions');
  if (compilerProperty && compilerProperty.valueNode.type !== 'object') {
    const id = 'tsconfig.json#compilerOptions';
    plan.knownResolutionIds.add(id);
    plan.activeConflictIds.add(id);
    if (!resolutions[id])
      plan.conflicts.push({ id, message: 'existing value must be an object' });
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
          edits.push(jsoncValueEdit(property.valueNode, value, tsconfigSource));
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
  await plan.addAction(
    tsconfigPath,
    applyJsoncEdits(tsconfigSource, edits),
    'jsonc',
  );
}

/** The ESLint flat config: generate one, or merge / conflict on an existing one. */
async function planEslint(plan, nextManifest) {
  const { root, selected, mode, resolutions, managedBefore, managedAfter } =
    plan;
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
    await plan.addAction(generatedPath, generated);
    managedAfter[portable(root, generatedPath)] = { sha256: sha256(generated) };
    return;
  }
  const source = await readText(eslintPath);
  const id = portable(root, eslintPath);
  plan.knownResolutionIds.add(id);
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
      : mode === 'ui'
        ? source === template
          ? { value: source }
          : {
              conflict:
                'existing UI ESLint config needs the full typed Kerf baseline',
            }
        : commonjs
          ? {
              conflict:
                'CommonJS config requires an explicit Kerf preset merge',
            }
          : mergeEslintConfig(source, mode);
  if (merged.conflict) {
    plan.activeConflictIds.add(id);
    if (!resolutions[id])
      plan.conflicts.push({
        id,
        message: `${merged.conflict}; choose keep or kerf`,
      });
    else if (resolutions[id] === 'kerf') {
      const generated = template;
      await plan.addAction(eslintPath, generated);
      managedAfter[id] = { sha256: sha256(generated) };
    }
  } else {
    await plan.addAction(eslintPath, merged.value);
    if (wasManaged) managedAfter[id] = { sha256: sha256(merged.value) };
  }
}

/** UI mode: Prettier config, doctor config, and the fresh-app scaffold files. */
async function planUiBaseline(plan, { scaffoldUiApp, packageDoctorConfig }) {
  const { root, selected, resolutions, managedBefore, managedAfter } = plan;
  const prettierFiles = [
    'prettier.config.mjs',
    'prettier.config.js',
    '.prettierrc',
    '.prettierrc.json',
    '.prettierrc.js',
    '.prettierrc.mjs',
  ];
  if (
    !(
      await Promise.all(
        prettierFiles.map((name) => exists(resolve(selected.directory, name))),
      )
    ).some(Boolean)
  ) {
    await plan.addAction(
      resolve(selected.directory, 'prettier.config.mjs'),
      uiPrettierConfig,
    );
  }
  if (!(await exists(packageDoctorConfig)))
    await plan.addAction(
      packageDoctorConfig,
      stableJson(uiDoctorConfig),
      'json',
    );
  if (!scaffoldUiApp) return;
  for (const [path, content] of Object.entries(uiAppFiles())) {
    const destination = resolve(selected.directory, path);
    const id = portable(root, destination);
    const current = await readText(destination);
    plan.knownResolutionIds.add(id);
    if (
      current !== null &&
      current !== content &&
      managedBefore[id]?.sha256 !== sha256(current)
    ) {
      plan.activeConflictIds.add(id);
      if (!resolutions[id]) {
        plan.conflicts.push({
          id,
          message: 'app scaffold file was customized; choose keep or kerf',
        });
        continue;
      }
      if (resolutions[id] === 'keep') continue;
    }
    await plan.addAction(destination, content);
    managedAfter[id] = { sha256: sha256(content) };
  }
}

/**
 * UI mode with a component catalog: the workspace .kerf-ui-profile.json
 * catalog entry, the catalog metadata source, and the generated catalog paths.
 */
async function planUiCatalog(plan, nextManifest) {
  const { root, selected, context } = plan;
  const profilePath = resolve(root, '.kerf-ui-profile.json');
  const currentProfileSource = await readText(profilePath);
  const currentProfile =
    currentProfileSource === null
      ? undefined
      : parseJsonFile(currentProfileSource, profilePath, root);
  const profileCatalogPath = (configuredPath) => {
    const relative = portable(
      root,
      resolve(selected.directory, configuredPath),
    );
    return relative.startsWith('.') ? relative : `./${relative}`;
  };
  const profile = mergeProfile(
    currentProfile,
    profileTemplate(
      nextManifest.name,
      profileCatalogPath(nextManifest.kerfComponentCatalog.output),
      nextManifest.kerfComponentCatalog.selectionOutput
        ? profileCatalogPath(nextManifest.kerfComponentCatalog.selectionOutput)
        : undefined,
    ),
    context,
  );
  await plan.addAction(profilePath, stableJson(profile), 'json');
  const metadataPath = resolve(
    selected.directory,
    nextManifest.kerfComponentCatalog.source,
  );
  if (nextManifest.kerfComponentCatalog.selectionOutput) {
    const metadata = await readJson(metadataPath, root);
    if (
      !metadata ||
      typeof metadata.description !== 'string' ||
      !metadata.description.trim()
    )
      throw new Error(
        `${portable(root, metadataPath)}: selectionOutput requires an authored metadata source with a nonempty description. Add the source and description before running setup.`,
      );
  } else if (!(await exists(metadataPath)))
    await plan.addAction(metadataPath, stableJson(metadataTemplate()), 'json');
  if (
    nextManifest.scripts['catalog:generate'] &&
    dependencies(nextManifest)['create-kerf-component']
  ) {
    plan.generatedPaths.push(
      resolve(selected.directory, nextManifest.kerfComponentCatalog.output),
    );
    if (nextManifest.kerfComponentCatalog.selectionOutput)
      plan.generatedPaths.push(
        resolve(
          selected.directory,
          nextManifest.kerfComponentCatalog.selectionOutput,
        ),
      );
  }
}

/** Every requested resolution must name a live conflict or proposal. */
function validateRequestedResolutions(plan) {
  for (const [id, resolution] of Object.entries(plan.requestedResolutions)) {
    if (!['keep', 'kerf', 'skip'].includes(resolution))
      throw new Error(`Resolution ${id} must be keep, kerf, or skip.`);
    if (!plan.knownResolutionIds.has(id))
      throw new Error(`Unknown resolution id ${id}.`);
    if (resolution === 'skip' && plan.activeConflictIds.has(id))
      throw new Error(
        `Resolution ${id} cannot skip a conflict; choose keep or kerf.`,
      );
    if (
      !plan.activeConflictIds.has(id) &&
      !(resolution !== 'keep' && plan.activeProposalIds.has(id))
    )
      throw new Error(
        `Stale resolution id ${id}; there is no applicable conflict or proposal.`,
      );
  }
}

/** The next .kerf-ai-setup.json: prior package states plus this package's. */
function nextSetupState(plan, { manager, priorState, packageEntry }) {
  return {
    schemaVersion: 2,
    setupVersion: plan.setupVersion,
    packageManager: manager.name,
    ...(manager.version ? { packageManagerVersion: manager.version } : {}),
    ...(manager.variant ? { packageManagerVariant: manager.variant } : {}),
    packages: {
      ...(priorState.packages ??
        (priorState.packagePath
          ? {
              [priorState.packagePath]: {
                mode: priorState.mode,
                package: priorState.package,
                packagePath: priorState.packagePath,
                ...(priorState.guidanceSource
                  ? { guidanceSource: priorState.guidanceSource }
                  : {}),
                managed: priorState.managed ?? {},
                resolutions: priorState.resolutions ?? {},
              },
            }
          : {})),
      [packageEntry.packagePath]: packageEntry,
    },
  };
}

export async function planKerfSetup({
  root = process.cwd(),
  package: selector,
  mode: requestedMode,
  version,
  resolutions = {},
  guidanceSource,
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
  const statePath = resolve(root, '.kerf-ai-setup.json');
  const priorState = (await readJson(statePath, root)) ?? {};
  if (Object.keys(priorState).length) validateSetupState(priorState);
  const packageKey = portable(root, selected.directory);
  const legacyPackageState =
    priorState.packagePath === packageKey ? priorState : {};
  const priorPackageState =
    priorState.packages?.[packageKey] ?? legacyPackageState;
  guidanceSource = await validatedGuidanceSource(
    root,
    guidanceSource ?? priorPackageState.guidanceSource,
  );
  if (
    priorPackageState.package &&
    priorPackageState.package !== (selected.manifest.name ?? packageKey)
  )
    throw new Error(`Setup state package identity changed at ${packageKey}.`);

  const plan = createPlanAccumulator({
    root,
    selected,
    mode,
    setupVersion,
    requestedResolutions: { ...resolutions },
    resolutions: { ...(priorPackageState.resolutions ?? {}), ...resolutions },
    managedBefore: priorPackageState.managed ?? {},
  });
  const aiManifest = await readJson(resolve(packageRoot, 'ai/manifest.json'));
  await planKerfVersion(plan);
  await planAiFiles(plan, aiManifest, guidanceSource);
  const manifestPlan = await planManifest(plan, priorPackageState, packageKey);
  const { nextManifest } = manifestPlan;
  await planTsconfig(plan);
  await planEslint(plan, nextManifest);
  if (mode === 'ui') {
    await planUiBaseline(plan, manifestPlan);
    if (!nextManifest.name)
      throw new Error(
        'UI setup requires package.json name for catalog identity.',
      );
    if (nextManifest.kerfComponentCatalog !== undefined)
      await planUiCatalog(plan, nextManifest);
  }
  validateRequestedResolutions(plan);

  const {
    resolutions: effectiveResolutions,
    activeConflictIds,
    activeProposalIds,
  } = plan;
  const manager = await packageManagerInfo(root);
  const state = nextSetupState(plan, {
    manager,
    priorState,
    packageEntry: {
      mode,
      package: nextManifest.name ?? packageKey,
      packagePath: packageKey,
      ...(guidanceSource ? { guidanceSource } : {}),
      managed: plan.managedAfter,
      resolutions: Object.fromEntries(
        [...new Set([...activeConflictIds, ...activeProposalIds])]
          .filter(
            (id) =>
              (activeConflictIds.has(id) &&
                effectiveResolutions[id] === 'keep') ||
              (activeProposalIds.has(id) &&
                effectiveResolutions[id] === 'skip'),
          )
          .map((id) => [id, effectiveResolutions[id]]),
      ),
    },
  });
  await plan.addAction(statePath, stableJson(state), 'state');
  return {
    schemaVersion: 1,
    root,
    packageRoot: selected.directory,
    packageName: nextManifest.name ?? packageKey,
    packageManager: state.packageManager,
    packageManagerVersion: manager.version,
    packageManagerVariant: manager.variant,
    mode,
    setupVersion,
    actions: plan.actions,
    proposalIds: [...activeProposalIds].filter(
      (id) => effectiveResolutions[id] !== 'skip',
    ),
    conflicts: plan.conflicts,
    generatedPaths: plan.generatedPaths,
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
  for (const id of plan.proposalIds ?? [])
    lines.push(`PROPOSAL ${id} (use --resolve ${id}=skip to decline)`);
  if (!plan.actions.length && !plan.conflicts.length) lines.push('No changes.');
  lines.push('AI guidance: .claude/skills/kerf-app/SKILL.md');
  if (plan.mode === 'ui') {
    lines.push('AI UI guidance: .claude/skills/kerf-ui/SKILL.md');
    lines.push(
      'AI design mocks: .claude/skills/kerf-ui-design-mock/SKILL.md and .agents/skills/kerf-ui-design-mock/SKILL.md',
    );
    lines.push(
      `Read first: ${portable(plan.root, resolve(plan.packageRoot, 'node_modules/@kerfjs/ui/llms.txt'))}`,
    );
    lines.push(
      `Then read: ${portable(plan.root, resolve(plan.packageRoot, 'node_modules/@kerfjs/ui/ai/skill.md'))}`,
    );
  }
  return lines.join('\n');
}
