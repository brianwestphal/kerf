#!/usr/bin/env node
// kerf-ui-view: generate, check, and diff read-only view modules from Kerf UI
// view documents (docs/26-ui-editor.md §6). An authoring step, like a
// formatter — never part of a consumer's build.
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { contractOf, diffContracts } from './contract.mjs';
import { generateView, readViewHeader, viewModulePath } from './generate.mjs';
import { createViewCatalog, validateView } from './validate.mjs';

const USAGE = `Usage: kerf-ui-view <command> <document.kui.json...> [options]

Commands:
  generate   write each document's view module beside it
  check      fail when a module is missing, stale, or edited by hand
  diff       print the contract changes regenerating would make

Catalogs: @kerfjs/ui's own, plus every package catalog (props and
composition) the .kerf-ui-profile.json files above the document declare.

Options:
  --target ts|js        .view.ts (default) or .view.js + .view.d.ts
  --declarations-only   omit render<Name> (for runtime-interpreted documents)
  --props <file>        an extra component-props.json (repeatable)
  --no-profile          skip catalogs .kerf-ui-profile.json declares
  --composition <file>  an extra component-composition.json (repeatable)
`;

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

/** Parses argv into `{ command, documents, options }`, or throws a usage error. */
export function parseArguments(argv) {
  const [command, ...rest] = argv;
  const options = {
    target: 'ts',
    declarationsOnly: false,
    props: [],
    composition: [],
    profile: true,
  };
  const documents = [];
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    const next = () => {
      const value = rest[(index += 1)];
      if (value === undefined) throw new Error(`${argument} needs a value`);
      return value;
    };
    if (argument === '--target') {
      options.target = next();
      if (!['ts', 'js'].includes(options.target))
        throw new Error('--target is ts or js');
    } else if (argument === '--declarations-only')
      options.declarationsOnly = true;
    else if (argument === '--props') options.props.push(next());
    else if (argument === '--composition') options.composition.push(next());
    else if (argument === '--no-profile') options.profile = false;
    else if (argument.startsWith('--'))
      throw new Error(`unknown option ${argument}`);
    else documents.push(argument);
  }
  if (!['generate', 'check', 'diff'].includes(command))
    throw new Error(`unknown command ${command ?? '(none)'}`);
  if (documents.length === 0)
    throw new Error('name at least one .kui.json document');
  return { command, documents, options };
}

const require = createRequire(import.meta.url);
const profiles = require('../ai/application-ui-profile-sync.cjs');

/** The nearest ancestor holding `.git`, else the filesystem root. */
function workspaceRootOf(directory) {
  for (let current = directory; ; current = dirname(current)) {
    if (existsSync(join(current, '.git')) || dirname(current) === current) {
      return current;
    }
  }
}

/**
 * The prop and composition catalogs a document's `.kerf-ui-profile.json`
 * layers declare for packages other than @kerfjs/ui (KF-S61KAT: profile
 * discovery of component-props.json), resolved relative to the profile file
 * that declares each one.
 */
export function profileCatalogPaths(documentPath) {
  const startDirectory = dirname(resolve(documentPath));
  const files = profiles.discoverApplicationUiProfileFilesSync({
    workspaceRoot: workspaceRootOf(startDirectory),
    startDirectory,
    packageProfile: resolve(
      packageRoot,
      'ai/application-ui-profile.defaults.json',
    ),
  });
  const resolved = profiles.mergeApplicationUiProfiles(
    files.map((source) => ({ source, profile: readJson(source) })),
  );
  const paths = { props: [], composition: [] };
  for (const catalog of resolved.profile.catalogs ?? []) {
    const owner = resolved.provenance[`$catalogs.${catalog.package}`];
    if (catalog.package === '@kerfjs/ui' || !owner) continue;
    for (const kind of ['props', 'composition']) {
      if (catalog[kind]?.path)
        paths[kind].push(resolve(dirname(owner), catalog[kind].path));
    }
  }
  return paths;
}

