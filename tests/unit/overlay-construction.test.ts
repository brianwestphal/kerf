/**
 * `overlay()` construction is one transaction: a malformed `initialFocus`
 * selector is rejected before any mutation, and any setup phase that throws
 * (the content's first render, `showModal()` / `showPopover()`, popover /
 * tooltip positioning) rolls back everything already installed — wrapper node,
 * mount, listeners, fallback-stack entry, top-layer state, moved focus — and
 * rethrows. No handle is returned on failure, so any residue would be
 * permanently orphaned. Each case then proves a subsequent overlay still opens
 * and dismisses normally (Escape reaches the right overlay).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { raw } from '../../src/jsx-runtime.js';
import { overlay, popover, tooltip } from '../../src/overlay.js';
import { signal } from '../../src/reactive.js';
import { anchorAt } from './overlay-test-helpers.js';

function key(target: EventTarget, k: string): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', {
    key: k,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(ev);
  return ev;
}

function focusedTrigger(): HTMLButtonElement {
  const trigger = document.createElement('button');
  trigger.id = 'trigger';
  document.body.appendChild(trigger);
  trigger.focus();
  return trigger;
}

/** Track document-level listeners added/removed, to prove none leak. */
function trackDocumentListeners(): { live: () => number; restore: () => void } {
  const add = vi.spyOn(document, 'addEventListener');
  const remove = vi.spyOn(document, 'removeEventListener');
  return {
    live: () => add.mock.calls.length - remove.mock.calls.length,
    restore: () => {
      add.mockRestore();
      remove.mockRestore();
    },
  };
}

/** A subsequent overlay opens, receives Escape, and tears down cleanly. */
function expectHealthyFollowUp(): void {
  const onDismiss = vi.fn();
  const next = overlay(raw('<button class="next">n</button>'), {
    className: 'next-overlay',
    onDismiss,
  });
  expect(document.activeElement).toBe(next.el.querySelector('.next'));
  key(document, 'Escape');
  expect(onDismiss).toHaveBeenCalledTimes(1);
  expect(next.el.isConnected).toBe(false);
}

