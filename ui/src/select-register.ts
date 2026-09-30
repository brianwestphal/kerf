import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/divider/divider.js';
import '@awesome.me/webawesome/dist/components/dropdown/dropdown.js';
import '@awesome.me/webawesome/dist/components/dropdown-item/dropdown-item.js';
import '@awesome.me/webawesome/dist/components/tooltip/tooltip.js';

import WaOption from '@awesome.me/webawesome/dist/components/option/option.js';
import WaSelect from '@awesome.me/webawesome/dist/components/select/select.js';

import { installHelpTags } from './install-help-tag.js';
import { installSelectActions } from './install-select-actions.js';
import { installSelectLifecycle } from './install-select-lifecycle.js';
import { installSelectMultiple } from './install-select-multiple.js';

installSelectLifecycle(WaSelect.prototype);
installSelectMultiple(WaSelect.prototype, WaOption.prototype);
installSelectActions();
installHelpTags();

/**
 * Marker export for tests and tooling; importing this module performs registration.
 * Registers both the `Select` elements and the `Catalog` related-entries popup-menu
 * elements (`wa-dropdown` / `wa-dropdown-item` / `wa-button`).
 */
export const selectElementsRegistered = true;
