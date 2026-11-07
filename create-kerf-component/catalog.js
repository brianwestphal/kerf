#!/usr/bin/env node
// kerf-component-catalog: generate (or with --check, verify) a component
// package's composition and selection catalogs from its author-owned
// `kerf.components.json`. This file is the command and the public API; the
// work lives in ./catalog/ (schema validation, workspace discovery, export
// discovery, component validation, selection catalog, generation). A
// scaffolded package receives this file as scripts/kerf-component-catalog.mjs
// with ./catalog/ and the three schemas beside it.

import { realpathSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { runCatalogCommand } from './catalog/generate.js';
import { CatalogError } from './catalog/workspace.js';

export { exportedNamesFromSource } from './catalog/export-discovery.js';
export {
  formatCatalog,
  generateCatalogs,
  runCatalogCommand,
} from './catalog/generate.js';
export { validateDocumentAgainstSchema } from './catalog/schema-validate.js';
export { CatalogError } from './catalog/workspace.js';

function parseArgs(argv) {
  let root = process.cwd();
  let check = false;
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--check') check = true;
    else if (arg === '--write') check = false;
    else if (arg === '--root' && argv[index + 1]) root = resolve(argv[++index]);
    else if (arg === '--help' || arg === '-h') {
      process.stdout.write(
        'Usage: kerf-component-catalog [--write|--check] [--root <package-or-workspace>]\n',
      );
      process.exit(0);
    } else throw new CatalogError([`unknown argument: ${arg}`]);
  }
  return { root, check };
}

const isMain =
  process.argv[1] &&
  realpathSync(process.argv[1]) ===
    realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  try {
    const options = parseArgs(process.argv);
    const results = runCatalogCommand(options);
    const verb = options.check ? 'verified' : 'wrote';
    for (const result of results)
      for (const path of [result.outputPath, result.selectionOutputPath])
        if (path)
          process.stdout.write(`${verb} ${relative(options.root, path)}\n`);
  } catch (error) {
    const diagnostics =
      error instanceof CatalogError ? error.diagnostics : [error.message];
    for (const diagnostic of diagnostics)
      process.stderr.write(`kerf-component-catalog: ${diagnostic}\n`);
    process.exitCode = 1;
  }
}
