/**
 * Public `kerfjs/overlay` composition entry.
 *
 * Implementations live in focused internal modules so helpers depend directly
 * on the overlay core rather than importing back through this public barrel.
 */
export {
  type DismissTrigger,
  overlay,
  type OverlayContent,
  type OverlayHandle,
  type OverlayOptions,
  popover,
  type PopoverOptions,
  tooltip,
  type TooltipContent,
  type TooltipOptions,
} from './overlay-core.js';
export {
  choice,
  type ChoiceAction,
  type ChoiceOptions,
  type ChoiceRenderSlots,
  confirm,
  type ConfirmOptions,
  type ConfirmRenderSlots,
  type FieldValidator,
  form,
  type FormField,
  type FormOptions,
  type FormRenderField,
  type FormRenderSlots,
  prompt,
  type PromptOptions,
  type PromptRenderSlots,
} from './overlay-dialogs.js';
export {
  type AnchorPositionOptions,
  autoReposition,
  type PopoverPlacement,
  positionAnchored,
} from './overlay-position.js';
export {
  toast,
  type ToastContent,
  type ToastHandle,
  type ToastOptions,
  type ToastVariant,
} from './overlay-toast.js';
