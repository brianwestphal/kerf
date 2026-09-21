import { createHash } from 'node:crypto';
import {
  access,
  mkdir,
  readFile,
  readdir,
  rename,
  stat,
  writeFile,
} from 'node:fs/promises';
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  relative,
  resolve,
} from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

import { loadApplicationUiProfile } from '../ai/application-ui-profile.mjs';
import { analyzeUiProject, UI_ANALYSIS_RULES } from '../analyzer/index.mjs';
import { evaluateUi, UI_EVALUATION_RULES } from '../evaluator/index.mjs';
import { isForeignRuleDefinitionDiagnostic } from './eslint-diagnostics.mjs';

export const UI_DOCTOR_SCHEMA_VERSION = 1;
export const UI_DOCTOR_EXIT = Object.freeze({
  clean: 0,
  findings: 1,
  configuration: 2,
  cancelled: 130,
});
export const UI_DOCTOR_RULES = Object.freeze({
  'KUI-D001': { severity: 'error', title: 'Doctor configuration is invalid' },
  'KUI-D002': { severity: 'error', title: 'Doctor run was cancelled' },
  'KUI-D003': { severity: 'warning', title: 'Diagnostic identifier conflict' },
  'KUI-D010': { severity: 'error', title: 'Required tool is unavailable' },
  'KUI-D011': { severity: 'error', title: 'Tool execution failed' },
  'KUI-D020': {
    severity: 'error',
    title: 'Local component catalog is stale or invalid',
  },
});

const sourceExtensions = new Set([
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.css',
]);
const ignoredDirectories = new Set([
  '.git',
  '.kerf-cache',
  'coverage',
  'dist',
  'kerf-ui-evidence',
  'node_modules',
]);
const defaultStages = Object.freeze({
  catalog: true,
  typescript: true,
  eslint: true,
  analyzer: true,
  browser: false,
});
const exists = async (path) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

function portablePath(root, value) {
  if (!value || !isAbsolute(value)) return value;
  const path = relative(root, value).replaceAll('\\', '/');
  return path === '..' || path.startsWith('../')
    ? `<external>/${basename(value)}`
    : path || '.';
}

function redact(root, value) {
  if (typeof value === 'string') return value.replaceAll(root, '<repo-root>');
  if (Array.isArray(value)) return value.map((item) => redact(root, item));
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, redact(root, item)]),
    );
  return value;
}

function configDiagnostic(message, location = {}) {
  return {
    id: 'KUI-D001',
    severity: 'error',
    stage: 'doctor',
    message,
    location: {
      file: location.file ?? '.kerf-ui-doctor.json',
      line: location.line ?? 1,
      column: location.column ?? 1,
      path: location.path ?? '$',
    },
    action: 'Correct the doctor configuration and run kerf-ui-doctor again.',
    meaning: UI_DOCTOR_RULES['KUI-D001'].title,
  };
}

