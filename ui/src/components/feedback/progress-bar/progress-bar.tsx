import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';

/** The fill color: `brand` (default), or a status tone. */
export type ProgressTone = 'brand' | 'success' | 'warning' | 'danger';
/** `default` is a 6px track; `compact` is 4px, for a row or table cell. */
export type ProgressBarSize = 'default' | 'compact';

/**
 * Application `data-*` identity on the ProgressBar root, such as `data-key`;
 * its own configuration attributes stay protected.
 */
export type ProgressBarRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined>
>;

const PROGRESS_BAR_PROTECTED = new Set([
  'data-component',
  'data-tone',
  'data-size',
  'data-indeterminate',
]);

export type ProgressBarProps = {
  /**
   * Work done so far, from 0 to `max`. Omit it for indeterminate progress
   * (work whose size is unknown), which animates instead.
   */
  value?: number;
  /** The amount that means done (default 1). */
  max?: number;
  /**
   * Spoken progress in place of the percentage, such as "3 of 12 files". With
   * `showValue` it is also the visible text.
   */
  valueText?: string;
  /** Show the value (or `valueText`) at the end of the label row. */
  showValue?: boolean;
  tone?: ProgressTone;
  size?: ProgressBarSize;
  id?: string;
  rootAttributes?: ProgressBarRootAttributes;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
} & (
  | {
      /** A visible label above the bar that also names it. */
      label: string;
      ariaLabel?: never;
    }
  | {
      label?: never;
      /** The bar's accessible name when it shows no visible label. */
      ariaLabel: string;
    }
);

function percent(value: number, max: number): string {
  return `${Math.round((value / max) * 100)}%`;
}

/**
 * A linear progress indicator on the native `<progress>` element: determinate
 * (`value` of `max`) or indeterminate (no `value`, an animated sweep), named
 * by a visible `label` or an `ariaLabel`, toned, and in two track sizes. The
 * native element carries the progressbar role and its value to assistive
 * technology; `valueText` replaces the spoken percentage.
 */
export function ProgressBar({
  value,
  max = 1,
  valueText,
  showValue = false,
  label,
  ariaLabel,
  tone = 'brand',
  size = 'default',
  id,
  rootAttributes = {},
  className = '',
  slot,
}: ProgressBarProps) {
  if (!Number.isFinite(max) || max <= 0)
    throw new RangeError('ProgressBar max must be a positive number.');
  if (value !== undefined && (!Number.isFinite(value) || value < 0))
    throw new RangeError('ProgressBar value must be zero or more.');
  const clamped = value === undefined ? undefined : Math.min(value, max);
  const labelId = id === undefined ? undefined : `${id}-label`;
  const shownValue =
    showValue &&
    (valueText ?? (clamped === undefined ? undefined : percent(clamped, max)));
  return (
    <div
      {...filterDataAttributes(rootAttributes, PROGRESS_BAR_PROTECTED)}
      id={id}
      class={`kui-progress-bar ${className}`.trim()}
      data-component="progress-bar"
      data-tone={tone}
      data-size={size}
      data-indeterminate={clamped === undefined ? '' : undefined}
      slot={slot}
    >
      {label === undefined && !shownValue ? null : (
        <div class="kui-progress-bar__header">
          {label === undefined ? null : (
            <span class="kui-progress-bar__label" id={labelId}>
              {label}
            </span>
          )}
          {shownValue ? (
            <span class="kui-progress-bar__value" aria-hidden="true">
              {shownValue}
            </span>
          ) : null}
        </div>
      )}
      <progress
        class="kui-progress-bar__track"
        value={clamped}
        max={max}
        aria-label={labelId === undefined ? (label ?? ariaLabel) : undefined}
        aria-labelledby={labelId}
        aria-valuetext={valueText}
      />
    </div>
  );
}
