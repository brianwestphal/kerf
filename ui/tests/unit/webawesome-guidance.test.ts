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

  it('documents the overridable no-arrow floating-surface default', () => {
    const guidance = readFileSync(resolve(import.meta.dirname, '../../docs/webawesome-theme.md'), 'utf8');

    expect(guidance).toContain('Tooltip and Popover use arrowless floating surfaces by default');
    expect(guidance).toContain('--wa-tooltip-arrow-size');
    expect(guidance).toContain('--kui-wa-popover-arrow-size');
    expect(guidance).toContain('--arrow-size');
  });

  it('distinguishes supported ecosystem components from preferred Kerf patterns', () => {
    const guidance = readFileSync(resolve(import.meta.dirname, '../../docs/webawesome-theme.md'), 'utf8');

    expect(guidance).toContain('listing does not make each component the preferred Kerf application pattern');
    expect(guidance).toContain('Consider `wa-popup`');
    expect(guidance).toContain('use Kerf `Select`');
    expect(guidance).toContain('`SegmentedControl` for a small exclusive choice set');
    expect(guidance).toContain('Prefer Kerf `ResizableRegion` over Web Awesome Split Panel');
    expect(guidance).toContain('Avoid Web Awesome Zoomable Frame and Icon');
  });
});
