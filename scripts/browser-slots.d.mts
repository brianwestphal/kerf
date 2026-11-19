import type { spawn, spawnSync } from 'node:child_process';

type Env = Record<string, string | undefined>;

export const BROWSER_SLOT_NAMESPACE: 'browser-engines';
export const DEFAULT_WEBKIT_SLOTS: number;
export const SLOTS_HELD_ENV: 'HOTSHEET_BROWSER_SLOTS_HELD';
export const DEFAULT_LEASE_MS: number;
export const DEFAULT_WAIT_MS: number;
export const WAIT_ROUND_MS: number;

export interface BrowserSlot {
  resource: string | null;
  claimId: string | null;
  reason?: 'off' | 'held' | 'no-cli';
  waitedMs?: number;
  release: () => Promise<void>;
  releaseSync: () => void;
}

export function slotPolicy(engine: string, env: Env): 'on' | 'off' | 'held';
export function slotNames(engine: string, env: Env): string[];
export function claimCli(env: Env): string;
export function parseClaimOutput(
  stdout: string,
): Record<string, unknown> | null;
export function describeHolders(
  holders: ReadonlyArray<{
    resource?: string;
    claim_id?: string;
    expires_at?: string;
    metadata?: Record<string, string>;
  }>,
): string;

export function acquireBrowserSlot(options: {
  engine: string;
  env?: Env;
  waitMs?: number;
  leaseMs?: number;
  purpose?: string;
  spawn?: typeof spawn;
  spawnSync?: typeof spawnSync;
  now?: () => number;
}): Promise<BrowserSlot>;

export function holdRunnerWebkitSlots(options: {
  env?: Env;
  workers?: number;
  acquire?: typeof acquireBrowserSlot;
  onExit?: (release: () => void) => void;
}): Promise<
  | { workers: number; slots: BrowserSlot[]; reason?: undefined }
  | {
      reason: 'off' | 'held' | 'no-cli' | undefined;
      workers?: undefined;
      slots?: undefined;
    }
>;
