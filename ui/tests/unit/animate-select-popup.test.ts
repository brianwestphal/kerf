import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { animateSelectPopup } from '../../src/animate-select-popup.js';

describe('Select animation completion', () => {
  let frames: FrameRequestCallback[];
  beforeEach(() => {
    frames = [];
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => frames.push(callback)),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('finishes absent motion and an already aborted transition', async () => {
    const popup = document.createElement('div');
    popup.getAnimations = () => [];
    const controller = new AbortController();
    const opening = animateSelectPopup(popup, 'show', controller.signal);
    frames[0](0);
    await opening;
    expect(popup.classList.contains('show')).toBe(false);
    controller.abort();
    await animateSelectPopup(popup, 'hide', controller.signal);
    expect(popup.classList.contains('hide')).toBe(false);
  });

  it('ignores old animation events and promise completions after a reversal', async () => {
    const popup = document.createElement('div');
    let finishOld!: () => void;
    let cancelNew!: () => void;
    const oldFinished = new Promise<void>((resolve) => {
      finishOld = resolve;
    });
    const newFinished = new Promise<void>((_, reject) => {
      cancelNew = () => reject(new Error('canceled'));
    });
    const animations = vi
      .fn()
      .mockReturnValueOnce([{ finished: oldFinished }])
      .mockReturnValueOnce([{ finished: newFinished }]);
    popup.getAnimations = animations;
    const old = new AbortController();
    const closing = animateSelectPopup(popup, 'hide', old.signal);
    frames[0](0);
    old.abort();
    await closing;
    const opening = animateSelectPopup(
      popup,
      'show',
      new AbortController().signal,
    );
    frames[1](0);
    popup.dispatchEvent(new Event('animationcancel'));
    finishOld();
    await Promise.resolve();
    expect(popup.classList.contains('show')).toBe(true);
    cancelNew();
    await opening;
    expect(popup.classList.contains('show')).toBe(false);
  });
});
