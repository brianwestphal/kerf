import WaDialog from '@awesome.me/webawesome/dist/components/dialog/dialog.js';

import { installChromeBlockSize } from '../internal/install-chrome-block-size.js';
import { installDialogLabel } from '../internal/install-dialog-label.js';
import { installHeaderScrollDivider } from '../internal/install-header-scroll-divider.js';

installDialogLabel(WaDialog.prototype);
installChromeBlockSize(WaDialog.prototype);
installHeaderScrollDivider(WaDialog.prototype);

/**
 * Importing this module registers wa-dialog, repairs wrapped native names, and
 * measures each DialogSurface header and footer for a floating header's or
 * footer's body clearance, and shows a floating header's divider while
 * content is scrolled beneath it.
 */
export const surfaceScaffoldElementsRegistered = true;
