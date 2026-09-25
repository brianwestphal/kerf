import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// Lives under the repository's git directory (per worktree), so it is never
// tracked, never shared between clones, and disappears with the worktree.
const CACHE_GIT_PATH = 'kerf/check-pass.json';
const TREE = /^[0-9a-f]{40,64}$/;

export const FORCE_CHECK_ENV = 'KERF_FORCE_CHECK';

/**
 * Decide whether the pre-push hook may skip `npm run check` because the exact
 * tree it would verify already passed that gate locally. Every uncertain input
 * answers "run": the skip is an optimization, never a weaker gate.
 */
export function decideCheckSkip({ force, cached, current }) {
  if (force) return { skip: false, reason: 'forced' };
  if (!cached || cached.schema_version !== 1 || !TREE.test(cached.tree ?? ''))
    return { skip: false, reason: 'no_verified_tree' };
  if (!current.clean) return { skip: false, reason: 'dirty_worktree' };
  if (!TREE.test(current.tree ?? ''))
    return { skip: false, reason: 'unknown_tree' };
  if (cached.tree !== current.tree)
    return { skip: false, reason: 'tree_changed' };
  if (cached.node !== current.node)
    return { skip: false, reason: 'runtime_changed' };
  const pushed = current.pushedTrees ?? [];
  if (pushed.length === 0 || pushed.some((tree) => tree !== current.tree))
    return { skip: false, reason: 'pushed_tree_differs' };
  return { skip: true, reason: 'tree_already_verified' };
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

export async function writeCheckPass(cwd, tree, node) {
  const path = await checkPassCachePath(cwd);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    `${JSON.stringify({ schema_version: 1, tree, node, passed_at: new Date().toISOString() })}\n`,
  );
}
