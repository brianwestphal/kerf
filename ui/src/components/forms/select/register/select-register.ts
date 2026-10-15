import { installHelpTags } from '../../../../wiring/help-tags.js';
import { installPopupMenus } from '../../../actions/popup-menu/internal/popup-menu-controller.js';
import { installSelects } from '../internal/select-controller.js';

installSelects();
// The Catalog's related-entries menus are PopupMenus.
installPopupMenus();
installHelpTags();

/**
 * Marker export for tests and tooling; importing this module defines the
 * `kui-select` root element and wires every `Select` in the document:
 * opening, placement, keyboard navigation and typeahead, choosing, the
 * select-all and clear actions, form participation, and dismissal. It also
 * wires the `Catalog` related-entries `PopupMenu`s and registers the help tag
 * an icon-only trigger shows on hover or keyboard focus.
 */
export const selectElementsRegistered = true;
