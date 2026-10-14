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

/** The root attributes a tinted surface renders. */
export function surfaceTintAttributes(tint: SurfaceTint | undefined): {
  'data-kui-tint': SurfaceTintScheme | undefined;
  'data-kui-tint-accent': '' | undefined;
  /** The Web Awesome scheme class, so its theme re-derives in the scope. */
  className: string;
  /** The inline declaration carrying the color, or `undefined`. */
  style: string | undefined;
} {
  if (tint === undefined)
    return {
      'data-kui-tint': undefined,
      'data-kui-tint-accent': undefined,
      className: '',
      style: undefined,
    };
  return {
    'data-kui-tint': tint.scheme,
    'data-kui-tint-accent': tint.accent === undefined ? undefined : '',
    className: `wa-${tint.scheme}`,
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
