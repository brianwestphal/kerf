import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

describe('Web Awesome consumer guidance', () => {
  it('does not advertise the removed aggregate theme route', () => {
    const guidance = readFileSync(
      resolve(import.meta.dirname, '../../docs/webawesome-theme.md'),
      'utf8',
    );

    expect(guidance).toMatch(/There is no aggregate theme\s+route/);
    expect(guidance).not.toContain(
      'The aggregate theme route remains a broad visual-regression surface',
    );
  });

  it('keeps the Markdown trust boundary explicit', () => {
    const guidance = readFileSync(
      resolve(import.meta.dirname, '../../docs/webawesome-theme.md'),
      'utf8',
    );

    expect(guidance).toContain(
      'Do not pass unsanitized user input or any other untrusted Markdown',
    );
    expect(guidance).toContain(
      "Marked's HTML output directly into the component's light DOM",
    );
    expect(guidance).toContain('client-only');
    expect(guidance).toContain('share one mutable Marked instance');
  });

  it('documents the overridable no-arrow floating-surface default', () => {
    const guidance = readFileSync(
      resolve(import.meta.dirname, '../../docs/webawesome-theme.md'),
      'utf8',
    );

    expect(guidance).toContain(
      'Tooltip and Popover use arrowless floating surfaces by default',
    );
    expect(guidance).toContain('--wa-tooltip-arrow-size');
    expect(guidance).toContain('--kui-wa-popover-arrow-size');
    expect(guidance).toContain('--arrow-size');
  });

  it('records the audited non-field inset tiers and intentional exceptions', () => {
    const css = readFileSync(
      resolve(import.meta.dirname, '../../src/webawesome.css'),
      'utf8',
    );
    const guidance = readFileSync(
      resolve(import.meta.dirname, '../../docs/webawesome-theme.md'),
      'utf8',
    );

    expect(guidance).toContain('--kui-wa-control-inset');
    expect(guidance).toContain('--kui-wa-surface-inset');
    expect(guidance).toContain('--kui-wa-surface-margin');
    expect(guidance).toContain('--kui-wa-container-inset');
    expect(guidance).toContain(
      'Accordion, Card, Details, Callout, and Include',
    );
    expect(guidance).toContain('Badge remains intentionally compact');
    expect(guidance).toContain('Breadcrumb');
    expect(guidance).toContain('bordered or filled');
    expect(guidance).toMatch(/delegates item\s+chrome/);
    expect(guidance).toContain('no `wa-menu-item`');
    expect(css).toContain('wa-details[appearance="plain"]::part(header)');
    expect(css).toContain('wa-accordion[appearance="plain"]');
    expect(css).toContain('padding-inline: var(--kui-wa-container-inset)');
    expect(guidance).toContain(
      'Plain Accordion and Details remove inline padding',
    );
  });

  it('keeps plain disclosures flush and framed disclosure bodies compact', () => {
    const css = readFileSync(
      resolve(import.meta.dirname, '../../src/webawesome.css'),
      'utf8',
    );
    const rules = postcss.parse(css).nodes;
    const declarations = (
      selectorIncludes: readonly string[],
      selectorExcludes: readonly string[] = [],
    ) => {
      const matches: string[] = [];
      postcss.parse(css).walkRules((rule) => {
        if (
          selectorIncludes.every((selector) =>
            rule.selector.includes(selector),
          ) &&
          selectorExcludes.every(
            (selector) => !rule.selector.includes(selector),
          )
        ) {
          rule.walkDecls('padding-inline', (declaration) => {
            matches.push(declaration.value);
          });
        }
      });
      return matches;
    };

    expect(rules.length).toBeGreaterThan(0);
    expect(
      declarations([
        'wa-details[appearance="plain"]::part(header)',
        'wa-accordion[appearance="plain"] > wa-accordion-item::part(content)',
      ]),
    ).toEqual(['0']);
    expect(
      declarations(
        [
          'wa-details:is([appearance="outlined"], [appearance="sunken"])::part(header)',
          'wa-accordion-item::part(button)',
        ],
        ['wa-accordion-item::part(content)'],
      ),
    ).toEqual(['var(--kui-wa-container-inset)']);
    expect(
      declarations([
        'wa-details:is([appearance="outlined"], [appearance="sunken"])::part(content)',
        'wa-accordion-item::part(content)',
      ]),
    ).toEqual(['var(--kui-wa-surface-inset)']);
  });

  it('defines and documents the shared sunken surface appearance', () => {
    const css = readFileSync(
      resolve(import.meta.dirname, '../../src/webawesome.css'),
      'utf8',
    );
    const guidance = readFileSync(
      resolve(import.meta.dirname, '../../docs/webawesome-theme.md'),
      'utf8',
    );

    expect(css).toContain(':is(wa-accordion, wa-card)[appearance="sunken"]');
    expect(css).toContain('wa-details[appearance="sunken"]::part(details)');
    expect(css).toContain('--kui-wa-sunken-background');
    expect(css).toContain('--kui-wa-sunken-radius');
    expect(css).toContain('var(--kui-color-surface-lowered');
    expect(guidance).toContain(
      '`appearance="sunken"` is a Kerf theme extension for Accordion, Card, and',
    );
    expect(guidance).toContain('--kui-wa-sunken-background');
    expect(guidance).toContain('--kui-wa-sunken-radius');
  });

  it('keeps filled badges on a documented contrast-safe semantic pair', () => {
    const css = readFileSync(
      resolve(import.meta.dirname, '../../src/webawesome.css'),
      'utf8',
    );
    const guidance = readFileSync(
      resolve(import.meta.dirname, '../../docs/webawesome-theme.md'),
      'utf8',
    );

    expect(css).toContain('[appearance="filled"]');
    expect(css).toContain('[appearance="filled-outlined"]');
    expect(css).toContain('wa-badge[appearance="accent"]');
    expect(css).toContain('--kui-wa-badge-filled-background');
    expect(css).toContain('--kui-wa-badge-filled-foreground');
    expect(css).toContain('--kui-wa-badge-accent-foreground');
    expect(css).toContain('var(--wa-color-fill-quiet)');
    expect(css).toContain('var(--wa-color-text-normal)');
    expect(guidance).toContain('meets WCAG AA');
    expect(guidance).toContain('--kui-wa-badge-filled-background');
    expect(guidance).toContain('--kui-wa-badge-filled-foreground');
    expect(guidance).toContain('--kui-wa-badge-accent-foreground');
  });

  it('assigns dialog body and footer to their distinct inset tiers', () => {
    const css = readFileSync(
      resolve(import.meta.dirname, '../../src/webawesome.css'),
      'utf8',
    );
    const guidance = readFileSync(
      resolve(import.meta.dirname, '../../docs/webawesome-theme.md'),
      'utf8',
    );

    expect(css).toMatch(
      /wa-dialog::part\(body\)\s*{\s*padding: var\(--kui-wa-surface-inset\)/,
    );
    expect(css).toMatch(
      /wa-dialog::part\(footer\)\s*{\s*padding: var\(--kui-wa-container-inset\)/,
    );
    expect(guidance).toMatch(/Dialog body uses\s+the 8px surface inset/);
    expect(guidance).toMatch(/footer uses the 16px container inset/);
  });

  it('hides dialog header actions through the directly exported shadow part', () => {
    const css = readFileSync(
      resolve(import.meta.dirname, '../../src/webawesome.css'),
      'utf8',
    );
    const guidance = readFileSync(
      resolve(import.meta.dirname, '../../docs/webawesome-theme.md'),
      'utf8',
    );

    expect(css).toMatch(
      /wa-dialog\.hide-actions::part\(header-actions\)\s*{\s*display: none/,
    );
    expect(css).not.toContain(
      '::part(dialog)::part(header)::part(header-actions)',
    );
    expect(guidance).toContain('class="hide-actions"');
    expect(guidance).toContain('directly exported `header-actions` part');
  });

  it('keeps unbordered group and color-picker control regions on the shared inline inset', () => {
    const css = readFileSync(
      resolve(import.meta.dirname, '../../src/webawesome.css'),
      'utf8',
    );
    const guidance = readFileSync(
      resolve(import.meta.dirname, '../../docs/webawesome-theme.md'),
      'utf8',
    );

    expect(css).toMatch(
      /:is\(\s*wa-checkbox-group,\s*wa-color-picker,\s*wa-radio-group\s*\)::part\(\s*form-control-input\s*\)/,
    );
    expect(css).toContain(
      'margin-inline: var(--kui-layout-inline-margin, remify(8px))',
    );
    expect(guidance).toMatch(
      /Checkbox Group and Radio Group option regions receive the shared 8px inline\s+outer inset/,
    );
    expect(guidance).toMatch(
      /Color Picker trigger receives the same 8px inline outer inset/,
    );
  });

  it('keeps the complete Slider region on the shared logical inline inset', () => {
    const css = readFileSync(
      resolve(import.meta.dirname, '../../src/webawesome.css'),
      'utf8',
    );
    const guidance = readFileSync(
      resolve(import.meta.dirname, '../../docs/webawesome-theme.md'),
      'utf8',
    );

    expect(css).toContain('wa-slider::part(slider)');
    expect(guidance).toMatch(
      /Slider's complete interactive region receives the\s+shared 8px logical inline outer inset/,
    );
  });

  it('aligns Known Date captions and bordered text-field hints with field values', () => {
    const css = readFileSync(
      resolve(import.meta.dirname, '../../src/webawesome.css'),
      'utf8',
    );
    const guidance = readFileSync(
      resolve(import.meta.dirname, '../../docs/webawesome-theme.md'),
      'utf8',
    );

    expect(css).toContain('wa-known-date::part(field-label)');
    expect(css).toMatch(
      /wa-input,[\s\S]*wa-known-date,[\s\S]*wa-number-input,[\s\S]*wa-otp-input,[\s\S]*wa-select,[\s\S]*wa-textarea,[\s\S]*wa-time-input[\s\S]*::part\(hint\)/,
    );
    expect(css).toContain('var(--wa-form-control-border-width) +');
    expect(guidance).toMatch(
      /Known Date's field captions and bordered text-like field hints use the same 9px\s+inline inset/,
    );
  });

  it('styles OTP label and hint like bordered text-field secondary text', () => {
    const css = readFileSync(
      resolve(import.meta.dirname, '../../src/webawesome.css'),
      'utf8',
    );
    const guidance = readFileSync(
      resolve(import.meta.dirname, '../../docs/webawesome-theme.md'),
      'utf8',
    );

    expect(css).toContain('wa-otp-input::part(label)');
    expect(guidance).toMatch(
      /OTP Input\s+exposes `label` instead of `form-control-label`; the theme gives it the same\s+uppercase 12px\/650 treatment/,
    );
    expect(guidance).toMatch(
      /OTP Input's label and hint both use the 9px field-text inset/,
    );
  });

  it('distinguishes supported ecosystem components from preferred Kerf patterns', () => {
    const guidance = readFileSync(
      resolve(import.meta.dirname, '../../docs/webawesome-theme.md'),
      'utf8',
    );

    expect(guidance).toContain(
      'listing does not make each component the preferred Kerf application pattern',
    );
    expect(guidance).toContain('Consider `wa-popup`');
    expect(guidance).toContain('use Kerf `Select`');
    expect(guidance).toContain(
      '`SegmentedControl` for a small exclusive choice set',
    );
    expect(guidance).toContain(
      'Prefer Kerf `ResizableRegion` over Web Awesome Split Panel',
    );
    expect(guidance).toContain('Avoid Web Awesome Zoomable Frame and Icon');
  });
});
