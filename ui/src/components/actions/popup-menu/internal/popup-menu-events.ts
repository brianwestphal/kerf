/**
 * The requests `openPopupMenu`, `openPopupMenuAt`, and `closePopupMenu` send
 * to a PopupMenu root. The component module stays free of behavior code; the
 * `/register` entry's document listener carries them out.
 */
import type { PopupMenuPlacement } from '../popup-menu.js';

export const POPUP_MENU_OPEN_EVENT = 'kui-popup-menu-open-request';
export const POPUP_MENU_CLOSE_EVENT = 'kui-popup-menu-close-request';

/**
 * The choice event a PopupMenu root dispatches before it closes: bubbling and
 * cancelable (canceling keeps the menu open). `detail.item` is the chosen
 * item element, `detail.value` its `value`, and `detail.checked` the state a
 * checkbox choice asks for; the application owns that state and renders it.
 */
export const POPUP_MENU_SELECT_EVENT = 'kui-menu-select';

export interface PopupMenuOpenDetail {
  /** Open from this viewport point for this opening only. */
  point?: { x: number; y: number };
  /**
   * The placement at `point` for this opening only. Omitted, a
   * button-triggered menu opens `bottom-start` and a context menu at its
   * `placement` prop.
   */
  placement?: PopupMenuPlacement;
}

export interface PopupMenuSelectDetail {
  item: HTMLElement;
  value: string | undefined;
  checked: boolean | undefined;
}
