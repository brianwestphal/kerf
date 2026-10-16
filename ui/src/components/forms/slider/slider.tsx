import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';

/** `default` is a 4px track with a 20px thumb at 16px text; `compact` 3px, 16px, and 14px. */
export type SliderSize = 'default' | 'compact';

/**
 * A labeled stop under the track: a value and the text shown for it. The
 * labels are visual; the input still reports its value to assistive
 * technology. (No `<datalist>`: Chromium shrinks a styled range's track when
 * the input has a `list`.)
 */
export interface SliderTick {
  value: number;
  label?: string;
}

/** Application `data-*` metadata; the Slider's own markers stay protected. */
export type SliderRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined>
>;

const SLIDER_PROTECTED = new Set(['data-component', 'data-size', 'data-unit']);

export type SliderProps = {
  /** The input's id; it also derives the readout, hint, and tick ids. */
  id: string;
  /** The current value (default the midpoint of `min` and `max`, snapped to `step`). */
  value?: number;
  /** The lowest value (default 0). */
  min?: number;
  /** The highest value (default 100). */
  max?: number;
  /** The step between values (default 1). */
  step?: number;
  name?: string;
  /** Show the current value at the end of the label row, live while dragging. */
  showValue?: boolean;
  /** Text after the readout's number, such as `%` or ` px`. */
  unit?: string;
  /** Supporting text below the slider, also its description. */
  hint?: string;
  /** Labeled stops under the track. */
  ticks?: readonly SliderTick[];
  size?: SliderSize;
  disabled?: boolean;
  /** Delegated `data-action` on the input; listen for `input` or `change`. */
  action?: string;
  /** Associate the input with a form outside its ancestor chain. */
  form?: string;
  className?: string;
  rootAttributes?: SliderRootAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
} & (
  { label: string; ariaLabel?: never } | { label?: never; ariaLabel: string }
);

function fractionOf(value: number, min: number, max: number): number {
  return max === min ? 0 : (value - min) / (max - min);
}

function percent(fraction: number): string {
  return `${Number((fraction * 100).toFixed(4))}%`;
}

/**
 * A value on a continuous or stepped range: a native `<input type="range">`
 * drawn as a track, a brand fill up to the value, and a thumb, with a label
 * row, an optional live readout (`<output>`), labeled tick stops, and a hint.
 * Keyboard, pointer, and screen-reader behavior are the platform's. Wire
 * `wireSliders` from `@kerfjs/ui/wire-sliders` above it so the fill and the
 * readout follow a drag before the app re-renders.
 */
export function Slider({
  id,
  value,
  min = 0,
  max = 100,
  step = 1,
  name,
  label,
  ariaLabel,
  showValue = false,
  unit = '',
  hint,
  ticks,
  size = 'default',
  disabled = false,
  action,
  form,
  className = '',
  rootAttributes = {},
  slot,
}: SliderProps) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min)
    throw new RangeError('Slider max must be a number at least min.');
  if (!Number.isFinite(step) || step <= 0)
    throw new RangeError('Slider step must be a positive number.');
  const current = Math.min(
    max,
    Math.max(min, value ?? min + Math.round((max - min) / 2 / step) * step),
  );
  const hintId = hint === undefined ? undefined : `${id}-hint`;
  const ticksId = ticks === undefined ? undefined : `${id}-ticks`;
  return (
    <div
      {...filterDataAttributes(rootAttributes, SLIDER_PROTECTED)}
      class={`kui-slider ${className}`.trim()}
      data-component="slider"
      data-size={size}
      data-unit={unit || undefined}
      slot={slot}
    >
      {label === undefined && !showValue ? null : (
        <div class="kui-slider__header">
          {label === undefined ? null : (
            <label class="kui-slider__label" for={id}>
              {label}
            </label>
          )}
          {showValue ? (
            <output class="kui-slider__value" for={id} aria-hidden="true">
              {`${current}${unit}`}
            </output>
          ) : null}
        </div>
      )}
      <input
        class="kui-slider__input"
        type="range"
        id={id}
        name={name}
        min={min}
        max={max}
        step={step}
        value={String(current)}
        form={form}
        disabled={disabled}
        data-action={action}
        aria-label={ariaLabel}
        aria-describedby={hintId}
        aria-valuetext={unit ? `${current}${unit}` : undefined}
        style={`--_kui-slider-fill:${percent(fractionOf(current, min, max))}`}
      />
      {ticks === undefined ? null : (
        <div class="kui-slider__ticks" id={ticksId} aria-hidden="true">
          {ticks.map((tick) => (
            <span
              class="kui-slider__tick"
              style={`--_kui-slider-tick:${percent(fractionOf(Math.min(max, Math.max(min, tick.value)), min, max))}`}
            >
              {tick.label ?? ''}
            </span>
          ))}
        </div>
      )}
      {hint === undefined ? null : (
        <span class="kui-slider__hint" id={hintId}>
          {hint}
        </span>
      )}
    </div>
  );
}
