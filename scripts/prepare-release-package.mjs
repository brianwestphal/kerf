#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const packageName = args[0];
const version = args[1];
const rootFlag = args.indexOf('--root');
if (rootFlag !== -1 && !args[rootFlag + 1]) {
  throw new Error('--root requires a path');
}
const repoRoot = resolve(
  rootFlag === -1
    ? fileURLToPath(new URL('../', import.meta.url))
    : (args[rootFlag + 1] ?? ''),
);

const packagePaths = {
  kerfjs: 'package.json',
  'eslint-plugin-kerfjs': 'eslint-plugin/package.json',
  'create-kerf-component': 'create-kerf-component/package.json',
  '@kerfjs/ui': 'ui/package.json',
};

if (
  !Object.hasOwn(packagePaths, packageName ?? '') ||
  !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version ?? '')
) {
  throw new Error(
    'Usage: node scripts/prepare-release-package.mjs ' +
      '<kerfjs|eslint-plugin-kerfjs|create-kerf-component|@kerfjs/ui> <version> [--root <path>]',
  );
}

const major = Number.parseInt(version.split('.')[0], 10);
const prerelease = version.includes('-');
const kerfPeerRange = prerelease ? `^${major}.0.0-0` : `^${major}.0.0`;

function path(relative) {
  return resolve(repoRoot, relative);
}

function read(relative) {
  return readFileSync(path(relative), 'utf8');
}

function write(relative, contents) {
  writeFileSync(path(relative), contents);
}

function readJson(relative) {
  return JSON.parse(read(relative));
}

function writeJson(relative, value) {
  write(relative, `${JSON.stringify(value, null, 2)}\n`);
}

function setPackageVersion(relative) {
  const manifest = readJson(relative);
  manifest.version = version;
  writeJson(relative, manifest);
}

function replaceRequired(relative, pattern, replacement) {
  const before = read(relative);
  const after = before.replace(pattern, replacement);
  if (after === before && !pattern.test(before)) {
    throw new Error(
      `[prepare-release-package] missing expected version surface in ${relative}`,
    );
  }
  write(relative, after);
}

setPackageVersion(packagePaths[packageName]);

if (packageName === 'kerfjs') {
  const manifest = readJson('ai/manifest.json');
  manifest.kerfjsVersion = version;
  writeJson('ai/manifest.json', manifest);
}

if (packageName === 'eslint-plugin-kerfjs') {
  replaceRequired(
    'eslint-plugin/index.js',
    /meta: \{ name: 'eslint-plugin-kerfjs', version: '[^']+' \}/,
    `meta: { name: 'eslint-plugin-kerfjs', version: '${version}' }`,
  );
}

if (packageName === 'create-kerf-component') {
  const template = readJson('create-kerf-component/template/package.json');
  template.peerDependencies.kerfjs = kerfPeerRange;
  template.devDependencies.kerfjs = `^${version}`;
  writeJson('create-kerf-component/template/package.json', template);
}

if (packageName === '@kerfjs/ui') {
  const manifest = readJson('ui/package.json');
  manifest.peerDependencies.kerfjs = kerfPeerRange;
  writeJson('ui/package.json', manifest);
  replaceRequired(
    'ui/ai/public-api-signatures-v1.md',
    /Generated from emitted declarations for `@kerfjs\/ui@[^`]+` and `kerfjs@[^`]+`/,
    `Generated from emitted declarations for \`@kerfjs/ui@${version}\` and \`kerfjs@${version}\``,
  );
  replaceRequired(
    'ui/ai/webawesome-jsx-signatures-v1.md',
    /Generated from the emitted `@kerfjs\/ui@[^`]+` declaration boundary/,
    `Generated from the emitted \`@kerfjs/ui@${version}\` declaration boundary`,
  );
}

console.log(`[prepare-release-package] prepared ${packageName}@${version}`);
