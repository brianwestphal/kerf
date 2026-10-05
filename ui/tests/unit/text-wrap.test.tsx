import { describe, expect, it } from 'vitest';

import { FieldLabel } from '../../src/components/forms/field-label/field-label.js';
import {
  FieldLabel as TextFieldLabel,
  Text,
  type TextProps,
} from '../../src/components/typography/text/text.js';

describe('FieldLabel', () => {
  it('remains available through the text module', () => {
    expect(TextFieldLabel).toBe(FieldLabel);
  });
  it('renders a plain heading that can name a read-only preview group', () => {
    const html = String(
      FieldLabel({
        id: 'needed-by-label',
        children: 'Needed by',
        className: 'app-field',
      }),
    );
    expect(html).toContain('<div id="needed-by-label"');
    expect(html).toContain('class="kui-text__field-label app-field"');
    expect(html).toContain('data-component="field-label"');
    expect(html).toContain('>Needed by</div>');
    expect(html).not.toContain('<label');
  });
});

describe('Text wrapping', () => {
  it('keeps native attributes and defaults to ordinary wrapping', () => {
    const html = String(Text({ children: 'Summary', style: 'color:red' }));
    expect(html).toContain('style="color:red"');
    expect(html).not.toContain('data-wrap');
    expect(html).not.toContain('kui-text__clamp');
  });

  it('projects the four wrap policies and a capped wrapping span', () => {
    expect(String(Text({ children: 'ABC', wrap: 'normal' }))).not.toContain(
      'data-wrap',
    );
    for (const wrap of ['anywhere', 'nowrap', 'truncate'] as const)
      expect(String(Text({ children: 'ABC', wrap }))).toContain(
        `data-wrap="${wrap}"`,
      );
    const capped = String(
      Text({ children: 'Long summary', wrap: 'anywhere', maxLines: 2 }),
    );
    expect(capped).toContain('data-max-lines="2"');
    expect(capped).toContain(
      '<span class="kui-text__clamp" style="--_kui-text-max-lines:2">Long summary</span>',
    );
  });

  it('rejects invalid caps and combinations for JavaScript callers', () => {
    for (const maxLines of [0, -1, 1.5, Number.NaN])
      expect(() => Text({ children: 'Copy', maxLines })).toThrow(RangeError);
    expect(() =>
      Text({
        children: 'Copy',
        wrap: 'truncate',
        maxLines: 2,
      } as unknown as TextProps),
    ).toThrow(RangeError);
  });
});

describe('Text control margins', () => {
  it('omits an empty margin selection and projects every canonical side combination', () => {
    for (const controlMargins of [undefined, ''] as const)
      expect(String(Text({ children: 'Copy', controlMargins }))).not.toContain(
        'data-control-margins',
      );
    for (const controlMargins of [
      't',
      'r',
      'b',
      'l',
      'tr',
      'tb',
      'tl',
      'rb',
      'rl',
      'bl',
      'trb',
      'trl',
      'tbl',
      'rbl',
      'trbl',
    ] as const) {
      const html = String(Text({ children: 'Copy', controlMargins }));
      expect(html).toContain(`data-control-margins="${controlMargins}"`);
      expect(html).not.toContain('controlMargins=');
    }
  });
  it('composes margins with flush, inline, native attributes, and wrapping', () => {
    const html = String(
      Text({
        variant: 'span',
        children: 'Copy',
        controlMargins: 'rl',
        flush: true,
        wrap: 'anywhere',
        maxLines: 2,
        id: 'copy',
      }),
    );
    expect(html).toContain('<span id="copy"');
    expect(html).toContain('data-flush="true"');
    expect(html).toContain('data-control-margins="rl"');
    expect(html).toContain('data-max-lines="2"');
  });
});