export function validateUiDoctorConfig(
  config,
  source = '.kerf-ui-doctor.json',
) {
  const diagnostics = [];
  const add = (path, message) =>
    diagnostics.push(configDiagnostic(message, { file: source, path }));
  if (!config || typeof config !== 'object' || Array.isArray(config))
    return [configDiagnostic('Expected a JSON object.', { file: source })];
  const allowed = new Set([
    '$schema',
    'schemaVersion',
    'mode',
    'package',
    'stages',
    'browser',
    'cache',
    'suppressions',
  ]);
  for (const key of Object.keys(config))
    if (!allowed.has(key)) add(`$.${key}`, 'Unknown configuration property.');
  if (config.$schema !== undefined && typeof config.$schema !== 'string')
    add('$.$schema', '$schema must be a string.');
  if (config.schemaVersion !== 1)
    add('$.schemaVersion', 'schemaVersion must be 1.');
  if (config.mode !== undefined && !['full', 'changed'].includes(config.mode))
    add('$.mode', 'mode must be full or changed.');
  if (
    config.package !== undefined &&
    (typeof config.package !== 'string' || !config.package)
  )
    add(
      '$.package',
      'package must be a non-empty workspace package name or path.',
    );
  if (config.stages !== undefined) {
    if (
      !config.stages ||
      typeof config.stages !== 'object' ||
      Array.isArray(config.stages)
    )
      add('$.stages', 'stages must be an object.');
    else
      for (const [name, enabled] of Object.entries(config.stages)) {
        if (!(name in defaultStages)) add(`$.stages.${name}`, 'Unknown stage.');
        else if (typeof enabled !== 'boolean')
          add(`$.stages.${name}`, 'Stage values must be boolean.');
      }
  }
  if (config.browser !== undefined) {
    if (
      !config.browser ||
      typeof config.browser !== 'object' ||
      Array.isArray(config.browser)
    )
      add('$.browser', 'browser must be an object.');
    else {
      const browserKeys = new Set([
        'url',
        'browsers',
        'retention',
        'outputDirectory',
        'reportPath',
      ]);
      for (const key of Object.keys(config.browser))
        if (!browserKeys.has(key))
          add(`$.browser.${key}`, 'Unknown browser property.');
      if (
        typeof config.browser.url !== 'string' ||
        !/^https?:\/\//.test(config.browser.url)
      )
        add('$.browser.url', 'browser.url must be an explicit http(s) URL.');
      if (
        config.browser.browsers !== undefined &&
        (!Array.isArray(config.browser.browsers) ||
          config.browser.browsers.some(
            (item) => !['chromium', 'firefox', 'webkit'].includes(item),
          ))
      )
        add(
          '$.browser.browsers',
          'browser.browsers must contain only chromium, firefox, or webkit.',
        );
      if (
        config.browser.retention !== undefined &&
        !['always', 'on-failure', 'never'].includes(config.browser.retention)
      )
        add(
          '$.browser.retention',
          'browser.retention must be always, on-failure, or never.',
        );
      for (const key of ['outputDirectory', 'reportPath'])
        if (
          config.browser[key] !== undefined &&
          (typeof config.browser[key] !== 'string' ||
            !config.browser[key] ||
            isAbsolute(config.browser[key]) ||
            config.browser[key].split(/[\\/]/).includes('..'))
        )
          add(
            `$.browser.${key}`,
            `${key} must be a portable workspace-relative path.`,
          );
    }
  }
  if (config.cache !== undefined && typeof config.cache !== 'boolean')
    add('$.cache', 'cache must be boolean.');
  if (config.suppressions !== undefined) {
    if (!Array.isArray(config.suppressions))
      add('$.suppressions', 'suppressions must be an array.');
    else {
      const ids = new Set();
      config.suppressions.forEach((item, index) => {
        const at = `$.suppressions[${index}]`;
        if (!item || typeof item !== 'object' || Array.isArray(item))
          return add(at, 'Suppression must be an object.');
        if (typeof item.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(item.id))
          add(
            `${at}.id`,
            'Suppression id must be a stable lowercase identifier.',
          );
        else if (ids.has(item.id))
          add(`${at}.id`, 'Suppression ids must be unique.');
        else ids.add(item.id);
        if (
          !Array.isArray(item.rules) ||
          !item.rules.length ||
          item.rules.some((rule) => typeof rule !== 'string')
        )
          add(
            `${at}.rules`,
            'Suppression rules must be a non-empty string array.',
          );
        else if (new Set(item.rules).size !== item.rules.length)
          add(`${at}.rules`, 'Suppression rules must be unique.');
        if (
          typeof item.target !== 'string' ||
          !item.target ||
          isAbsolute(item.target) ||
          item.target.includes('..') ||
          /[*?]/.test(item.target)
        )
          add(
            `${at}.target`,
            'Suppression target must be an exact portable relative path or browser selector.',
          );
        if (
          typeof item.rationale !== 'string' ||
          item.rationale.trim().length < 12
        )
          add(
            `${at}.rationale`,
            'Suppression rationale must contain at least 12 characters.',
          );
      });
    }
  }
  return diagnostics;
}

export async function readUiDoctorConfig(
  root,
  path = resolve(root, '.kerf-ui-doctor.json'),
) {
  if (!(await exists(path)))
    return { path, config: { schemaVersion: 1 }, diagnostics: [] };
  try {
    const config = JSON.parse(await readFile(path, 'utf8'));
    return {
      path,
      config,
      diagnostics: validateUiDoctorConfig(config, portablePath(root, path)),
    };
  } catch (error) {
    return {
      path,
      config: {},
      diagnostics: [
        configDiagnostic(`Invalid JSON: ${error.message}`, {
          file: portablePath(root, path),
        }),
      ],
    };
  }
}

async function workspacePackages(root) {
  let manifest;
  try {
    manifest = JSON.parse(
      await readFile(resolve(root, 'package.json'), 'utf8'),
    );
  } catch {
    return [];
  }
  const patterns = Array.isArray(manifest.workspaces)
    ? manifest.workspaces
    : (manifest.workspaces?.packages ?? []);
  const directories = [];
  for (const pattern of patterns) {
    if (typeof pattern !== 'string') continue;
    if (!pattern.includes('*')) directories.push(resolve(root, pattern));
    else {
      const [prefix, suffix = ''] = pattern.split('*');
      const parent = resolve(root, prefix);
      try {
        for (const entry of await readdir(parent, { withFileTypes: true }))
          if (entry.isDirectory())
            directories.push(resolve(parent, entry.name, suffix));
      } catch {
        /* A declared workspace glob may currently be empty. */
      }
    }
  }
  return Promise.all(
    directories.map(async (directory) => {
      try {
        return {
          directory,
          manifest: JSON.parse(
            await readFile(resolve(directory, 'package.json'), 'utf8'),
          ),
        };
      } catch {
        return null;
      }
    }),
  ).then((items) => items.filter(Boolean));
}

