import { jsx } from 'kerfjs/jsx-runtime';
import type { IconNode } from 'lucide';

import type { CssForegroundColor } from './css-values.js';
import { remify } from './css-values.js';

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
  label?: string;
  /** Named icon scale or positive pixel size, converted to rem. Omit for 1em. */
  size?: LucideIconSize;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/** Render a Lucide-compatible icon node without copying icon SVG strings. */
export function LucideIcon({
  icon,
  name,
  appearance = 'outline',
  className,
  color,
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
      {icon.map(([tag, attrs]) => jsx(tag, attrs))}
    </svg>
  );
}
