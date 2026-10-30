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
        children: 'Needed By',
        className: 'app-field',
      }),
    );
    expect(html).toContain('<div id="needed-by-label"');
    expect(html).toContain('class="kui-text__field-label app-field"');
    expect(html).toContain('data-component="field-label"');
    expect(html).toContain('>Needed By</div>');
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

describe('Text truncation position', () => {
  const head = (html: string) =>
    /kui-text__truncate-head">([^<]*)</.exec(html)?.[1];
  const tail = (html: string) =>
    /kui-text__truncate-tail">([^<]*)</.exec(html)?.[1];

  it('keeps end truncation unchanged and untitled', () => {
    for (const truncate of [undefined, 'end'] as const) {
      const html = String(
        Text({ children: 'Vendor', wrap: 'truncate', truncate }),
      );
      expect(html).toContain('data-wrap="truncate"');
      expect(html).not.toContain('data-truncate');
      expect(html).not.toContain('title=');
      expect(html).toContain('>Vendor</p>');
    }
  });

  it('keeps the tail in an isolated left-to-right run for start truncation', () => {
    const html = String(
      Text({
        children: 'feature/kf-123-long-branch',
        wrap: 'truncate',
        truncate: 'start',
        variant: 'span',
      }),
    );
    expect(html).toContain('data-truncate="start"');
    expect(html).toContain('title="feature/kf-123-long-branch"');
    expect(html).toContain(
      '<span class="kui-text__truncate-start"><span dir="ltr">feature/kf-123-long-branch</span></span>',
    );
  });

  it('splits middle truncation at the last path segment by default', () => {
    const cases: [string, string, string][] = [
      ['src/components/text/text.tsx', 'src/components/text', '/text.tsx'],
      ['C:\\repo\\src\\main.ts', 'C:\\repo\\src', '\\main.ts'],
      ['src/lib/', 'src', '/lib/'],
      ['a-very-long-identifier-value', 'a-very-long-identi', 'fier-value'],
      ['short', 'short', ''],
      ['/root', '/root', ''],
    ];
    for (const [text, expectedHead, expectedTail] of cases) {
      const html = String(
        Text({ children: text, wrap: 'truncate', truncate: 'middle' }),
      );
      expect(html).toContain('data-truncate="middle"');
      expect(head(html)).toBe(expectedHead);
      expect(tail(html) ?? '').toBe(expectedTail);
      // The DOM keeps the whole value in order for assistive technology.
      expect((head(html) ?? '') + (tail(html) ?? '')).toBe(text);
    }
  });

  it('keeps an explicit character suffix, numbers, and an app title', () => {
    const html = String(
      Text({
        children: 1234567890,
        wrap: 'truncate',
        truncate: 'middle',
        truncateKeep: 4,
        title: 'Order number',
      }),
    );
    expect(head(html)).toBe('123456');
    expect(tail(html)).toBe('7890');
    expect(html).toContain('title="Order number"');
    expect(html).not.toContain('title="1234567890"');
  });

  it('rejects invalid truncation combinations for JavaScript callers', () => {
    const bad = (props: Record<string, unknown>) => () =>
      Text({ children: 'a/b', ...props } as unknown as TextProps);
    expect(bad({ truncate: 'middle' })).toThrow(RangeError);
    expect(bad({ wrap: 'nowrap', truncate: 'start' })).toThrow(RangeError);
    expect(bad({ wrap: 'truncate', truncate: 'center' })).toThrow(RangeError);
    expect(bad({ wrap: 'truncate', truncateKeep: 3 })).toThrow(RangeError);
    for (const truncateKeep of [0, -2, 1.5, 'last'])
      expect(
        bad({ wrap: 'truncate', truncate: 'middle', truncateKeep }),
      ).toThrow(RangeError);
    expect(() =>
      Text({
        children: ['a', 'b'],
        wrap: 'truncate',
        truncate: 'middle',
      }),
    ).toThrow(TypeError);
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

describe('Text size', () => {
  it('renders a medium heading at the body size with heading semantics', () => {
    const html = String(
      Text({ variant: 'h3', size: 'medium', children: 'Batch 1' }),
    );
    expect(html).toContain('<h3');
    expect(html).toContain('data-size="medium"');
  });
});

describe('Text weight (KF-6A9GJ2)', () => {
  const html = (props: Partial<TextProps>) =>
    String(Text({ children: 'Release Notes', ...props } as TextProps));

  it('wraps strong text in <strong> and leaves regular text bare', () => {
    expect(html({ variant: 'span', weight: 'strong' })).toMatch(
      /<span[^>]*><strong>Release Notes<\/strong><\/span>/,
    );
    expect(html({ variant: 'span' })).not.toContain('<strong>');
    expect(html({ variant: 'span', weight: 'regular' })).not.toContain(
      '<strong>',
    );
  });

  it('keeps each truncation and line cap structure around the strong text', () => {
    expect(html({ wrap: 'normal', maxLines: 2, weight: 'strong' })).toContain(
      '<span class="kui-text__clamp" style="--_kui-text-max-lines:2"><strong>Release Notes</strong></span>',
    );
    expect(
      html({ wrap: 'truncate', truncate: 'start', weight: 'strong' }),
    ).toContain('<span dir="ltr"><strong>Release Notes</strong></span>');
    const middle = html({
      children: 'src/lib/release-notes.md',
      wrap: 'truncate',
      truncate: 'middle',
      weight: 'strong',
    });
    expect(middle).toContain(
      '<span class="kui-text__truncate-head"><strong>src/lib</strong></span>',
    );
    expect(middle).toContain(
      '<span class="kui-text__truncate-tail"><strong>/release-notes.md</strong></span>',
    );
  });
});
