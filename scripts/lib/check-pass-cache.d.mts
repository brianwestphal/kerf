export const FORCE_CHECK_ENV: string;

export interface CheckPassRecord {
  schema_version: number;
  tree: string;
  node: string;
  passed_at?: string;
}

export interface CheckSkipDecision {
  skip: boolean;
  reason:
    | 'forced'
    | 'no_verified_tree'
    | 'dirty_worktree'
    | 'unknown_tree'
    | 'tree_changed'
    | 'runtime_changed'
    | 'pushed_tree_differs'
    | 'tree_already_verified';
}

export function decideCheckSkip(input: {
  force: boolean;
  cached: Partial<CheckPassRecord> | null;
  current: {
    tree: string | null;
    clean: boolean;
    node: string;
    pushedTrees?: string[];
  };
}): CheckSkipDecision;
export function isForced(env: Record<string, string | undefined>): boolean;
export function checkPassCachePath(cwd: string): Promise<string>;
export function readWorktreeState(
  cwd: string,
): Promise<{ tree: string | null; clean: boolean }>;
export function treeOf(cwd: string, revision: string): Promise<string>;
export function readCheckPass(cwd: string): Promise<CheckPassRecord | null>;
export function clearCheckPass(cwd: string): Promise<void>;
export function writeCheckPass(
  cwd: string,
  tree: string,
  node: string,
): Promise<void>;
