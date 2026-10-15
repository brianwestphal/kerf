import { afterEach, describe, expect, it, vi } from 'vitest';

interface Middleware {
  name: string;
  options?: unknown;
  fn: (state: {
    x: number;
    y: number;
    placement: string;
  }) => { x?: number; y?: number } | Promise<unknown>;
}

const calls = vi.hoisted(() => ({
  compute: [] as {
    anchor: unknown;
    options: { placement: string; strategy: string; middleware: Middleware[] };
  }[],
  auto: [] as unknown[][],
}));

vi.mock('@floating-ui/dom', () => ({
  computePosition: (
    anchor: unknown,
    _popup: HTMLElement,
    options: { placement: string; strategy: string; middleware: Middleware[] },
  ) => {
    calls.compute.push({ anchor, options });
    return Promise.resolve({
      x: 12,
      y: 34,
      placement: `${options.placement}-used`,
    });
  },
  autoUpdate: (...args: unknown[]) => {
    calls.auto.push(args);
    return () => undefined;
  },
  flip: (options: unknown) => ({ name: 'flip', options, fn: () => ({}) }),
  shift: (options: unknown) => ({ name: 'shift', options, fn: () => ({}) }),
  size: (options: {
    apply(state: { availableHeight: number; availableWidth: number }): void;
  }) => ({
    name: 'size',
    options,
    fn: () => ({}),
  }),
}));

import {
  followAnchor,
  pointAnchor,
  POPUP_VIEWPORT_PADDING,
  positionPopup,
} from '../../src/shared/popup/position-popup.js';

afterEach(() => {
  calls.compute.length = 0;
  calls.auto.length = 0;
});

const offsetOf = () =>
  calls.compute.at(-1)!.options.middleware.find((m) => m.name === 'offset')!;

describe('positionPopup', () => {
  it('positions fixed against the anchor and records the placement used', async () => {
    const anchor = document.createElement('button');
    const popup = document.createElement('div');
    popup.style.maxHeight = '10px';
    popup.style.maxWidth = '10px';
    const done = positionPopup(anchor, popup, { placement: 'bottom-start' });
    // The earlier cap is cleared so the natural size steers the flip.
    expect(popup.style.maxHeight).toBe('');
    expect(popup.style.maxWidth).toBe('');
    await done;
    const { anchor: used, options } = calls.compute[0]!;
    expect(used).toBe(anchor);
    expect(options.strategy).toBe('fixed');
    expect(options.placement).toBe('bottom-start');
    expect(options.middleware.map((m) => m.name)).toEqual([
      'offset',
      'flip',
      'shift',
      'size',
    ]);
    // Only the viewport bounds a top-layer popup.
    const boundary = document.documentElement;
    expect(options.middleware[1]!.options).toEqual({
      fallbackStrategy: 'bestFit',
      padding: POPUP_VIEWPORT_PADDING,
      boundary,
    });
    expect(options.middleware[2]!.options).toEqual({
      padding: POPUP_VIEWPORT_PADDING,
      crossAxis: true,
      boundary,
    });
    expect(popup.style.left).toBe('12px');
    expect(popup.style.top).toBe('34px');
    expect(popup.getAttribute('data-placement')).toBe('bottom-start-used');
  });

  it('caps the popup to the room its side has, never below zero', async () => {
    const popup = document.createElement('div');
    await positionPopup(document.body, popup, { placement: 'top', padding: 4 });
    const size = calls.compute[0]!.options.middleware[3]!.options as {
      padding: number;
      apply(state: { availableHeight: number; availableWidth: number }): void;
    };
    expect(size.padding).toBe(4);
    size.apply({ availableHeight: 120, availableWidth: 300 });
    expect([popup.style.maxHeight, popup.style.maxWidth]).toEqual([
      '120px',
      '300px',
    ]);
    size.apply({ availableHeight: -5, availableWidth: -1 });
    expect([popup.style.maxHeight, popup.style.maxWidth]).toEqual([
      '0px',
      '0px',
    ]);
  });

  it('offsets along the main axis by the gap and across it by the cross offset', async () => {
    await positionPopup(document.body, document.createElement('div'), {
      placement: 'bottom-start',
      gap: 4,
      crossOffset: -5,
    });
    const offset = offsetOf();
    expect(offset.fn({ x: 100, y: 200, placement: 'bottom-start' })).toEqual({
      x: 95,
      y: 204,
    });
    // An end alignment shifts the other way.
    expect(offset.fn({ x: 100, y: 200, placement: 'top-end' })).toEqual({
      x: 105,
      y: 196,
    });
    expect(offset.fn({ x: 100, y: 200, placement: 'right-start' })).toEqual({
      x: 104,
      y: 195,
    });
    expect(offset.fn({ x: 100, y: 200, placement: 'left-start' })).toEqual({
      x: 96,
      y: 195,
    });
    expect(offset.fn({ x: 100, y: 200, placement: 'right-end' })).toEqual({
      x: 104,
      y: 205,
    });
  });

  it('adds no offset by default', async () => {
    await positionPopup(document.body, document.createElement('div'), {
      placement: 'right-start',
    });
    expect(offsetOf().fn({ x: 1, y: 2, placement: 'right-start' })).toEqual({
      x: 1,
      y: 2,
    });
  });
});

describe('pointAnchor and followAnchor', () => {
  it('anchors at a zero-size viewport point', () => {
    expect(pointAnchor(30, 40).getBoundingClientRect()).toMatchObject({
      x: 30,
      y: 40,
      width: 0,
      height: 0,
    });
  });

  it('follows through floating-ui autoUpdate', () => {
    const anchor = document.createElement('button');
    const popup = document.createElement('div');
    const place = () => undefined;
    const stop = followAnchor(anchor, popup, place);
    expect(calls.auto[0]).toEqual([anchor, popup, place]);
    expect(typeof stop).toBe('function');
  });
});
