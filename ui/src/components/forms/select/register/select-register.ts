import '@awesome.me/webawesome/dist/components/divider/divider.js';
import '@awesome.me/webawesome/dist/components/tooltip/tooltip.js';

import WaOption from '@awesome.me/webawesome/dist/components/option/option.js';
import WaSelect from '@awesome.me/webawesome/dist/components/select/select.js';

import { installHelpTags } from '../../../../integrations/webawesome/help-tags/install-help-tag.js';
import { installPopupMenus } from '../../../actions/popup-menu/internal/popup-menu-controller.js';
import { installSelectActions } from '../internal/install-select-actions.js';
import { installSelectLifecycle } from '../internal/install-select-lifecycle.js';
import { installSelectMultiple } from '../internal/install-select-multiple.js';

installSelectLifecycle(WaSelect.prototype);
installSelectMultiple(WaSelect.prototype, WaOption.prototype);
installSelectActions();
// The Catalog's related-entries menus are PopupMenus.
installPopupMenus();
installHelpTags();

/**
 * Marker export for tests and tooling; importing this module performs registration.
 * Registers the `Select` elements and wires the `Catalog` related-entries
 * `PopupMenu`s (the `popup-menu/register` entry).
 */
export const selectElementsRegistered = true;
