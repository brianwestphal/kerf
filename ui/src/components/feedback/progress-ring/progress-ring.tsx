import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';
import { remify } from '../../../shared/styles/css-values.js';
import type { ProgressTone } from '../progress-bar/progress-bar.js';

export type { ProgressTone } from '../progress-bar/progress-bar.js';

/**
 * The ring's diameter: `small` (16px) sits in a line of text, `medium` (24px,
 * the default) beside an icon in a row or toolbar, and `large` (40px) on its
 * own.
 */
export type ProgressRingSize = 'small' | 'medium' | 'large';

const RING_PIXELS: Record<ProgressRingSize, number> = {
  small: 16,
  medium: 24,
  large: 40,
};

/**
 * Application `data-*` identity on the ProgressRing root, such as `data-key`;
 * its own configuration attributes stay protected.
 */
export type ProgressRingRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined>
>;

const PROGRESS_RING_PROTECTED = new Set([
  'data-component',
  'data-tone',
  'data-size',
  'data-indeterminate',
]);

export interface ProgressRingProps {
  /**
   * Work done so far, from 0 to `max`. Omit it for indeterminate progress,
   * which spins a short arc instead.
   */
  value?: number;
  /** The amount that means done (default 1). */
  max?: number;
  /** The ring's accessible name, such as "Claim time remaining". */
  label: string;
  /** Spoken progress in place of the percentage, such as "12 minutes left". */
  valueText?: string;
  tone?: ProgressTone;
  size?: ProgressRingSize;
  id?: string;
  rootAttributes?: ProgressRingRootAttributes;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/** The circle's radius in the 24-unit viewBox, inside a 3-unit stroke. */
const RADIUS = 10.5;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * A circular progress indicator: an SVG track and arc, determinate (`value`
 * of `max`, filling clockwise from the top) or indeterminate (no `value`, a
 * spinning arc), sized to sit inline in text, a row, or a toolbar. It is a
 * `role="progressbar"` named by `label`, with `aria-valuenow` (as a
 * percentage) or `valueText`.
 */
export function ProgressRing({
  value,
  max = 1,
  label,
  valueText,
  tone = 'brand',
  size = 'medium',
  id,
  rootAttributes = {},
  className = '',
  slot,
}: ProgressRingProps) {
  if (!Number.isFinite(max) || max <= 0)
    throw new RangeError('ProgressRing max must be a positive number.');
  if (value !== undefined && (!Number.isFinite(value) || value < 0))
    throw new RangeError('ProgressRing value must be zero or more.');
  const fraction = value === undefined ? undefined : Math.min(value, max) / max;
  const dash =
    fraction === undefined ? CIRCUMFERENCE * 0.25 : CIRCUMFERENCE * fraction;
  return (
    <span
      {...filterDataAttributes(rootAttributes, PROGRESS_RING_PROTECTED)}
      id={id}
      class={`kui-progress-ring ${className}`.trim()}
      data-component="progress-ring"
      data-tone={tone}
      data-size={size}
      data-indeterminate={fraction === undefined ? '' : undefined}
      role="progressbar"
      aria-label={label}
      aria-valuemin={fraction === undefined ? undefined : '0'}
      aria-valuemax={fraction === undefined ? undefined : '100'}
      aria-valuenow={
        fraction === undefined ? undefined : String(Math.round(fraction * 100))
      }
      aria-valuetext={valueText}
      style={`--_kui-progress-ring-size:${remify(RING_PIXELS[size])}`}
      slot={slot}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle class="kui-progress-ring__track" cx="12" cy="12" r={RADIUS} />
        <circle
          class="kui-progress-ring__arc"
          cx="12"
          cy="12"
          r={RADIUS}
          stroke-dasharray={`${dash.toFixed(3)} ${CIRCUMFERENCE.toFixed(3)}`}
        />
      </svg>
    </span>
  );
}
