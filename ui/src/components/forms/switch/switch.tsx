import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';

/** `default` is a 35×20 track beside 16px text; `compact` 31.5×18 and 14px. */
export type SwitchSize = 'default' | 'compact';

const SWITCH_PROTECTED = new Set(['data-component', 'data-size']);

/** Application `data-*` metadata; the Switch's own markers stay protected. */
export type SwitchRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined>
>;

export interface SwitchProps {
  /** The visible label, which is also the switch's accessible name. */
  label: string;
  /** Whether the setting is on. */
  checked?: boolean;
  name?: string;
  /** The value submitted while on (native default `on`). */
  value?: string;
  /** Supporting text below the label, also the switch's description. */
  hint?: string;
  size?: SwitchSize;
  disabled?: boolean;
  /** Delegated `data-action` on the input; listen for `change`. */
  action?: string;
  /** Associate the input with a form outside its ancestor chain. */
  form?: string;
  /** The input's id. */
  id?: string;
  className?: string;
  /** Safe `data-*` metadata (a `data-key`). */
  rootAttributes?: SwitchRootAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/**
 * An on/off setting that applies immediately: a native checkbox with
 * `role="switch"`, drawn as a track and thumb beside its label, with an
 * optional hint aligned under the label.
 */
export function Switch({
  label,
  checked = false,
  name,
  value,
  hint,
  size = 'default',
  disabled = false,
  action,
  form,
  id,
  className = '',
  rootAttributes = {},
  slot,
}: SwitchProps) {
  return (
    <div
      {...filterDataAttributes(rootAttributes, SWITCH_PROTECTED)}
      class={`kui-switch ${className}`.trim()}
      data-component="switch"
      data-size={size}
      slot={slot}
    >
      <label class="kui-switch__row">
        <span class="kui-switch__control">
          <input
            class="kui-switch__input"
            type="checkbox"
            role="switch"
            id={id}
            name={name}
            value={value}
            form={form}
            checked={checked}
            disabled={disabled}
            data-action={action}
            aria-description={hint}
          />
          <span class="kui-switch__track" aria-hidden="true">
            <span class="kui-switch__thumb" />
          </span>
        </span>
        <span class="kui-switch__label">{label}</span>
      </label>
      {hint === undefined ? null : (
        <span class="kui-switch__hint" aria-hidden="true">
          {hint}
        </span>
      )}
    </div>
  );
}
