import { ChevronsUpDown, Pipette, Plus } from 'lucide';

import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';
import { LucideIcon } from '../../media/lucide-icon/lucide-icon.js';
import {
  type ColorSwatch,
  ColorSwatches,
} from '../color-swatches/color-swatches.js';
import {
  colorChannelColor,
  colorChannelTrack,
  colorChannelValues,
} from './model/color-channels.js';
import {
  formatHex,
  type Hsva,
  hsvToRgb,
  parseColor,
  rgbToHsv,
} from './model/color-model.js';

/** The channel fields the picker shows: RGB, HSL, HSB (HSV), or one gray level. */
export type ColorPickerMode = 'rgb' | 'hsl' | 'hsb' | 'gray';

/** A titled group of app-owned colors, such as "Document Colors". */
export interface ColorPickerSamples {
  title: string;
  swatches: readonly ColorSwatch[];
}

/** Application `data-*` metadata; the picker's own markers stay protected. */
export type ColorPickerRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined>
>;

const COLOR_PICKER_PROTECTED = new Set([
  'data-component',
  'data-value',
  'data-mode',
  'data-alpha',
  'data-color-picker-id',
]);

/** The delegated action every preset and sample swatch carries. */
export const COLOR_PICKER_SWATCH_ACTION = 'kui-color-picker-swatch';

