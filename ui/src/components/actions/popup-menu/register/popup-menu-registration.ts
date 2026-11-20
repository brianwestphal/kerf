import { installHelpTags } from '../../../../wiring/help-tags.js';
import { installPopupMenus } from '../internal/popup-menu-controller.js';

/** Keep the side effect in each published register entry. Shared chunks only define the installer. */
export function installPopupMenuElements() {
  installPopupMenus();
  installHelpTags();
}
