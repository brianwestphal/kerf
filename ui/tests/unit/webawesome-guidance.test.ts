import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('Web Awesome consumer guidance', () => {
  it('keeps the Markdown trust boundary explicit', () => {
    const guidance = readFileSync(resolve(import.meta.dirname, '../../docs/webawesome-theme.md'), 'utf8');

    expect(guidance).toContain('Do not pass unsanitized user input or any other untrusted Markdown');
    expect(guidance).toContain("Marked's HTML output directly into the component's light DOM");
    expect(guidance).toContain('client-only');
    expect(guidance).toContain('share one mutable Marked instance');
  });
});