export interface ColorPickerProps {
  /** The picker's id; it also prefixes its inner ids. */
  id: string;
  /** The picker's accessible name. */
  label: string;
  /**
   * The color, as CSS color text (`#rrggbb[aa]`, `rgb()`, `hsl()`); invalid
   * text shows black. The picker reports `#rrggbb`, or `#rrggbbaa` below
   * full opacity.
   */
  value: string;
  /** The channel fields shown (default `rgb`). */
  mode?: ColorPickerMode;
  /** Offer opacity: an alpha slider and field (default true). */
  alpha?: boolean;
  /** A form field name the hex value submits under. */
  name?: string;
  /** Associate the hidden input with a form outside its ancestor chain. */
  form?: string;
  /**
   * Offer a button that samples a color from the screen, where the browser
   * provides the EyeDropper API (default true; hidden elsewhere).
   */
  eyedropper?: boolean;
  /** A preset row of swatches under the controls. */
  presets?: readonly ColorSwatch[];
  /** Titled groups of app-owned colors under the presets. */
  samples?: readonly ColorPickerSamples[];
  /**
   * A `data-action` for an "Add to Samples" button in the controls row; the
   * app reads the picker's current value and adds it to its samples.
   */
  addSampleAction?: string;
  disabled?: boolean;
  className?: string;
  rootAttributes?: ColorPickerRootAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

const MODE_LABELS: Record<ColorPickerMode, [string, string]> = {
  rgb: ['RGB', 'RGBA'],
  hsl: ['HSL', 'HSLA'],
  hsb: ['HSB', 'HSBA'],
  gray: ['Grayscale', 'Grayscale'],
};

/**
 * The labels, accessible names, maximum, and spoken unit of each channel per
 * mode; the mode's sliders and fields both follow it.
 */
export const COLOR_PICKER_CHANNELS: Record<
  ColorPickerMode,
  readonly { short: string; name: string; max: number; unit: '' | '%' | '°' }[]
> = {
  rgb: [
    { short: 'R', name: 'Red', max: 255, unit: '' },
    { short: 'G', name: 'Green', max: 255, unit: '' },
    { short: 'B', name: 'Blue', max: 255, unit: '' },
  ],
  hsl: [
    { short: 'H', name: 'Hue', max: 360, unit: '°' },
    { short: 'S', name: 'Saturation', max: 100, unit: '%' },
    { short: 'L', name: 'Lightness', max: 100, unit: '%' },
  ],
  hsb: [
    { short: 'H', name: 'Hue', max: 360, unit: '°' },
    { short: 'S', name: 'Saturation', max: 100, unit: '%' },
    { short: 'B', name: 'Brightness', max: 100, unit: '%' },
  ],
  gray: [{ short: 'W', name: 'Gray Level', max: 100, unit: '%' }],
};

/** The rounded channel values a mode shows for an HSV color. */
export function colorPickerChannels(
  mode: ColorPickerMode,
  hsv: Hsva,
): number[] {
  return colorChannelValues(mode, hsv).map(Math.round);
}

/** One channel slider's attributes; see {@link colorPickerSlider}. */
export interface ColorPickerSliderState {
  max: number;
  value: string;
  label: string;
  valueText: string;
  style: string;
}

/**
 * The attributes of one channel slider for a mode's exact channel values:
 * its range, value, accessible name and spoken value, and an inline style
 * with the track gradient of the colors that channel produces while the
 * others hold and the color under the thumb.
 * `undefined` for a slot the mode does not use.
 */
export function colorPickerSlider(
  mode: ColorPickerMode,
  index: number,
  values: readonly number[],
): ColorPickerSliderState | undefined {
  const channel = COLOR_PICKER_CHANNELS[mode][index];
  if (channel === undefined) return undefined;
  const value = String(Math.round(values[index]!));
  return {
    max: channel.max,
    value,
    label: channel.name,
    valueText: `${value}${channel.unit}`,
    style: [
      `--_kui-color-picker-track:${colorChannelTrack(mode, index, values)}`,
      `--_kui-color-picker-thumb-color:${colorChannelColor(mode, values)}`,
    ].join(';'),
  };
}

/** The area's spoken value. */
export function colorPickerAreaText(hsv: Hsva): string {
  return `Saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%`;
}

/** The CSS custom properties that place the thumbs and paint the tracks. */
export function colorPickerStyle(hsv: Hsva): string {
  const opaque = formatHex({ ...hsvToRgb(hsv), a: 1 });
  return [
    `--_kui-color-picker-h:${hsv.h.toFixed(2)}`,
    `--_kui-color-picker-s:${(hsv.s * 100).toFixed(2)}%`,
    `--_kui-color-picker-v:${(hsv.v * 100).toFixed(2)}%`,
    `--_kui-color-picker-a:${(hsv.a * 100).toFixed(2)}%`,
    `--_kui-color-picker-color:${opaque}`,
  ].join(';');
}

/**
 * A full color picker panel: a saturation and brightness area; a slider for
 * each channel of the color model (red, green, and blue; hue, saturation, and
 * lightness or brightness; or one gray level), each track painting the colors
 * that channel produces while the others hold; an optional opacity slider on
 * a checkerboard; a color-model menu (RGB, HSL, HSB, Grayscale) with its
 * channel fields, a hex field (8 digits below full
 * opacity) and an opacity field, an optional screen sampler (EyeDropper), and
 * optional preset and sample swatches. The controlled `value` renders it;
 * wire `wireColorPickers` from `@kerfjs/ui/wire-color-pickers` to make it
 * interactive. The interactive surface belongs to that wiring after the first
 * render, so a drag never fights a re-render; a new `value` from the app
 * resynchronizes it.
 */
export function ColorPicker({
  id,
  label,
  value,
  mode = 'rgb',
  alpha = true,
  name,
  form,
  eyedropper = true,
  presets,
  samples,
  addSampleAction,
  disabled = false,
  className = '',
  rootAttributes = {},
  slot,
}: ColorPickerProps) {
  const parsed = parseColor(value) ?? { r: 0, g: 0, b: 0, a: 1 };
  const rgba = alpha ? parsed : { ...parsed, a: 1 };
  const hsv = rgbToHsv(rgba);
  const hex = formatHex(rgba);
  const channels = COLOR_PICKER_CHANNELS[mode];
  const exact = colorChannelValues(mode, hsv);
  const channelValues = exact.map(Math.round);
  const opacity = `${Math.round(hsv.a * 100)}%`;
  return (
    <div
      {...filterDataAttributes(rootAttributes, COLOR_PICKER_PROTECTED)}
      id={id}
      class={`kui-color-picker ${className}`.trim()}
      role="group"
      aria-label={label}
      data-component="color-picker"
      data-color-picker-id={id}
      data-value={hex}
      data-mode={mode}
      data-alpha={alpha ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      slot={slot}
    >
      <div
        class="kui-color-picker__surface"
        data-morph-skip
        style={colorPickerStyle(hsv)}
      >
        <div
          class="kui-color-picker__area"
          role="slider"
          tabindex={disabled ? -1 : 0}
          aria-label="Saturation and Brightness"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={String(Math.round(hsv.s * 100))}
          aria-valuetext={colorPickerAreaText(hsv)}
          aria-disabled={disabled ? 'true' : undefined}
        >
          <span class="kui-color-picker__area-thumb" />
        </div>
        <div class="kui-color-picker__sliders">
          {[0, 1, 2].map((index) => {
            const slider = colorPickerSlider(mode, index, exact);
            return (
              <input
                class="kui-color-picker__slider"
                type="range"
                data-slider={String(index)}
                min="0"
                max={String(slider?.max ?? 100)}
                step="1"
                value={slider?.value ?? '0'}
                aria-label={slider?.label}
                aria-valuetext={slider?.valueText}
                style={slider?.style}
                hidden={slider === undefined}
                disabled={disabled}
              />
            );
          })}
          {alpha ? (
            <input
              class="kui-color-picker__opacity"
              type="range"
              min="0"
              max="100"
              step="1"
              value={String(Math.round(hsv.a * 100))}
              aria-label="Opacity"
              aria-valuetext={opacity}
              disabled={disabled}
            />
          ) : null}
        </div>
        <div class="kui-color-picker__controls">
          <span class="kui-color-picker__mode-wrap">
            <select
              class="kui-color-picker__mode"
              aria-label="Color Model"
              disabled={disabled}
            >
              {(Object.keys(MODE_LABELS) as ColorPickerMode[]).map((option) => (
                <option value={option} selected={option === mode}>
                  {MODE_LABELS[option][alpha ? 1 : 0]}
                </option>
              ))}
            </select>
            <span class="kui-color-picker__mode-icon" aria-hidden="true">
              <LucideIcon
                icon={ChevronsUpDown}
                name="chevrons-up-down"
                size="s"
              />
            </span>
          </span>
          {eyedropper ? (
            <button
              type="button"
              class="kui-color-picker__tool kui-color-picker__eyedropper"
              aria-label="Pick a Color from the Screen"
              title="Pick a Color from the Screen"
              hidden
              disabled={disabled}
            >
              <LucideIcon icon={Pipette} name="pipette" size="m" />
            </button>
          ) : null}
          {addSampleAction === undefined ? null : (
            <button
              type="button"
              class="kui-color-picker__tool"
              data-action={addSampleAction}
              aria-label="Add to Samples"
              title="Add to Samples"
              disabled={disabled}
            >
              <LucideIcon icon={Plus} name="plus" size="m" />
            </button>
          )}
        </div>
        <div
          class="kui-color-picker__channels"
          data-count={String(channels.length)}
        >
          {[0, 1, 2].map((index) => {
            const channel = channels[index];
            return (
              <label
                class="kui-color-picker__field"
                hidden={channel === undefined}
              >
                <span class="kui-color-picker__field-label" aria-hidden="true">
                  {channel?.short ?? ''}
                </span>
                <input
                  class="kui-color-picker__channel"
                  data-channel={String(index)}
                  inputMode="numeric"
                  value={channel ? String(channelValues[index]) : ''}
                  aria-label={channel?.name}
                  disabled={disabled}
                />
              </label>
            );
          })}
        </div>
        <div class="kui-color-picker__hex-row">
          <label class="kui-color-picker__field kui-color-picker__field--hex">
            <span class="kui-color-picker__field-label" aria-hidden="true">
              #
            </span>
            <input
              class="kui-color-picker__hex"
              value={hex.slice(1).toUpperCase()}
              maxLength={8}
              spellcheck="false"
              autocomplete="off"
              aria-label="Hex Color"
              disabled={disabled}
            />
          </label>
          {alpha ? (
            <label class="kui-color-picker__field">
              <span class="kui-color-picker__field-label" aria-hidden="true">
                A
              </span>
              <input
                class="kui-color-picker__opacity-field"
                inputMode="numeric"
                value={opacity}
                aria-label="Opacity"
                disabled={disabled}
              />
            </label>
          ) : null}
        </div>
        {name === undefined ? null : (
          <input type="hidden" name={name} value={hex} form={form} />
        )}
      </div>
      {presets === undefined ? null : (
        <ColorSwatches
          name={`${id}-presets`}
          ariaLabel="Presets"
          swatches={presets}
          value={presets.find((swatch) => swatch.value === hex)?.value}
          size="compact"
          disabled={disabled}
          action={COLOR_PICKER_SWATCH_ACTION}
        />
      )}
      {(samples ?? []).map((group, index) => (
        <ColorSwatches
          name={`${id}-samples-${index}`}
          label={group.title}
          swatches={group.swatches}
          value={group.swatches.find((swatch) => swatch.value === hex)?.value}
          size="compact"
          disabled={disabled}
          action={COLOR_PICKER_SWATCH_ACTION}
        />
      ))}
    </div>
  );
}
