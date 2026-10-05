import WaDialog from '@awesome.me/webawesome/dist/components/dialog/dialog.js';

import { installDialogLabel } from '../internal/install-dialog-label.js';

installDialogLabel(WaDialog.prototype);

/** Importing this module registers wa-dialog and repairs wrapped native names. */
export const surfaceScaffoldElementsRegistered = true;
