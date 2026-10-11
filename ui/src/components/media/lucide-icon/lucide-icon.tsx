import { raw, type SafeHtml } from 'kerfjs';
import { jsx } from 'kerfjs/jsx-runtime';
import type { IconNode } from 'lucide';

import type { CssForegroundColor } from '../../../shared/styles/css-values.js';
import { remify } from '../../../shared/styles/css-values.js';

export type LucideNode = IconNode;
export type LucideIconSize = 'xs' | 's' | 'm' | 'l' | 'xl' | number;

const lucideIconSizePixels = {
  xs: 12,
  s: 16,
  m: 20,
  l: 24,
  xl: 32,
} as const satisfies Record<Exclude<LucideIconSize, number>, number>;

export interface LucideIconProps {
  icon: LucideNode;
  name: string;
  /** Outline by default; solid fills compatible glyphs with the current text color. */
  appearance?: 'outline' | 'solid';
  className?: string;
  /** Foreground color; omit to inherit the surrounding text color. */
  color?: CssForegroundColor;
  /** Flow with surrounding text instead of occupying a block. */
  inline?: boolean;
  label?: string;
  /** Named icon scale or positive pixel size, converted to rem. Omit for 1em. */
  size?: LucideIconSize;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/**
 * Each icon node's rendered child markup. Lucide icon nodes are module-level
 * constants, so a list that re-renders the same glyph in every row serializes
 * (validates, screens, and escapes) its path data once instead of per render.
 * Keyed by node identity and held weakly, so an app-built node is collected
 * with it; treat a node as immutable once rendered. A node carrying anything
 * but string or number attribute values (outside the `IconNode` type) is
 * rendered fresh every time.
 */
const childMarkup = new WeakMap<LucideNode, SafeHtml>();

function renderChildren(icon: LucideNode): SafeHtml {
  const cached = childMarkup.get(icon);
  if (cached) return cached;
  let cacheable = true;
  const markup = raw(
    icon
      .map(([tag, attrs]) => {
        for (const value of Object.values(attrs))
          if (typeof value !== 'string' && typeof value !== 'number')
            cacheable = false;
        return String(jsx(tag, attrs));
      })
      .join(''),
  );
  if (cacheable) childMarkup.set(icon, markup);
  return markup;
}

/** Render a Lucide-compatible icon node without copying icon SVG strings. */
export function LucideIcon({
  icon,
  name,
  appearance = 'outline',
  className,
  color,
  inline = false,
  label,
  size,
  slot,
}: LucideIconProps) {
  if (typeof size === 'number' && (!Number.isFinite(size) || size <= 0))
    throw new RangeError(
      'LucideIcon size must be a positive finite pixel value',
    );
  if (typeof size === 'string' && !Object.hasOwn(lucideIconSizePixels, size))
    throw new RangeError('LucideIcon size must use a named icon step');
  const pixels =
    typeof size === 'number' ? size : size && lucideIconSizePixels[size];
  const slotAttribute = { slot };
  return (
    <svg
      {...slotAttribute}
      class={className}
      data-lucide={name}
      data-inline={inline ? 'true' : undefined}
      data-size={size === undefined ? undefined : String(size)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      viewBox="0 0 24 24"
      fill={appearance === 'solid' ? 'currentColor' : 'none'}
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      style={
        [
          pixels === undefined
            ? undefined
            : `--_kui-lucide-size:${remify(pixels)}`,
          color === undefined ? undefined : `color:${color}`,
        ]
          .filter(Boolean)
          .join(';') || undefined
      }
    >
      {renderChildren(icon)}
    </svg>
  );
}
