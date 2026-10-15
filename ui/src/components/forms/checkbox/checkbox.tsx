import { Check, Minus } from 'lucide';

import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';
import { LucideIcon } from '../../media/lucide-icon/lucide-icon.js';

/** `default` is a 20px box beside 16px text; `compact` an 18px box and 14px text. */
export type CheckboxSize = 'default' | 'compact';

const CHECKBOX_PROTECTED = new Set([
  'data-component',
  'data-size',
  'data-invalid',
]);

/** Application `data-*` metadata; the Checkbox's own markers stay protected. */
export type CheckboxRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined>
>;

export interface CheckboxProps {
  /** The visible label, which is also the checkbox's accessible name. */
  label: string;
  checked?: boolean;
  /**
   * A mixed state, such as a parent of partly checked children. Needs
   * `wireCheckboxes(root)`, which sets the native `indeterminate` property.
   */
  indeterminate?: boolean;
  name?: string;
  /** The value submitted while checked (native default `on`). */
  value?: string;
  /** Supporting text below the label, also the checkbox's description. */
  hint?: string;
  /** A validation message: shown in the danger color and marking it invalid. */
  error?: string;
  size?: CheckboxSize;
  disabled?: boolean;
  required?: boolean;
  /** Delegated `data-action` on the input; listen for `change`. */
  action?: string;
  /** Associate the input with a form outside its ancestor chain. */
  form?: string;
  /** The input's id. */
  id?: string;
  className?: string;
  /** Safe `data-*` metadata (a `data-key`). */
  rootAttributes?: CheckboxRootAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/**
 * A native checkbox drawn as a Kerf box beside its label, with optional hint
 * and error text aligned under the label, a mixed (indeterminate) state, and
 * native form participation.
 */
export function Checkbox({
  label,
  checked = false,
  indeterminate = false,
  name,
  value,
  hint,
  error,
  size = 'default',
  disabled = false,
  required = false,
  action,
  form,
  id,
  className = '',
  rootAttributes = {},
  slot,
}: CheckboxProps) {
  const description = [hint, error].filter(Boolean).join(' ') || undefined;
  return (
    <div
      {...filterDataAttributes(rootAttributes, CHECKBOX_PROTECTED)}
      class={`kui-checkbox ${className}`.trim()}
      data-component="checkbox"
      data-size={size}
      data-invalid={error ? '' : undefined}
      slot={slot}
    >
      <label class="kui-checkbox__row">
        <span class="kui-checkbox__control">
          <input
            class="kui-checkbox__input"
            type="checkbox"
            id={id}
            name={name}
            value={value}
            form={form}
            checked={checked}
            disabled={disabled}
            required={required}
            data-action={action}
            data-indeterminate={indeterminate ? '' : undefined}
            aria-description={description}
            aria-invalid={error ? 'true' : undefined}
          />
          <span class="kui-checkbox__box" aria-hidden="true">
            <LucideIcon icon={Check} name="check" />
            <LucideIcon icon={Minus} name="minus" />
          </span>
        </span>
        <span class="kui-checkbox__label">{label}</span>
      </label>
      {hint === undefined ? null : (
        <span class="kui-checkbox__hint" aria-hidden="true">
          {hint}
        </span>
      )}
      {error === undefined ? null : (
        <span class="kui-checkbox__error" aria-hidden="true">
          {error}
        </span>
      )}
    </div>
  );
}
