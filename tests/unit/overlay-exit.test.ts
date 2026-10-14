/**
 * `overlay()` exit motion (`exitClass` / `exitDuration`, `close(_, { instant })`)
 * — the transition matrix: open → close-with-exit → removal, and every
 * re-entrant edge (close twice, instant mid-exit, a new overlay opened
 * mid-exit, reduced motion, native hosts, construction rollback, the promise
 * dialogs). happy-dom's `getAnimations()` ignores `{ subtree }` and never sees
 * CSS animations, so the tests stub it with controllable fake animations; the
 * real exit animation is `tests/browser/overlay-exit.spec.ts`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { raw } from '../../src/jsx-runtime.js';
import { choice, confirm, form, overlay, prompt } from '../../src/overlay.js';
import { signal } from '../../src/reactive.js';

/** A fake `Animation`: `endTime` drives kerf's finite filter; `settle()` ends it. */
function fakeAnimation(endTime: number | null = 200): {
  animation: Animation;
  settle: () => void;
  cancel: () => void;
} {
  let settle!: () => void;
  let cancel!: () => void;
  const finished = new Promise<void>((resolve, reject) => {
    settle = resolve;
    cancel = () => reject(new DOMException('cancelled', 'AbortError'));
  });
  const animation = {
    finished,
    effect:
      endTime === null ? null : { getComputedTiming: () => ({ endTime }) },
  } as unknown as Animation;
  return { animation, settle, cancel };
}

/** Make the next `getAnimations()` call(s) report `animations`. */
function stubAnimations(animations: Animation[]) {
  return vi
    .spyOn(Element.prototype, 'getAnimations')
    .mockImplementation(() => animations);
}

/** Drain pending promise reactions (the early-out's `allSettled().then`). */
async function microtasks(): Promise<void> {
  for (let i = 0; i < 6; i++) await Promise.resolve();
}

const EXIT = { exitClass: 'is-leaving', exitDuration: 300 } as const;

let opener: HTMLButtonElement;

