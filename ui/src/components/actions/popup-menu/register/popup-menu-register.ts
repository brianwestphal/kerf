import { installPopupMenuElements } from './popup-menu-registration.js';

installPopupMenuElements();

/**
 * Marker export for tests and tooling; importing this module wires every
 * `PopupMenu` in the document: opening from its trigger and from
 * `openPopupMenu` / `openPopupMenuAt` / `closePopupMenu`, top-layer placement,
 * keyboard navigation and typeahead, hover-opened submenus, the `kui-menu-select`
 * choice event, and focus return. It also registers the help tag an
 * icon-only trigger shows on hover or keyboard focus.
 */
export const popupMenuElementsRegistered = true;
