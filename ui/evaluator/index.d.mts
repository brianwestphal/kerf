export type UiEvaluationBrowser = 'chromium' | 'firefox' | 'webkit';
export type UiEvaluationRetention = 'always' | 'on-failure' | 'never';

export interface UiEvaluationContext {
  id: string;
  width: number;
  height: number;
  zoom: number;
  colorScheme: 'light' | 'dark';
  reducedMotion?: 'reduce' | 'no-preference';
}

export interface UiEvaluationDiagnostic {
  code: `KUI-B${number}`;
  severity: 'error' | 'warning';
  context: string;
  message: string;
  repair?: string;
  selector?: string;
  evidence?: unknown;
}

export interface UiEvaluationReport {
  schemaVersion: 1;
  tool: { name: '@kerfjs/ui/evaluator'; reportVersion: 1 };
  target: { url: string };
  recordedAt: string;
  profileFiles: string[];
  contexts: Array<
    UiEvaluationContext & {
      browser: UiEvaluationBrowser;
      evidence: unknown;
      summary: { errors: number; warnings: number; passed: boolean };
    }
  >;
  diagnostics: UiEvaluationDiagnostic[];
  summary: { errors: number; warnings: number; passed: boolean };
  artifacts: {
    retention: UiEvaluationRetention;
    files: Array<{ path: string; sha256: string }>;
  };
  subjectiveReview: {
    status: 'not-recorded';
    rubric: Array<{ id: string; prompt: string }>;
    ratings: [];
    note: string;
  };
}

export const UI_EVALUATION_SCHEMA_VERSION: 1;
export const UI_EVALUATION_RULES: Readonly<
  Record<`KUI-B${number}`, { severity: 'error' | 'warning'; title: string }>
>;
export const SUBJECTIVE_REVIEW_RUBRIC: ReadonlyArray<{
  id: string;
  prompt: string;
}>;
export function buildEvaluationContexts(
  overrides?: UiEvaluationContext[],
): UiEvaluationContext[];
export function contrastRatio(
  foreground: string | number[],
  background: string | number[],
): number | null;
export function createEvaluationReport(options: {
  target: { url: string };
  profileFiles: string[];
  contexts: UiEvaluationReport['contexts'];
  diagnostics: UiEvaluationDiagnostic[];
  artifacts: UiEvaluationReport['artifacts']['files'];
  recordedAt: string;
  retention: UiEvaluationRetention;
}): UiEvaluationReport;
export function evaluateUi(options: {
  url: string;
  workspaceRoot?: string;
  startDirectory?: string;
  packageProfile?: string;
  outputDirectory?: string;
  reportPath?: string;
  browsers?: UiEvaluationBrowser[];
  contexts?: UiEvaluationContext[];
  timeoutMs?: number;
  settleMs?: number;
  retention?: UiEvaluationRetention;
  recordedAt?: string;
  playwright?: unknown;
  signal?: AbortSignal;
}): Promise<UiEvaluationReport>;
export function formatUiEvaluationText(report: UiEvaluationReport): string;
