import { describe, expect, it } from 'vitest';

import {
  calc,
  em,
  lengthVar,
  pct,
  plus,
  px,
  rem,
  space,
  type UiSpaceName,
} from '../../src/css-values.js';

describe('typed CSS values', () => {
  it('serializes each supported dimension deterministically', () => {
    expect(px(12)).toBe('12px');
    expect(rem(0.25)).toBe('0.25rem');
    expect(em(-1.5)).toBe('-1.5em');
    expect(pct(10)).toBe('10%');
    expect(px(-0)).toBe('0px');
    expect(rem(0.1 + 0.2)).toBe('0.30000000000000004rem');
  });

  it.each([
    ['none', 'var(--kui-space-none)'],
    ['2xs', 'var(--kui-space-2xs)'],
    ['xs', 'var(--kui-space-xs)'],
    ['s', 'var(--kui-space-s)'],
    ['m', 'var(--kui-space-m)'],
    ['l', 'var(--kui-space-l)'],
    ['xl', 'var(--kui-space-xl)'],
  ] satisfies readonly [UiSpaceName, string][])(
    '%s resolves to %s',
    (name, css) => {
      expect(space(name)).toBe(css);
    },
  );

  it('rejects unknown spacing names from untyped JavaScript', () => {
    expect(() => space('xxs' as UiSpaceName)).toThrow(
      new RangeError('space() received unknown spacing name xxs.'),
    );
  });

  it('composes custom properties, sums, and complete calc values', () => {
    expect(lengthVar('--app-gap')).toBe('var(--app-gap)');
    expect(lengthVar('--app-gap', space('xs'))).toBe(
      'var(--app-gap, var(--kui-space-xs))',
    );
    expect(plus(rem(0.25), pct(10), px(1))).toBe('0.25rem + 10% + 1px');
    expect(calc(plus(rem(0.25), pct(10)))).toBe('calc(0.25rem + 10%)');
  });

  it.each([
    ['px', px],
    ['rem', rem],
    ['em', em],
    ['pct', pct],
  ] as const)('%s rejects non-finite numbers', (name, helper) => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, -Infinity])
      expect(() => helper(value), `${name}(${String(value)})`).toThrow(
        new RangeError(`${name}() requires a finite number.`),
      );
  });

  it('rejects malformed custom property names', () => {
    for (const name of [
      '--app gap',
      '--gap;color:red',
      '--gap\ncolor:red',
      '--1gap',
      '--',
    ])
      expect(() => lengthVar(name as `--${string}`), name).toThrow(
        new TypeError(
          'lengthVar() requires an ASCII custom property name such as --app-gap.',
        ),
      );
  });
});