export async function resolveUiDoctorPackage(root, selector) {
  if (!selector) return root;
  const direct = resolve(root, selector);
  if (
    (await exists(resolve(direct, 'package.json'))) &&
    !relative(root, direct).startsWith('..')
  )
    return direct;
  const match = (await workspacePackages(root)).find(
    ({ manifest }) => manifest.name === selector,
  );
  if (!match) throw new Error(`Workspace package ${selector} was not found.`);
  return match.directory;
}

async function collectInputs(root, paths) {
  const result = [];
  const visit = async (path) => {
    let details;
    try {
      details = await stat(path);
    } catch {
      return;
    }
    if (details.isFile()) {
      if (
        sourceExtensions.has(extname(path)) ||
        extname(path) === '.json' ||
        basename(path).startsWith('.kerf-ui-') ||
        ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'].includes(
          basename(path),
        ) ||
        basename(path).startsWith('tsconfig')
      )
        result.push(path);
      return;
    }
    for (const entry of await readdir(path, { withFileTypes: true })) {
      if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
      await visit(resolve(path, entry.name));
    }
  };
  for (const path of paths?.length ? paths : [root])
    await visit(resolve(root, path));
  return result.sort();
}

async function installedPackageVersion(root, name) {
  try {
    const require = createRequire(resolve(root, 'package.json'));
    let directory = dirname(require.resolve(name));
    while (true) {
      const manifestPath = resolve(directory, 'package.json');
      if (await exists(manifestPath)) {
        const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
        if (manifest.name === name) return manifest.version ?? 'unknown';
      }
      const parent = dirname(directory);
      if (parent === directory) break;
      directory = parent;
    }
  } catch {
    return 'unavailable';
  }
  return 'unavailable';
}

async function cacheKey(root, packageRoot, mode, paths, config) {
  const files = await collectInputs(packageRoot, paths);
  for (const directory of new Set([root, packageRoot])) {
    for (const name of [
      'package.json',
      'package-lock.json',
      'pnpm-lock.yaml',
      'yarn.lock',
      'tsconfig.json',
      '.kerf-ui-profile.json',
      '.kerf-ui-doctor.json',
    ]) {
      const path = resolve(directory, name);
      if (!files.includes(path) && (await exists(path))) files.push(path);
    }
  }
  files.sort();
  const toolVersions = Object.fromEntries(
    await Promise.all(
      [
        'typescript',
        'eslint',
        'eslint-plugin-kerfjs',
        'create-kerf-component',
      ].map(async (name) => [
        name,
        await installedPackageVersion(packageRoot, name),
      ]),
    ),
  );
  const hash = createHash('sha256')
    .update(
      JSON.stringify({
        schema: 1,
        package: portablePath(root, packageRoot),
        mode,
        paths,
        config,
        toolVersions,
      }),
    )
    .update(await readFile(fileURLToPath(import.meta.url)));
  for (const file of files)
    hash.update(portablePath(root, file)).update(await readFile(file));
  return hash.digest('hex');
}

async function readCache(path, key) {
  try {
    const value = JSON.parse(await readFile(path, 'utf8'));
    return value.key === key ? value.report : undefined;
  } catch {
    return undefined;
  }
}

