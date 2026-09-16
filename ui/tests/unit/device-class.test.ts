import { afterEach, describe, expect, it, vi } from 'vitest';

import { classifyViewport, DEFAULT_BREAKPOINTS, deviceClass } from '../../src/device-class.js';

function setViewport(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: height, configurable: true });
}

/** A matchMedia stub that reports `n` horizontal segments and 1 vertical. */
function segmentedMatchMedia(horizontal: number): (query: string) => { matches: boolean } {
  return (query: string) => ({ matches: query === `(horizontal-viewport-segments: ${horizontal})` });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('classifyViewport', () => {
  it('buckets width into the five sizes at the default breakpoints', () => {
    expect(classifyViewport(320, 'portrait').size).toBe('xs-mobile');
    expect(classifyViewport(360, 'portrait').size).toBe('mobile');
    expect(classifyViewport(720, 'landscape').size).toBe('tablet');
    expect(classifyViewport(1024, 'landscape').size).toBe('desktop');
    expect(classifyViewport(1440, 'landscape').size).toBe('xl-desktop');
    expect(classifyViewport(1920, 'landscape').size).toBe('xl-desktop');
  });

  it('derives handset and compact from size and orientation', () => {
    expect(classifyViewport(320, 'portrait').handset).toBe(true);
    expect(classifyViewport(360, 'portrait').handset).toBe(true);
    expect(classifyViewport(720, 'landscape').handset).toBe(false);
    // A portrait tablet is compact (one pane at a time); a landscape tablet is not.
    expect(classifyViewport(720, 'portrait').compact).toBe(true);
    expect(classifyViewport(720, 'landscape').compact).toBe(false);
    expect(classifyViewport(320, 'portrait').compact).toBe(true);
    expect(classifyViewport(1024, 'landscape').compact).toBe(false);
  });

  it('answers atLeast against the size order', () => {
    const tablet = classifyViewport(720, 'landscape');
    expect(tablet.atLeast('mobile')).toBe(true);
    expect(tablet.atLeast('tablet')).toBe(true);
    expect(tablet.atLeast('desktop')).toBe(false);
    expect(tablet.atLeast('xl-desktop')).toBe(false);
  });

  it('defaults segment counts to 1 and passes explicit counts through', () => {
    expect(classifyViewport(1024, 'landscape')).toMatchObject({ segments: 1, verticalSegments: 1 });
    expect(classifyViewport(1024, 'landscape', 2, 2)).toMatchObject({ segments: 2, verticalSegments: 2 });
  });

  it('honors custom breakpoints', () => {
    const bp = { ...DEFAULT_BREAKPOINTS, tablet: 900 };
    expect(classifyViewport(800, 'landscape', 1, 1, bp).size).toBe('mobile');
    expect(classifyViewport(900, 'landscape', 1, 1, bp).size).toBe('tablet');
  });
});

describe('deviceClass', () => {
  it('reflects the current window and reacts to resize', () => {
    setViewport(1200, 800);
    const device = deviceClass();
    expect(device.value.size).toBe('desktop');
    expect(device.value.orientation).toBe('landscape');

    setViewport(360, 800);
    window.dispatchEvent(new Event('resize'));
    expect(device.value.size).toBe('mobile');
    expect(device.value.orientation).toBe('portrait');

    // A second reader shares the one installed source (no second install).
    const other = deviceClass();
    expect(other.value.size).toBe('mobile');
  });

  it('applies per-reader custom breakpoints over the shared source', () => {
    setViewport(800, 600);
    window.dispatchEvent(new Event('resize'));
    const strict = deviceClass({ breakpoints: { tablet: 900 } });
    expect(strict.value.size).toBe('mobile');
  });

  it('detects viewport segments and falls back to one when unsupported', () => {
    setViewport(1400, 900);
    vi.stubGlobal('matchMedia', segmentedMatchMedia(2));
    Object.defineProperty(window, 'matchMedia', { value: segmentedMatchMedia(2), configurable: true });
    window.dispatchEvent(new Event('resize'));
    expect(deviceClass().value.segments).toBe(2);
    expect(deviceClass().value.verticalSegments).toBe(1);

    // No matchMedia at all → single segment.
    Object.defineProperty(window, 'matchMedia', { value: undefined, configurable: true });
    window.dispatchEvent(new Event('resize'));
    expect(deviceClass().value.segments).toBe(1);
  });

  it('resolves to an SSR default without a DOM, overridable via options.ssr', () => {
    vi.stubGlobal('window', undefined);
    expect(deviceClass().value).toMatchObject({ size: 'desktop', orientation: 'landscape', segments: 1 });
    expect(deviceClass({ ssr: { width: 375, height: 812 } }).value).toMatchObject({ size: 'mobile', orientation: 'portrait' });
  });
});
