export function createFirefoxAppData(options?: {
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
}): { env: NodeJS.ProcessEnv; dispose(): void };
