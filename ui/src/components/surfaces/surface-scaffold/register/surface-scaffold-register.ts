import WaDialog from '@awesome.me/webawesome/dist/components/dialog/dialog.js';

import { installChromeBlockSize } from '../internal/install-chrome-block-size.js';
import { installDialogLabel } from '../internal/install-dialog-label.js';

installDialogLabel(WaDialog.prototype);
installChromeBlockSize(WaDialog.prototype);

/**
 * Importing this module registers wa-dialog, repairs wrapped native names, and
 * measures each DialogSurface header and footer for a floating header's or
 * footer's body clearance.
 */
export const surfaceScaffoldElementsRegistered = true;
