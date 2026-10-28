export const GENERATOR_MARKER: string;
export const ENTRIES: Record<string, string>;
export function measureEntry(
  source: string,
): Promise<{ gzip: number; text: string }>;
