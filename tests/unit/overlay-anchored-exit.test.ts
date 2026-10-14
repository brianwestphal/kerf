/**
 * Exit motion for the anchored surfaces — `popover()` and `tooltip()` forward
 * `exitClass` / `exitDuration` to `overlay()`'s exit machinery. The transition
 * matrix: open → close-with-exit → removal, and the edges that must stay
 * instant (anchor removal, construction rollback, the tooltip disposer) or
 * must not double up (a tooltip re-shown while its previous node is still
 * exiting). happy-dom's `getAnimations()` never sees CSS, so a controllable
 * fake animation keeps each exit running until the test settles it; the real
 * CSS exit is `tests/browser/overlay-exit.spec.ts`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { raw } from '../../src/jsx-runtime.js';
import { popover, tooltip } from '../../src/overlay.js';
import { rectFn } from './overlay-test-helpers.js';

/** A finite fake `Animation` whose `finished` settles on demand. */
function fakeAnimation(): { animation: Animation; settle: () => void } {
  let settle!: () => void;
  const finished = new Promise<void>((resolve) => {
    settle = resolve;
  });
  const animation = {
    finished,
    effect: { getComputedTiming: () => ({ endTime: 200 }) },
  } as unknown as Animation;
  return { animation, settle };
}

/** Every exit started from now on reports one running animation. */
function runningExit(): { settle: () => void } {
  const { animation, settle } = fakeAnimation();
  vi.spyOn(Element.prototype, 'getAnimations').mockImplementation(() => [
    animation,
  ]);
  return { settle };
}

async function microtasks(): Promise<void> {
  for (let i = 0; i < 6; i++) await Promise.resolve();
}

