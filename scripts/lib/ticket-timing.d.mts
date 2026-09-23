export type TicketTimingPhase =
  'active' | 'local_verification' | 'push_hook' | 'ci' | 'publication';

export interface TicketTimingSummary {
  queue_delay_ms: number | null;
  phases: Record<
    TicketTimingPhase,
    { attempts: number; duration_ms: number; failures: number }
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
