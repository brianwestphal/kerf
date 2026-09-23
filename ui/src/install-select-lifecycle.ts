import type WaSelect from '@awesome.me/webawesome/dist/components/select/select.js';
import { WaAfterHideEvent } from '@awesome.me/webawesome/dist/events/after-hide.js';
import { WaAfterShowEvent } from '@awesome.me/webawesome/dist/events/after-show.js';
import { WaHideEvent } from '@awesome.me/webawesome/dist/events/hide.js';
import { WaShowEvent } from '@awesome.me/webawesome/dist/events/show.js';

import { animateSelectPopup } from './animate-select-popup.js';

// Web Awesome 3.12/3.13 expose the lifecycle method but not these helper types.
// Keep this integration boundary local: native option selection, dismissal
// listeners, popup positioning and rendering remain owned by Web Awesome.
interface SelectHost extends Pick<
  WaSelect,
  | 'open'
  | 'disabled'
  | 'isConnected'
  | 'dataset'
  | 'popup'
  | 'listbox'
  | 'currentOption'
  | 'selectedOptions'
  | 'dispatchEvent'
  | 'handleOpenChange'
  | 'updateComplete'
> {
  getFirstOption(): WaSelect['currentOption'];
  setCurrentOption(option: WaSelect['currentOption']): void;
  addOpenListeners(): void;
  removeOpenListeners(): void;
}

/** Install once at the explicit registration boundary, only for Kerf Selects. */
export function installSelectLifecycle(
  prototype: Pick<WaSelect, 'handleOpenChange' | 'handleDisabledChange'>,
): void {
  const installed = Symbol.for('@kerfjs/ui/select-lifecycle');
  if (Object.prototype.hasOwnProperty.call(prototype, installed)) return;
  Object.defineProperty(prototype, installed, { value: true });
  const original = prototype.handleOpenChange;
  const originalDisabled = prototype.handleDisabledChange;
  prototype.handleDisabledChange = function () {
    const host = this as unknown as SelectHost;
    const wasOpen = host.open;
    originalDisabled.call(this);
    // WA's disabled watcher runs after its open watcher in the same Lit update.
    // Its open=false mutation otherwise misses the open lifecycle altogether.
    if (host.dataset.component === 'select' && wasOpen && !host.open) {
      void host.handleOpenChange();
    }
  };
  const transitions = new WeakMap<SelectHost, AbortController>();
  const restorations = new WeakMap<SelectHost, { open: boolean }>();
  prototype.handleOpenChange = async function () {
    const host = this as unknown as SelectHost;
    if (host.dataset.component !== 'select') return original.call(this);
    const restoring = restorations.get(host)?.open === host.open;
    restorations.delete(host);
    if (restoring) return;
    const transition = new AbortController();
    const opening = host.open && !host.disabled;
    const current = () =>
      !transition.signal.aborted &&
      host.isConnected &&
      (host.open && !host.disabled) === opening;
    try {
      if (!host.isConnected) return;
      if (opening) {
        host.setCurrentOption(host.selectedOptions[0] || host.getFirstOption());
      }
      const event = opening ? new WaShowEvent() : new WaHideEvent();
      host.dispatchEvent(event);
      if (event.defaultPrevented) {
        // Restore the accepted state without emitting the opposite transition.
        // Clear at the update checkpoint too: Lit can coalesce a restoration.
        host.open = !opening;
        const restoration = { open: host.open };
        restorations.set(host, restoration);
        void host.updateComplete.then(() => {
          if (restorations.get(host) === restoration) restorations.delete(host);
        });
        return;
      }
      // A consumer can reverse the request synchronously in a lifecycle event.
      if (!current()) return;
      // A rejected reversal must not cancel the previously accepted animation.
      transitions.get(host)?.abort();
      transitions.set(host, transition);
      if (opening) {
        host.addOpenListeners();
        host.listbox.hidden = false;
        host.popup.active = true;
        window.requestAnimationFrame(() => {
          if (current()) host.setCurrentOption(host.currentOption);
        });
      } else {
        host.removeOpenListeners();
      }
      await animateSelectPopup(
        host.popup.popup,
        opening ? 'show' : 'hide',
        transition.signal,
      );
      if (!transition.signal.aborted && !host.isConnected) {
        host.removeOpenListeners();
        host.listbox.hidden = true;
        host.popup.active = false;
      }
      if (!current()) return;
      if (opening) {
        // Match native vertical, immediate option reveal without scrolling an
        // ancestor page or moving focus after animation completion.
        const option = host.currentOption;
        if (option) {
          const list = host.listbox;
          const offset = Math.round(
            option.getBoundingClientRect().top -
              list.getBoundingClientRect().top,
          );
          if (offset < 0)
            list.scrollTo({ top: list.scrollTop + offset, behavior: 'auto' });
          else if (offset + option.clientHeight > list.offsetHeight) {
            list.scrollTo({
              top:
                list.scrollTop +
                offset -
                list.offsetHeight +
                option.clientHeight,
              behavior: 'auto',
            });
          }
        }
        host.dispatchEvent(new WaAfterShowEvent());
      } else {
        host.listbox.hidden = true;
        host.popup.active = false;
        host.dispatchEvent(new WaAfterHideEvent());
      }
    } finally {
      if (transitions.get(host) === transition) transitions.delete(host);
    }
  };
}
