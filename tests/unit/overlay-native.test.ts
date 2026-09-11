import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';

import { raw } from '../../src/jsx-runtime.js';
import { confirm,overlay,popover,tooltip } from '../../src/overlay.js';
import { anchorAt } from './overlay-test-helpers.js';

beforeEach(() => {
  document.body.innerHTML = '';
});
afterEach(() => {
  vi.useRealTimers();
});

describe('overlay() — native top-layer backing (KF-526)', () => {
  // happy-dom implements <dialog> (showModal/close/.open/cancel) but NOT the
  // Popover API, so the modal path runs natively here and the popover path is
  // stubbed. Real top-layer / inert / backdrop behavior is Playwright-only.

  describe('modal — <dialog>.showModal()', () => {
    it('hosts a modal overlay in a <dialog>, opened, without the ARIA fallback attrs', () => {
      const h = overlay(raw('<button class="go">go</button>'), { native: true, trap: true });
      expect(h.el.tagName).toBe('DIALOG');
      expect((h.el as HTMLDialogElement).open).toBe(true);
      // Native <dialog> conveys modality itself — no role/aria-modal fallback.
      expect(h.el.hasAttribute('role')).toBe(false);
      expect(h.el.hasAttribute('aria-modal')).toBe(false);
      expect(h.el.querySelector('.go')).not.toBeNull();
    });

    it('close() exits the dialog (open=false) and removes it, resolving the result', async () => {
      const h = overlay(raw('<div/>'), { native: true, trap: true });
      h.close('done');
      expect((h.el as HTMLDialogElement).open).toBe(false);
      expect(h.el.parentElement).toBeNull();
      await expect(h.result).resolves.toBe('done');
    });

    it('the native cancel event (Escape) dismisses when escape is a trigger, and preventDefaults', () => {
      const onDismiss = vi.fn();
      const h = overlay(raw('<div/>'), { native: true, trap: true, dismiss: ['escape'], onDismiss });
      const ev = new Event('cancel', { cancelable: true });
      h.el.dispatchEvent(ev);
      expect(ev.defaultPrevented).toBe(true); // kerf owns teardown
      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(h.el.parentElement).toBeNull();
    });

    it('the native cancel event is swallowed (kept open) when escape is NOT a dismiss trigger', () => {
      const onDismiss = vi.fn();
      const h = overlay(raw('<div/>'), { native: true, trap: true, dismiss: ['backdrop'], onDismiss });
      const ev = new Event('cancel', { cancelable: true });
      h.el.dispatchEvent(ev);
      expect(ev.defaultPrevented).toBe(true);
      expect(onDismiss).not.toHaveBeenCalled();
      expect((h.el as HTMLDialogElement).open).toBe(true); // still open
      h.close();
    });

    it('a backdrop click (target is the dialog itself) still dismisses', () => {
      const onDismiss = vi.fn();
      const h = overlay(raw('<button>x</button>'), { native: true, trap: true, dismiss: ['backdrop'], onDismiss });
      h.el.dispatchEvent(new MouseEvent('click', { bubbles: true })); // target === dialog
      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(h.el.parentElement).toBeNull();
    });

    it('confirm({ native: true }) resolves true on OK through a <dialog>', async () => {
      const p = confirm('Sure?', { native: true });
      const dialog = document.querySelector('dialog') as HTMLDialogElement;
      expect(dialog).not.toBeNull();
      expect(dialog.open).toBe(true);
      dialog.querySelector<HTMLButtonElement>('[data-confirm="ok"]')!.click();
      await expect(p).resolves.toBe(true);
      expect(document.querySelector('dialog')).toBeNull();
    });

    it('falls back to a <div> when <dialog>.showModal is unavailable', () => {
      const proto = HTMLDialogElement.prototype as { showModal?: () => void };
      const original = proto.showModal;
      // Simulate an engine without dialog support.
      delete proto.showModal;
      try {
        const h = overlay(raw('<div/>'), { native: true, trap: true });
        expect(h.el.tagName).toBe('DIV'); // fallback
        expect(h.el.getAttribute('role')).toBe('dialog'); // ARIA fallback restored
        h.close();
      } finally {
        proto.showModal = original;
      }
    });
  });

  describe('non-modal — Popover API (stubbed; happy-dom lacks it)', () => {
    const proto = HTMLElement.prototype as {
      showPopover?: () => void;
      hidePopover?: () => void;
    };
    let shown: number;
    let hidden: number;
    let original: { show?: () => void; hide?: () => void };

    beforeEach(() => {
      shown = 0;
      hidden = 0;
      original = { show: proto.showPopover, hide: proto.hidePopover };
      proto.showPopover = function () { shown++; };
      proto.hidePopover = function () { hidden++; };
    });
    afterEach(() => {
      proto.showPopover = original.show;
      proto.hidePopover = original.hide;
    });

    it('backs a popover() with [popover] + showPopover, neutralizing UA anchoring', () => {
      const anchor = anchorAt({ bottom: 20, left: 10, right: 60, top: 10 });
      const h = popover(anchor, raw('<div class="menu">m</div>'), { native: true });
      expect(h.el.getAttribute('popover')).toBe('manual');
      expect(shown).toBe(1);
      expect(h.el.style.inset).toBe('auto'); // UA inset neutralized for positionAnchored
      h.close();
      expect(hidden).toBe(1);
      expect(h.el.parentElement).toBeNull();
    });

    it('tooltip({ native: true }) shows/hides through the Popover API', () => {
      vi.useFakeTimers();
      const anchor = anchorAt({ bottom: 20, left: 10, right: 60, top: 10 });
      const stop = tooltip(anchor, 'hi', { native: true, delay: 0 });
      anchor.dispatchEvent(new Event('pointerenter'));
      vi.advanceTimersByTime(1);
      expect(shown).toBe(1);
      expect(document.querySelector('[popover]')).not.toBeNull();
      stop();
      vi.useRealTimers();
    });

    it('falls back to a plain <div> (no popover attr) when showPopover is unavailable', () => {
      proto.showPopover = undefined; // engine without the Popover API
      const anchor = anchorAt({ bottom: 20, left: 10, right: 60, top: 10 });
      const h = popover(anchor, raw('<div/>'), { native: true });
      expect(h.el.tagName).toBe('DIV');
      expect(h.el.hasAttribute('popover')).toBe(false);
      expect(shown).toBe(0);
      h.close();
    });
  });
});
