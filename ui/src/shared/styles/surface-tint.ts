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
}

/** The root attributes a tinted surface renders. */
export function surfaceTintAttributes(tint: SurfaceTint | undefined): {
  'data-kui-tint': SurfaceTintScheme | undefined;
  /** The Web Awesome scheme class, so its theme re-derives in the scope. */
  className: string;
  /** The inline declaration carrying the color, or `undefined`. */
  style: string | undefined;
} {
  if (tint === undefined)
    return { 'data-kui-tint': undefined, className: '', style: undefined };
  return {
    'data-kui-tint': tint.scheme,
    className: `wa-${tint.scheme}`,
    style: `--_kui-tint-color:${tint.color}`,
  };
}

/** Join inline declarations, omitting absent ones. */
export function joinStyles(
  ...declarations: (string | undefined)[]
): string | undefined {
  const present = declarations.filter((value) => value !== undefined);
  return present.length === 0 ? undefined : present.join(';');
}
