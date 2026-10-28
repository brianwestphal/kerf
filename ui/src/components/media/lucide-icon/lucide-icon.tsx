import type { SafeHtml } from 'kerfjs';
import { Fragment, jsx } from 'kerfjs/jsx-runtime';
import type { IconNode } from 'lucide';

import {
  filterDataAttributes,
  type RootDataAttributes,
} from '../../../shared/dom/extension-attributes.js';
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
  /** The icon's accessible name; without it the icon is decorative. */
  label?: string;
  /**
   * Hover text, as an SVG `<title>`: a status icon's explanation ("Session
   * halted"). With `label`, the label stays the accessible name; alone, the
   * title also names the icon. The whole icon box shows it, not just its
   * strokes.
   */
  title?: string;
  /** Named icon scale or positive pixel size, converted to rem. Omit for 1em. */
  size?: LucideIconSize;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
  /** Application `data-*` metadata on the root, such as a row key or an
   * editor node marker; the component's own markers stay protected. */
  rootAttributes?: RootDataAttributes;
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
  const markup = jsx(Fragment, {
    children: icon.map(([tag, attrs]) => {
      for (const value of Object.values(attrs))
        if (typeof value !== 'string' && typeof value !== 'number')
          cacheable = false;
      return jsx(tag, attrs);
    }),
  });
  if (cacheable) childMarkup.set(icon, markup);
  return markup;
}

/**
 * Each icon node's rendered icons, by their props. Rows that re-render the
 * same glyph with the same props get the identical `SafeHtml` back instead of
 * rebuilding the `<svg>` wrapper, and consumers that hash or compare icon
 * markup (PopupMenu's content key) see one string object. Bounded per node,
 * because a per-row `label` would otherwise grow it with the list; past the
 * bound the oldest variant is evicted. Only nodes whose child markup is
 * cacheable are cached.
 */
const iconMarkup = new WeakMap<LucideNode, Map<string, SafeHtml>>();

/** Most rendered variants remembered per icon node. */
const LUCIDE_ICON_VARIANT_LIMIT = 64;

function variantKey(parts: readonly (string | number | boolean | undefined)[]) {
  // U+0001 marks an omitted prop so it never equals an empty string.
  return parts
    .map((part) => (part === undefined ? '\u0001' : String(part)))
    .join('\u0000');
}

const LUCIDE_ICON_PROTECTED = new Set([
  'data-component',
  'data-inline',
  'data-lucide',
  'data-size',
]);

/** Render a Lucide-compatible icon node without copying icon SVG strings. */
export function LucideIcon({
  icon,
  name,
  appearance = 'outline',
  className,
  color,
  inline = false,
  label,
  title,
  size,
  slot,
  rootAttributes,
}: LucideIconProps) {
  if (typeof size === 'number' && (!Number.isFinite(size) || size <= 0))
    throw new RangeError(
      'LucideIcon size must be a positive finite pixel value',
    );
  if (typeof size === 'string' && !Object.hasOwn(lucideIconSizePixels, size))
    throw new RangeError('LucideIcon size must use a named icon step');
  const rootData = rootAttributes
    ? filterDataAttributes(rootAttributes, LUCIDE_ICON_PROTECTED)
    : undefined;
  const key = variantKey([
    rootData ? JSON.stringify(rootData) : undefined,
    name,
    appearance,
    className,
    color,
    inline,
    label,
    title,
    size,
    slot,
  ]);
  const variants = iconMarkup.get(icon);
  const cached = variants?.get(key);
  if (cached) return cached;
  const pixels =
    typeof size === 'number' ? size : size && lucideIconSizePixels[size];
  const slotAttribute = { slot };
  const markup = (
    <svg
      {...rootData}
      {...slotAttribute}
      class={className}
      data-lucide={name}
      data-inline={inline ? 'true' : undefined}
      data-size={size === undefined ? undefined : String(size)}
      role={label || title ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label || title ? undefined : 'true'}
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
      {title ? (
        <>
          <title>{title}</title>
          {/* A transparent box, so hovering between strokes shows the title. */}
          <rect width="24" height="24" fill="transparent" stroke="none" />
        </>
      ) : null}
      {renderChildren(icon)}
    </svg>
  );
  if (childMarkup.has(icon)) {
    const known = variants ?? new Map<string, SafeHtml>();
    if (!variants) iconMarkup.set(icon, known);
    if (known.size >= LUCIDE_ICON_VARIANT_LIMIT)
      known.delete(known.keys().next().value!);
    known.set(key, markup);
  }
  return markup;
}
