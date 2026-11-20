import { installPopupMenuElements } from '../../../actions/popup-menu/register/popup-menu-registration.js';
import { installSelects } from '../internal/select-controller.js';

installPopupMenuElements();
installSelects();

/**
 * Marker export for tests and tooling; importing this module defines the
 * `kui-select` root element and wires every `Select` in the document:
 * opening, placement, keyboard navigation and typeahead, choosing, the
 * select-all and clear actions, form participation, and dismissal. It also
 * wires the `Catalog` related-entries `PopupMenu`s and registers the help tag
 * an icon-only trigger shows on hover or keyboard focus.
 */
export const selectElementsRegistered = true;
