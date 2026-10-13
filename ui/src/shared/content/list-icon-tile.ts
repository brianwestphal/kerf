import type { CssColor, CssForegroundColor } from '../styles/css-values.js';

/**
 * Quiet tile palette for a list row's leading icon: the same fill, border, and
 * foreground roles as `ToolbarControlGroup`'s `tileTone`.
 */
export type ListIconTileTone =
  'neutral' | 'brand' | 'success' | 'warning' | 'danger';

/** A list row's leading icon tile filled with an application-chosen color. */
export interface ListIconTileColor {
  /** The tile fill: `uiColor()`, `colorVar()`, or `fillColor()` for an app color such as `#e5484d`. */
  color: CssColor;
  /** The glyph color over the fill. Defaults to black or white, whichever contrasts with `color`. */
  foreground?: CssForegroundColor;
}

/** A filled leading icon tile: a quiet tone preset or an application color. */
export type ListIconTile = ListIconTileTone | ListIconTileColor;

const tileTones: readonly ListIconTileTone[] = [
  'neutral',
  'brand',
  'success',
  'warning',
  'danger',
];
const unsafeColor = /[;{}<>"'\\]|\p{Cc}/u;

function colorDeclaration(value: string, property: string): string {
  const color = value.trim();
  if (!color || unsafeColor.test(color))
    throw new TypeError(`iconTile ${property} requires one CSS color value.`);
  return color;
}

/** Root data attributes and the icon slot's custom properties for a tile. */
export interface ListIconTilePresentation {
  tile: 'tone' | 'color' | undefined;
  tone: ListIconTileTone | undefined;
  style: string | undefined;
}

/** Validate a row's `iconTile` and resolve how its icon slot renders it. */
export function listIconTilePresentation(
  tile: ListIconTile | undefined,
  component: 'list-item' | 'list-action-row',
): ListIconTilePresentation {
  if (tile === undefined)
    return { tile: undefined, tone: undefined, style: undefined };
  if (typeof tile === 'string') {
    if (!tileTones.includes(tile))
      throw new RangeError(`iconTile received unknown tone ${String(tile)}.`);
    return { tile: 'tone', tone: tile, style: undefined };
  }
  const declarations = [
    `--_kui-${component}-icon-tile-fill: ${colorDeclaration(tile.color, 'color')}`,
  ];
  if (tile.foreground !== undefined)
    declarations.push(
      `--_kui-${component}-icon-tile-foreground: ${colorDeclaration(tile.foreground, 'foreground')}`,
    );
  return { tile: 'color', tone: undefined, style: declarations.join('; ') };
}
