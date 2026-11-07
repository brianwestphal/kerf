import { readdir, realpath } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';

import { braceExpand, minimatch } from 'minimatch';
import { parse as parseYaml } from 'yaml';

import {
  contained,
  dependencies,
  exists,
  portable,
  readJson,
  readText,
} from './common.mjs';

function validatedWorkspacePattern(pattern) {
  if (typeof pattern !== 'string' || pattern !== pattern.trim() || !pattern)
    throw new Error(`Unsafe workspace pattern ${String(pattern)}.`);
  const negated = pattern.startsWith('!');
  const body = negated ? pattern.slice(1) : pattern;
  if (
    !body ||
    body.startsWith('!') ||
    isAbsolute(body) ||
    /^[A-Za-z]:/.test(body) ||
    body.startsWith('//') ||
    body.includes('\\') ||
    body.includes('\0')
  )
    throw new Error(`Unsafe workspace pattern ${pattern}.`);
  let expansions;
  try {
    expansions = braceExpand(body);
    // Compile as well as expand so malformed extglobs/classes fail here.
    minimatch('', body, { nonegate: true });
  } catch {
    throw new Error(`Invalid workspace pattern ${pattern}.`);
  }
  if (
    !expansions.length ||
    expansions.some(
      (expanded) =>
        isAbsolute(expanded) ||
        expanded.split('/').some((segment) => segment === '..'),
    )
  )
    throw new Error(`Unsafe workspace pattern ${pattern}.`);
  return { body, negated };
}

async function pnpmWorkspacePatterns(root) {
  const source = await readText(resolve(root, 'pnpm-workspace.yaml'));
  if (source === null) return [];
  let document;
  try {
    document = parseYaml(source);
  } catch (error) {
    throw new Error(`pnpm-workspace.yaml is invalid: ${error.message}`, {
      cause: error,
    });
  }
  if (
    !document ||
    typeof document !== 'object' ||
    !Array.isArray(document.packages) ||
    document.packages.some((pattern) => typeof pattern !== 'string')
  )
    throw new Error(
      'pnpm-workspace.yaml packages must be an array of strings.',
    );
  return [...document.packages];
}

