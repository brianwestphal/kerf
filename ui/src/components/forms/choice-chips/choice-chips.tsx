import type { SafeHtml } from 'kerfjs';

import type { CssColor } from '../../../shared/styles/css-values.js';

export type ChoiceChipsSize = 'default' | 'compact';

/**
 * A leading color dot: a {@link CssColor} from `uiColor()`, `colorVar()`, or
 * `foregroundColor()`, or `'transparent'` for the no-color swatch (an outlined
 * dot struck through by a diagonal line).
 */
export type ChoiceChipsSwatch = CssColor | 'transparent';

export interface ChoiceChipsChoice<Value extends string = string> {
  value: Value;
  /** Visible label; it is also the radio's accessible name. */
  label: string;
  /** Leading color dot. Mutually exclusive with `icon`. */
  swatch?: ChoiceChipsSwatch;
  /** Decorative leading icon, normally an unsized LucideIcon. */
  icon?: SafeHtml;
  /** Supplementary tooltip; never the only place a choice is described. */
  title?: string;
  disabled?: boolean;
}

interface ChoiceChipsCommonProps<Value extends string> {
  /** Native radio `name`: the form field the selected value submits under. */
  name: string;
  /** The selected value. Omit (or pass `undefined`) for no selection. */
  value?: NoInfer<Value>;
  choices: readonly ChoiceChipsChoice<Value>[];
  /** Delegated `data-action` on every radio; listen for `change`. */
  action?: string;
  size?: ChoiceChipsSize;
  /** Disable the whole group. */
  disabled?: boolean;
  /** Require a selection for native form validation. */
  required?: boolean;
  /** Associate the radios with a form outside their ancestor chain. */
  form?: string;
  id?: string;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/** A radio group is named either by a string or by a visible heading's id. */
export type ChoiceChipsProps<Value extends string = string> =
  ChoiceChipsCommonProps<Value> &
    (
      | { label: string; labelledBy?: never }
      | { labelledBy: string; label?: never }
    );

const unsafeSwatch = /[;{}<>"'\\]|\p{Cc}/u;

function swatchStyle(swatch: ChoiceChipsSwatch): string | undefined {
  if (swatch === 'transparent') return undefined;
  const color = swatch.trim();
  if (!color || unsafeSwatch.test(color))
    throw new TypeError('ChoiceChips swatch requires one CSS color value.');
  return `--_kui-choice-chips-swatch: ${color}`;
}

/**
 * An exclusive, wrapping set of pill chips backed by native radios: one Tab
 * stop, arrow-key selection, and a real form value. Each choice may lead with
 * a color swatch (including a struck-through transparent swatch) or an icon.
 */
export function ChoiceChips<Value extends string>({
  name,
  value,
  choices,
  action,
  size = 'default',
  disabled = false,
  required = false,
  form,
  id,
  className = '',
  slot,
  label,
  labelledBy,
}: ChoiceChipsProps<Value>) {
  if (choices.some((choice) => choice.swatch !== undefined && choice.icon))
    throw new TypeError('A ChoiceChips choice takes a swatch or an icon.');
  return (
    <div
      id={id}
      class={`kui-choice-chips ${className}`.trim()}
      data-component="choice-chips"
      data-size={size}
      data-disabled={disabled ? '' : undefined}
      role="radiogroup"
      aria-label={label}
      aria-labelledby={labelledBy}
      aria-required={required ? 'true' : undefined}
      aria-disabled={disabled ? 'true' : undefined}
      slot={slot}
    >
      {choices.map((choice) => {
        const unavailable = disabled || choice.disabled === true;
        return (
          <label
            class="kui-choice-chips__chip"
            data-choice-value={choice.value}
            data-disabled={unavailable ? '' : undefined}
            title={choice.title}
          >
            <input
              class="kui-choice-chips__input"
              type="radio"
              name={name}
              value={choice.value}
              checked={choice.value === value}
              disabled={unavailable}
              required={required}
              form={form}
              data-action={action}
            />
            {choice.swatch === undefined ? null : (
              <span
                class="kui-choice-chips__swatch"
                data-swatch={
                  choice.swatch === 'transparent' ? 'transparent' : 'color'
                }
                style={swatchStyle(choice.swatch)}
                aria-hidden="true"
              />
            )}
            {choice.icon === undefined ? null : (
              <span class="kui-choice-chips__icon" aria-hidden="true">
                {choice.icon}
              </span>
            )}
            <span class="kui-choice-chips__label">{choice.label}</span>
          </label>
        );
      })}
    </div>
  );
}
