#!/usr/bin/env node
// create-kerf-component — scaffold a publishable kerf component package that
// already follows kerf's hard packaging rules (docs/13-component-packages.md):
// kerfjs as a peerDependency + external in the build (never bundled), ESM +
// .d.ts output, `jsxImportSource: "kerfjs"`, subpath exports, and an example
// component showing per-instance state via a factory + props and a `wire(root)`
// delegation disposer.
//
// Usage:
//   npm create kerf-component@latest <dir> [--name <package-name>]
//   npm init kerf-component <dir>
//   npx create-kerf-component <dir>
//
// <dir> is the target directory; its basename is the default package name (pass
// `.` to scaffold into the current directory). `--name` sets the package name
// instead, which is how to scaffold a scoped package (`--name @acme/widgets`).
// Run with NO argument and it prompts for the directory (or reads it from piped
// stdin) — `npm create kerf-component` alone just works. The initializer itself
// is plain Node; TypeScript is only an optional peer of the
// `kerf-component-catalog` bin, which runs inside a TypeScript project, so
// `npm create` installs nothing beyond this package.

import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const TEMPLATE_DIR = join(dirname(fileURLToPath(import.meta.url)), 'template');
const TOKEN = /__PKG_NAME__/g;
const DEFAULT_NAME = 'my-kerf-component';

function fail(msg) {
  process.stderr.write(`create-kerf-component: ${msg}\n`);
  process.exit(1);
}

const USAGE =
  'Usage: npm create kerf-component@latest <dir> [--name <package-name>]\n' +
  '       (or: npx create-kerf-component <dir> [--name <package-name>])\n\n' +
  'Scaffolds a kerf component package into <dir>. Pass `.` for the current directory.\n' +
  'The package name defaults to the directory name; use --name for a scoped name\n' +
  '(for example --name @acme/widgets).\n';

// Split the command line into the target directory and options. Anything that
// starts with `-` is an option: an unknown one is an error rather than a
// directory named `--foo`.
function parseArgs(args) {
  const parsed = { target: undefined, name: undefined, help: false };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') parsed.help = true;
    else if (arg === '--name') {
      const value = args[++index];
      if (value === undefined || value.startsWith('-'))
        throw new Error(
          '--name needs a package name, e.g. --name @acme/widgets.',
        );
      parsed.name = value;
    } else if (arg.startsWith('--name=')) parsed.name = arg.slice(7);
    else if (arg.startsWith('-'))
      throw new Error(
        `unknown option "${arg}". Run with --help for usage. (To use a directory whose name starts with "-", pass it as ./${arg}.)`,
      );
    else if (parsed.target === undefined) parsed.target = arg;
    else
      throw new Error(
        `expected one target directory, received "${parsed.target}" and "${arg}".`,
      );
  }
  return parsed;
}

// Ask for the target directory when none was passed. `npm create kerf-component`
// (no arg) is the most natural invocation, so prompt rather than error.
async function promptForTarget() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(
      `Directory (\`.\` for current) [${DEFAULT_NAME}]: `,
    );
    return answer.trim() || DEFAULT_NAME;
  } finally {
    rl.close();
  }
}

// Non-TTY fallback: read the first line of piped stdin (scripted/test input).
// Resolves null if the stream closes without a line.
async function readFirstLine() {
  const rl = createInterface({ input: process.stdin });
  try {
    for await (const line of rl) return line;
    return null;
  } finally {
    rl.close();
  }
}

// npm package name rules, trimmed to what we actually need to guard: no spaces,
// no uppercase, no leading dot/underscore, URL-safe. (Scoped names like
// `@scope/name` are allowed.)
function isValidPackageName(name) {
  return /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name);
}

// Recursively walk a directory, returning absolute file paths.
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(abs));
    else out.push(abs);
  }
  return out;
}

