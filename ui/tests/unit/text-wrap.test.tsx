import { describe, expect, it } from 'vitest';

import { Text, type TextProps } from '../../src/text.js';

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
