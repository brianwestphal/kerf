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

  it('records the audited non-field inset tiers and intentional exceptions', () => {
    const guidance = readFileSync(resolve(import.meta.dirname, '../../docs/webawesome-theme.md'), 'utf8');

    expect(guidance).toContain('--kui-wa-control-inset');
    expect(guidance).toContain('--kui-wa-surface-inset');
    expect(guidance).toContain('--kui-wa-surface-margin');
    expect(guidance).toContain('--kui-wa-container-inset');
    expect(guidance).toContain('Accordion, Card, Details, Callout, and Include');
    expect(guidance).toContain('Badge remains intentionally compact');
    expect(guidance).toContain('Breadcrumb');
    expect(guidance).toContain('bordered or filled');
    expect(guidance).toContain('delegates item chrome');
    expect(guidance).toContain("no `wa-menu-item`");
  });

  it('keeps unbordered group and color-picker control regions on the shared inline inset', () => {
    const css = readFileSync(resolve(import.meta.dirname, '../../src/webawesome.css'), 'utf8');
    const guidance = readFileSync(resolve(import.meta.dirname, '../../docs/webawesome-theme.md'), 'utf8');

    expect(css).toMatch(/:is\(\s*wa-checkbox-group,\s*wa-color-picker,\s*wa-radio-group\s*\)::part\(\s*form-control-input\s*\)/);
    expect(css).toContain('margin-inline: var(--kui-layout-inline-margin, remify(8px))');
    expect(guidance).toMatch(/Checkbox Group and Radio Group option regions receive the shared 8px inline\s+outer inset/);
    expect(guidance).toMatch(/Color Picker trigger receives the same 8px inline outer inset/);
  });

  it('keeps the complete Slider region on the shared logical inline inset', () => {
    const css = readFileSync(resolve(import.meta.dirname, '../../src/webawesome.css'), 'utf8');
    const guidance = readFileSync(resolve(import.meta.dirname, '../../docs/webawesome-theme.md'), 'utf8');

    expect(css).toContain('wa-slider::part(slider)');
    expect(guidance).toMatch(/Slider's complete interactive region receives the\s+shared 8px logical inline outer inset/);
  });

  it('aligns Known Date captions and bordered text-field hints with field values', () => {
    const css = readFileSync(resolve(import.meta.dirname, '../../src/webawesome.css'), 'utf8');
    const guidance = readFileSync(resolve(import.meta.dirname, '../../docs/webawesome-theme.md'), 'utf8');

    expect(css).toContain('wa-known-date::part(field-label)');
    expect(css).toMatch(/wa-input,[\s\S]*wa-known-date,[\s\S]*wa-number-input,[\s\S]*wa-otp-input,[\s\S]*wa-select,[\s\S]*wa-textarea,[\s\S]*wa-time-input[\s\S]*::part\(hint\)/);
    expect(css).toContain('var(--wa-form-control-border-width) +');
    expect(guidance).toMatch(/Known Date's field captions and bordered text-like field hints use the same 9px\s+inline inset/);
  });

  it('styles OTP label and hint like bordered text-field secondary text', () => {
    const css = readFileSync(resolve(import.meta.dirname, '../../src/webawesome.css'), 'utf8');
    const guidance = readFileSync(resolve(import.meta.dirname, '../../docs/webawesome-theme.md'), 'utf8');

    expect(css).toContain('wa-otp-input::part(label)');
    expect(guidance).toMatch(/OTP Input\s+exposes `label` instead of `form-control-label`; the theme gives it the same\s+uppercase 12px\/650 treatment/);
    expect(guidance).toMatch(/OTP Input's label and hint both use the 9px field-text inset/);
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
