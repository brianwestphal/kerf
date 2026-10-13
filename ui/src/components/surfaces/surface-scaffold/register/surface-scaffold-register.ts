import WaDialog from '@awesome.me/webawesome/dist/components/dialog/dialog.js';

import { installDialogLabel } from '../internal/install-dialog-label.js';
import { installFooterBlockSize } from '../internal/install-footer-block-size.js';

installDialogLabel(WaDialog.prototype);
installFooterBlockSize(WaDialog.prototype);

/**
 * Importing this module registers wa-dialog, repairs wrapped native names, and
 * measures each DialogSurface footer for a floating footer's body clearance.
 */
export const surfaceScaffoldElementsRegistered = true;
