export interface SetupConflict {
  id: string;
  message: string;
}
export interface SetupAction {
  path: string;
  absolutePath: string;
  before: string | null;
  after: string;
  kind: string;
}
export interface KerfSetupPlan {
  schemaVersion: 1;
  root: string;
  packageRoot: string;
  packageName: string;
  packageManager: 'npm' | 'pnpm' | 'yarn';
  packageManagerVersion?: string;
  packageManagerVariant?: 'classic' | 'berry';
  mode: 'core' | 'ui';
  setupVersion: string;
  actions: SetupAction[];
  conflicts: SetupConflict[];
  generatedPaths: string[];
}
export function planKerfSetup(options?: {
  root?: string;
  package?: string;
  mode?: 'core' | 'ui';
  version?: string;
  resolutions?: Record<string, 'keep' | 'kerf'>;
}): Promise<KerfSetupPlan>;
export function formatSetupPlan(plan: KerfSetupPlan): string;
export function applyKerfSetup(
  plan: KerfSetupPlan,
  options?: { install?: boolean; offline?: boolean; runner?: Function },
): Promise<{ changed: string[] }>;
