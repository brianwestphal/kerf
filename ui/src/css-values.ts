declare const cssValueBrand: unique symbol;
declare const cssLengthBrand: unique symbol;
declare const cssLengthExpressionBrand: unique symbol;

/**
 * A complete typed CSS value minted by a property-specific Kerf UI builder.
 *
 * This brand is an authoring correctness aid, not a sanitizer or security
 * boundary. Prefer the narrower property grammar, such as {@link CssLength},
 * whenever one is available.
 */
export type CssValue = string & {
  readonly [cssValueBrand]: 'CssValue';
};

/**
 * A complete CSS length-percentage value suitable for dimension-valued UI
 * props. Despite the concise name, percentages are intentionally included.
 */
export type CssLength = CssValue & {
  readonly [cssLengthBrand]: 'CssLength';
};

/**
 * An incomplete arithmetic expression. Wrap it with {@link calc} before
 * passing it to a prop that accepts {@link CssLength}.
 */
export type CssLengthExpression = string & {
  readonly [cssLengthExpressionBrand]: 'CssLengthExpression';
};

/** Kerf UI's complete spacing-token vocabulary. `s` and `xl` are exceptions. */
export type UiSpaceName = 'none' | '2xs' | 'xs' | 's' | 'm' | 'l' | 'xl';

const spaceVariables = {
  none: '--kui-space-none',
  '2xs': '--kui-space-2xs',
  xs: '--kui-space-xs',
  s: '--kui-space-s',
  m: '--kui-space-m',
  l: '--kui-space-l',
  xl: '--kui-space-xl',
} as const satisfies Record<UiSpaceName, string>;

function serializeNumber(value: number, helper: string): string {
  if (!Number.isFinite(value))
    throw new RangeError(`${helper}() requires a finite number.`);
  return String(Object.is(value, -0) ? 0 : value);
}

function dimension(value: number, unit: string, helper: string): CssLength {
  return `${serializeNumber(value, helper)}${unit}` as CssLength;
}

/** Create a complete pixel length. */
export function px(value: number): CssLength {
  return dimension(value, 'px', 'px');
}

/** Create a complete root-font-relative length. */
export function rem(value: number): CssLength {
  return dimension(value, 'rem', 'rem');
}

/** Create a complete current-font-relative length. */
export function em(value: number): CssLength {
  return dimension(value, 'em', 'em');
}

/** Create a complete percentage length. */
export function pct(value: number): CssLength {
  return dimension(value, '%', 'pct');
}

/** Resolve a Kerf UI spacing step to its public custom property. */
export function space(name: UiSpaceName): CssLength {
  const variable = spaceVariables[name];
  if (variable === undefined)
    throw new RangeError(
      `space() received unknown spacing name ${String(name)}.`,
    );
  return `var(${variable})` as CssLength;
}

/**
 * Reference an application-owned custom property whose contract is a CSS
 * length-percentage. The deliberately narrow name grammar keeps this helper
 * from becoming an arbitrary CSS-string constructor.
 */
export function lengthVar(
  name: `--${string}`,
  fallback?: CssLength,
): CssLength {
  if (!/^--[A-Za-z_][A-Za-z0-9_-]*$/.test(name))
    throw new TypeError(
      'lengthVar() requires an ASCII custom property name such as --app-gap.',
    );
  return `var(${name}${fallback === undefined ? '' : `, ${fallback}`})` as CssLength;
}

/** Combine two or more complete lengths into a non-standalone sum. */
export function plus(
  first: CssLength,
  second: CssLength,
  ...rest: readonly CssLength[]
): CssLengthExpression {
  return [first, second, ...rest].join(' + ') as CssLengthExpression;
}

/** Turn a typed length expression into a complete CSS `calc()` value. */
export function calc(expression: CssLengthExpression): CssLength {
  return `calc(${expression})` as CssLength;
}
