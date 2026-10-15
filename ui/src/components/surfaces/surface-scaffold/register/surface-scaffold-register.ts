import { installDialogSurfaces } from '../internal/dialog-surface-controller.js';

installDialogSurfaces();

/**
 * Importing this module wires every DialogSurface in the document: the close
 * button, `data-dialog-close`, Escape, and backdrop requests through the
 * cancelable `kui-request-close`. `openDialog` also wires the dialogs it
 * opens, measuring a floating header's or footer's body clearance, showing a
 * floating header's divider while content scrolls beneath it, and following a
 * bottom sheet's keyboard clearance and resize grabber, all kept across
 * application re-renders while the dialog is open.
 */
export const surfaceScaffoldElementsRegistered = true;
