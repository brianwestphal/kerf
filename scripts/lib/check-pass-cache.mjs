import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import { PACKAGE_GATES } from './package-gates.mjs';

const execFileAsync = promisify(execFile);

// Lives under the repository's git directory (per worktree), so it is never
// tracked, never shared between clones, and disappears with the worktree.
const CACHE_GIT_PATH = 'kerf/check-pass.json';
const TREE = /^[0-9a-f]{40,64}$/;
const SCHEMA_VERSION = 2;

// Every package directory with its own lockfile that `npm run check` can
// exercise: the root, the sibling packages `scripts/check-package-gates.mjs`
// runs, and `site/` (the example-app typecheck reads its sources). Each
// contributes its committed `package-lock.json` and the
// `node_modules/.package-lock.json` npm rewrites on every install, so a
// reinstall or an install from a different lockfile invalidates a recorded
// pass even when the git tree is identical.
export const INSTALL_FINGERPRINT_DIRS = [
  ...new Set(['.', ...PACKAGE_GATES.map((gate) => gate.dir), 'site']),
];
const INSTALL_FINGERPRINT_FILES = [
  'package-lock.json',
  'node_modules/.package-lock.json',
];

export const FORCE_CHECK_ENV = 'KERF_FORCE_CHECK';

/**
 * Decide whether the pre-push hook may skip `npm run check` because the exact
 * tree it would verify already passed that gate locally. Every uncertain input
 * answers "run": the skip is an optimization, never a weaker gate.
 */
export function decideCheckSkip({ force, cached, current }) {
  if (force) return { skip: false, reason: 'forced' };
  if (
    !cached ||
    cached.schema_version !== SCHEMA_VERSION ||
    !TREE.test(cached.tree ?? '')
  )
    return { skip: false, reason: 'no_verified_tree' };
  if (!current.clean) return { skip: false, reason: 'dirty_worktree' };
  if (!TREE.test(current.tree ?? ''))
    return { skip: false, reason: 'unknown_tree' };
  if (cached.tree !== current.tree)
    return { skip: false, reason: 'tree_changed' };
  if (
    cached.node !== current.node ||
    cached.platform !== current.platform ||
    cached.arch !== current.arch
  )
    return { skip: false, reason: 'runtime_changed' };
  if (!cached.install || cached.install !== current.install)
    return { skip: false, reason: 'install_changed' };
  const pushed = current.pushedTrees ?? [];
  if (pushed.length === 0 || pushed.some((tree) => tree !== current.tree))
    return { skip: false, reason: 'pushed_tree_differs' };
  return { skip: true, reason: 'tree_already_verified' };
}

/**
 * Environment switches that make `npm run check` verify LESS than the full
 * gate. A pass recorded under one of them must not let a later push skip the
 * full gate, so no pass is recorded while any is set.
 */
export const GATE_WEAKENING_ENV = ['KERF_SKIP_PACKAGE_GATES'];

/** The weakening switches set in `env` (empty when a pass may be recorded). */
export function gateWeakeningSwitches(env) {
  return GATE_WEAKENING_ENV.filter((name) => {
    const value = env[name];
    return value !== undefined && value !== '' && value !== '0';
  });
}

export function isForced(env) {
  const value = env[FORCE_CHECK_ENV];
  return value !== undefined && value !== '' && value !== '0';
}

async function git(cwd, args) {
  return (await execFileAsync('git', args, { cwd, encoding: 'utf8' })).stdout;
}

export async function checkPassCachePath(cwd) {
  const path = (
    await git(cwd, ['rev-parse', '--git-path', CACHE_GIT_PATH])
  ).trim();
  return resolve(cwd, path);
}

/** HEAD's tree plus whether the worktree (tracked and untracked) is clean. */
export async function readWorktreeState(cwd) {
  try {
    const tree = (await git(cwd, ['rev-parse', 'HEAD^{tree}'])).trim();
    const status = await git(cwd, [
      'status',
      '--porcelain',
      '--untracked-files=normal',
    ]);
    return { tree, clean: status.trim() === '' };
  } catch {
    return { tree: null, clean: false };
  }
}

export async function treeOf(cwd, revision) {
  return (await git(cwd, ['rev-parse', `${revision}^{tree}`])).trim();
}

/**
 * A hash over every install input the verdict depends on beyond the tree. A
 * missing file hashes as `absent`, so removing an install changes it too.
 */
export async function installFingerprint(cwd, dirs = INSTALL_FINGERPRINT_DIRS) {
  const hash = createHash('sha256');
  for (const dir of dirs)
    for (const file of INSTALL_FINGERPRINT_FILES) {
      let digest = 'absent';
      try {
        digest = createHash('sha256')
          .update(await readFile(join(cwd, dir, file)))
          .digest('hex');
      } catch {
        // Not installed (or no lockfile): recorded as absent.
      }
      hash.update(`${dir}/${file}\0${digest}\n`);
    }
  return hash.digest('hex');
}

/** The runtime and install a check verdict was produced under. */
export async function readCheckEnvironment(cwd, dirs) {
  return {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    install: await installFingerprint(cwd, dirs),
  };
}

export function sameCheckEnvironment(a, b) {
  return (
    a.node === b.node &&
    a.platform === b.platform &&
    a.arch === b.arch &&
    a.install === b.install
  );
}

export async function readCheckPass(cwd) {
  try {
    return JSON.parse(await readFile(await checkPassCachePath(cwd), 'utf8'));
  } catch {
    return null;
  }
}

export async function clearCheckPass(cwd) {
  try {
    await rm(await checkPassCachePath(cwd), { force: true });
  } catch {
    // Not a git checkout: there is nothing to invalidate.
  }
}

export async function writeCheckPass(cwd, tree, environment) {
  const path = await checkPassCachePath(cwd);
  await mkdir(dirname(path), { recursive: true });
  const { node, platform, arch, install } = environment;
  await writeFile(
    path,
    `${JSON.stringify({
      schema_version: SCHEMA_VERSION,
      tree,
      node,
      platform,
      arch,
      install,
      passed_at: new Date().toISOString(),
    })}\n`,
  );
}
