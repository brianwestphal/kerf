/** Internal compatibility aggregator for the four promise-dialog helpers. */
export {
  choice,
  type ChoiceAction,
  type ChoiceOptions,
  type ChoiceRenderSlots,
} from './overlay-choice.js';
export {
  confirm,
  type ConfirmOptions,
  type ConfirmRenderSlots,
} from './overlay-confirm.js';
export {
  form,
  type FormField,
  type FormOptions,
  type FormRenderField,
  type FormRenderSlots,
} from './overlay-form.js';
export {
  type FieldValidator,
  prompt,
  type PromptOptions,
  type PromptRenderSlots,
} from './overlay-prompt.js';