async function workspacePackages(root) {
  const rootManifest = await readJson(resolve(root, 'package.json'), root);
  if (!rootManifest) throw new Error(`${root} has no package.json.`);
  let manifestPatterns = [];
  if (rootManifest.workspaces !== undefined) {
    const declaredPatterns = Array.isArray(rootManifest.workspaces)
      ? rootManifest.workspaces
      : rootManifest.workspaces?.packages;
    if (!Array.isArray(declaredPatterns))
      throw new Error(
        'package.json workspaces must be an array or an object with a packages array.',
      );
    manifestPatterns = [...declaredPatterns];
  }
  const patterns = [
    ...manifestPatterns,
    ...(await pnpmWorkspacePatterns(root)),
  ].map(validatedWorkspacePattern);
  const positivePatterns = patterns.filter(({ negated }) => !negated);
  const rootReal = await realpath(root);
  const candidates = new Map();
  const ignored = new Set([
    '.git',
    '.hg',
    '.pnpm-store',
    '.svn',
    '.yarn',
    'node_modules',
  ]);
  const visit = async (directory, relativeDirectory = '') => {
    const entries = (await readdir(directory, { withFileTypes: true })).sort(
      (left, right) => left.name.localeCompare(right.name),
    );
    for (const entry of entries) {
      if (ignored.has(entry.name)) continue;
      const childRelative = relativeDirectory
        ? `${relativeDirectory}/${entry.name}`
        : entry.name;
      if (
        !positivePatterns.some(({ body }) =>
          minimatch(childRelative, body, { nonegate: true, partial: true }),
        )
      )
        continue;
      const child = resolve(directory, entry.name);
      if (entry.isSymbolicLink()) {
        const actual = await realpath(child);
        if (!contained(rootReal, actual))
          throw new Error(
            `Workspace package symlink escapes the workspace: ${childRelative}.`,
          );
        const manifest = await readJson(resolve(child, 'package.json'), root);
        if (manifest)
          candidates.set(childRelative, { directory: child, manifest });
        continue;
      }
      if (!entry.isDirectory()) continue;
      const manifest = await readJson(resolve(child, 'package.json'), root);
      if (manifest)
        candidates.set(childRelative, { directory: child, manifest });
      await visit(child, childRelative);
    }
  };
  if (positivePatterns.length) await visit(root);
  const selected = new Map();
  for (const { body, negated } of patterns)
    for (const [path, candidate] of [...candidates].sort(([left], [right]) =>
      left.localeCompare(right),
    ))
      if (minimatch(path, body, { nonegate: true })) {
        if (negated) selected.delete(path);
        else selected.set(path, candidate);
      }
  const packages = [
    { directory: root, manifest: rootManifest },
    ...[...selected]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, candidate]) => candidate),
  ];
  const actualDirectories = new Map([[rootReal, '.']]);
  for (const { directory } of packages) {
    if (directory === root) continue;
    const actual = await realpath(directory);
    const previous = actualDirectories.get(actual);
    if (previous)
      throw new Error(
        `Workspace package aliases ${previous} and ${portable(root, directory)} resolve to the same directory.`,
      );
    actualDirectories.set(actual, portable(root, directory));
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

export async function detectMode(candidate) {
  return declaredMode(candidate.manifest) ?? sourceMode(candidate.directory);
}

export async function selectPackage(root, selector, requestedMode) {
  const packages = await workspacePackages(root);
  if (selector) {
    const direct = resolve(root, selector);
    const pathMatch = packages.find(({ directory }) => directory === direct);
    const nameMatches = packages.filter(
      ({ manifest }) => manifest.name === selector,
    );
    if (!pathMatch && nameMatches.length > 1)
      throw new Error(
        `Workspace package name ${selector} is ambiguous (${nameMatches
          .map(({ directory }) => portable(root, directory))
          .join(', ')}); select a relative package path.`,
      );
    const selected = pathMatch ?? nameMatches[0];
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

export async function packageManagerInfo(root) {
  const manifest = await readJson(resolve(root, 'package.json'), root);
  const declared = manifest?.packageManager?.match(/^(npm|pnpm|yarn)@(.+)$/);
  if (manifest?.packageManager && !declared)
    throw new Error(
      `Unsupported packageManager ${manifest.packageManager}; expected npm@<version>, pnpm@<version>, or yarn@<numeric-version>.`,
    );
  if (declared) {
    if (declared[1] !== 'yarn')
      return { name: declared[1], version: declared[2] };
    const major = Number(declared[2].match(/^\d+/)?.[0]);
    if (!Number.isInteger(major))
      throw new Error(
        'Cannot distinguish Yarn Classic from Berry; declare a numeric yarn packageManager version.',
      );
    return {
      name: 'yarn',
      version: declared[2],
      variant: major === 1 ? 'classic' : 'berry',
    };
  }
  if (await exists(resolve(root, 'pnpm-lock.yaml'))) return { name: 'pnpm' };
  const yarnLock = await readText(resolve(root, 'yarn.lock'));
  const berryConfig = await exists(resolve(root, '.yarnrc.yml'));
  const classicConfig = await exists(resolve(root, '.yarnrc'));
  if (yarnLock !== null || berryConfig || classicConfig) {
    const berryLock = /^__metadata:\s*$/m.test(yarnLock ?? '');
    const classicLock = /^# yarn lockfile v1\s*$/m.test(yarnLock ?? '');
    if ((berryConfig || berryLock) && !(classicConfig || classicLock))
      return { name: 'yarn', variant: 'berry' };
    if ((classicConfig || classicLock) && !(berryConfig || berryLock))
      return { name: 'yarn', variant: 'classic' };
    throw new Error(
      'Cannot distinguish Yarn Classic from Berry; declare packageManager as yarn@<version>.',
    );
  }
  return { name: 'npm' };
}