beforeEach(() => {
  document.body.innerHTML = '<button id="opener">open</button>';
  opener = document.getElementById('opener') as HTMLButtonElement;
  opener.focus();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('overlay() — no exit configured', () => {
  it('close() removes the node synchronously and never reads animations', () => {
    const spy = stubAnimations([]);
    const h = overlay(raw('<button>x</button>'));
    h.close();
    expect(h.el.isConnected).toBe(false);
    expect(h.el.inert).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('overlay() — exit window (exitClass / exitDuration)', () => {
  it('at close start: result settles, focus returns, wrapper is inert + classed, node lingers', async () => {
    const { animation, settle } = fakeAnimation();
    stubAnimations([animation]);
    const h = overlay(raw('<button class="in">x</button>'), EXIT);
    expect(document.activeElement?.className).toBe('in');
    h.close('done');
    await expect(h.result).resolves.toBe('done');
    expect(h.el.isConnected).toBe(true);
    expect(h.el.inert).toBe(true);
    expect(h.el.classList.contains('is-leaving')).toBe(true);
    expect(document.activeElement).toBe(opener);
    settle();
    await microtasks();
    expect(h.el.isConnected).toBe(false);
  });

  it('removes early when the running exit animations finish (before the cap)', async () => {
    const a = fakeAnimation();
    const b = fakeAnimation();
    stubAnimations([a.animation, b.animation]);
    const h = overlay(raw('<p>x</p>'), EXIT);
    h.close();
    a.settle();
    await microtasks();
    expect(h.el.isConnected).toBe(true); // still waiting on b
    b.cancel(); // a cancelled animation counts as settled
    await microtasks();
    expect(h.el.isConnected).toBe(false);
    expect(vi.getTimerCount()).toBe(0); // the cap was cleared
  });

  it('exitDuration is the hard cap when an animation never finishes', async () => {
    stubAnimations([fakeAnimation().animation]);
    const h = overlay(raw('<p>x</p>'), EXIT);
    h.close();
    vi.advanceTimersByTime(299);
    expect(h.el.isConnected).toBe(true);
    vi.advanceTimersByTime(1);
    expect(h.el.isConnected).toBe(false);
  });

  it('ignores infinite and effect-less animations: with nothing finite running it removes at once', async () => {
    const spy = stubAnimations([
      fakeAnimation(Infinity).animation,
      fakeAnimation(null).animation,
    ]);
    const h = overlay(raw('<p>x</p>'), EXIT);
    h.close();
    expect(spy).toHaveBeenCalledWith({ subtree: true });
    expect(h.el.isConnected).toBe(true);
    await microtasks();
    expect(h.el.isConnected).toBe(false);
  });

  it('without getAnimations() support the timeout alone ends the exit', () => {
    let proto: object | null = Element.prototype;
    while (proto !== null && !Object.hasOwn(proto, 'getAnimations'))
      proto = Object.getPrototypeOf(proto) as object | null;
    const owner = proto as Element;
    const descriptor = Object.getOwnPropertyDescriptor(
      owner,
      'getAnimations',
    ) as PropertyDescriptor;
    delete (owner as Partial<Element>).getAnimations;
    try {
      const h = overlay(raw('<p>x</p>'), EXIT);
      h.close();
      vi.advanceTimersByTime(299);
      expect(h.el.isConnected).toBe(true);
      vi.advanceTimersByTime(1);
      expect(h.el.isConnected).toBe(false);
    } finally {
      Object.defineProperty(owner, 'getAnimations', descriptor);
    }
  });

  it('exitDuration alone opts in (no class added) — e.g. a native allow-discrete transition', () => {
    stubAnimations([fakeAnimation().animation]);
    const h = overlay(raw('<p>x</p>'), { exitDuration: 120 });
    const classes = h.el.className;
    h.close();
    expect(h.el.className).toBe(classes);
    expect(h.el.inert).toBe(true);
    vi.advanceTimersByTime(120);
    expect(h.el.isConnected).toBe(false);
  });

  it('exitClass alone (exitDuration 0) mirrors toast: removal on the next tick', () => {
    stubAnimations([fakeAnimation().animation]);
    const h = overlay(raw('<p>x</p>'), { exitClass: 'out' });
    h.close();
    expect(h.el.classList.contains('out')).toBe(true);
    expect(h.el.isConnected).toBe(true);
    vi.advanceTimersByTime(0);
    expect(h.el.isConnected).toBe(false);
  });

  it('disposes the mount at close start — reactive content stops re-rendering', () => {
    stubAnimations([fakeAnimation().animation]);
    const label = signal('a');
    const h = overlay(() => raw(`<p>${label.value}</p>`), EXIT);
    h.close();
    label.value = 'b';
    expect(h.el.textContent).toBe('a');
    vi.advanceTimersByTime(300);
  });

  it('removes dismissal listeners at close start — a click or Escape during the exit is inert', () => {
    stubAnimations([fakeAnimation().animation]);
    const onDismiss = vi.fn();
    const h = overlay(raw('<p>x</p>'), { ...EXIT, onDismiss });
    h.el.click(); // backdrop
    expect(onDismiss).toHaveBeenCalledTimes(1);
    h.el.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(h.el.isConnected).toBe(true);
  });
});

describe('overlay() — re-entrancy during the exit', () => {
  it('close() twice: the second is a no-op and the first value wins', async () => {
    stubAnimations([fakeAnimation().animation]);
    const h = overlay(raw('<p>x</p>'), EXIT);
    h.close('first');
    h.close('second');
    await expect(h.result).resolves.toBe('first');
    expect(h.el.isConnected).toBe(true);
    expect(vi.getTimerCount()).toBe(1);
  });

  it('close(_, { instant: true }) mid-exit removes now and clears the cap', () => {
    stubAnimations([fakeAnimation().animation]);
    const h = overlay(raw('<p>x</p>'), EXIT);
    h.close();
    h.close(undefined, { instant: true });
    expect(h.el.isConnected).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    h.close(undefined, { instant: true }); // still idempotent
  });

  it('close(_, { instant: true }) up front skips the exit entirely', () => {
    const spy = stubAnimations([fakeAnimation().animation]);
    const h = overlay(raw('<p>x</p>'), EXIT);
    h.close('v', { instant: true });
    expect(h.el.isConnected).toBe(false);
    expect(h.el.classList.contains('is-leaving')).toBe(false);
    expect(h.el.inert).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('the exit finishing after an instant close is a no-op', async () => {
    const { animation, settle } = fakeAnimation();
    stubAnimations([animation]);
    const h = overlay(raw('<p>x</p>'), EXIT);
    h.close();
    h.close(undefined, { instant: true });
    const sibling = document.createElement('div');
    document.body.appendChild(sibling);
    settle();
    await microtasks();
    expect(sibling.isConnected).toBe(true);
  });

  it('an overlay opened mid-exit is topmost: Escape closes it, focus returns to the opener', () => {
    stubAnimations([fakeAnimation().animation]);
    const firstDismiss = vi.fn();
    const first = overlay(raw('<button>a</button>'), {
      ...EXIT,
      onDismiss: firstDismiss,
    });
    first.close();
    expect(document.activeElement).toBe(opener);
    const secondDismiss = vi.fn();
    const second = overlay(raw('<button class="b">b</button>'), {
      onDismiss: secondDismiss,
    });
    expect(document.activeElement?.className).toBe('b');
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }),
    );
    expect(secondDismiss).toHaveBeenCalledTimes(1);
    expect(firstDismiss).not.toHaveBeenCalled();
    expect(second.el.isConnected).toBe(false);
    expect(document.activeElement).toBe(opener);
    expect(first.el.isConnected).toBe(true); // still exiting
    vi.advanceTimersByTime(300);
    expect(first.el.isConnected).toBe(false);
  });

  it('open → close-with-exit → reopen: the new overlay is independent of the leaving one', () => {
    stubAnimations([fakeAnimation().animation]);
    const a = overlay(raw('<button>a</button>'), EXIT);
    a.close();
    const b = overlay(raw('<button>b</button>'), EXIT);
    expect(b.el.inert).toBe(false);
    expect(b.el.classList.contains('is-leaving')).toBe(false);
    vi.advanceTimersByTime(300);
    expect(a.el.isConnected).toBe(false);
    expect(b.el.isConnected).toBe(true);
    b.close();
    vi.advanceTimersByTime(300);
    expect(b.el.isConnected).toBe(false);
  });

  it('a construction failure rolls back instantly even with an exit configured', () => {
    const spy = stubAnimations([]);
    expect(() =>
      overlay(() => {
        throw new Error('render failed');
      }, EXIT),
    ).toThrow('render failed');
    expect(document.querySelector('.kerf-overlay')).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('overlay() — reduced motion', () => {
  it('prefers-reduced-motion: reduce skips the exit (no class, synchronous removal)', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
    }));
    const spy = stubAnimations([fakeAnimation().animation]);
    const h = overlay(raw('<p>x</p>'), EXIT);
    h.close();
    expect(h.el.isConnected).toBe(false);
    expect(h.el.classList.contains('is-leaving')).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('overlay() — native hosts during the exit', () => {
  it('a native <dialog> leaves the top layer at close start, lingers inert, then goes', () => {
    stubAnimations([fakeAnimation().animation]);
    const h = overlay(raw('<button>x</button>'), { ...EXIT, native: true });
    const dialog = h.el as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    h.close();
    expect(dialog.open).toBe(false);
    expect(dialog.isConnected).toBe(true);
    expect(dialog.inert).toBe(true);
    // A plain overlay opened mid-exit is not lifted: no modal is open now.
    const next = overlay(raw('<p>y</p>'));
    expect(next.el.tagName).toBe('DIV');
    next.close();
    vi.advanceTimersByTime(300);
    expect(dialog.isConnected).toBe(false);
  });

  it('a native [popover] is hidden at close start and removed after the exit', () => {
    const proto = HTMLElement.prototype as {
      showPopover?: () => void;
      hidePopover?: () => void;
    };
    const original = { show: proto.showPopover, hide: proto.hidePopover };
    let hidden = 0;
    proto.showPopover = () => {};
    proto.hidePopover = () => {
      hidden++;
    };
    try {
      stubAnimations([fakeAnimation().animation]);
      const h = overlay(raw('<p>x</p>'), {
        ...EXIT,
        native: true,
        trap: false,
      });
      h.close();
      expect(hidden).toBe(1);
      expect(h.el.isConnected).toBe(true);
      vi.advanceTimersByTime(300);
      expect(h.el.isConnected).toBe(false);
    } finally {
      proto.showPopover = original.show;
      proto.hidePopover = original.hide;
    }
  });
});

describe('overlay() — bottom sheet exit keeps following the keyboard', () => {
  it('the keyboard inset is published through the exit and cleared at removal', () => {
    const viewport = Object.assign(new EventTarget(), {
      height: 500,
      offsetTop: 0,
      scale: 1,
    });
    vi.stubGlobal('visualViewport', viewport);
    vi.stubGlobal('innerHeight', 800);
    stubAnimations([fakeAnimation().animation]);
    const h = overlay(raw('<input />'), {
      ...EXIT,
      presentation: 'bottom-sheet',
    });
    const inset = () => h.el.style.getPropertyValue('--kerf-keyboard-inset');
    expect(inset()).toBe('300px');
    h.close();
    viewport.height = 600; // the keyboard retracts during the exit
    viewport.dispatchEvent(new Event('resize'));
    expect(inset()).toBe('200px');
    vi.advanceTimersByTime(300);
    expect(inset()).toBe('');
    expect(h.el.isConnected).toBe(false);
  });
});

describe('promise dialogs — exitClass / exitDuration thread through; the promise settles at once', () => {
  it('confirm(): resolves on OK while the node is still exiting', async () => {
    stubAnimations([fakeAnimation().animation]);
    const p = confirm('Sure?', EXIT);
    const el = document.querySelector('.kerf-overlay') as HTMLElement;
    (el.querySelector('[data-confirm="ok"]') as HTMLElement).click();
    await expect(p).resolves.toBe(true);
    expect(el.classList.contains('is-leaving')).toBe(true);
    expect(el.isConnected).toBe(true);
    expect(document.activeElement).toBe(opener);
    vi.advanceTimersByTime(300);
    expect(el.isConnected).toBe(false);
  });

  it('prompt(), form(), and choice() exit the same way', async () => {
    stubAnimations([fakeAnimation().animation]);
    const settled = async (
      open: () => Promise<unknown>,
      control: string,
      expected: unknown,
    ): Promise<void> => {
      const p = open();
      const els = document.querySelectorAll<HTMLElement>('.kerf-overlay');
      const el = els[els.length - 1];
      (el.querySelector(control) as HTMLElement).click();
      await expect(p).resolves.toEqual(expected);
      expect(el.classList.contains('is-leaving')).toBe(true);
      expect(el.isConnected).toBe(true);
      vi.advanceTimersByTime(300);
      expect(el.isConnected).toBe(false);
    };
    await settled(
      () => prompt('Name', { ...EXIT, defaultValue: 'Ada' }),
      '[data-prompt="ok"]',
      'Ada',
    );
    await settled(
      () => form([{ name: 'n', defaultValue: 'v' }], EXIT),
      '[data-form="ok"]',
      { n: 'v' },
    );
    await settled(
      () => choice('Pick', [{ label: 'A', value: 'a' }], EXIT),
      '[data-choice="0"]',
      'a',
    );
  });

  it('a guarded throw rejects at once and the dialog still exits', async () => {
    stubAnimations([fakeAnimation().animation]);
    const p = prompt('Name', {
      ...EXIT,
      validate: () => {
        throw new Error('boom');
      },
    });
    const el = document.querySelector('.kerf-overlay') as HTMLElement;
    (el.querySelector('[data-prompt="ok"]') as HTMLElement).click();
    await expect(p).rejects.toThrow('boom');
    expect(el.classList.contains('is-leaving')).toBe(true);
    vi.advanceTimersByTime(300);
    expect(el.isConnected).toBe(false);
  });

  it('a wiring failure at construction rolls back instantly', () => {
    stubAnimations([fakeAnimation().animation]);
    expect(() =>
      prompt('Name', { ...EXIT, render: () => raw('<div>no input</div>') }),
    ).toThrow('render missing');
    expect(document.querySelector('.kerf-overlay')).toBeNull();
  });
});

describe('overlay() — a slot-hosted surface whose node is removed closes instantly', () => {
  it('removing the wrapper from the document ends it without an exit', async () => {
    vi.useRealTimers();
    stubAnimations([fakeAnimation().animation]);
    const dialog = document.createElement('dialog');
    document.body.appendChild(dialog);
    dialog.showModal();
    const host = document.createElement('div');
    host.setAttribute('data-kerf-overlay-host', '');
    host.setAttribute('data-morph-skip', '');
    dialog.appendChild(host);
    const onDismiss = vi.fn();
    const h = overlay(raw('<button>x</button>'), {
      ...EXIT,
      container: host,
      trap: false,
      dismiss: false,
      onDismiss,
    });
    let settled = false;
    void h.result.then(() => {
      settled = true;
    });
    h.el.remove();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(settled).toBe(true);
    expect(h.el.classList.contains('is-leaving')).toBe(false);
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
