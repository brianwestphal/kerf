export const OVERRIDE: 'KERF_ALLOW_WEBKIT_REPEAT';

export interface WebkitGuardInput {
  argv: readonly string[];
  env: Readonly<Record<string, string | undefined>>;
  projects: readonly string[];
}

export function webkitGuard(input: WebkitGuardInput): {
  error?: string;
  warning?: string;
};

export function guardWebkitRun(
  projects: readonly string[],
  options?: {
    argv?: readonly string[];
    env?: Readonly<Record<string, string | undefined>>;
    log?: (message: string) => void;
  },
): void;
