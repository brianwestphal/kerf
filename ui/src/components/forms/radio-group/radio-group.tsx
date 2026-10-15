import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';

/** `default` is a 20px circle beside 16px text; `compact` 18px and 14px. */
export type RadioGroupSize = 'default' | 'compact';

/** `vertical` stacks the choices; `horizontal` lines them up and wraps. */
export type RadioGroupOrientation = 'vertical' | 'horizontal';

const RADIO_GROUP_PROTECTED = new Set([
  'data-component',
  'data-size',
  'data-orientation',
  'data-invalid',
]);

/** Application `data-*` metadata; the RadioGroup's own markers stay protected. */
export type RadioGroupRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined>
>;

export interface RadioGroupChoice<Value extends string = string> {
  value: Value;
  /** Visible label; it is also the radio's accessible name. */
  label: string;
  /** Supporting text under this choice's label, also its description. */
  hint?: string;
  disabled?: boolean;
}

/** A group is named by a visible `label` (its legend) or by `ariaLabel`. */
export type RadioGroupName =
  { label: string; ariaLabel?: never } | { label?: never; ariaLabel: string };

export interface RadioGroupOptions<Value extends string = string> {
  /** Native input `name`: the form field the selected value submits under. */
  name: string;
  choices: readonly RadioGroupChoice<Value>[];
  /** The selected value. Omit for no selection. */
  value?: NoInfer<Value>;
  /** Supporting text below the choices, also the group's description. */
  hint?: string;
  /** A validation message: shown in the danger color and marking it invalid. */
  error?: string;
  size?: RadioGroupSize;
  orientation?: RadioGroupOrientation;
  /** Require a selection for native form validation. */
  required?: boolean;
  /** Disable the whole group. */
  disabled?: boolean;
  /** Delegated `data-action` on every radio; listen for `change`. */
  action?: string;
  /** Associate the radios with a form outside their ancestor chain. */
  form?: string;
  /** The fieldset's id. */
  id?: string;
  className?: string;
  /** Safe `data-*` metadata (a `data-key`). */
  rootAttributes?: RadioGroupRootAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

export type RadioGroupProps<Value extends string = string> = RadioGroupName &
  RadioGroupOptions<Value>;

/**
 * One exclusive choice among a few visible options: a native fieldset of
 * radios, each drawn as a Kerf circle beside its label, with the group label
 * above and hint and error text below. The browser owns the interaction: one
 * Tab stop, arrow keys move and select, and the checked value submits.
 */
export function RadioGroup<Value extends string>({
  label,
  ariaLabel,
  name,
  choices,
  value,
  hint,
  error,
  size = 'default',
  orientation = 'vertical',
  required = false,
  disabled = false,
  action,
  form,
  id,
  className = '',
  rootAttributes = {},
  slot,
}: RadioGroupProps<Value>) {
  const description = [hint, error].filter(Boolean).join(' ') || undefined;
  return (
    <fieldset
      {...filterDataAttributes(rootAttributes, RADIO_GROUP_PROTECTED)}
      class={`kui-radio-group ${className}`.trim()}
      data-component="radio-group"
      data-size={size}
      data-orientation={orientation}
      data-invalid={error ? '' : undefined}
      id={id}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-description={description}
      aria-invalid={error ? 'true' : undefined}
      aria-required={required ? 'true' : undefined}
      disabled={disabled}
      slot={slot}
    >
      {label === undefined ? null : (
        <legend class="kui-radio-group__label">{label}</legend>
      )}
      <span class="kui-radio-group__choices">
        {choices.map((choice) => (
          <span class="kui-radio-group__choice">
            <label class="kui-radio-group__row">
              <span class="kui-radio-group__control">
                <input
                  class="kui-radio-group__input"
                  type="radio"
                  name={name}
                  value={choice.value}
                  form={form}
                  checked={choice.value === value}
                  disabled={choice.disabled}
                  required={required}
                  data-action={action}
                  aria-description={choice.hint}
                />
                <span class="kui-radio-group__circle" aria-hidden="true" />
              </span>
              <span class="kui-radio-group__choice-label">{choice.label}</span>
            </label>
            {choice.hint === undefined ? null : (
              <span class="kui-radio-group__choice-hint" aria-hidden="true">
                {choice.hint}
              </span>
            )}
          </span>
        ))}
      </span>
      {hint === undefined ? null : (
        <span class="kui-radio-group__hint" aria-hidden="true">
          {hint}
        </span>
      )}
      {error === undefined ? null : (
        <span class="kui-radio-group__error" aria-hidden="true">
          {error}
        </span>
      )}
    </fieldset>
  );
}
