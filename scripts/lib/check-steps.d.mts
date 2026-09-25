export interface CheckStepLogEntry {
  name: string;
  duration_ms: number;
  outcome: 'passed' | 'failed' | 'interrupted';
}

export function splitCheckChain(script: string | undefined): string[];
export function stepIdentifiers(segments: string[]): string[];
export function stepTimingFields(log: { steps?: unknown } | null | undefined): {
  steps?: Record<string, number>;
  failed_step?: string;
};
