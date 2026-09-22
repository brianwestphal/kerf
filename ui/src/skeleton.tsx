export interface SkeletonProps {
  /** Width as any browser CSS length (e.g. `7.5rem`, `60%`). Defaults to filling its slot. */
  width?: string;
  /** Height as any CSS length. Defaults to a single text line. */
  height?: string;
  /** Corner radius override (a CSS length). Defaults to the small radius token. */
  radius?: string;
  /** Render this many stacked lines (the last one shorter), for multi-line text. */
  lines?: number;
  /** Accessible label. Omit to keep the block decorative (`aria-hidden`). */
  label?: string;
  className?: string;
}

function blockStyle(
  width?: string,
  height?: string,
  radius?: string,
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
              index === lines - 1 ? '60%' : undefined,
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
