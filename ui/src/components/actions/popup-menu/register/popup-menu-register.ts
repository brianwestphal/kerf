import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/divider/divider.js';
import '@awesome.me/webawesome/dist/components/dropdown-item/dropdown-item.js';
import '@awesome.me/webawesome/dist/components/tooltip/tooltip.js';

import WaDropdown from '@awesome.me/webawesome/dist/components/dropdown/dropdown.js';
import WaDropdownItem from '@awesome.me/webawesome/dist/components/dropdown-item/dropdown-item.js';

import { installHelpTags } from '../../../../integrations/webawesome/help-tags/install-help-tag.js';
import { installDropdownShowFocus } from '../internal/install-dropdown-show-focus.js';
import { installPopupMenuKeyboard } from '../internal/install-popup-menu-keyboard.js';
import { installPopupMenuLifecycle } from '../internal/install-popup-menu-lifecycle.js';
import { installPopupMenuSubmenuFocus } from '../internal/install-popup-menu-submenu-focus.js';
import { installPopupMenuSubmenuPlacement } from '../internal/install-popup-menu-submenu-placement.js';

installPopupMenuKeyboard(WaDropdown.prototype);
installPopupMenuLifecycle(WaDropdown.prototype);
installDropdownShowFocus(WaDropdown.prototype);
installPopupMenuSubmenuFocus(WaDropdownItem.prototype);
installPopupMenuSubmenuPlacement(WaDropdown.prototype);
installHelpTags();

/**
 * Marker export for tests and tooling; importing this module registers the
 * Web Awesome elements a `PopupMenu` renders (`wa-dropdown`,
 * `wa-dropdown-item`, `wa-button`, and `wa-divider`) and routes a keyboard
 * choice through the item's click so delegated `data-action`s run.
 */
export const popupMenuElementsRegistered = true;
