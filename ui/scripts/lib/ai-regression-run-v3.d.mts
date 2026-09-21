export function canonicalizeAiRegressionValue(value: unknown): unknown;
export function canonicalAiRegressionJson(value: unknown): string;
export function sha256AiRegression(value: string | Uint8Array): string;
export function normalizeAiRegressionReport(value: unknown): unknown;
export function isSafeAiRegressionArtifactPath(path: string): boolean;
export function readAiRegressionArtifact(
  root: string,
  path: string,
): Promise<string>;
export function createAiRegressionToolOptionsV3(options: {
  compatibility: any;
  url: string;
  signal: AbortSignal;
  recordedAt: string;
}): { doctor: any; evaluator: any };
export function calculateAiRegressionRunV3Metrics(
  results: Array<{ metrics: Record<string, any> }>,
): Record<string, any>;
export function validateAiRegressionMeasuredCohortV3(
  runs: any[],
  corpus: any,
  conditions: any,
): string[];
export function loadAiRegressionV3Context(root: string): Promise<any>;
export function detectAiRegressionEnvironment(
  root: string,
  overrides?: Record<string, any>,
): Promise<any>;
export function validateAiRegressionRunV3(
  run: any,
  conditions: any,
  compatibility: any,
): string[];
export function replayAiRegressionRunV3(
  run: any,
  options: {
    context: any;
    readArtifact(path: string): Promise<string>;
    environment?: any;
  },
): Promise<{
  status: 'invalid' | 'replayed' | 'incompatible-environment';
  errors: string[];
  browserArtifactsCompared: boolean;
  run: any;
}>;
