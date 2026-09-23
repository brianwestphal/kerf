export interface DemoBundleMeasurement {
  chunks: number;
  totalJavaScriptGzip: number;
  largestJavaScriptGzip: number;
  largestJavaScriptAsset: string;
}

export interface DemoBundleBudget {
  schemaVersion: number;
  largestJavaScriptGzip: number;
  totalJavaScriptGzip: number;
  measuredLargestJavaScriptGzip: number;
  measuredTotalJavaScriptGzip: number;
  history: Array<Record<string, unknown>>;
}

export function measureDemoBundle(
  assetsDir: string,
): Promise<DemoBundleMeasurement>;
export function roundedBudget(bytes: number): number;
export function updateDemoBundleBudget(
  budget: DemoBundleBudget,
  measurement: DemoBundleMeasurement,
  reason: string,
  at: string,
): DemoBundleBudget;
export function gzipDelta(
  measurement: DemoBundleMeasurement,
  budget: DemoBundleBudget,
): { total: number; largest: number };
