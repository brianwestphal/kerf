import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';
import { Checkbox } from '../checkbox/checkbox.js';

/** `default` is a 20px box beside 16px text; `compact` 18px and 14px. */
export type CheckboxGroupSize = 'default' | 'compact';

/** `vertical` stacks the choices; `horizontal` lines them up and wraps. */
export type CheckboxGroupOrientation = 'vertical' | 'horizontal';

const CHECKBOX_GROUP_PROTECTED = new Set([
  'data-component',
  'data-size',
  'data-orientation',
  'data-invalid',
]);

/** Application `data-*` metadata; the CheckboxGroup's own markers stay protected. */
export type CheckboxGroupRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined>
>;

export interface CheckboxGroupChoice<Value extends string = string> {
  value: Value;
  /** Visible label; it is also the checkbox's accessible name. */
  label: string;
  /** Supporting text under this choice's label, also its description. */
  hint?: string;
  disabled?: boolean;
}

/**
 * A group is named by a visible `label` (its legend), by `ariaLabel`, or by
 * `labelledBy`, the id of a visible heading elsewhere that names it.
 */
export type CheckboxGroupName =
  | { label: string; ariaLabel?: never; labelledBy?: never }
  | { label?: never; ariaLabel: string; labelledBy?: never }
  | { label?: never; ariaLabel?: never; labelledBy: string };

export interface CheckboxGroupOptions<Value extends string = string> {
  /** Native input `name`: the form field every checked value submits under. */
  name: string;
  choices: readonly CheckboxGroupChoice<Value>[];
  /** The checked values. Omit for none. */
  value?: readonly NoInfer<Value>[];
  /** Supporting text below the choices, also the group's description. */
  hint?: string;
  /** A validation message: shown in the danger color and marking it invalid. */
  error?: string;
  size?: CheckboxGroupSize;
  orientation?: CheckboxGroupOrientation;
  /** Disable the whole group. */
  disabled?: boolean;
  /** Delegated `data-action` on every checkbox; listen for `change`. */
  action?: string;
  /** Associate the checkboxes with a form outside their ancestor chain. */
  form?: string;
  /** The fieldset's id. */
  id?: string;
  className?: string;
  /** Safe `data-*` metadata (a `data-key`). */
  rootAttributes?: CheckboxGroupRootAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

export type CheckboxGroupProps<Value extends string = string> =
  CheckboxGroupName & CheckboxGroupOptions<Value>;

/**
 * Any number of related options among a few visible choices: a native
 * fieldset of `Checkbox`es with the group label above and hint and error text
 * below, laid out like a `RadioGroup` so stacked checkboxes and radios share
 * one control column and one 28px pitch. Every checked value submits under
 * `name`.
 */
export function CheckboxGroup<Value extends string>({
  label,
  ariaLabel,
  labelledBy,
  name,
  choices,
  value = [],
  hint,
  error,
  size = 'default',
  orientation = 'vertical',
  disabled = false,
  action,
  form,
  id,
  className = '',
  rootAttributes = {},
  slot,
}: CheckboxGroupProps<Value>) {
  const description = [hint, error].filter(Boolean).join(' ') || undefined;
  const checked = new Set<string>(value);
  return (
    <fieldset
      {...filterDataAttributes(rootAttributes, CHECKBOX_GROUP_PROTECTED)}
      class={`kui-checkbox-group ${className}`.trim()}
      data-component="checkbox-group"
      data-size={size}
      data-orientation={orientation}
      data-invalid={error ? '' : undefined}
      id={id}
      aria-label={ariaLabel}
      aria-labelledby={labelledBy}
      aria-description={description}
      aria-invalid={error ? 'true' : undefined}
      disabled={disabled}
      slot={slot}
    >
      {label === undefined ? null : (
        <legend class="kui-checkbox-group__label">{label}</legend>
      )}
      <div class="kui-checkbox-group__choices">
        {choices.map((choice) => (
          <Checkbox
            label={choice.label}
            name={name}
            value={choice.value}
            checked={checked.has(choice.value)}
            hint={choice.hint}
            size={size}
            disabled={choice.disabled}
            action={action}
            form={form}
          />
        ))}
      </div>
      {hint === undefined ? null : (
        <span class="kui-checkbox-group__hint" aria-hidden="true">
          {hint}
        </span>
      )}
      {error === undefined ? null : (
        <span class="kui-checkbox-group__error" aria-hidden="true">
          {error}
        </span>
      )}
    </fieldset>
  );
}
