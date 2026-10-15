/**
 * A small Popover API stand-in for happy-dom, which has no `showPopover()`.
 * It models what the PopupMenu register relies on: `showPopover()` throws on
 * a disconnected element, opening an auto popover hides every open auto
 * popover that is not its ancestor, hiding an auto popover hides the auto
 * popovers inside it (manual popovers are left alone either way), both fire `beforetoggle` and
 * `toggle` with `newState`, and `:popover-open` / `:hover` match through
 * `Element.matches`. `:hover` follows the elements a test marks hovered.
 */

const shown: HTMLElement[] = [];
const hovered = new Set<Element>();

function toggleEvent(type: string, newState: 'open' | 'closed'): Event {
  const event = new Event(type);
  Object.defineProperty(event, 'newState', { value: newState });
  return event;
}

function hide(element: HTMLElement): void {
  if (!shown.includes(element)) return;
  // An auto popover takes the auto popovers inside it along; a manual
  // popover's nested popovers stay shown.
  if (element.getAttribute('popover') === 'auto')
    for (const nested of [...shown].reverse())
      if (
        nested !== element &&
        nested.getAttribute('popover') === 'auto' &&
        element.contains(nested)
      )
        hide(nested);
  element.dispatchEvent(toggleEvent('beforetoggle', 'closed'));
  shown.splice(shown.indexOf(element), 1);
  element.dispatchEvent(toggleEvent('toggle', 'closed'));
}

let installed = false;

/** Install the stand-in once per test file; `resetPopovers` between tests. */
export function installPopoverPolyfill(): void {
  if (installed) return;
  installed = true;
  const proto = HTMLElement.prototype as HTMLElement & {
    showPopover(): void;
    hidePopover(): void;
  };
  proto.showPopover = function (this: HTMLElement) {
    if (!this.isConnected)
      throw new DOMException('Not connected', 'InvalidStateError');
    if (shown.includes(this)) return;
    // Only an auto popover closes the open auto popovers it is not inside.
    if (this.getAttribute('popover') === 'auto')
      for (const other of [...shown].reverse())
        if (other.getAttribute('popover') === 'auto' && !other.contains(this))
          hide(other);
    this.dispatchEvent(toggleEvent('beforetoggle', 'open'));
    shown.push(this);
    this.dispatchEvent(toggleEvent('toggle', 'open'));
  };
  proto.hidePopover = function (this: HTMLElement) {
    hide(this);
  };
  const matches = Element.prototype.matches;
  (Element.prototype as { matches(selector: string): boolean }).matches =
    function (this: Element, selector: string) {
      if (selector === ':popover-open')
        return shown.includes(this as HTMLElement);
      if (selector === ':hover') return hovered.has(this);
      return matches.call(this, selector);
    };
}

/** Whether the stand-in currently shows `element`. */
export const isShown = (element: Element | null): boolean =>
  !!element && shown.includes(element as HTMLElement);

/** Mark an element (and so its `:hover` match) hovered or not. */
export function setHovered(element: Element, value: boolean): void {
  if (value) hovered.add(element);
  else hovered.delete(element);
}

/** Close everything and forget hover state between tests. */
export function resetPopovers(): void {
  shown.length = 0;
  hovered.clear();
}
