/**
 * Color math for the ColorPicker: parsing CSS color text, converting between
 * RGB, HSV (HSB), and HSL, and formatting hex. The picker keeps HSV as its
 * source of truth so a hue survives while the color is gray (zero saturation
 * or brightness), which RGB and hex cannot remember.
 */

/** Red, green, and blue 0–255 (unrounded), and alpha 0–1. */
export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Hue 0–360, saturation and value (brightness) 0–1, and alpha 0–1. */
export interface Hsva {
  h: number;
  s: number;
  v: number;
  a: number;
}

/** Hue 0–360, saturation and lightness 0–1, and alpha 0–1. */
export interface Hsla {
  h: number;
  s: number;
  l: number;
  a: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function parseHex(text: string): Rgba | undefined {
  const hex = text.slice(1);
  if (!/^(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(hex)) return undefined;
  const full =
    hex.length <= 4 ? [...hex].map((digit) => digit + digit).join('') : hex;
  const channel = (index: number) =>
    Number.parseInt(full.slice(index * 2, index * 2 + 2), 16);
  return {
    r: channel(0),
    g: channel(1),
    b: channel(2),
    a: full.length === 8 ? channel(3) / 255 : 1,
  };
}

/** A number, or a percentage of `scale`, from one CSS function argument. */
function number(part: string, scale: number): number | undefined {
  const value = Number.parseFloat(part);
  if (!Number.isFinite(value)) return undefined;
  return part.trim().endsWith('%') ? (value / 100) * scale : value;
}

function parseFunction(text: string): Rgba | undefined {
  const match = /^(rgba?|hsla?)\((.*)\)$/i.exec(text);
  if (!match) return undefined;
  const parts = match[2]!
    .replace('/', ' ')
    .split(/[\s,]+/)
    .filter(Boolean);
  if (parts.length !== 3 && parts.length !== 4) return undefined;
  const alpha = parts[3] === undefined ? 1 : number(parts[3], 1);
  if (alpha === undefined) return undefined;
  if (match[1]!.toLowerCase().startsWith('rgb')) {
    const [r, g, b] = parts.slice(0, 3).map((part) => number(part, 255));
    if (r === undefined || g === undefined || b === undefined) return undefined;
    return {
      r: clamp(r, 0, 255),
      g: clamp(g, 0, 255),
      b: clamp(b, 0, 255),
      a: clamp(alpha, 0, 1),
    };
  }
  const h = Number.parseFloat(parts[0]!);
  const s = number(parts[1]!, 1);
  const l = number(parts[2]!, 1);
  if (!Number.isFinite(h) || s === undefined || l === undefined)
    return undefined;
  return hslToRgb({
    h: ((h % 360) + 360) % 360,
    s: clamp(s, 0, 1),
    l: clamp(l, 0, 1),
    a: clamp(alpha, 0, 1),
  });
}

/**
 * Parse `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()`/`rgba()`,
 * `hsl()`/`hsla()` (comma or space syntax), or `transparent`; `undefined`
 * for anything else.
 */
export function parseColor(text: string): Rgba | undefined {
  const value = text.trim();
  if (value.toLowerCase() === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  if (value.startsWith('#')) return parseHex(value);
  return parseFunction(value);
}

export function rgbToHsv({ r, g, b, a }: Rgba): Hsva {
  const [red, green, blue] = [r / 255, g / 255, b / 255];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let h = 0;
  if (delta > 0) {
    if (max === red) h = ((green - blue) / delta) % 6;
    else if (max === green) h = (blue - red) / delta + 2;
    else h = (red - green) / delta + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: max === 0 ? 0 : delta / max, v: max, a };
}

export function hsvToRgb({ h, s, v, a }: Hsva): Rgba {
  const chroma = v * s;
  const sector = (((h % 360) + 360) % 360) / 60;
  const x = chroma * (1 - Math.abs((sector % 2) - 1));
  const [red, green, blue] =
    sector < 1
      ? [chroma, x, 0]
      : sector < 2
        ? [x, chroma, 0]
        : sector < 3
          ? [0, chroma, x]
          : sector < 4
            ? [0, x, chroma]
            : sector < 5
              ? [x, 0, chroma]
              : [chroma, 0, x];
  const m = v - chroma;
  return {
    r: (red + m) * 255,
    g: (green + m) * 255,
    b: (blue + m) * 255,
    a,
  };
}

export function hslToRgb({ h, s, l, a }: Hsla): Rgba {
  const v = l + s * Math.min(l, 1 - l);
  return hsvToRgb({ h, s: v === 0 ? 0 : 2 * (1 - l / v), v, a });
}

export function rgbToHsl(rgba: Rgba): Hsla {
  const { h, s, v, a } = rgbToHsv(rgba);
  const l = v * (1 - s / 2);
  return {
    h,
    s: l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l),
    l,
    a,
  };
}

const hexByte = (value: number) =>
  Math.round(clamp(value, 0, 255))
    .toString(16)
    .padStart(2, '0');

/** `#rrggbb`, or `#rrggbbaa` when alpha is below 1; lowercase. */
export function formatHex({ r, g, b, a }: Rgba): string {
  const alpha = Math.round(clamp(a, 0, 1) * 255);
  return `#${hexByte(r)}${hexByte(g)}${hexByte(b)}${alpha === 255 ? '' : hexByte(alpha)}`;
}

/** Rec. 601 luma, 0–1: the brightness a gray of this color would have. */
export function grayLevel({ r, g, b }: Rgba): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/**
 * The HSV a hex value should take when the picker already shows `current`:
 * `current` itself when it still formats to the same hex (so dragging to gray
 * keeps the hue), otherwise the hex's own HSV, keeping the current hue for a
 * gray result.
 */
export function hsvForValue(value: string, current?: Hsva): Hsva | undefined {
  const rgba = parseColor(value);
  if (!rgba) return undefined;
  if (current && formatHex(hsvToRgb(current)) === formatHex(rgba))
    return current;
  const hsv = rgbToHsv(rgba);
  return hsv.s === 0 && current ? { ...hsv, h: current.h } : hsv;
}
