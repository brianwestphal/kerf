#!/usr/bin/env node
// kerf-ui-props: writes or checks a component package's component-props.json
// (KF-B8TGP4: component packages ship the same prop schema as @kerfjs/ui), so
// the Kerf UI editor, view validator, and generator can use its components.
// Reads package.json#kerfComponentCatalog: `output` (the composition catalog
// create-kerf-component writes), `propsOutput` (where to write), and an
// optional `propsOverlay` of inspector hints. Run after the package's build.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  CLI_USAGE_EXIT,
  isMainModule,
  parseCliArguments,
  readJsonFile,
  wantsHelp,
} from '../scripts/lib/cli-args.mjs';
import { validateJsonSchemaSubset } from '../scripts/lib/json-schema-subset.mjs';
import { buildPackageComponentProps } from './component-props.mjs';

const USAGE = `Usage: kerf-ui-props (--write | --check) [--root <package directory>]

Reads package.json#kerfComponentCatalog.output (composition catalog),
.propsOutput (destination), and optional .propsOverlay (inspector hints).
Run it after building the package: it reads the built declarations.

Options:
  --write          write the props catalog
  --check          fail when the props catalog is missing or stale
  --root <path>    package directory (default: current directory)
  -h, --help       show this help

Exit codes: 0 success, 1 stale catalog or schema problems, 2 usage or
input error.
`;

// Every read names its file on failure (missing, unreadable, invalid JSON).
const readJson = (path) => readJsonFile(path);
const schemaPath = fileURLToPath(
  new URL('../ai/component-props.schema.json', import.meta.url),
);

/** Runs one invocation; returns `{ code, output }` instead of exiting, for tests. */
export function run(argv) {
  if (wantsHelp(argv)) return { code: 0, output: USAGE };
  let options;
  try {
    ({ options } = parseCliArguments(argv, {
      values: { '--root': 'root' },
      flags: { '--write': 'write', '--check': 'check' },
    }));
    if (options.write === options.check)
      throw new Error('choose exactly one of --write or --check');
  } catch (error) {
    return { code: 2, output: `kerf-ui-props: ${error.message}\n\n${USAGE}` };
  }
  const write = options.write === true;
  const root = resolve(options.root ?? process.cwd());
  try {
    return runIn(root, write);
  } catch (error) {
    return {
      code: CLI_USAGE_EXIT,
      output: `kerf-ui-props: ${error.message}\n`,
    };
  }
}

/** Writes or checks the props catalog of the package at `root`. */
function runIn(root, write) {
  const packagePath = resolve(root, 'package.json');
  if (!existsSync(packagePath)) {
    return { code: 2, output: `kerf-ui-props: no package.json in ${root}\n` };
  }
  const packageJson = readJson(packagePath);
  const config = packageJson.kerfComponentCatalog ?? {};
  const missing = ['output', 'propsOutput'].filter((key) => !config[key]);
  if (missing.length) {
    return {
      code: 2,
      output: `kerf-ui-props: package.json#kerfComponentCatalog needs ${missing.join(' and ')}\n`,
    };
  }
  const compositionPath = resolve(root, config.output);
  if (!existsSync(compositionPath)) {
    return {
      code: 1,
      output: `kerf-ui-props: ${config.output} is missing; run your catalog:generate script first\n`,
    };
  }
  const { document, problems } = buildPackageComponentProps({
    root,
    packageJson,
    composition: readJson(compositionPath),
    overlay: config.propsOverlay
      ? readJson(resolve(root, config.propsOverlay))
      : undefined,
  });
  problems.push(
    ...validateJsonSchemaSubset(readJson(schemaPath), document).map(
      (error) => `${config.propsOutput} ${error}`,
    ),
  );
  if (problems.length) {
    return {
      code: 1,
      output: `${problems.map((problem) => `kerf-ui-props: ${problem}`).join('\n')}\n`,
    };
  }
  const text = `${JSON.stringify(document, null, 2)}\n`;
  const outputPath = resolve(root, config.propsOutput);
  if (write) {
    writeFileSync(outputPath, text);
    return {
      code: 0,
      output: `kerf-ui-props: wrote ${document.components.length} components to ${config.propsOutput}\n`,
    };
  }
  const current = existsSync(outputPath)
    ? readFileSync(outputPath, 'utf8')
    : undefined;
  if (current !== text) {
    return {
      code: 1,
      output: `kerf-ui-props: ${config.propsOutput} is ${current === undefined ? 'missing' : 'stale'}; run kerf-ui-props --write after building\n`,
    };
  }
  return {
    code: 0,
    output: `kerf-ui-props: ${config.propsOutput} is up to date (${document.components.length} components)\n`,
  };
}

// npm runs bins through symlinks (node_modules/.bin); isMainModule compares
// real paths.
if (isMainModule(import.meta.url)) {
  const result = run(process.argv.slice(2));
  (result.code === 0 ? process.stdout : process.stderr).write(result.output);
  process.exitCode = result.code;
}
