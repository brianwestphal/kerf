import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';
import type { CssColor } from '../../../shared/styles/css-values.js';

/** `default` is a 24px swatch; `compact` is 20px. */
export type ColorSwatchesSize = 'default' | 'compact';

/** One color in the palette. */
export interface ColorSwatch {
  /** The submitted value, such as `#0a84ff` or `blue`. */
  value: string;
  /** The color's name: the swatch's accessible name and its hover hint. */
  label: string;
  /**
   * The swatch's paint: a `CssColor` from `uiColor()`, `colorVar()`, or
   * `fillColor()` (`@kerfjs/ui/css-values`), or `'transparent'` for the
   * no-color swatch, drawn outlined and struck through.
   */
  color: CssColor | 'transparent';
}

/** Application `data-*` metadata; the group's own markers stay protected. */
export type ColorSwatchesRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined>
>;

const COLOR_SWATCHES_PROTECTED = new Set(['data-component', 'data-size']);

export type ColorSwatchesProps = {
  /** The radio group name the chosen value submits under. */
  name: string;
  swatches: readonly ColorSwatch[];
  /** The chosen swatch's value. */
  value?: string;
  size?: ColorSwatchesSize;
  disabled?: boolean;
  /** Delegated `data-action` on each radio; listen for `change`. */
  action?: string;
  /** Associate the radios with a form outside their ancestor chain. */
  form?: string;
  /** The group's id. */
  id?: string;
  className?: string;
  rootAttributes?: ColorSwatchesRootAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
} & (
  { label: string; ariaLabel?: never } | { label?: never; ariaLabel: string }
);

const unsafeColor = /[;{}<>"'\\]|\p{Cc}/u;

function swatchStyle(color: ColorSwatch['color']): string | undefined {
  if (color === 'transparent') return undefined;
  const value = color.trim();
  if (!value || unsafeColor.test(value))
    throw new TypeError('A ColorSwatches color must be one CSS color value.');
  return `--_kui-color-swatches-color:${value}`;
}

/**
 * A fixed palette: a group of round color swatches with no visible text, one
 * of which is chosen. It is a native radio group, so arrow keys move the
 * choice, Tab reaches it once, and the chosen value submits under `name`.
 * Each swatch is named by its color's label (also its hover hint), and the
 * chosen one wears a ring that does not rely on its hue. A `'transparent'`
 * swatch offers "no color".
 */
export function ColorSwatches({
  name,
  swatches,
  value,
  label,
  ariaLabel,
  size = 'default',
  disabled = false,
  action,
  form,
  id,
  className = '',
  rootAttributes = {},
  slot,
}: ColorSwatchesProps) {
  const legend =
    label === undefined ? null : (
      <legend class="kui-color-swatches__label">{label}</legend>
    );
  return (
    <fieldset
      {...filterDataAttributes(rootAttributes, COLOR_SWATCHES_PROTECTED)}
      id={id}
      class={`kui-color-swatches ${className}`.trim()}
      data-component="color-swatches"
      data-size={size}
      aria-label={ariaLabel}
      disabled={disabled}
      slot={slot}
    >
      {legend}
      <div class="kui-color-swatches__list">
        {swatches.map((swatch) => (
          <label class="kui-color-swatches__swatch" title={swatch.label}>
            <input
              class="kui-color-swatches__input"
              type="radio"
              name={name}
              value={swatch.value}
              checked={swatch.value === value}
              form={form}
              data-action={action}
              aria-label={swatch.label}
            />
            <span
              class="kui-color-swatches__dot"
              data-swatch={
                swatch.color === 'transparent' ? 'transparent' : 'color'
              }
              style={swatchStyle(swatch.color)}
              aria-hidden="true"
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
