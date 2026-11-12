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
export function measuringNodeMismatch(
  nodeVersion: string,
  pinnedVersion: string,
): string | null;
export const ZLIB_DRIFT_BYTES: number;
export function measureOnPinnedNode(
  assetsDir: string,
  pinnedVersion: string,
  run?: (
    command: string,
    args: string[],
    options: { encoding: 'utf8'; timeout: number },
  ) => { status: number | null; stdout: string | Buffer },
): DemoBundleMeasurement | null;
export function zlibDriftRisk(
  measurement: DemoBundleMeasurement,
  budget: DemoBundleBudget,
  nodeVersion: string,
): string | null;
