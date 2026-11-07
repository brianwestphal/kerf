// The `@kerfjs/ui/surface-scaffold` facade module: four surfaces, each in its
// own internal module (KF-0MY6JQ: one primary export per file), plus the
// dialog and pinnable-popover controllers.
export * from './internal/dialog-surface.js';
export {
  closeDialog,
  type DialogCloseSource,
  type DialogRequestCloseDetail,
  openDialog,
  syncDialogStack,
  wireDialogStack,
} from './internal/dialog-surface-controller.js';
export * from './internal/pinnable-popover-surface.js';
export * from './internal/popover-dialog-surface.js';
export * from './internal/popup-surface.js';
export type { SurfacePresentation } from './internal/surface-presentation.js';
export {
  isPopoverPinned,
  type PinnablePopoverChange,
  type PinnablePopoverChangeReason,
  type PinnablePopoverOptions,
  type PinnablePopoverPlacement,
  pinPopover,
  wirePinnablePopover,
} from './wiring/wire-pinnable-popover.js';