async function writeCache(path, key, report) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify({ key, report }, null, 2)}\n`);
  await rename(temporary, path);
}

function normalizedDiagnostic(item) {
  const diagnostic = {
    id: item.id,
    severity: item.severity,
    stage: item.stage,
    message: item.message,
  };
  for (const key of [
    'location',
    'dom',
    'evidence',
    'catalogFacts',
    'documentation',
    'action',
    'sources',
    'meaning',
  ])
    if (item[key] !== undefined) diagnostic[key] = item[key];
  if (!diagnostic.documentation) {
    const guides = {
      catalog: '@kerfjs/ui/ai/application-ui-profile.schema.json',
      typescript: 'https://www.typescriptlang.org/tsconfig/',
      eslint: 'eslint-plugin-kerfjs/README.md',
      analyzer: '@kerfjs/ui/docs/ui-analyzer.md',
      browser: '@kerfjs/ui/docs/ui-evaluator.md',
      doctor: '@kerfjs/ui/docs/ui-doctor.md',
      merged: '@kerfjs/ui/docs/ui-doctor.md#report-and-exit-contract',
    };
    diagnostic.documentation = guides[item.stage];
  }
  return diagnostic;
}

function normalizeProfile(item, root) {
  return normalizedDiagnostic({
    id: item.code,
    severity: 'error',
    stage: 'catalog',
    message: item.message,
    location: {
      file: portablePath(root, item.source),
      line: 1,
      column: 1,
      path: item.path,
    },
    action:
      'Repair the source-located application UI profile or catalog artifact.',
    meaning: item.code,
  });
}

function normalizeAnalyzer(report) {
  return [
    ...report.profile.diagnostics.map((item) =>
      normalizedDiagnostic({
        id: item.code,
        severity: 'error',
        stage: 'analyzer',
        message: item.message,
        location: { file: item.source, line: 1, column: 1, path: item.path },
        action: 'Repair the application UI profile before layout analysis.',
        meaning: item.code,
      }),
    ),
    ...report.diagnostics.map((item) =>
      normalizedDiagnostic({
        id: item.ruleId,
        severity: item.severity,
        stage: 'analyzer',
        message: item.message,
        location: item.location,
        evidence: item.evidence,
        catalogFacts: item.chain,
        action:
          'Apply the catalog-declared composition or geometry boundary at this source location.',
        meaning: UI_ANALYSIS_RULES[item.ruleId]?.title ?? item.ruleId,
      }),
    ),
  ];
}

function normalizeEvaluator(report) {
  return report.diagnostics.map((item) =>
    normalizedDiagnostic({
      id: item.code,
      severity: item.severity,
      stage: 'browser',
      message: item.message,
      dom: { context: item.context, selector: item.selector ?? '<page>' },
      evidence: item.evidence,
      action: item.repair,
      meaning: UI_EVALUATION_RULES[item.code]?.title ?? item.code,
    }),
  );
}

function mergeDiagnostics(items) {
  const merged = [];
  const exact = new Map();
  const meanings = new Map();
  for (const raw of items) {
    const item = normalizedDiagnostic(raw);
    const location = item.location
      ? JSON.stringify(item.location)
      : JSON.stringify(item.dom ?? {});
    const key = JSON.stringify([
      item.id,
      item.severity,
      item.message,
      location,
    ]);
    if (exact.has(key)) {
      const previous = exact.get(key);
      previous.sources = [
        ...new Set([...(previous.sources ?? [previous.stage]), item.stage]),
      ].sort();
      previous.stage = 'merged';
      continue;
    }
    exact.set(key, item);
    merged.push(item);
    const signature = JSON.stringify([
      item.severity,
      item.meaning ?? item.message,
    ]);
    const previous = meanings.get(item.id);
    if (previous && previous !== signature)
      merged.push(
        normalizedDiagnostic({
          id: 'KUI-D003',
          severity: 'warning',
          stage: 'doctor',
          message: `${item.id} was emitted with conflicting severity or meaning; both findings were retained.`,
          evidence: { diagnosticId: item.id },
          action:
            'Upgrade the conflicting tool versions so diagnostic identifiers have one stable meaning.',
        }),
      );
    else meanings.set(item.id, signature);
  }
  for (const item of merged) delete item.meaning;
  return merged.sort(
    (left, right) =>
      (left.location?.file ?? left.dom?.selector ?? '').localeCompare(
        right.location?.file ?? right.dom?.selector ?? '',
      ) ||
      (left.location?.line ?? 0) - (right.location?.line ?? 0) ||
      left.id.localeCompare(right.id) ||
      left.message.localeCompare(right.message),
  );
}

function applySuppressions(diagnostics, suppressions) {
  const active = [],
    suppressed = [];
  for (const item of diagnostics) {
    const target = item.location?.file ?? item.dom?.selector;
    const suppression = suppressions.find(
      (candidate) =>
        candidate.rules.includes(item.id) && candidate.target === target,
    );
    if (suppression)
      suppressed.push({
        ...item,
        suppression: { id: suppression.id, rationale: suppression.rationale },
      });
    else active.push(item);
  }
  return { active, suppressed };
}

function unavailable(stage, error) {
  return normalizedDiagnostic({
    id: 'KUI-D010',
    severity: 'error',
    stage,
    message: `${stage} is unavailable: ${error.message}`,
    action: `Install and configure the ${stage} tool in the selected workspace package.`,
    meaning: UI_DOCTOR_RULES['KUI-D010'].title,
  });
}

async function importFrom(root, specifier) {
  const require = createRequire(resolve(root, 'package.json'));
  return import(pathToFileURL(require.resolve(specifier)).href);
}

async function installedEslintRuleIds(packageRoot) {
  try {
    const module = await importFrom(packageRoot, 'eslint-plugin-kerfjs');
    const plugin = module.default ?? module;
    const ids = new Set();
    for (const rule of Object.values(plugin.rules ?? {}))
      for (const template of Object.values(rule.meta?.messages ?? {}))
        for (const match of String(template).matchAll(/\bKUI-[A-Z]\d{3}\b/g))
          ids.add(match[0]);
    return [...ids];
  } catch {
    return [];
  }
}

async function sharedDiagnosticRuleIds() {
  const registry = JSON.parse(
    await readFile(
      resolve(
        import.meta.dirname,
        '../ai/application-ui-diagnostic-ids-v1.json',
      ),
      'utf8',
    ),
  );
  if (registry.schemaVersion !== 1 || !Array.isArray(registry.ids))
    throw new Error(
      'The packaged application UI diagnostic registry must have schemaVersion 1 and an ids array.',
    );
  return registry.ids;
}

async function hasLocalCatalogConfiguration(root) {
  const manifests = [
    root,
    ...(await workspacePackages(root)).map((item) => item.directory),
  ];
  for (const directory of manifests) {
    try {
      const manifest = JSON.parse(
        await readFile(resolve(directory, 'package.json'), 'utf8'),
      );
      if (manifest.kerfComponentCatalog) return true;
    } catch {
      /* Profile validation reports other JSON failures. */
    }
  }
  return false;
}

async function validateLocalCatalogs(root) {
  if (!(await hasLocalCatalogConfiguration(root)))
    return {
      diagnostics: [],
      detail:
        'No local component metadata; declared profile catalogs were validated.',
    };
  try {
    const module = await importFrom(root, 'create-kerf-component/catalog.js');
    module.runCatalogCommand({ root, check: true });
    return { diagnostics: [] };
  } catch (error) {
    if (
      ['ERR_MODULE_NOT_FOUND', 'MODULE_NOT_FOUND'].includes(error?.code) ||
      /Cannot find (?:module|package)/.test(error?.message ?? '')
    )
      throw error;
    const messages = error.diagnostics ?? [error.message];
    return {
      diagnostics: messages.map((message) =>
        normalizedDiagnostic({
          id: 'KUI-D020',
          severity: 'error',
          stage: 'catalog',
          message,
          documentation:
            'create-kerf-component/README.md#machine-readable-component-metadata',
          action:
            'Repair local kerf.components.json metadata or run kerf-component-catalog --write, then review the generated catalog.',
          meaning: UI_DOCTOR_RULES['KUI-D020'].title,
        }),
      ),
    };
  }
}

function normalizeChangedPaths(root, packageRoot, paths) {
  if (!paths) return undefined;
  const normalized = [];
  for (const input of paths) {
    const fromRoot = resolve(root, input);
    const fromPackage = resolve(packageRoot, input);
    const candidate =
      packageRoot === root || !relative(packageRoot, fromRoot).startsWith('..')
        ? fromRoot
        : fromPackage;
    const path = relative(packageRoot, candidate).replaceAll('\\', '/');
    if (path && path !== '..' && !path.startsWith('../')) normalized.push(path);
  }
  return [...new Set(normalized)].sort();
}

async function runTypeScript({ packageRoot, paths }) {
  const ts = await importFrom(packageRoot, 'typescript');
  const configPath = ts.default.findConfigFile(
    packageRoot,
    ts.default.sys.fileExists,
    'tsconfig.json',
  );
  if (!configPath)
    return { diagnostics: [], detail: 'No tsconfig.json; skipped.' };
  const parsed = ts.default.getParsedCommandLineOfConfigFile(
    configPath,
    {},
    { ...ts.default.sys, onUnRecoverableConfigFileDiagnostic: () => {} },
  );
  if (!parsed) throw new Error('TypeScript could not parse tsconfig.json.');
  if (paths?.length) {
    const selected = new Set(paths.map((path) => resolve(packageRoot, path)));
    parsed.fileNames = parsed.fileNames.filter((file) => selected.has(file));
  }
  const program = ts.default.createProgram(
    parsed.fileNames,
    { ...parsed.options, noEmit: true },
    undefined,
    undefined,
    parsed.projectReferences,
  );
  const diagnostics = [
    ...parsed.errors,
    ...ts.default.getPreEmitDiagnostics(program),
  ].map((item) => {
    const point =
      item.file && item.start !== undefined
        ? item.file.getLineAndCharacterOfPosition(item.start)
        : undefined;
    return normalizedDiagnostic({
      id: `TS${item.code}`,
      severity:
        item.category === ts.default.DiagnosticCategory.Error
          ? 'error'
          : 'warning',
      stage: 'typescript',
      message: ts.default.flattenDiagnosticMessageText(item.messageText, '\n'),
      location: item.file
        ? {
            file: portablePath(packageRoot, item.file.fileName),
            line: (point?.line ?? 0) + 1,
            column: (point?.character ?? 0) + 1,
          }
        : undefined,
      action: 'Repair the TypeScript diagnostic at this source location.',
      meaning: `TypeScript diagnostic TS${item.code}`,
    });
  });
  return { diagnostics };
}

async function runEslint({
  packageRoot,
  paths,
  eslintConfig = 'recommended-ui',
}) {
  const [{ ESLint }, pluginModule] = await Promise.all([
    importFrom(packageRoot, 'eslint'),
    importFrom(packageRoot, 'eslint-plugin-kerfjs'),
  ]);
  const plugin = pluginModule.default ?? pluginModule;
  const meanings = new Map();
  for (const rule of Object.values(plugin.rules ?? {}))
    for (const template of Object.values(rule.meta?.messages ?? {}))
      for (const match of String(template).matchAll(/\bKUI-[A-Z]\d{3}\b/g))
        meanings.set(match[0], String(template));
  const preset = plugin.configs?.[eslintConfig];
  if (!preset)
    throw new Error(`eslint-plugin-kerfjs does not export ${eslintConfig}.`);
  const inputs = await collectInputs(packageRoot, paths);
  const usesTypeScript = inputs.some((file) =>
    /\.(?:ts|tsx|mts|cts)$/.test(file),
  );
  const base = {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
  };
  const configs = [base];
  if (usesTypeScript) {
    const parserModule = await importFrom(
      packageRoot,
      '@typescript-eslint/parser',
    );
    configs.push({
      files: ['**/*.{ts,tsx,mts,cts}'],
      languageOptions: {
        parser: parserModule.default ?? parserModule,
        parserOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module',
          ecmaFeatures: { jsx: true },
        },
      },
    });
  }
  configs.push(preset);
  const eslint = new ESLint({
    cwd: packageRoot,
    overrideConfigFile: true,
    overrideConfig: configs,
  });
  const targets = paths?.length ? paths : ['.'];
  const results = await eslint.lintFiles(targets);
  const diagnostics = [];
  for (const result of results)
    for (const item of result.messages) {
      if (isForeignRuleDefinitionDiagnostic(item)) continue;
      const code = item.message.match(/\bKUI-[A-Z]\d{3}\b/)?.[0];
      diagnostics.push(
        normalizedDiagnostic({
          id: code ?? `eslint:${item.ruleId ?? 'parse-error'}`,
          severity: item.severity === 2 ? 'error' : 'warning',
          stage: 'eslint',
          message: item.message.replace(/^KUI-[A-Z]\d{3}:\s*/, ''),
          location: {
            file: portablePath(packageRoot, result.filePath),
            line: item.line ?? 1,
            column: item.column ?? 1,
          },
          documentation: item.ruleId
            ? `eslint-plugin-kerfjs/docs/rules/${item.ruleId.replace(/^kerfjs\//, '')}.md`
            : 'https://eslint.org/docs/latest/use/troubleshooting',
          action: item.suggestions?.length
            ? 'Apply one of ESLint’s safe suggestions after reviewing its edit.'
            : 'Repair the ESLint diagnostic at this source location.',
          meaning: meanings.get(code) ?? item.ruleId ?? 'ESLint parse error',
        }),
      );
    }
  return { diagnostics };
}

