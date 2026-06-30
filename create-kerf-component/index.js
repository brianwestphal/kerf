#!/usr/bin/env node
// create-kerf-component — scaffold a publishable kerf component package that
// already follows kerf's hard packaging rules (docs/13-component-packages.md):
// kerfjs as a peerDependency + external in the build (never bundled), ESM +
// .d.ts output, `jsxImportSource: "kerfjs"`, subpath exports, and an example
// component showing per-instance state via a factory + props and a `wire(root)`
// delegation disposer.
//
// Usage:
//   npm create kerf-component@latest <dir>
//   npm init kerf-component <dir>
//   npx create-kerf-component <dir>
//
// <dir> is the target directory; its basename is the default package name (pass
// `.` to scaffold into the current directory). No third-party dependencies — the
// initializer is plain Node so `npm create` runs it with zero install latency.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEMPLATE_DIR = join(dirname(fileURLToPath(import.meta.url)), 'template');
const TOKEN = /__PKG_NAME__/g;

function fail(msg) {
  process.stderr.write(`create-kerf-component: ${msg}\n`);
  process.exit(1);
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

function main(argv) {
  const target = argv[2];
  if (target == null || target === '' || target === '--help' || target === '-h') {
    process.stdout.write(
      'Usage: npm create kerf-component@latest <dir>\n' +
        '       (or: npx create-kerf-component <dir>)\n\n' +
        'Scaffolds a kerf component package into <dir>. Pass `.` for the current directory.\n',
    );
    process.exit(target == null || target === '' ? 1 : 0);
  }

  const targetDir = resolve(process.cwd(), target);
  const pkgName = target === '.' ? basename(targetDir) : basename(target);

  if (!isValidPackageName(pkgName)) {
    fail(`"${pkgName}" is not a valid npm package name.`);
  }

  if (existsSync(targetDir) && readdirSync(targetDir).length > 0) {
    fail(`target directory "${target}" already exists and is not empty.`);
  }

  // Copy the whole template tree, then post-process each file in place: replace
  // the package-name token and rename the dotfile placeholders npm can't ship
  // verbatim (`_gitignore` → `.gitignore`).
  mkdirSync(targetDir, { recursive: true });
  cpSync(TEMPLATE_DIR, targetDir, { recursive: true });

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
      '  npm run typecheck\n\n' +
      'Edit src/counter.tsx, then publish with `npm publish --access public`.\n',
  );
}

main(process.argv);