async function main(argv) {
  let options;
  try {
    options = parseArgs(argv.slice(2));
  } catch (error) {
    fail(error.message);
  }
  if (options.help) {
    process.stdout.write(USAGE);
    process.exit(0);
  }
  let target = options.target;

  if (target == null || target === '') {
    // No directory given. Prompt interactively when attached to a terminal (the
    // `npm create kerf-component` happy path); when stdin is piped (scripts/CI),
    // take the first piped line; if there's nothing to read, print usage + fail.
    if (process.stdin.isTTY) {
      target = await promptForTarget();
    } else {
      target = ((await readFirstLine()) ?? '').trim();
    }
    if (target === '') {
      process.stderr.write(USAGE);
      process.exit(1);
    }
  }

  const targetDir = resolve(process.cwd(), target);
  const pkgName =
    options.name ?? (target === '.' ? basename(targetDir) : basename(target));

  if (!isValidPackageName(pkgName)) {
    fail(
      options.name === undefined
        ? `"${pkgName}" (from the directory name) is not a valid npm package name; pass --name <package-name> or choose another directory.`
        : `"${pkgName}" is not a valid npm package name.`,
    );
  }

  if (existsSync(targetDir)) {
    if (!statSync(targetDir).isDirectory())
      fail(
        `target "${target}" already exists and is a file, not a directory; choose a new directory name.`,
      );
    if (readdirSync(targetDir).length > 0)
      fail(`target directory "${target}" already exists and is not empty.`);
  }

  // Copy the whole template tree, then post-process each file in place: replace
  // the package-name token and rename the dotfile placeholders npm can't ship
  // verbatim (`_gitignore` → `.gitignore`).
  try {
    mkdirSync(targetDir, { recursive: true });
  } catch (error) {
    if (error?.code === 'ENOTDIR' || error?.code === 'EEXIST')
      fail(
        `cannot create "${target}": part of that path is an existing file, not a directory.`,
      );
    throw error;
  }
  cpSync(TEMPLATE_DIR, targetDir, { recursive: true });
  mkdirSync(join(targetDir, 'scripts'), { recursive: true });
  copyFileSync(
    join(dirname(fileURLToPath(import.meta.url)), 'catalog.js'),
    join(targetDir, 'scripts', 'kerf-component-catalog.mjs'),
  );
  // The command's modules, imported relatively by the entry above. Their
  // own package.json keeps them ES modules whatever the host package's type.
  cpSync(
    join(dirname(fileURLToPath(import.meta.url)), 'catalog'),
    join(targetDir, 'scripts', 'catalog'),
    { recursive: true },
  );
  writeFileSync(
    join(targetDir, 'scripts', 'catalog', 'package.json'),
    '{ "type": "module" }\n',
  );
  for (const schema of [
    'component-metadata.schema.json',
    'component-composition.schema.json',
    'component-catalog-extension.schema.json',
  ])
    copyFileSync(
      join(dirname(fileURLToPath(import.meta.url)), schema),
      join(targetDir, 'scripts', schema),
    );

  for (const file of walk(targetDir)) {
    const text = readFileSync(file, 'utf8');
    if (TOKEN.test(text)) writeFileSync(file, text.replace(TOKEN, pkgName));
  }

  const dotfiles = [['_gitignore', '.gitignore']];
  for (const [from, to] of dotfiles) {
    const src = join(targetDir, from);
    if (existsSync(src)) renameSync(src, join(targetDir, to));
  }

  const cdHint = target === '.' ? '' : `  cd ${target}\n`;
  process.stdout.write(
    `\nScaffolded kerf component package "${pkgName}" in ${target}\n\n` +
      'Next steps:\n' +
      cdHint +
      '  npm install\n' +
      '  npm run build      # tsup → ESM + .d.ts (kerfjs stays external)\n' +
      '  npm run catalog:check # verify AI metadata and public exports\n' +
      '  npm run check:styles  # each component styles only itself (kerf-ui-analyze)\n' +
      '  npm run typecheck\n\n' +
      'Edit src/counter.tsx, src/counter.css, and kerf.components.json, then publish with `npm publish --access public`.\n',
  );
}

main(process.argv).catch((err) => fail(err?.message ?? String(err)));
