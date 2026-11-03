import type { CssColor } from './css-values.js';

/** The color scheme an app declares for a {@link SurfaceTint}'s color. */
export type SurfaceTintScheme = 'light' | 'dark';

/**
 * A scoped tint for a layout surface: the app's color (usually sampled from
 * artwork it already knows) and the scheme that color belongs to. Kerf does no
 * color detection; `scheme` says whether the color reads as a light or a dark
 * surface. Inside the scope the surface, raised surface, text, quiet text, and
 * everything built on them (quiet fills, separators' backdrop, the chrome
 * material) re-derive from the color, with lightness clamped so text keeps
 * WCAG AA over any color.
 */
export interface SurfaceTint {
  color: CssColor;
  scheme: SurfaceTintScheme;
  /**
   * An optional accent (usually the artwork's most vivid color). The scope's
   * brand ramp re-derives from it: loud fills and their text, brand text and
   * links, text on brand fills, and the focus ring, each clamped to keep AA.
   */
  accent?: CssColor;
}

/**
 * The root attributes a tinted or scheme-scoped surface renders. A `tint`
 * implies its own scheme; `scheme` alone scopes the light or dark palette
 * without a tint color. KF-E44H0A: Kerf owns the scope (`data-kui-scheme`
 * and the `kui-<scheme>` class foundation.css styles), so it works without
 * the Web Awesome bridge.
 */
export function surfaceTintAttributes(
  tint: SurfaceTint | undefined,
  scheme?: SurfaceTintScheme,
): {
  'data-kui-tint': SurfaceTintScheme | undefined;
  'data-kui-tint-accent': '' | undefined;
  'data-kui-scheme': SurfaceTintScheme | undefined;
  /** The `kui-<scheme>` scope class, or empty. */
  className: string;
  /** The inline declaration carrying the color, or `undefined`. */
  style: string | undefined;
} {
  if (tint !== undefined && scheme !== undefined && tint.scheme !== scheme)
    throw new Error(
      `A surface's scheme ("${scheme}") disagrees with its tint's scheme ("${tint.scheme}"); a tint already sets the scheme, so pass one or the other.`,
    );
  const resolved = tint?.scheme ?? scheme;
  const scope = {
    'data-kui-scheme': resolved,
    className: resolved === undefined ? '' : `kui-${resolved}`,
  };
  if (tint === undefined)
    return {
      'data-kui-tint': undefined,
      'data-kui-tint-accent': undefined,
      ...scope,
      style: undefined,
    };
  return {
    'data-kui-tint': tint.scheme,
    'data-kui-tint-accent': tint.accent === undefined ? undefined : '',
    ...scope,
    style:
      tint.accent === undefined
        ? `--_kui-tint-color:${tint.color}`
        : `--_kui-tint-color:${tint.color};--_kui-tint-accent:${tint.accent}`,
  };
}

/** Join inline declarations, omitting absent ones. */
export function joinStyles(
  ...declarations: (string | undefined)[]
): string | undefined {
  const present = declarations.filter((value) => value !== undefined);
  return present.length === 0 ? undefined : present.join(';');
}
