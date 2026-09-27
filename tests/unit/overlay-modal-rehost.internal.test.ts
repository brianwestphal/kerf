/**
 * Surfaces already showing when kerf opens a modal `<dialog>` (KF-FJ9VD8).
 * The lift in `overlay-modal-promotion.internal.test.ts` is decided when a
 * surface OPENS, so a tooltip or popover already on screen when a modal dialog
 * opened later stayed a plain `<div>` beneath it — inert and hidden. Whenever
 * kerf itself opens a modal `<dialog>` (a `native: true` modal, or a lifted
 * one), it now re-hosts every open non-modal kerf surface in the top layer
 * above the new dialog. KF-AHY6H4 extends that to an app-owned modal dialog
 * opened outside kerf: a document capture listener for the dialog's `toggle`
 * event, installed only while a kerf surface is open, re-hosts the same way.
 * An engine that fires no `toggle` for dialogs is the documented gap.
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

  it('a lifted modal (confirm() inside a native dialog) re-hosts a tooltip from the dialog host slot above itself', () => {
    stubPopoverApi();
    openNativeModal();
    const tip = showTooltip(document.getElementById('in-dialog')!);
    // Anchored inside the dialog: rendered into its host slot, not lifted.
    expect(tip.parentElement!.hasAttribute('data-kerf-overlay-host')).toBe(
      true,
    );
    expect(calls).toEqual([]);

    void confirm('Sure?', { className: 'inner' });
    disposers.unshift(() =>
      document
        .querySelector('dialog.inner')!
        .dispatchEvent(new Event('cancel', { cancelable: true })),
    );
    expect(document.querySelector('dialog.inner')).not.toBeNull();
    expect(calls).toEqual(['show:kerf-tooltip']);
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

  it('an engine that fires no dialog toggle event leaves an app-owned dialog unobserved (documented gap)', () => {
    stubPopoverApi();
    const tip = showTooltip(button('anchor'));
    const dialog = document.createElement('dialog');
    document.body.appendChild(dialog);
    dialog.showModal(); // happy-dom dispatches no `toggle` here
    expect(tip.hasAttribute('popover')).toBe(false);
    dialog.close();
  });
});

const realMatches = Element.prototype.matches;

/** An app-owned modal dialog opened outside kerf, then its `toggle` event. */
function openAppDialog(): HTMLDialogElement {
  const dialog = document.createElement('dialog');
  dialog.innerHTML = '<p>app</p>';
  document.body.appendChild(dialog);
  dialog.showModal();
  // happy-dom has no `:modal`: report this dialog as the modal one.
  const matches = vi
    .spyOn(Element.prototype, 'matches')
    .mockImplementation(function (this: Element, selector: string) {
      return selector === ':modal'
        ? this === dialog
        : realMatches.call(this, selector);
    });
  disposers.push(() => {
    matches.mockRestore();
    dialog.close();
  });
  dialog.dispatchEvent(new Event('toggle')); // does not bubble, like the real one
  return dialog;
}

describe('an app-owned modal <dialog> opened outside kerf', () => {
  it('re-hosts a plain tooltip already showing above it when the dialog toggles open', () => {
    stubPopoverApi();
    const tip = showTooltip(button('anchor'));
    openAppDialog();
    expect(tip.getAttribute('popover')).toBe('manual');
    expect(tip.dataset.shown).toBe('true');
    expect(calls).toEqual(['show:kerf-tooltip']);
  });

  it('re-shows a surface already in the top layer, and warns inert for one with controls', () => {
    stubPopoverApi();
    const pop = popover(button('anchor'), raw('<button>pick</button>'), {
      className: 'menu',
      native: true,
    });
    disposers.push(() => pop.close());
    openAppDialog();
    expect(calls).toEqual(['show:menu', 'hide:menu', 'show:menu']);
    expect(String(warn.mock.calls[0][0])).toMatch(/inert/);
  });

  it('ignores a toggle from kerf’s own dialog (already re-hosted synchronously)', () => {
    stubPopoverApi();
    showTooltip(button('anchor'));
    const modal = openNativeModal();
    expect(calls).toEqual(['show:kerf-tooltip']);
    modal.el.dispatchEvent(new Event('toggle'));
    expect(calls).toEqual(['show:kerf-tooltip']);
  });

  it('ignores toggles from non-dialogs, closed dialogs, and non-modal dialogs', () => {
    stubPopoverApi();
    const tip = showTooltip(button('anchor'));
    const details = document.createElement('details');
    document.body.appendChild(details);
    details.dispatchEvent(new Event('toggle'));
    const closed = document.createElement('dialog');
    document.body.appendChild(closed);
    closed.dispatchEvent(new Event('toggle'));
    const nonModal = document.createElement('dialog');
    document.body.appendChild(nonModal);
    nonModal.show(); // open, but not :modal
    nonModal.dispatchEvent(new Event('toggle'));
    expect(tip.hasAttribute('popover')).toBe(false);
    expect(calls).toEqual([]);
    nonModal.close();
  });

  it('listens only while a kerf surface is open', () => {
    stubPopoverApi();
    const add = vi.spyOn(document, 'addEventListener');
    const remove = vi.spyOn(document, 'removeEventListener');
    const toggles = (spy: typeof add) =>
      spy.mock.calls.filter(([type]) => type === 'toggle');
    const a = popover(button('a'), raw('<p>a</p>'), { className: 'a' });
    const b = popover(button('b'), raw('<p>b</p>'), { className: 'b' });
    expect(toggles(add).length).toBeGreaterThan(0);
    a.close();
    expect(toggles(remove)).toHaveLength(0); // b is still open
    b.close();
    expect(toggles(remove)).toHaveLength(1);
    const listener = toggles(remove)[0][1];
    expect(toggles(add).every(([, fn]) => fn === listener)).toBe(true);
    add.mockRestore();
    remove.mockRestore();

    // Nothing open: an app dialog opening later reaches no kerf listener.
    openAppDialog();
    expect(calls).toEqual([]);
  });
});