/** MutationObserver delivery (the anchor watch) needs a macrotask turn. */
async function observe(): Promise<void> {
  vi.useRealTimers();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

const EXIT = { exitClass: 'is-leaving', exitDuration: 300 } as const;
const tips = () => document.querySelectorAll<HTMLElement>('.kerf-tooltip');

let anchor: HTMLButtonElement;

beforeEach(() => {
  document.body.innerHTML = '<button id="anchor">a</button>';
  anchor = document.getElementById('anchor') as HTMLButtonElement;
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('popover() — exitClass / exitDuration', () => {
  it('no exit configured: close() removes the node synchronously', () => {
    const pop = popover(anchor, raw('<p>menu</p>'));
    pop.close();
    expect(pop.el.isConnected).toBe(false);
  });

  it('close() plays the exit: result settles, wrapper inert + classed, node removed when the exit ends', async () => {
    const { settle } = runningExit();
    const pop = popover(anchor, raw('<p>menu</p>'), EXIT);
    pop.close('picked');
    await expect(pop.result).resolves.toBe('picked');
    expect(pop.el.isConnected).toBe(true);
    expect(pop.el.inert).toBe(true);
    expect(pop.el.classList.contains('is-leaving')).toBe(true);
    settle();
    await microtasks();
    expect(pop.el.isConnected).toBe(false);
  });

  it('an outside-click dismissal plays the exit (onDismiss runs once)', () => {
    runningExit();
    const onDismiss = vi.fn();
    const pop = popover(anchor, raw('<p>menu</p>'), { ...EXIT, onDismiss });
    document.body.click();
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(pop.el.classList.contains('is-leaving')).toBe(true);
    document.body.click(); // listeners are gone during the exit
    expect(onDismiss).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(300); // the cap
    expect(pop.el.isConnected).toBe(false);
  });

  it('close(_, { instant: true }) skips the exit', () => {
    runningExit();
    const pop = popover(anchor, raw('<p>menu</p>'), EXIT);
    pop.close(undefined, { instant: true });
    expect(pop.el.isConnected).toBe(false);
    expect(pop.el.classList.contains('is-leaving')).toBe(false);
  });

  it('the anchor leaving the document closes the popover instantly (no exit class)', async () => {
    runningExit();
    const pop = popover(anchor, raw('<p>menu</p>'), EXIT);
    anchor.remove();
    await observe();
    expect(pop.el.isConnected).toBe(false);
    expect(pop.el.classList.contains('is-leaving')).toBe(false);
  });

  it('stops repositioning once close() settles result, while the node still exits', async () => {
    runningExit();
    const pop = popover(anchor, raw('<p>menu</p>'), EXIT);
    const top = pop.el.style.top;
    pop.close();
    await microtasks(); // the reposition stop is a `result` reaction
    anchor.getBoundingClientRect = rectFn({ top: 300, bottom: 320 });
    window.dispatchEvent(new Event('resize'));
    expect(pop.el.isConnected).toBe(true); // still exiting
    expect(pop.el.style.top).toBe(top);
  });

  it('a positioning failure rolls back instantly even with an exit configured', () => {
    runningExit();
    anchor.getBoundingClientRect = () => {
      throw new Error('no geometry');
    };
    expect(() => popover(anchor, raw('<p>menu</p>'), EXIT)).toThrow(
      'no geometry',
    );
    expect(document.querySelector('.kerf-popover')).toBeNull();
  });
});

describe('tooltip() — exitClass / exitDuration', () => {
  const show = () => {
    anchor.dispatchEvent(new Event('pointerenter'));
    vi.advanceTimersByTime(0);
  };
  const leave = () => {
    anchor.dispatchEvent(new Event('pointerleave'));
    vi.advanceTimersByTime(100);
  };

  it('the hide after hideDelay plays the exit, then the node goes', async () => {
    const { settle } = runningExit();
    const stop = tooltip(anchor, 'tip', { delay: 0, hideDelay: 100, ...EXIT });
    show();
    const tip = tips()[0] as HTMLElement;
    leave();
    expect(tip.isConnected).toBe(true);
    expect(tip.inert).toBe(true);
    expect(tip.classList.contains('is-leaving')).toBe(true);
    settle();
    await microtasks();
    expect(tip.isConnected).toBe(false);
    stop();
  });

  it('re-entering during the hide delay keeps the shown node (no exit starts)', () => {
    runningExit();
    const stop = tooltip(anchor, 'tip', { delay: 0, hideDelay: 100, ...EXIT });
    show();
    const tip = tips()[0];
    anchor.dispatchEvent(new Event('pointerleave'));
    anchor.dispatchEvent(new Event('pointerenter'));
    vi.advanceTimersByTime(100);
    expect(tips()).toHaveLength(1);
    expect(tips()[0]).toBe(tip);
    expect(tip.classList.contains('is-leaving')).toBe(false);
    stop();
  });

  it('re-shown while the previous node is exiting: the leaving node goes at once and a fresh one opens', () => {
    runningExit();
    const stop = tooltip(anchor, 'tip', {
      delay: 50,
      hideDelay: 100,
      ...EXIT,
    });
    anchor.dispatchEvent(new Event('pointerenter'));
    vi.advanceTimersByTime(50);
    const first = tips()[0];
    leave(); // exit running, cap 300 ms
    anchor.dispatchEvent(new Event('pointerenter'));
    vi.advanceTimersByTime(49);
    expect(tips()).toHaveLength(1); // still the leaving one
    expect(first.classList.contains('is-leaving')).toBe(true);
    vi.advanceTimersByTime(1); // show fires mid-exit
    expect(tips()).toHaveLength(1);
    expect(first.isConnected).toBe(false);
    const fresh = tips()[0];
    expect(fresh).not.toBe(first);
    expect(fresh.classList.contains('is-leaving')).toBe(false);
    expect(fresh.inert).toBe(false);
    stop();
  });

  it('hide → exit → re-show → hide again: each cycle leaves exactly one node behind', async () => {
    const { settle } = runningExit();
    const stop = tooltip(anchor, 'tip', { delay: 0, hideDelay: 100, ...EXIT });
    for (let cycle = 0; cycle < 3; cycle++) {
      show();
      expect(tips()).toHaveLength(1);
      leave();
      expect(tips()).toHaveLength(1);
    }
    settle();
    await microtasks();
    expect(tips()).toHaveLength(0);
    stop();
  });

  it('the anchor leaving the document hides instantly (no exit class)', async () => {
    runningExit();
    const stop = tooltip(anchor, 'tip', { delay: 0, ...EXIT });
    show();
    const tip = tips()[0];
    anchor.remove();
    await observe();
    expect(tip.isConnected).toBe(false);
    expect(tip.classList.contains('is-leaving')).toBe(false);
    stop();
  });

  it('the disposer hides a shown tooltip instantly', () => {
    runningExit();
    const stop = tooltip(anchor, 'tip', { delay: 0, ...EXIT });
    show();
    const tip = tips()[0];
    stop();
    expect(tip.isConnected).toBe(false);
    expect(tip.classList.contains('is-leaving')).toBe(false);
  });

  it('the disposer ends an exit already running', () => {
    runningExit();
    const stop = tooltip(anchor, 'tip', { delay: 0, hideDelay: 100, ...EXIT });
    show();
    const tip = tips()[0];
    leave();
    expect(tip.isConnected).toBe(true);
    stop();
    expect(tip.isConnected).toBe(false);
    expect(vi.getTimerCount()).toBe(0); // the exit cap was cleared
  });

  it('a failed show rolls back instantly even with an exit configured', () => {
    runningExit();
    anchor.getBoundingClientRect = () => {
      throw new Error('no geometry');
    };
    const stop = tooltip(anchor, 'tip', { delay: 0, ...EXIT });
    anchor.dispatchEvent(new Event('pointerenter'));
    expect(() => vi.advanceTimersByTime(0)).toThrow('no geometry');
    expect(tips()).toHaveLength(0);
    stop();
  });

  it('prefers-reduced-motion: reduce hides synchronously', () => {
    vi.spyOn(globalThis, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: query === '(prefers-reduced-motion: reduce)',
        }) as MediaQueryList,
    );
    const stop = tooltip(anchor, 'tip', { delay: 0, hideDelay: 100, ...EXIT });
    show();
    const tip = tips()[0];
    leave();
    expect(tip.isConnected).toBe(false);
    stop();
  });
});
