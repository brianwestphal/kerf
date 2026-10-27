export interface VerifiedPushOptions {
  cwd: string;
  args: string[];
  env?: NodeJS.ProcessEnv;
  getState?: (cwd: string) => Promise<{ tree: string | null; clean: boolean }>;
  getEnvironment?: (cwd: string) => Promise<{
    node: string;
    platform: string;
    arch: string;
    install: string;
  }>;
  getPass?: (cwd: string) => Promise<Record<string, unknown> | null>;
  getTree?: (cwd: string, source: string) => Promise<string>;
  gitOutput: (args: string[], cwd: string) => Promise<string>;
  check?: () => Promise<void>;
  push?: (args: string[]) => Promise<void>;
}

export function resolvePushArgs(
  args: string[],
  cwd: string,
  gitOutput: VerifiedPushOptions['gitOutput'],
): Promise<string[]>;

export function verifiedPush(options: VerifiedPushOptions): Promise<void>;