async function stage(name, runner, signal) {
  if (signal?.aborted)
    return { id: name, status: 'cancelled', diagnostics: [] };
  try {
    const value = await runner();
    if (signal?.aborted)
      return { id: name, status: 'cancelled', diagnostics: [] };
    return {
      id: name,
      status: value.detail?.includes('skipped') ? 'skipped' : 'ran',
      detail: value.detail,
      diagnostics: value.diagnostics ?? [],
    };
  } catch (error) {
    if (signal?.aborted || error?.name === 'AbortError')
      return { id: name, status: 'cancelled', diagnostics: [] };
    if (
      ['ERR_MODULE_NOT_FOUND', 'MODULE_NOT_FOUND'].includes(error?.code) ||
      /Cannot find (?:module|package)/.test(error?.message ?? '')
    )
      return {
        id: name,
        status: 'unavailable',
        diagnostics: [unavailable(name, error)],
      };
    return {
      id: name,
      status: 'failed',
      diagnostics: [
        normalizedDiagnostic({
          id: 'KUI-D011',
          severity: 'error',
          stage: name,
          message: error.message,
          action: `Repair the ${name} configuration and rerun the doctor.`,
          meaning: UI_DOCTOR_RULES['KUI-D011'].title,
        }),
      ],
    };
  }
}

