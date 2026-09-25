export interface TimingDistribution {
  samples: number;
  median_ms: number | null;
  p90_ms: number | null;
  max_ms: number | null;
}

export interface TicketTimingAggregate {
  tickets: number;
  backfill_threshold: number;
  backfill_included: boolean;
  backfill: Array<{
    phase: string;
    gate: string;
    started_at: string;
    finished_at: string;
    tickets: number;
  }>;
  excluded_records: number;
  gates: Array<
    TimingDistribution & {
      phase: string;
      gate: string;
      outcomes: {
        passed: number;
        failed: number;
        interrupted: number;
        skipped: number;
      };
      steps: Record<string, TimingDistribution>;
    }
  >;
  phases: Record<
    string,
    Omit<TimingDistribution, 'samples'> & { tickets: number }
  >;
}

export function percentile(sorted: number[], p: number): number | null;
export function intervalIdentity(interval: Record<string, unknown>): string;
export function aggregateTicketTiming(
  tickets: Array<{ slug: string; text: string }>,
  options?: {
    since?: string;
    backfillThreshold?: number;
    includeBackfill?: boolean;
  },
): TicketTimingAggregate;
export function formatAggregate(result: TicketTimingAggregate): string;
export function resolveStoreDirectory(
  cwd: string,
  explicit?: string,
): Promise<string>;
export function readStoreTickets(
  storeDirectory: string,
): Promise<Array<{ slug: string; text: string }>>;
