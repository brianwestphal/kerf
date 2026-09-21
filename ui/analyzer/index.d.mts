export type UiAnalysisSeverity = 'error' | 'review';

export interface UiAnalysisDiagnostic {
  ruleId: `KUI-L${string}`;
  severity: UiAnalysisSeverity;
  message: string;
  location: { file: string; line: number; column: number };
  evidence?: unknown;
  chain?: unknown;
}

export interface UiAnalysisProfileDiagnostic {
  code: `KUI-P${string}`;
  source?: string;
  path: string;
  message: string;
}

export interface UiAnalysisReport {
  schemaVersion: 1;
  tool: { name: string; version: 1 };
  root: '.';
  files: string[];
  profile: {
    files?: string[];
    diagnostics: UiAnalysisProfileDiagnostic[];
  };
  diagnostics: UiAnalysisDiagnostic[];
  summary: { errors: number; review: number; suppressed: number };
}

export const UI_ANALYSIS_SCHEMA_VERSION: 1;
export const UI_ANALYSIS_RULES: Readonly<
  Record<`KUI-L${string}`, { severity: UiAnalysisSeverity; title: string }>
>;

export function analyzeUiProject(options?: {
  root?: string;
  paths?: string[];
  profile?: string;
  knownRules?: Iterable<string>;
}): Promise<UiAnalysisReport>;

export function formatUiAnalysisText(report: UiAnalysisReport): string;
export function formatUiAnalysisSarif(report: UiAnalysisReport): object;
