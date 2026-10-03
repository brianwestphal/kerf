import { remify } from './css-values.js';
import type { LucideIconSize } from './lucide-icon.js';

export type LoadingSpinnerSize = LucideIconSize;

const spinnerSizePixels = {
  xs: 12,
  s: 16,
  m: 20,
  l: 24,
  xl: 32,
} as const satisfies Record<Exclude<LoadingSpinnerSize, number>, number>;

export interface LoadingSpinnerProps {
  className?: string;
  label?: string;
  /** Named icon scale or positive pixel size, converted to rem. Omit for 1em. */
  size?: LoadingSpinnerSize;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/** Stable viewBox-centered progress ring based on svg-spinners' MIT-licensed 180-ring. */
export function LoadingSpinner({
  className = '',
  label,
  size,
  slot,
}: LoadingSpinnerProps) {
  if (typeof size === 'number' && (!Number.isFinite(size) || size <= 0))
    throw new RangeError(
      'LoadingSpinner size must be a positive finite pixel value',
    );
  if (typeof size === 'string' && !Object.hasOwn(spinnerSizePixels, size))
    throw new RangeError('LoadingSpinner size must use a named icon step');
  const pixels =
    typeof size === 'number' ? size : size && spinnerSizePixels[size];
  const slotAttribute = { slot };
  return (
    <svg
      {...slotAttribute}
      class={`kui-loading-spinner ${className}`.trim()}
      data-component="loading-spinner"
      data-size={size === undefined ? undefined : String(size)}
      viewBox="0 0 24 24"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      style={
        pixels === undefined
          ? undefined
          : `--_kui-loading-spinner-size:${remify(pixels)}`
      }
    >
      <path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z" />
    </svg>
  );
}
