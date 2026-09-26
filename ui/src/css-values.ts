declare const cssValueBrand: unique symbol;
declare const cssLengthBrand: unique symbol;
declare const cssLengthExpressionBrand: unique symbol;
declare const cssFlexBrand: unique symbol;
declare const cssColorBrand: unique symbol;
declare const cssForegroundColorBrand: unique symbol;

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

/** A complete CSS `flex` shorthand. It is not interchangeable with a length. */
export type CssFlex = CssValue & {
  readonly [cssFlexBrand]: 'CssFlex';
};

/** A complete CSS color value. It is not interchangeable with a length. */
export type CssColor = CssValue & {
  readonly [cssColorBrand]: 'CssColor';
};

/**
 * A complete CSS color meant to paint a foreground: text or an icon drawn over
 * a surface. Mint it with {@link uiColor} and a foreground token name
 * ({@link UiForegroundColorName}) or with {@link foregroundColorVar}. It is a
 * {@link CssColor}, but a plain `CssColor` is not a foreground color: fill,
 * border, and surface tokens (including the `success` / `warning` / `danger` /
 * `pop` fill aliases) are pale backgrounds that leave a foreground nearly
 * invisible.
 */
export type CssForegroundColor = CssColor & {
  readonly [cssForegroundColorBrand]: 'CssForegroundColor';
};

export type CssFlexKeyword = 'none' | 'auto' | 'initial';
export type CssFlexBasis =
  | CssLength
  | 'auto'
  | 'content'
  | 'min-content'
  | 'max-content'
  | 'fit-content';
export type CssSizeKeyword =
  'auto' | 'min-content' | 'max-content' | 'fit-content';
/** A complete width/height value accepted by dimension-valued UI props. */
export type CssSize = CssLength | CssSizeKeyword;

const uiColorNames = [
  'accent',
  'accent-text',
  'border',
  'border-quiet',
  'brand-border-loud',
  'brand-border-normal',
  'brand-border-quiet',
  'brand-fill-loud',
  'brand-fill-normal',
  'brand-fill-quiet',
  'brand-on-fill',
  'brand-on-loud',
  'brand-on-normal',
  'brand-on-quiet',
  'danger',
  'danger-border-loud',
  'danger-border-normal',
  'danger-border-quiet',
  'danger-fill-loud',
  'danger-fill-normal',
  'danger-fill-quiet',
  'danger-on-loud',
  'danger-on-normal',
  'danger-on-quiet',
  'danger-text',
  'neutral-border-loud',
  'neutral-border-normal',
  'neutral-border-quiet',
  'neutral-fill-loud',
  'neutral-fill-normal',
  'neutral-fill-quiet',
  'neutral-on-loud',
  'neutral-on-normal',
  'neutral-on-quiet',
  'pop',
  'pop-border-loud',
  'pop-border-normal',
  'pop-border-quiet',
  'pop-fill-loud',
  'pop-fill-normal',
  'pop-fill-quiet',
  'pop-on-fill',
  'pop-on-loud',
  'pop-on-normal',
  'pop-on-quiet',
  'pop-text',
  'success',
  'success-border-loud',
  'success-border-normal',
  'success-border-quiet',
  'success-fill-loud',
  'success-fill-normal',
  'success-fill-quiet',
  'success-on-fill',
  'success-on-loud',
  'success-on-normal',
  'success-on-quiet',
  'success-text',
  'surface',
  'surface-lowered',
  'surface-raised',
  'text',
  'text-link',
  'text-quiet',
  'warning',
  'warning-border-loud',
  'warning-border-normal',
  'warning-border-quiet',
  'warning-fill-loud',
  'warning-fill-normal',
  'warning-fill-quiet',
  'warning-on-fill',
  'warning-on-loud',
  'warning-on-normal',
  'warning-on-quiet',
  'warning-text',
] as const;

/** Names of the public `--kui-color-*` semantic tokens. */
export type UiColorName = (typeof uiColorNames)[number];

/**
 * The semantic tokens that paint a foreground: the `*-on-*` roles, the text
 * roles, and their `*-text` compatibility aliases. The bare `success`,
 * `warning`, `danger`, `pop`, and `accent` aliases are quiet fills, not
 * foregrounds.
 */
export type UiForegroundColorName = Extract<
  UiColorName,
  | `${string}-on-${string}`
  | `${string}-text`
  | 'text'
  | 'text-quiet'
  | 'text-link'
>;

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

function serializeNonnegativeNumber(value: number, helper: string): string {
  const serialized = serializeNumber(value, helper);
  if (value < 0)
    throw new RangeError(`${helper}() requires nonnegative flex factors.`);
  return serialized;
}

function validateCustomPropertyName(
  name: string,
  helper: string,
  example: string,
): void {
  if (!/^--[A-Za-z_][A-Za-z0-9_-]*$/.test(name))
    throw new TypeError(
      `${helper}() requires an ASCII custom property name such as ${example}.`,
    );
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
  validateCustomPropertyName(name, 'lengthVar', '--app-gap');
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

/** Build a complete, structured CSS flex shorthand. */
export function flex(
  grow: number,
  shrink = 1,
  basis: CssFlexBasis = 'auto',
): CssFlex {
  return `${serializeNonnegativeNumber(grow, 'flex')} ${serializeNonnegativeNumber(shrink, 'flex')} ${basis}` as CssFlex;
}

/**
 * The brand {@link uiColor} returns for a token name: a
 * {@link CssForegroundColor} for a foreground token, otherwise a plain
 * {@link CssColor}.
 */
export type UiColor<Name extends UiColorName> =
  Name extends UiForegroundColorName ? CssForegroundColor : CssColor;

/**
 * Resolve a public Kerf UI semantic color token. A foreground token name
 * (`success-on-quiet`, `text-quiet`, …) returns a {@link CssForegroundColor};
 * any other token returns a plain {@link CssColor}.
 */
export function uiColor<Name extends UiColorName>(name: Name): UiColor<Name> {
  if (!(uiColorNames as readonly string[]).includes(name))
    throw new RangeError(
      `uiColor() received unknown color name ${String(name)}.`,
    );
  return `var(--kui-color-${name})` as UiColor<Name>;
}

/** Reference an application-owned custom property whose contract is a color. */
export function colorVar(name: `--${string}`, fallback?: CssColor): CssColor {
  validateCustomPropertyName(name, 'colorVar', '--app-color');
  return `var(${name}${fallback === undefined ? '' : `, ${fallback}`})` as CssColor;
}

/**
 * Reference an application-owned custom property whose contract is a
 * foreground color (text or an icon over a surface). Use it where a prop
 * accepts only {@link CssForegroundColor}, such as `SelectChoice.color`.
 */
export function foregroundColorVar(
  name: `--${string}`,
  fallback?: CssForegroundColor,
): CssForegroundColor {
  validateCustomPropertyName(name, 'foregroundColorVar', '--app-icon-color');
  return `var(${name}${fallback === undefined ? '' : `, ${fallback}`})` as CssForegroundColor;
}
