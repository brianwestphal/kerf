#!/usr/bin/env node
// Keeps every release-cadence version surface derived from the root manifest.
// Default mode checks only; --write is used by scripts/release.sh after npm
// version has updated the four package manifests and lockfiles.

import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const write = process.argv.includes('--write');

function read(relative) {
  return readFileSync(new URL(relative, root), 'utf8');
}

function readJson(relative) {
  return JSON.parse(read(relative));
}

function replace(relative, pattern, replacement) {
  const before = read(relative);
  const after = before.replace(pattern, replacement);
  if (after === before && !pattern.test(before)) {
    throw new Error(`[sync-lockstep-versions] could not find the expected version surface in ${relative}`);
  }
  writeFileSync(new URL(relative, root), after);
}

const rootPackage = readJson('package.json');
const version = rootPackage.version;
const major = Number.parseInt(version.split('.')[0] ?? '', 10);
if (!Number.isInteger(major)) throw new Error(`[sync-lockstep-versions] invalid root version: ${version}`);

const peerRange = `^${major}.0.0`;
const devRange = `^${version}`;
const docs = ['docs/13-component-packages.md', 'site/src/content/docs/docs/component-packages.md'];
const linkedRootLocks = [
  ['examples/reactivity-demo/package-lock.json', '../..'],
  ['site/package-lock.json', '..'],
];

if (write) {
  replace(
    'eslint-plugin/index.js',
    /meta: \{ name: 'eslint-plugin-kerfjs', version: '[^']+' \}/,
    `meta: { name: 'eslint-plugin-kerfjs', version: '${version}' }`,
  );

  const templatePath = 'create-kerf-component/template/package.json';
  const template = readJson(templatePath);
  template.peerDependencies.kerfjs = peerRange;
  template.devDependencies.kerfjs = devRange;
  writeFileSync(new URL(templatePath, root), `${JSON.stringify(template, null, 2)}\n`);

  for (const relative of docs) {
    replace(relative, /"peerDependencies": \{ "kerfjs": "[^"]+" \}/, `"peerDependencies": { "kerfjs": "${peerRange}" }`);
    replace(relative, /"devDependencies": \{ "kerfjs": "[^"]+",/, `"devDependencies": { "kerfjs": "${devRange}",`);
  }

  for (const [relative, linkKey] of linkedRootLocks) {
    const lock = readJson(relative);
    const linkedRoot = lock.packages?.[linkKey];
    if (!linkedRoot) throw new Error(`[sync-lockstep-versions] missing linked root ${linkKey} in ${relative}`);
    linkedRoot.version = version;
    linkedRoot.dependencies = rootPackage.dependencies;
    linkedRoot.devDependencies = rootPackage.devDependencies;
    linkedRoot.engines = rootPackage.engines;
    writeFileSync(new URL(relative, root), `${JSON.stringify(lock, null, 2)}\n`);
  }
}

const errors = [];
const rootLock = readJson('package-lock.json');
if (rootLock.version !== version || rootLock.packages?.['']?.version !== version) {
  errors.push(`package-lock.json does not agree with package.json version ${version}`);
}
const companions = [
  ['eslint-plugin/package.json', 'eslint-plugin/package-lock.json'],
  ['create-kerf-component/package.json', 'create-kerf-component/package-lock.json'],
  ['ui/package.json', 'ui/package-lock.json'],
];

for (const [manifestPath, lockPath] of companions) {
  const manifest = readJson(manifestPath);
  const lock = readJson(lockPath);
  if (manifest.version !== version) errors.push(`${manifestPath} is ${manifest.version}; expected ${version}`);
  if (lock.version !== version) errors.push(`${lockPath} is ${lock.version}; expected ${version}`);
  if (lock.packages?.['']?.version !== version) errors.push(`${lockPath} root is ${lock.packages?.['']?.version}; expected ${version}`);
}

for (const [relative, linkKey] of linkedRootLocks) {
  const linkedRoot = readJson(relative).packages?.[linkKey];
  if (linkedRoot?.version !== version) errors.push(`${relative} linked root is ${linkedRoot?.version}; expected ${version}`);
  for (const field of ['dependencies', 'devDependencies', 'engines']) {
    if (JSON.stringify(linkedRoot?.[field]) !== JSON.stringify(rootPackage[field])) {
      errors.push(`${relative} linked root ${field} does not match package.json`);
    }
  }
}

const pluginSource = read('eslint-plugin/index.js');
const pluginMeta = pluginSource.match(/meta: \{ name: 'eslint-plugin-kerfjs', version: '([^']+)' \}/)?.[1];
if (pluginMeta !== version) errors.push(`eslint-plugin/index.js meta.version is ${pluginMeta ?? 'missing'}; expected ${version}`);

const pluginPackage = readJson('eslint-plugin/package.json');
const pluginLock = readJson('eslint-plugin/package-lock.json');
const manifestEslintPeer = pluginPackage.peerDependencies?.eslint;
const lockEslintPeer = pluginLock.packages?.['']?.peerDependencies?.eslint;
if (lockEslintPeer !== manifestEslintPeer) {
  errors.push(`eslint-plugin/package-lock.json peer is ${lockEslintPeer}; expected ${manifestEslintPeer}`);
}

const template = readJson('create-kerf-component/template/package.json');
if (template.peerDependencies?.kerfjs !== peerRange) {
  errors.push(`component template peer is ${template.peerDependencies?.kerfjs}; expected ${peerRange}`);
}
if (template.devDependencies?.kerfjs !== devRange) {
  errors.push(`component template dev range is ${template.devDependencies?.kerfjs}; expected ${devRange}`);
}

for (const relative of docs) {
  const text = read(relative);
  if (!text.includes(`"peerDependencies": { "kerfjs": "${peerRange}" }`)) {
    errors.push(`${relative} does not show the current-major peer range ${peerRange}`);
  }
  if (!text.includes(`"devDependencies": { "kerfjs": "${devRange}",`)) {
    errors.push(`${relative} does not show the current release dev range ${devRange}`);
  }
}

if (errors.length > 0) {
  throw new Error(`[sync-lockstep-versions] version drift:\n- ${errors.join('\n- ')}\nRun npm run sync:lockstep-versions after intentional version changes.`);
}

console.log(`[sync-lockstep-versions] OK — four packages and companion metadata agree on ${version}`);
