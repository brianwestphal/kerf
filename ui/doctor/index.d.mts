export type UiDoctorSeverity = 'error' | 'warning' | 'review' | 'info';
export type UiDoctorStageId =
  | 'catalog'
  | 'typescript'
  | 'eslint'
  | 'analyzer'
  | 'browser'
  | 'doctor'
  | 'merged';
export type UiDoctorStageStatus =
  'ran' | 'cached' | 'skipped' | 'unavailable' | 'failed' | 'cancelled';

export interface UiDoctorSuppression {
  id: string;
  rules: string[];
  target: string;
  rationale: string;
}

export interface UiDoctorConfig {
  $schema?: string;
  schemaVersion: 1;
  mode?: 'full' | 'changed';
  package?: string;
  stages?: Partial<
    Record<
      'catalog' | 'typescript' | 'eslint' | 'analyzer' | 'browser',
      boolean
    >
  >;
  browser?: {
    url: string;
    browsers?: Array<'chromium' | 'firefox' | 'webkit'>;
    retention?: 'always' | 'on-failure' | 'never';
    outputDirectory?: string;
    reportPath?: string;
  };
  cache?: boolean;
  suppressions?: UiDoctorSuppression[];
}

export interface UiDoctorDiagnostic {
  id: string;
  severity: UiDoctorSeverity;
  stage: UiDoctorStageId | string;
  message: string;
  location?: { file: string; line: number; column: number; path?: string };
  dom?: { context?: string; selector: string };
  evidence?: unknown;
  catalogFacts?: unknown;
  documentation?: string;
  action?: string;
  sources?: string[];
}

export interface UiDoctorReport {
  schemaVersion: 1;
  tool: { name: '@kerfjs/ui/doctor'; reportVersion: 1 };
  mode: 'full' | 'changed';
  root: '.';
  package: string;
  paths: string[];
  stages: Array<{ id: string; status: UiDoctorStageStatus; detail?: string }>;
  diagnostics: UiDoctorDiagnostic[];
  suppressions: Array<
    UiDoctorDiagnostic & { suppression: { id: string; rationale: string } }
  >;
  summary: {
    errors: number;
    warnings: number;
    review: number;
    suppressed: number;
  };
  exitCode: 0 | 1 | 2 | 130;
  cache: { hit: boolean; key: string };
}

export const UI_DOCTOR_SCHEMA_VERSION: 1;
export const UI_DOCTOR_EXIT: Readonly<{
  clean: 0;
  findings: 1;
  configuration: 2;
  cancelled: 130;
}>;
export const UI_DOCTOR_RULES: Readonly<
  Record<string, { severity: UiDoctorSeverity; title: string }>
>;
export function validateUiDoctorConfig(
  config: unknown,
  source?: string,
): UiDoctorDiagnostic[];
export function readUiDoctorConfig(
  root: string,
  path?: string,
): Promise<{
  path: string;
  config: UiDoctorConfig;
  diagnostics: UiDoctorDiagnostic[];
}>;
export function resolveUiDoctorPackage(
  root: string,
  selector?: string,
): Promise<string>;
export function runUiDoctor(options?: {
  root?: string;
  package?: string;
  mode?: 'full' | 'changed';
  paths?: string[];
  config?: UiDoctorConfig;
  configPath?: string;
  cache?: boolean;
  signal?: AbortSignal;
  browser?: UiDoctorConfig['browser'];
  eslintConfig?: 'recommended-ui' | 'strict-ui';
}): Promise<UiDoctorReport>;
export function formatUiDoctorText(report: UiDoctorReport): string;
