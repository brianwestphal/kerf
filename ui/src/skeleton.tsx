import { type CssLength, type CssSize, pct } from './css-values.js';

export interface SkeletonProps {
  /** Typed width or intrinsic sizing keyword. Defaults to filling its slot. */
  width?: CssSize;
  /** Typed height or intrinsic sizing keyword. Defaults to a single text line. */
  height?: CssSize;
  /** Typed corner-radius override. Defaults to the small radius token. */
  radius?: CssLength;
  /** Render this many stacked lines (the last one shorter), for multi-line text. */
  lines?: number;
  /** Accessible label. Omit to keep the block decorative (`aria-hidden`). */
  label?: string;
  className?: string;
}

function blockStyle(
  width?: CssSize,
  height?: CssSize,
  radius?: CssLength,
): string | undefined {
  const parts = [
    width && `width:${width}`,
    height && `height:${height}`,
    radius && `--kui-skeleton-radius:${radius}`,
  ].filter(Boolean);
  return parts.length ? parts.join(';') : undefined;
}

/**
 * A subtle, deliberately **unanimated** loading placeholder block. Use it for a
 * value slot whose content is not yet known, on its own or via a component's
 * `placeholder` prop. Decorative by default (`aria-hidden`); pass `label` to
 * announce it. Sizes to its slot unless `width`/`height` are given.
 */
export function Skeleton({
  width,
  height,
  radius,
  lines,
  label,
  className = '',
}: SkeletonProps) {
  const a11y = {
    role: label ? 'img' : undefined,
    'aria-label': label,
    'aria-hidden': label ? undefined : ('true' as const),
  };
  if (lines && lines > 1) {
    return (
      <span
        class={`kui-skeleton-lines ${className}`.trim()}
        data-component="skeleton"
        style={width ? `width:${width}` : undefined}
        {...a11y}
      >
        {Array.from({ length: lines }, (_, index) => (
          <span
            class="kui-skeleton"
            aria-hidden="true"
            style={blockStyle(
              index === lines - 1 ? pct(60) : undefined,
              height,
              radius,
            )}
          ></span>
        ))}
      </span>
    );
  }
  return (
    <span
      class={`kui-skeleton ${className}`.trim()}
      data-component="skeleton"
      style={blockStyle(width, height, radius)}
      {...a11y}
    ></span>
  );
}
