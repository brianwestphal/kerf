export const FORCE_CHECK_ENV: string;

export interface CheckEnvironment {
  node: string;
  platform: string;
  arch: string;
  install: string;
}

export interface CheckPassRecord extends CheckEnvironment {
  schema_version: number;
  tree: string;
  passed_at?: string;
}

export const INSTALL_FINGERPRINT_DIRS: string[];

export interface CheckSkipDecision {
  skip: boolean;
  reason:
    | 'forced'
    | 'no_verified_tree'
    | 'dirty_worktree'
    | 'unknown_tree'
    | 'tree_changed'
    | 'runtime_changed'
    | 'install_changed'
    | 'pushed_tree_differs'
    | 'tree_already_verified';
}

export function decideCheckSkip(input: {
  force: boolean;
  cached: Partial<CheckPassRecord> | null;
  current: CheckEnvironment & {
    tree: string | null;
    clean: boolean;
    pushedTrees?: string[];
  };
}): CheckSkipDecision;
export function isForced(env: Record<string, string | undefined>): boolean;
export function checkPassCachePath(cwd: string): Promise<string>;
export function readWorktreeState(
  cwd: string,
): Promise<{ tree: string | null; clean: boolean }>;
export function treeOf(cwd: string, revision: string): Promise<string>;
export function installFingerprint(
  cwd: string,
  dirs?: string[],
): Promise<string>;
export function readCheckEnvironment(
  cwd: string,
  dirs?: string[],
): Promise<CheckEnvironment>;
export function sameCheckEnvironment(
  a: CheckEnvironment,
  b: CheckEnvironment,
): boolean;
export function readCheckPass(cwd: string): Promise<CheckPassRecord | null>;
export function clearCheckPass(cwd: string): Promise<void>;
export function writeCheckPass(
  cwd: string,
  tree: string,
  environment: CheckEnvironment,
): Promise<void>;
