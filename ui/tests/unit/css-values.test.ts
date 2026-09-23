import { describe, expect, it } from 'vitest';

import {
  calc,
  colorVar,
  em,
  flex,
  lengthVar,
  pct,
  plus,
  px,
  rem,
  space,
  uiColor,
  type UiColorName,
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

  it('builds property-specific flex and color values', () => {
    expect(flex(1)).toBe('1 1 auto');
    expect(flex(2, 0, rem(20))).toBe('2 0 20rem');
    expect(flex(-0, -0, 'min-content')).toBe('0 0 min-content');
    expect(uiColor('success')).toBe('var(--kui-color-success)');
    expect(colorVar('--app-choice-color')).toBe('var(--app-choice-color)');
    expect(colorVar('--app-choice-color', uiColor('accent'))).toBe(
      'var(--app-choice-color, var(--kui-color-accent))',
    );
  });

  it('rejects invalid flex factors and semantic color names', () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, -Infinity])
      expect(() => flex(value)).toThrow(
        new RangeError('flex() requires a finite number.'),
      );
    expect(() => flex(-1)).toThrow(
      new RangeError('flex() requires nonnegative flex factors.'),
    );
    expect(() => flex(1, -1)).toThrow(
      new RangeError('flex() requires nonnegative flex factors.'),
    );
    expect(() => uiColor('rainbow' as UiColorName)).toThrow(
      new RangeError('uiColor() received unknown color name rainbow.'),
    );
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

    for (const name of [
      '--app color',
      '--color;background:red',
      '--color\nbackground:red',
      '--1color',
      '--',
    ])
      expect(() => colorVar(name as `--${string}`), name).toThrow(
        new TypeError(
          'colorVar() requires an ASCII custom property name such as --app-color.',
        ),
      );
  });
});
