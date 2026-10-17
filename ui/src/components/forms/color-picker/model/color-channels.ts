/**
 * Channel math for the ColorPicker's color models: the unrounded channel
 * values a model shows for the picker's HSV state, the HSV a set of channel
 * values produces, and the gradient each channel's slider track paints. The
 * model's sliders and fields both edit through these, so a channel change
 * replaces only that channel and every other one keeps its exact value.
 */
import type { ColorPickerMode } from '../color-picker.js';
import {
  formatHex,
  grayLevel,
  hslToRgb,
  type Hsva,
  hsvToRgb,
  type Rgba,
  rgbToHsl,
  rgbToHsv,
} from './color-model.js';

/**
 * The channel values a model shows for an HSV color, before rounding: RGB
 * 0–255 (rounded, since hex and the fields carry whole bytes), hue 0–360,
 * and every other channel 0–100.
 */
export function colorChannelValues(mode: ColorPickerMode, hsv: Hsva): number[] {
  switch (mode) {
    case 'rgb': {
      const { r, g, b } = hsvToRgb(hsv);
      return [r, g, b].map(Math.round);
    }
    case 'hsl': {
      const hsl = rgbToHsl(hsvToRgb(hsv));
      return [hsv.h, hsl.s * 100, hsl.l * 100];
    }
    case 'hsb':
      return [hsv.h, hsv.s * 100, hsv.v * 100];
    case 'gray':
      return [grayLevel(hsvToRgb(hsv)) * 100];
  }
}

/** The opaque color a model's channel values describe. */
function rgbOf(mode: ColorPickerMode, values: readonly number[]): Rgba {
  const [first = 0, second = 0, third = 0] = values;
  switch (mode) {
    case 'rgb':
      return { r: first, g: second, b: third, a: 1 };
    case 'hsl':
      return hslToRgb({ h: first, s: second / 100, l: third / 100, a: 1 });
    case 'hsb':
      return hsvToRgb({ h: first, s: second / 100, v: third / 100, a: 1 });
    case 'gray': {
      const level = (first / 100) * 255;
      return { r: level, g: level, b: level, a: 1 };
    }
  }
}

/**
 * The HSV a model's channel values produce, keeping `current`'s alpha. Where
 * the result cannot carry a hue (a gray) or a saturation (black), `current`'s
 * is kept, so the area and the other models do not jump.
 */
export function hsvFromChannels(
  mode: ColorPickerMode,
  values: readonly number[],
  current: Hsva,
): Hsva {
  const { a } = current;
  switch (mode) {
    case 'hsb':
      return { h: values[0]!, s: values[1]! / 100, v: values[2]! / 100, a };
    case 'gray':
      return { h: current.h, s: 0, v: values[0]! / 100, a };
    case 'rgb':
    case 'hsl': {
      const hsv = { ...rgbToHsv(rgbOf(mode, values)), a };
      if (mode === 'hsl') hsv.h = values[0]!;
      else if (hsv.s === 0) hsv.h = current.h;
      if (hsv.v === 0) hsv.s = current.s;
      return hsv;
    }
  }
}

/**
 * The evenly spaced stop values a channel's track needs to be exact: the
 * models are piecewise linear in RGB, so hue breaks every 60° and HSL
 * lightness at 50%.
 */
function trackStops(mode: ColorPickerMode, index: number): number[] {
  switch (mode) {
    case 'rgb':
      return [0, 255];
    case 'gray':
      return [0, 100];
    case 'hsl':
    case 'hsb':
      if (index === 0) return [0, 60, 120, 180, 240, 300, 360];
      return mode === 'hsl' && index === 2 ? [0, 50, 100] : [0, 100];
  }
}

/**
 * The opaque `#rrggbb` a model's channel values describe: the color under
 * every channel slider's thumb (a gray level for the grayscale model, which
 * shows the gray its slider would set rather than the current color).
 */
export function colorChannelColor(
  mode: ColorPickerMode,
  values: readonly number[],
): string {
  return formatHex(rgbOf(mode, values));
}

/**
 * The gradient a channel's slider track paints: the colors that channel
 * produces from its minimum to its maximum while every other channel keeps
 * its value. The gradient runs in the slider's writing direction (its
 * `--_kui-color-picker-track-direction`, `to left` in right-to-left text),
 * so the minimum always sits where the native range puts it.
 */
export function colorChannelTrack(
  mode: ColorPickerMode,
  index: number,
  values: readonly number[],
): string {
  const stops = trackStops(mode, index).map((stop) => {
    const next = [...values];
    next[index] = stop;
    return formatHex(rgbOf(mode, next));
  });
  return `linear-gradient(var(--_kui-color-picker-track-direction,to right),${stops.join(',')})`;
}
