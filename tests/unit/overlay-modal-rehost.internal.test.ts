/**
 * Surfaces already showing when kerf opens a modal `<dialog>` (KF-FJ9VD8).
 * The lift in `overlay-modal-promotion.internal.test.ts` is decided when a
 * surface OPENS, so a tooltip or popover already on screen when a modal dialog
 * opened later stayed a plain `<div>` beneath it — inert and hidden. Whenever
 * kerf itself opens a modal `<dialog>` (a `native: true` modal, or a lifted
 * one), it now re-hosts every open non-modal kerf surface in the top layer
 * above the new dialog. An app-owned dialog opened outside kerf is not
 * observed (documented limitation).
 *
 * happy-dom has no Popover API, so it is stubbed with a call log; the real
 * paint order is pinned in `tests/browser/overlay-modal-promotion.spec.ts`.
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from 'vitest';

import { _resetWarnedForTests } from '../../src/dev-overlay-warn.js';
import { raw } from '../../src/jsx-runtime.js';
import { confirm, overlay, popover, tooltip } from '../../src/overlay.js';

const proto = HTMLElement.prototype as {
  showPopover?: () => void;
  hidePopover?: () => void;
};
const original = { show: proto.showPopover, hide: proto.hidePopover };
let calls: string[];

function stubPopoverApi(): void {
  proto.showPopover = function (this: HTMLElement) {
    calls.push(`show:${this.className}`);
    this.dataset.shown = 'true';
  };
  proto.hidePopover = function (this: HTMLElement) {
    calls.push(`hide:${this.className}`);
    delete this.dataset.shown;
  };
}

let warn: MockInstance<typeof console.warn>;
const disposers: Array<() => void> = [];

beforeEach(() => {
  document.body.innerHTML = '';
  calls = [];
  _resetWarnedForTests();
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.useFakeTimers();
});
afterEach(() => {
  // Tear everything down while the stub (if any) is still installed.
  disposers.splice(0).forEach((dispose) => dispose());
  proto.showPopover = original.show;
  proto.hidePopover = original.hide;
  warn.mockRestore();
  vi.useRealTimers();
});

function button(id: string): HTMLElement {
  const el = document.createElement('button');
  el.id = id;
  document.body.appendChild(el);
  return el;
}

function showTooltip(anchor: HTMLElement, native = false): HTMLElement {
  disposers.push(tooltip(anchor, 'tip', { delay: 0, native }));
  anchor.dispatchEvent(new Event('pointerenter'));
  vi.advanceTimersByTime(0);
  return document.querySelector('.kerf-tooltip') as HTMLElement;
}

const openNativeModal = () => {
  const h = overlay(raw('<button id="in-dialog">x</button>'), {
    native: true,
    className: 'modal',
  });
  disposers.push(() => h.close());
  return h;
};

describe('opening a kerf modal <dialog> re-hosts surfaces already showing', () => {
  it('a plain tooltip already on screen moves into the top layer above the new dialog', () => {
    stubPopoverApi();
    const tip = showTooltip(button('anchor'));
    expect(tip.hasAttribute('popover')).toBe(false); // no dialog yet

    openNativeModal();
    expect(tip.getAttribute('popover')).toBe('manual');
    expect(tip.dataset.shown).toBe('true');
    expect(tip.style.inset).toBe('auto');
    expect(calls).toEqual(['show:kerf-tooltip']);
    expect(warn).not.toHaveBeenCalled(); // a tooltip has no controls
  });

  it('a re-hosted popover hides through the Popover API when it closes', () => {
    stubPopoverApi();
    const pop = popover(button('anchor'), raw('<p>menu</p>'), {
      className: 'menu',
    });
    openNativeModal();
    pop.close();
    expect(calls).toEqual(['show:menu', 'hide:menu']);
    expect(pop.el.isConnected).toBe(false);
  });

  it('an interactive popover is re-hosted, and dev warns that its controls stay inert', () => {
    stubPopoverApi();
    const pop = popover(button('anchor'), raw('<button>pick</button>'), {
      className: 'menu',
    });
    disposers.push(() => pop.close());
    openNativeModal();
    expect(pop.el.dataset.shown).toBe('true');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toMatch(/inert/);
  });

  it('a surface already in the top layer is re-shown so it stacks above the new dialog', () => {
    stubPopoverApi();
    const tip = showTooltip(button('anchor'), true); // native: already a [popover]
    expect(calls).toEqual(['show:kerf-tooltip']);

    openNativeModal();
    expect(calls).toEqual([
      'show:kerf-tooltip',
      'hide:kerf-tooltip',
      'show:kerf-tooltip',
    ]);
    expect(tip.dataset.shown).toBe('true');
  });

  it('a lifted modal (confirm() inside a native dialog) re-shows a lifted tooltip above itself', () => {
    stubPopoverApi();
    openNativeModal();
    const tip = showTooltip(document.getElementById('in-dialog')!);
    expect(calls).toEqual(['show:kerf-tooltip']); // lifted at open

    void confirm('Sure?', { className: 'inner' });
    expect(document.querySelector('dialog.inner')).not.toBeNull();
    expect(calls).toEqual([
      'show:kerf-tooltip',
      'hide:kerf-tooltip',
      'show:kerf-tooltip',
    ]);
    expect(tip.dataset.shown).toBe('true');
  });

  it('without the Popover API a showing surface stays a <div> and dev warns it is hidden', () => {
    const tip = showTooltip(button('anchor')); // happy-dom: no Popover API
    openNativeModal();
    expect(tip.hasAttribute('popover')).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toMatch(/beneath/);
  });

  it('a fallback MODAL already open is left beneath the new dialog (stacking, not re-hosting)', () => {
    stubPopoverApi();
    const lower = overlay(raw('<button>lower</button>'), {
      className: 'lower',
    });
    disposers.push(() => lower.close());
    openNativeModal();
    expect(lower.el.hasAttribute('popover')).toBe(false);
    expect(calls).toEqual([]);
  });

  it('an app-owned dialog opened outside kerf does not re-host (documented limitation)', () => {
    stubPopoverApi();
    const tip = showTooltip(button('anchor'));
    const dialog = document.createElement('dialog');
    document.body.appendChild(dialog);
    dialog.showModal();
    expect(tip.hasAttribute('popover')).toBe(false);
    dialog.close();
  });
});
