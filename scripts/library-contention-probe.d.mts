export interface ContentionCell {
  name: string;
  workers: number;
  trace: string;
}
export const contentionCells: ContentionCell[];
export function instrumentDisclosureTiming(source: string): string;
export function contentionArguments(
  cell: ContentionCell,
  browser: string,
  output: string,
): string[];
export interface TestInterval {
  title: string;
  file: string;
  status: string;
  workerIndex: number;
  start: number;
  end: number;
}
export function reportIntervals(report: unknown): TestInterval[];
export function summarizeDisclosure(
  metrics: unknown,
  intervals: TestInterval[],
): Array<{
  competingTests: TestInterval[];
  taskBudgetPassed: boolean;
  visibleBudgetPassed: boolean;
}>;
export function runLibraryContention(
  target: string,
  evidence: string,
  browser: string,
): Promise<{ failedCells: string[] }>;

export function assertMeaningfulOverlap(
  measurements: Array<{ competingTests: TestInterval[] }>,
): void;
export function unavailableAfter(execution: {
  status: number | null;
  signal: string | null;
  error: string | null;
}): boolean;
