export const GUIDANCE_PATHS: readonly string[];

export type GuidanceSnapshot = Map<string, Buffer | null>;

export function snapshotGuidance(
  root: string,
  paths?: readonly string[],
): Promise<GuidanceSnapshot>;

export function changedGuidancePaths(
  before: GuidanceSnapshot,
  after: GuidanceSnapshot,
): string[];
