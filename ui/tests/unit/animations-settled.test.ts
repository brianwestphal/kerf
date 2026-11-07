import type { Page } from '@playwright/test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  animationProgressed,
  animationsSettled,
} from '../helpers/animations-settled.js';

const getAnimationsDescriptor = Object.getOwnPropertyDescriptor(
  document,
  'getAnimations',
);

afterEach(() => {
  vi.unstubAllGlobals();
  if (getAnimationsDescriptor)
    Object.defineProperty(document, 'getAnimations', getAnimationsDescriptor);
  else Reflect.deleteProperty(document, 'getAnimations');
});

function animations(items: Animation[]) {
  Object.defineProperty(document, 'getAnimations', {
    configurable: true,
    value: () => items,
  });
}

describe('animation waits', () => {
  it('settles if a sampled animation pauses before its finished promise resolves', async () => {
    let frames = 0;
    const pending = new Promise<AnimationPlayState>(() => undefined);
    animations([
      {
        get playState() {
          return frames < 2 ? 'running' : 'paused';
        },
        effect: { getComputedTiming: () => ({ endTime: 500 }) },
        finished: pending,
      } as unknown as Animation,
    ]);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      globalThis.queueMicrotask(() => {
        frames++;
        callback(performance.now());
      });
    });

    await animationsSettled({
      evaluate: (fn: () => Promise<void>) => fn(),
    } as Page);
    expect(frames).toBeGreaterThanOrEqual(3);
  });

  it('does not return while a finite animation is still running after 20 frames', async () => {
    let frames = 0;
    animations([
      {
        get playState() {
          return frames < 30 ? 'running' : 'finished';
        },
        effect: { getComputedTiming: () => ({ endTime: 1_000 }) },
      } as unknown as Animation,
    ]);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      globalThis.queueMicrotask(() => {
        frames++;
        callback(performance.now());
      });
    });

    await animationsSettled({
      evaluate: (fn: () => Promise<void>) => fn(),
    } as Page);
    expect(frames).toBeGreaterThanOrEqual(31);
  });

  it('requires a running view transition at the requested progress', async () => {
    let predicate: ((minimum: number) => boolean) | undefined;
    const page = {
      waitForFunction: (fn: (minimum: number) => boolean) => {
        predicate = fn;
      },
    } as unknown as Page;
    await animationProgressed(page, 90);
    const ready = (items: Animation[]) => {
      animations(items);
      return predicate!(90);
    };
    const animation = (
      pseudoElement: string,
      currentTime: number,
      playState: AnimationPlayState = 'running',
    ) =>
      ({
        playState,
        currentTime,
        effect: {
          pseudoElement,
          getComputedTiming: () => ({ endTime: 250 }),
        },
      }) as unknown as Animation;

    expect(ready([])).toBe(false);
    expect(ready([animation('::before', 100)])).toBe(false);
    expect(ready([animation('::view-transition-old(vt)', 89)])).toBe(false);
    expect(
      ready([animation('::view-transition-old(vt)', 100, 'finished')]),
    ).toBe(false);
    expect(ready([animation('::view-transition-old(vt)', 100)])).toBe(true);
  });
});