function loadCatalog(options, documentPath) {
  const discovered = options.profile
    ? profileCatalogPaths(documentPath)
    : { props: [], composition: [] };
  return createViewCatalog({
    props: [
      resolve(packageRoot, 'ai/component-props.json'),
      ...discovered.props,
      ...options.props,
    ].map(readJson),
    composition: [
      resolve(packageRoot, 'ai/component-composition.json'),
      ...discovered.composition,
      ...options.composition,
    ].map(readJson),
  });
}

/** Loads composed documents relative to the composing document's folder. */
const viewResolver = (documentPath) => (src) => {
  const path = resolve(dirname(documentPath), src);
  return existsSync(path) ? readJson(path) : undefined;
};

/** Runs one command; returns `{ code, output }` instead of exiting, for tests. */
export function run(argv) {
  let parsed;
  try {
    parsed = parseArguments(argv);
  } catch (error) {
    return { code: 2, output: `kerf-ui-view: ${error.message}\n\n${USAGE}` };
  }
  const { command, documents, options } = parsed;
  const lines = [];
  let failed = false;
  for (const documentPath of documents) {
    const catalog = loadCatalog(options, documentPath);
    const document = readJson(documentPath);
    const resolveView = viewResolver(documentPath);
    const validation = validateView(document, catalog, { resolveView });
    if (!validation.valid) {
      failed = true;
      for (const item of validation.diagnostics) {
        lines.push(
          `${documentPath}: ${item.code} ${item.path}: ${item.message}`,
        );
      }
      continue;
    }
    const modulePath = viewModulePath(documentPath, options.target);
    const generated = generateView(document, catalog, {
      source: basename(documentPath),
      resolveView,
      target: options.target,
      declarationsOnly: options.declarationsOnly,
    });
    const outputs = [[modulePath, generated.code]];
    if (generated.declarations)
      outputs.push([
        modulePath.replace(/\.js$/, '.d.ts'),
        generated.declarations,
      ]);

    if (command === 'generate') {
      for (const [path, code] of outputs) writeFileSync(path, code);
      lines.push(`${modulePath}: ${generated.digest}`);
      continue;
    }
    const current = existsSync(modulePath)
      ? readFileSync(modulePath, 'utf8')
      : undefined;
    const header = current === undefined ? undefined : readViewHeader(current);
    if (command === 'diff') {
      const before = header?.contract ?? {
        inputs: {},
        actions: {},
        slots: {},
        refs: {},
      };
      const changes = diffContracts(
        before,
        contractOf(document, catalog, { resolveView }),
      );
      lines.push(
        `${modulePath}: ${changes.length ? `${changes.length} contract change(s)` : 'contract unchanged'}`,
      );
      for (const change of changes) {
        lines.push(
          `  ${change.breaking ? 'BREAKING' : 'compatible'} ${change.member} ${JSON.stringify(change.name)} ${change.change} (${change.detail})`,
        );
      }
      continue;
    }
    for (const [path, code] of outputs) {
      const existing =
        path === modulePath
          ? current
          : existsSync(path)
            ? readFileSync(path, 'utf8')
            : undefined;
      const existingHeader =
        path === modulePath ? header : existing && readViewHeader(existing);
      if (existing === undefined) {
        failed = true;
        lines.push(`${path}: missing; run kerf-ui-view generate`);
      } else if (!existingHeader?.intact) {
        failed = true;
        lines.push(`${path}: edited by hand; regenerate it instead of editing`);
      } else if (existing !== code) {
        failed = true;
        lines.push(`${path}: stale; run kerf-ui-view generate`);
      } else lines.push(`${path}: up to date`);
    }
  }
  return { code: failed ? 1 : 0, output: `${lines.join('\n')}\n` };
}

if (
  process.argv[1] &&
  // npm runs bins through symlinks (node_modules/.bin), so compare real paths.
  realpathSync(resolve(process.argv[1])) === fileURLToPath(import.meta.url)
) {
  const result = run(process.argv.slice(2));
  (result.code === 0 ? process.stdout : process.stderr).write(result.output);
  process.exitCode = result.code;
}
