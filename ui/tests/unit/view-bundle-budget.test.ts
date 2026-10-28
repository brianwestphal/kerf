// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  ENTRIES,
  GENERATOR_MARKER,
  measureEntry,
} from '../../scripts/lib/view-bundle-budget.mjs';

describe('view bundle budget measurement', () => {
  it('keeps the generator out of the interpreter entry', async () => {
    const { text, gzip } = await measureEntry(ENTRIES.interpretView!);
    expect(text).not.toContain(GENERATOR_MARKER);
    expect(text).not.toContain("from'lucide'");
    expect(gzip).toBeGreaterThan(1000);
  });

  it('detects the generator when an entry does pull it in', async () => {
    const { text } = await measureEntry(
      "export { generateView } from './view/generate.mjs';",
    );
    expect(text).toContain(GENERATOR_MARKER);
  });
});