export async function runUiDoctor({
  root: requestedRoot = process.cwd(),
  package: packageSelector,
  mode,
  paths,
  config: suppliedConfig,
  configPath,
  cache,
  signal,
  browser,
  runners = {},
  eslintConfig = 'recommended-ui',
} = {}) {
  const root = resolve(requestedRoot);
  const configResult = suppliedConfig
    ? {
        path: configPath ?? '<options>',
        config: suppliedConfig,
        diagnostics: validateUiDoctorConfig(
          suppliedConfig,
          configPath ?? '<options>',
        ),
      }
    : await readUiDoctorConfig(root, configPath && resolve(root, configPath));
  const config = configResult.config;
  let packageRoot = root;
  const initialDiagnostics = [...configResult.diagnostics];
  try {
    packageRoot = await resolveUiDoctorPackage(
      root,
      packageSelector ?? config.package,
    );
  } catch (error) {
    initialDiagnostics.push(
      configDiagnostic(error.message, {
        file: 'package.json',
        path: '$.workspaces',
      }),
    );
  }
  const selectedMode = mode ?? config.mode ?? 'full';
  const stages = { ...defaultStages, ...config.stages };
  if (browser?.url || config.browser?.url) stages.browser = true;
  const selectedPaths =
    selectedMode === 'changed'
      ? normalizeChangedPaths(root, packageRoot, paths ?? [])
      : undefined;
  if (selectedMode === 'changed' && !selectedPaths?.length)
    initialDiagnostics.push(
      configDiagnostic(
        'Changed mode requires at least one explicit --path. This prevents a false-clean report.',
        {
          file:
            configResult.path === '<options>'
              ? '<options>'
              : portablePath(root, configResult.path),
          path: '$.mode',
        },
      ),
    );
  const cacheEnabled = cache ?? config.cache ?? true;
  const [eslintRuleIds, registeredRuleIds] = await Promise.all([
    installedEslintRuleIds(packageRoot),
    sharedDiagnosticRuleIds(),
  ]);
  const cachePath = resolve(root, '.kerf-cache/ui-doctor-v1.json');
  const key = await cacheKey(root, packageRoot, selectedMode, selectedPaths, {
    ...config,
    browser: config.browser
      ? { ...config.browser, url: '<redacted-url>' }
      : undefined,
  });
  if (cacheEnabled && !initialDiagnostics.length && !stages.browser) {
    const cached = await readCache(cachePath, key);
    if (cached)
      return {
        ...cached,
        stages: cached.stages.map((item) =>
          item.status === 'ran' ? { ...item, status: 'cached' } : item,
        ),
        cache: { hit: true, key },
      };
  }
  const results = [];
  if (stages.catalog)
    results.push(
      await stage(
        'catalog',
        async () =>
          runners.catalog
            ? runners.catalog({
                root,
                packageRoot,
                paths: selectedPaths,
                signal,
              })
            : (async () => {
                const knownRules = [...registeredRuleIds, ...eslintRuleIds];
                const result = await loadApplicationUiProfile({
                  workspaceRoot: root,
                  startDirectory: packageRoot,
                  knownRules,
                });
                const local = await validateLocalCatalogs(packageRoot);
                return {
                  diagnostics: [
                    ...result.diagnostics.map((item) =>
                      normalizeProfile(item, root),
                    ),
                    ...local.diagnostics,
                  ],
                  detail: local.detail,
                };
              })(),
        signal,
      ),
    );
  if (stages.typescript)
    results.push(
      await stage(
        'typescript',
        () =>
          (runners.typescript ?? runTypeScript)({
            root,
            packageRoot,
            paths: selectedPaths,
            signal,
          }),
        signal,
      ),
    );
  if (stages.eslint)
    results.push(
      await stage(
        'eslint',
        () =>
          (runners.eslint ?? runEslint)({
            root,
            packageRoot,
            paths: selectedPaths,
            signal,
            eslintConfig,
          }),
        signal,
      ),
    );
  if (stages.analyzer)
    results.push(
      await stage(
        'analyzer',
        () =>
          runners.analyzer
            ? runners.analyzer({
                root,
                packageRoot,
                paths: selectedPaths,
                signal,
              })
            : (async () => ({
                diagnostics: normalizeAnalyzer(
                  await analyzeUiProject({
                    root: packageRoot,
                    paths: selectedPaths,
                    knownRules: [...registeredRuleIds, ...eslintRuleIds],
                  }),
                ),
              }))(),
        signal,
      ),
    );
  if (stages.browser)
    results.push(
      await stage(
        'browser',
        async () =>
          runners.browser
            ? runners.browser({
                root,
                packageRoot,
                paths: selectedPaths,
                signal,
                browser: { ...config.browser, ...browser },
              })
            : (async () => {
                const options = { ...config.browser, ...browser };
                if (!options.url)
                  throw new Error(
                    'The browser stage requires an explicit URL.',
                  );
                const report = await evaluateUi({
                  url: options.url,
                  workspaceRoot: root,
                  startDirectory: packageRoot,
                  browsers: options.browsers,
                  retention: options.retention ?? 'on-failure',
                  outputDirectory: resolve(
                    root,
                    options.outputDirectory ?? 'kerf-ui-evidence',
                  ),
                  reportPath: resolve(
                    root,
                    options.reportPath ?? 'kerf-ui-evidence/report.json',
                  ),
                  signal,
                });
                return { diagnostics: normalizeEvaluator(report) };
              })(),
        signal,
      ),
    );
  for (const name of Object.keys(stages))
    if (!stages[name])
      results.push({
        id: name,
        status: 'skipped',
        detail: 'Disabled by configuration.',
        diagnostics: [],
      });
  const cancelled =
    signal?.aborted || results.some((item) => item.status === 'cancelled');
  const suppressionSource = [...(config.suppressions ?? [])];
  const emitted = results.flatMap((item) => item.diagnostics);
  const knownSuppressionRules = new Set([
    ...registeredRuleIds,
    ...eslintRuleIds,
    ...emitted.map((item) => item.id),
  ]);
  suppressionSource.forEach((suppression, index) => {
    for (const rule of suppression.rules ?? [])
      if (
        !knownSuppressionRules.has(rule) &&
        !/^TS\d+$/.test(rule) &&
        !/^eslint:[a-z0-9@/_-]+$/i.test(rule)
      )
        initialDiagnostics.push(
          configDiagnostic(`Unknown or stale suppression rule id ${rule}.`, {
            file:
              configResult.path === '<options>'
                ? '<options>'
                : portablePath(root, configResult.path),
            path: `$.suppressions[${index}].rules`,
          }),
        );
  });
  const merged = mergeDiagnostics(
    redact(root, [...initialDiagnostics, ...emitted]),
  );
  const { active, suppressed } = applySuppressions(merged, suppressionSource);
  const infrastructureFailure =
    initialDiagnostics.length ||
    results.some((item) => ['failed', 'unavailable'].includes(item.status));
  const summary = {
    errors: active.filter((item) => item.severity === 'error').length,
    warnings: active.filter((item) => item.severity === 'warning').length,
    review: active.filter((item) => item.severity === 'review').length,
    suppressed: suppressed.length,
  };
  const exitCode = cancelled
    ? UI_DOCTOR_EXIT.cancelled
    : infrastructureFailure
      ? UI_DOCTOR_EXIT.configuration
      : summary.errors
        ? UI_DOCTOR_EXIT.findings
        : UI_DOCTOR_EXIT.clean;
  const report = redact(root, {
    schemaVersion: UI_DOCTOR_SCHEMA_VERSION,
    tool: { name: '@kerfjs/ui/doctor', reportVersion: 1 },
    mode: selectedMode,
    root: '.',
    package: portablePath(root, packageRoot),
    paths: selectedPaths ?? [],
    stages: results
      .map((item) => {
        const stageResult = { ...item };
        delete stageResult.diagnostics;
        return stageResult;
      })
      .sort((a, b) => a.id.localeCompare(b.id)),
    diagnostics: active,
    suppressions: suppressed,
    summary,
    exitCode,
    cache: { hit: false, key },
  });
  if (cacheEnabled && !cancelled && !infrastructureFailure && !stages.browser)
    await writeCache(cachePath, key, report);
  return report;
}

export function formatUiDoctorText(report) {
  const lines = [];
  for (const item of report.diagnostics) {
    const place = item.location
      ? `${item.location.file}:${item.location.line}:${item.location.column}`
      : item.dom
        ? `[${item.dom.context ?? 'browser'} ${item.dom.selector}]`
        : '<doctor>';
    lines.push(`${place} ${item.severity} ${item.id} ${item.message}`);
    if (item.action) lines.push(`  Next: ${item.action}`);
  }
  lines.push(
    `Kerf UI doctor: ${report.summary.errors} error(s), ${report.summary.warnings} warning(s), ${report.summary.review} review finding(s), ${report.summary.suppressed} suppressed; exit ${report.exitCode}.`,
  );
  lines.push(
    `Stages: ${report.stages.map((item) => `${item.id}=${item.status}`).join(', ')}${report.cache.hit ? ' (cache hit)' : ''}`,
  );
  return lines.join('\n');
}
