export interface UiChangeStep {
  label: string;
  command: string;
  env?: Record<string, string | undefined>;
}

export const DEMO_BUNDLE_COMMAND: string;
export const DEMO_CHECK_COMMAND: string;

export function uiChangeSyncSteps(): UiChangeStep[];
export function uiChangeGateSteps(options?: {
  updateBundleBudget?: boolean;
  reason?: string;
}): UiChangeStep[];
export function commandEnvironment(
  baseEnv: Record<string, string | undefined>,
  options: {
    execPath: string;
    root: string;
    extra?: Record<string, string | undefined>;
  },
): Record<string, string | undefined>;
