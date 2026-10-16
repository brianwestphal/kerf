import { describe, expect, it } from 'vitest';

import {
  formatHex,
  grayLevel,
  hslToRgb,
  hsvForValue,
  hsvToRgb,
  parseColor,
  rgbToHsl,
  rgbToHsv,
} from '../../src/components/forms/color-picker/model/color-model.js';

describe('color model', () => {
  it('parses hex, rgb(), hsl(), and transparent, and refuses anything else', () => {
    expect(parseColor('#0af')).toEqual({ r: 0, g: 170, b: 255, a: 1 });
    expect(parseColor('#0af8')).toEqual({ r: 0, g: 170, b: 255, a: 136 / 255 });
    expect(parseColor('#D8D8D8')).toEqual({ r: 216, g: 216, b: 216, a: 1 });
    expect(parseColor('#0a84ff80')?.a).toBeCloseTo(128 / 255);
    expect(parseColor('rgb(10, 20, 30)')).toEqual({
      r: 10,
      g: 20,
      b: 30,
      a: 1,
    });
    expect(parseColor('rgba(10 20 30 / 50%)')).toEqual({
      r: 10,
      g: 20,
      b: 30,
      a: 0.5,
    });
    expect(parseColor('rgb(100% 0% 0%)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor('rgb(300, -5, 0, 2)')).toEqual({
      r: 255,
      g: 0,
      b: 0,
      a: 1,
    });
    expect(formatHex(parseColor('hsl(120, 100%, 50%)')!)).toBe('#00ff00');
    expect(formatHex(parseColor('hsla(-120 100% 25% / 0.5)')!)).toBe(
      '#00008080',
    );
    expect(parseColor(' transparent ')).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    for (const bad of [
      '',
      '#12',
      '#12345',
      'red',
      'rgb(1, 2)',
      'rgb(a, b, c)',
      'hsl(x, 1%, 1%)',
      'rgb(1,2,3,x)',
      'hsl(1, a, 1%)',
    ])
      expect(parseColor(bad)).toBeUndefined();
  });

  it('converts between RGB, HSV, and HSL', () => {
    expect(rgbToHsv({ r: 255, g: 0, b: 0, a: 1 })).toEqual({
      h: 0,
      s: 1,
      v: 1,
      a: 1,
    });
    expect(rgbToHsv({ r: 0, g: 255, b: 0, a: 1 }).h).toBe(120);
    expect(rgbToHsv({ r: 0, g: 0, b: 255, a: 1 }).h).toBe(240);
    expect(rgbToHsv({ r: 255, g: 0, b: 128, a: 1 }).h).toBeCloseTo(329.88, 1);
    expect(rgbToHsv({ r: 0, g: 0, b: 0, a: 1 })).toEqual({
      h: 0,
      s: 0,
      v: 0,
      a: 1,
    });
    for (const h of [0, 30, 90, 150, 210, 270, 330])
      expect(rgbToHsv(hsvToRgb({ h, s: 0.6, v: 0.8, a: 1 })).h).toBeCloseTo(
        h,
        6,
      );
    expect(rgbToHsl({ r: 216, g: 216, b: 216, a: 1 })).toEqual({
      h: 0,
      s: 0,
      l: 216 / 255,
      a: 1,
    });
    expect(rgbToHsl({ r: 255, g: 255, b: 255, a: 1 }).s).toBe(0);
    expect(formatHex(hslToRgb(rgbToHsl({ r: 18, g: 52, b: 86, a: 1 })))).toBe(
      '#123456',
    );
    expect(formatHex(hslToRgb({ h: 0, s: 1, l: 0, a: 1 }))).toBe('#000000');
    expect(grayLevel({ r: 255, g: 255, b: 255, a: 1 })).toBeCloseTo(1);
  });

  it('round-trips every 8-bit gray and a sample of colors through HSV without drift', () => {
    for (let level = 0; level < 256; level += 1) {
      const hex = formatHex({ r: level, g: level, b: level, a: 1 });
      expect(formatHex(hsvToRgb(rgbToHsv(parseColor(hex)!)))).toBe(hex);
    }
    for (let i = 0; i < 4096; i += 37) {
      const rgba = {
        r: (i * 7) % 256,
        g: (i * 13) % 256,
        b: (i * 29) % 256,
        a: 1,
      };
      const hex = formatHex(rgba);
      expect(formatHex(hsvToRgb(rgbToHsv(parseColor(hex)!)))).toBe(hex);
      expect(formatHex(hslToRgb(rgbToHsl(parseColor(hex)!)))).toBe(hex);
    }
  });

  it('formats alpha only below 1, clamped', () => {
    expect(formatHex({ r: 1, g: 2, b: 3, a: 1 })).toBe('#010203');
    expect(formatHex({ r: 1, g: 2, b: 3, a: 0.5 })).toBe('#01020380');
    expect(formatHex({ r: 300, g: -2, b: 3, a: 2 })).toBe('#ff0003');
  });

  it('keeps the current HSV for the same hex and a hue for a gray value', () => {
    const current = { h: 200, s: 0, v: 0.5, a: 1 };
    expect(hsvForValue(formatHex(hsvToRgb(current)), current)).toBe(current);
    expect(hsvForValue('#ffffff', current)).toEqual({
      h: 200,
      s: 0,
      v: 1,
      a: 1,
    });
    expect(hsvForValue('#ff0000', current)).toEqual({ h: 0, s: 1, v: 1, a: 1 });
    expect(hsvForValue('#808080')).toEqual({ h: 0, s: 0, v: 128 / 255, a: 1 });
    expect(hsvForValue('nope')).toBeUndefined();
  });
});
