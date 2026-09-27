/**
 * Surfaces opened while a modal `<dialog>` is open (KF-0V9RTE). The browser
 * inerts everything outside an open modal dialog, and a plain `<div>` in the
 * document paints beneath its top layer — so a non-native tooltip / popover /
 * overlay opened from inside a `native: true` dialog used to be invisible and
 * unusable. kerf now lifts such a surface into the top layer itself (Popover
 * API for non-modal, `<dialog>.showModal()` for modal), feature-detected, and
 * the `kerfjs/dev` diagnostics explain what it cannot fix.
 *
 * happy-dom implements `<dialog>` but not the Popover API, so the popover path
 * is stubbed here; the real top-layer behavior is pinned in
 * `tests/browser/overlay-modal-promotion.spec.ts`.
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
import {
  enterProductionShape,
  restoreDevelopmentShape,
} from '../helpers/dev-shape.js';

const proto = HTMLElement.prototype as {
  showPopover?: () => void;
  hidePopover?: () => void;
};
const original = { show: proto.showPopover, hide: proto.hidePopover };

function stubPopoverApi(): void {
  proto.showPopover = function (this: HTMLElement) {
    this.dataset.shown = 'true';
  };
  proto.hidePopover = function (this: HTMLElement) {
    delete this.dataset.shown;
  };
}

let warn: MockInstance<typeof console.warn>;

beforeEach(() => {
  document.body.innerHTML = '';
  _resetWarnedForTests();
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  proto.showPopover = original.show;
  proto.hidePopover = original.hide;
  warn.mockRestore();
  vi.useRealTimers();
});

const openNativeModal = () =>
  overlay(raw('<button id="anchor">a</button>'), {
    native: true,
    initialFocus: '#anchor',
  });
const anchor = () => document.getElementById('anchor') as HTMLElement;

describe('a non-native surface opened over a native modal <dialog>', () => {
  it('a tooltip is lifted into the top layer via the Popover API', () => {
    stubPopoverApi();
    vi.useFakeTimers();
    openNativeModal();
    const dispose = tooltip(anchor(), 'tip', { delay: 0 });
    anchor().dispatchEvent(new Event('pointerenter'));
    vi.advanceTimersByTime(0);

    const tip = document.querySelector('.kerf-tooltip') as HTMLElement;
    expect(tip.getAttribute('popover')).toBe('manual');
    expect(tip.dataset.shown).toBe('true');
    expect(tip.style.inset).toBe('auto');
    expect(warn).not.toHaveBeenCalled(); // nothing interactive to lose
    dispose(); // while the Popover API stub is still installed
  });

  it('a popover with controls is lifted, and dev warns that its controls stay inert', () => {
    stubPopoverApi();
    openNativeModal();
    const h = popover(anchor(), raw('<button>pick</button>'));
    expect(h.el.getAttribute('popover')).toBe('manual');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toMatch(/inert/);

    popover(anchor(), raw('<button>again</button>')).close();
    expect(warn).toHaveBeenCalledTimes(1); // one-shot
    h.close();
    expect(h.el.dataset.shown).toBeUndefined(); // hidePopover ran
  });

  it('a modal overlay opened from inside the dialog becomes a <dialog> of its own and stays usable', async () => {
    openNativeModal();
    const answer = confirm('Sure?'); // no native option
    const dialogs = document.querySelectorAll('dialog');
    expect(dialogs.length).toBe(2);
    const inner = dialogs[1] as HTMLDialogElement;
    expect(inner.open).toBe(true);
    inner.querySelector<HTMLButtonElement>('[data-confirm="ok"]')!.click();
    await expect(answer).resolves.toBe(true);
    expect(warn).not.toHaveBeenCalled();
  });

  it('without the Popover API the surface stays a plain <div> and dev warns that it is hidden', () => {
    openNativeModal(); // happy-dom: no Popover API
    const h = popover(anchor(), raw('<p>menu</p>'));
    expect(h.el.hasAttribute('popover')).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toMatch(/beneath/);
    h.close();
  });

  it('an app-owned modal <dialog> (reported by :modal) triggers the same lift', () => {
    stubPopoverApi();
    const dialog = document.createElement('dialog');
    dialog.innerHTML = '<button id="anchor">a</button>';
    document.body.appendChild(dialog);
    dialog.showModal();
    const matches = vi
      .spyOn(Element.prototype, 'matches')
      .mockImplementation(function (this: Element, selector: string) {
        return selector === ':modal' && this === dialog;
      });
    try {
      const h = popover(anchor(), raw('<p>menu</p>'));
      expect(h.el.getAttribute('popover')).toBe('manual');
      h.close();
    } finally {
      matches.mockRestore();
    }
  });

  it('an engine that throws on :modal falls back to kerf-opened dialogs only', () => {
    stubPopoverApi();
    const dialog = document.createElement('dialog');
    document.body.appendChild(dialog);
    dialog.showModal();
    const matches = vi
      .spyOn(Element.prototype, 'matches')
      .mockImplementation(() => {
        throw new SyntaxError(':modal');
      });
    try {
      const h = popover(document.body, raw('<p>menu</p>'));
      expect(h.el.hasAttribute('popover')).toBe(false); // not detected
      h.close();
    } finally {
      matches.mockRestore();
    }
  });

  it('no dialog open → nothing is lifted (non-native surfaces keep today’s plain <div>)', () => {
    stubPopoverApi();
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    const h = popover(trigger, raw('<p>menu</p>'));
    expect(h.el.hasAttribute('popover')).toBe(false);
    h.close();
  });

  it('a closed dialog no longer lifts later surfaces', () => {
    stubPopoverApi();
    const modal = openNativeModal();
    modal.close();
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    const h = popover(trigger, raw('<p>menu</p>'));
    expect(h.el.hasAttribute('popover')).toBe(false);
    h.close();
  });

  it('production shape: the lift still happens, the warning does not', () => {
    enterProductionShape();
    try {
      openNativeModal();
      const h = popover(anchor(), raw('<p>menu</p>'));
      h.close();
      expect(warn).not.toHaveBeenCalled();
    } finally {
      restoreDevelopmentShape();
    }
  });
});
