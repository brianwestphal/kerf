export type TicketTimingPhase =
  'active' | 'local_verification' | 'push_hook' | 'ci' | 'publication';

export interface TicketTimingSummary {
  queue_delay_ms: number | null;
  phases: Record<
    TicketTimingPhase,
    { attempts: number; duration_ms: number; failures: number; skipped: number }
  >;
  failure_categories: Record<string, number>;
  in_progress: Array<Record<string, unknown>>;
  unmatched_finishes: string[];
}

export const TIMING_PHASES: TicketTimingPhase[];
export function assertTicket(value: string): string;
export function assertPhase(value: string): TicketTimingPhase;
export function assertIdentifier(value: string, label?: string): string;
export function isoTime(value: string, label?: string): string;
export function formatTimingRecord(record: Record<string, unknown>): string;
export function parseTimingRecords(text: string): Array<Record<string, any>>;
export function ticketSlugsFromSubjects(subjects: string[]): string[];
export function summarizeTicketTiming(text: string): TicketTimingSummary;
export const MAX_COHERENT_TICKETS: number;
export function ticketIntervals(records: Array<Record<string, any>>): {
  intervals: Array<Record<string, any> & { duration_ms: number }>;
  open: Array<Record<string, any>>;
  unmatchedFinishes: string[];
};