beforeEach(() => {
  document.body.innerHTML = '';
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('overlay() — initialFocus selector validation', () => {
  it.each(['', '[[', 'button:nope(', '###'])(
    'rejects %j with a descriptive overlay() error before touching the DOM',
    (selector) => {
      const trigger = focusedTrigger();
      const listeners = trackDocumentListeners();
      let caught: unknown;
      try {
        overlay(raw('<button>x</button>'), { initialFocus: selector });
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(Error);
      const message = (caught as Error).message;
      expect(message).toContain('overlay()');
      expect(message).toContain('initialFocus');
      expect(message).toContain(JSON.stringify(selector));
      // The engine's own parse failure is preserved as the cause.
      expect((caught as Error).cause).toBeDefined();
      // Nothing was mutated: no wrapper, no listeners, focus untouched.
      expect(document.body.children.length).toBe(1);
      expect(listeners.live()).toBe(0);
      listeners.restore();
      expect(document.activeElement).toBe(trigger);
      expectHealthyFollowUp();
    },
  );

  it('a valid selector that matches nothing is still accepted', () => {
    const h = overlay(raw('<button>x</button>'), {
      initialFocus: '.missing',
    });
    expect(h.el.isConnected).toBe(true);
    h.close();
  });

  it('a bad selector leaves an already-open overlay topmost for Escape', () => {
    const lower = overlay(raw('<button>lower</button>'));
    expect(() =>
      overlay(raw('<button>x</button>'), { initialFocus: '[[' }),
    ).toThrow(/overlay\(\): invalid initialFocus selector/);
    key(document, 'Escape');
    expect(lower.el.isConnected).toBe(false);
  });

  it('popover() surfaces the same descriptive error with no residue', () => {
    const anchor = anchorAt({ top: 10, bottom: 20, left: 10, right: 60 });
    expect(() =>
      popover(anchor, raw('<button>x</button>'), { initialFocus: 'div[' }),
    ).toThrow(/overlay\(\): invalid initialFocus selector "div\["/);
    expect(document.querySelector('.kerf-popover')).toBeNull();
  });
});

describe('overlay() — construction rollback', () => {
  it('a throwing first render removes the wrapper, restores focus, and rethrows the original error', () => {
    const trigger = focusedTrigger();
    const lower = overlay(raw('<button class="lower">l</button>'));
    const listenersBefore = trackDocumentListeners();
    const boom = new Error('render failed');
    expect(() =>
      overlay(() => {
        throw boom;
      }),
    ).toThrow(boom);
    expect(listenersBefore.live()).toBe(0);
    listenersBefore.restore();
    expect(document.querySelectorAll('.kerf-overlay')).toHaveLength(1);
    // The lower overlay is still topmost: Escape dismisses it.
    key(document, 'Escape');
    expect(lower.el.isConnected).toBe(false);
    expect(document.activeElement).toBe(trigger);
    expectHealthyFollowUp();
  });

  it('a throwing showModal() closes nothing it did not open, disposes the mount, and restores focus', () => {
    const trigger = focusedTrigger();
    const count = signal(0);
    let renders = 0;
    const failure = new DOMException('not allowed', 'InvalidStateError');
    const showModal = vi
      .spyOn(HTMLDialogElement.prototype, 'showModal')
      .mockImplementation(() => {
        throw failure;
      });
    const close = vi.spyOn(HTMLDialogElement.prototype, 'close');
    const listeners = trackDocumentListeners();
    expect(() =>
      overlay(
        () => {
          renders++;
          return raw(`<button>${count.value}</button>`);
        },
        { native: true, trap: true },
      ),
    ).toThrow(failure);
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled(); // never entered the top layer
    expect(document.querySelector('dialog')).toBeNull();
    expect(listeners.live()).toBe(0);
    listeners.restore();
    // The mount was disposed: a later signal write re-renders nothing.
    expect(renders).toBe(1);
    count.value = 1;
    expect(renders).toBe(1);
    expect(document.activeElement).toBe(trigger);
    showModal.mockRestore();
    expectHealthyFollowUp();
  });

  it('a throwing showPopover() rolls back a native non-modal overlay', () => {
    const proto = HTMLElement.prototype as {
      showPopover?: () => void;
      hidePopover?: () => void;
    };
    const original = { show: proto.showPopover, hide: proto.hidePopover };
    const hide = vi.fn();
    const failure = new Error('popover failed');
    proto.showPopover = () => {
      throw failure;
    };
    proto.hidePopover = hide;
    try {
      const anchor = anchorAt({ top: 10, bottom: 20, left: 10, right: 60 });
      expect(() =>
        popover(anchor, raw('<div>menu</div>'), { native: true }),
      ).toThrow(failure);
      expect(hide).not.toHaveBeenCalled(); // never shown, so never hidden
      expect(document.querySelector('[popover]')).toBeNull();
    } finally {
      proto.showPopover = original.show;
      proto.hidePopover = original.hide;
    }
    expectHealthyFollowUp();
  });

  it('popover(): a positioning failure closes the just-opened overlay and pops its stack entry', () => {
    const lower = overlay(raw('<button>lower</button>'));
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    const failure = new Error('geometry failed');
    anchor.getBoundingClientRect = () => {
      throw failure;
    };
    expect(() => popover(anchor, raw('<div>menu</div>'))).toThrow(failure);
    expect(document.querySelector('.kerf-popover')).toBeNull();
    // Without the rollback the orphaned popover would stay topmost and
    // swallow the lower overlay's Escape.
    key(document, 'Escape');
    expect(lower.el.isConnected).toBe(false);
  });

  it('tooltip(): a positioning failure on show leaves no orphaned tooltip', () => {
    vi.useFakeTimers();
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    const failure = new Error('geometry failed');
    anchor.getBoundingClientRect = () => {
      throw failure;
    };
    const stop = tooltip(anchor, 'tip', { delay: 0 });
    anchor.dispatchEvent(new Event('pointerenter'));
    expect(() => vi.advanceTimersByTime(1)).toThrow(failure);
    expect(document.querySelector('.kerf-tooltip')).toBeNull();
    stop();
    vi.useRealTimers();
    expectHealthyFollowUp();
  });
});
