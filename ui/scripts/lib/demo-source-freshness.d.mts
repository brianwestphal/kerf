export interface DemoSourceFreshness {
  schemaVersion: 1;
  sha256: string;
  files: string[];
}

export function computeDemoSourceFreshness(
  root: string,
): Promise<DemoSourceFreshness>;
