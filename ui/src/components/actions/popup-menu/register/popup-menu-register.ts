import '@awesome.me/webawesome/dist/components/tooltip/tooltip.js';

import { installHelpTags } from '../../../../integrations/webawesome/help-tags/install-help-tag.js';
import { installPopupMenus } from '../internal/popup-menu-controller.js';

installPopupMenus();
installHelpTags();

/**
 * Marker export for tests and tooling; importing this module wires every
 * `PopupMenu` in the document: opening from its trigger and from
 * `openPopupMenu` / `openPopupMenuAt` / `closePopupMenu`, top-layer placement,
 * keyboard navigation and typeahead, hover-opened submenus, the `kui-menu-select`
 * choice event, and focus return. It also registers the help tag an
 * icon-only trigger shows on hover or keyboard focus.
 */
export const popupMenuElementsRegistered = true;
