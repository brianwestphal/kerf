import type { SafeHtml } from 'kerfjs';

import {
  filterDataAttributes,
  type RootDataAttributes,
} from '../../../shared/dom/extension-attributes.js';
import type { CssLength } from '../../../shared/styles/css-values.js';
import type { CssColor } from '../../../shared/styles/css-values.js';

export type ChoiceChipsSize = 'default' | 'compact';

/**
 * `chips` (default) are labeled pills; `icons` are square 36px icon-only
 * choices (an icon picker), each named by its hidden label, which is also
 * its hover title.
 */
export type ChoiceChipsPresentation = 'chips' | 'icons';

/**
 * `wrap` (default) wraps chips onto more rows; `scroll` keeps them on one row
 * that scrolls horizontally inside the group, for a section or filter strip
 * that must never push the content below it down.
 */
export type ChoiceChipsOverflow = 'wrap' | 'scroll';

/**
 * A leading color dot: a {@link CssColor} from `uiColor()`, `colorVar()`, or
 * `fillColor()`, or `'transparent'` for the no-color swatch (an outlined
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
  /**
   * Form field name: the selected value (or, with `multiple`, every selected
   * value) submits under it.
   */
  name: string;
  choices: readonly ChoiceChipsChoice<Value>[];
  /**
   * Delegated `data-action`; listen for `change`. It sits on every native
   * input, or for `multiple: true` on the group, which `wireChoiceChips`
   * fires `change` on.
   */
  action?: string;
  size?: ChoiceChipsSize;
  presentation?: ChoiceChipsPresentation;
  /**
   * Cap the group's height; past it the group scrolls (a long icon grid).
   * Not with `overflow: 'scroll'`.
   */
  maxHeight?: CssLength;
  /**
   * `scroll` keeps the chips on one row that scrolls sideways inside the
   * group, with no visible scrollbar. `wireChoiceChips` keeps the checked
   * chip in view, and `wireScrollDividers` fades each edge with chips
   * scrolled past it.
   */
  overflow?: ChoiceChipsOverflow;
  /** Disable the whole group. */
  disabled?: boolean;
  /** Associate the inputs with a form outside their ancestor chain. */
  form?: string;
  id?: string;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
  /** Application `data-*` metadata on the root, such as a row key or an
   * editor node marker; the component's own markers stay protected. */
  rootAttributes?: RootDataAttributes;
}

/** One exclusive value (the default), backed by native radios. */
export interface ChoiceChipsSingleProps<Value extends string = string> {
  multiple?: false;
  /** The selected value. Omit (or pass `undefined`) for no selection. */
  value?: NoInfer<Value>;
  /** Require a selection for native form validation. */
  required?: boolean;
}

/**
 * Any number of values, backed by native checkboxes: each pill is its own Tab
 * stop, a click or Space toggles it alone, and every checked value submits
 * under `name`.
 */
export interface ChoiceChipsToggleProps<Value extends string = string> {
  multiple: 'toggle';
  /** The checked values. Omit (or pass `[]`) for none. */
  value?: readonly NoInfer<Value>[];
  /**
   * Native `required` on a checkbox demands that one box, so a toggle group
   * has no "at least one" requirement; validate the checked set in the app.
   */
  required?: never;
}

/**
 * Any number of values with the conventional desktop selection model, as an
 * ARIA multi-select listbox: a click selects one chip, Cmd (Apple) or Ctrl
 * (elsewhere) toggles one, and Shift extends a range. The group is one Tab
 * stop; arrows move the selection, Shift+arrows extend it, Cmd/Ctrl+arrows
 * move focus alone, Space toggles, and Cmd/Ctrl+A selects all. Hidden inputs
 * submit every selected value under `name`. Requires `wireChoiceChips`.
 */
export interface ChoiceChipsMultipleProps<Value extends string = string> {
  multiple: true;
  /** The selected values. Omit (or pass `[]`) for none. */
  value?: readonly NoInfer<Value>[];
  /** Validate the selected set in the app; a listbox has no native `required`. */
  required?: never;
}

/** A group is named either by a string or by a visible heading's id. */
export type ChoiceChipsNaming =
  { label: string; labelledBy?: never } | { labelledBy: string; label?: never };

export type ChoiceChipsProps<Value extends string = string> =
  ChoiceChipsCommonProps<Value> &
    (
      | ChoiceChipsSingleProps<Value>
      | ChoiceChipsToggleProps<Value>
      | ChoiceChipsMultipleProps<Value>
    ) &
    ChoiceChipsNaming;

const unsafeSwatch = /[;{}<>"'\\]|\p{Cc}/u;

function swatchStyle(swatch: ChoiceChipsSwatch): string | undefined {
  if (swatch === 'transparent') return undefined;
  const color = swatch.trim();
  if (!color || unsafeSwatch.test(color))
    throw new TypeError('ChoiceChips swatch requires one CSS color value.');
  return `--_kui-choice-chips-swatch: ${color}`;
}

/** Which selection model a ChoiceChips group renders. */
export type ChoiceChipsSelectionMode = 'single' | 'toggle' | 'multiple';

const CHOICE_CHIPS_PROTECTED = new Set([
  'data-action',
  'data-choice-value',
  'data-component',
  'data-disabled',
  'data-form',
  'data-kui-scroll-strip',
  'data-name',
  'data-overflow',
  'data-presentation',
  'data-scroll-overflow',
  'data-scrollable',
  'data-selection-mode',
  'data-size',
  'data-swatch',
]);

/**
 * A wrapping (or, with `overflow: 'scroll'`, one scrolling row of) set of
 * pill chips. By default it is an exclusive radio group:
 * one Tab stop, arrow-key selection, and a real form value. With
 * `multiple: 'toggle'` it is a checkbox group: each pill toggles on its own.
 * With `multiple: true` it is a multi-select listbox with modifier-key
 * selection (wire it with `wireChoiceChips`). Each choice may lead with a
 * color swatch (including a struck-through transparent swatch) or an icon.
 */
export function ChoiceChips<Value extends string>(
  props: ChoiceChipsProps<Value>,
) {
  const {
    name,
    choices,
    action,
    size = 'default',
    presentation = 'chips',
    maxHeight,
    overflow = 'wrap',
    disabled = false,
    form,
    id,
    className = '',
    slot,
    label,
    labelledBy,
    rootAttributes = {},
  } = props;
  const icons = presentation === 'icons';
  if (icons && choices.some((choice) => choice.icon === undefined))
    throw new TypeError('An icons ChoiceChips choice needs an icon.');
  const scroll = overflow === 'scroll';
  if (scroll && maxHeight !== undefined)
    throw new TypeError(
      'A ChoiceChips group scrolls one row or caps its height, not both.',
    );
  const shape = {
    'data-presentation': icons ? 'icons' : undefined,
    'data-overflow': scroll ? 'scroll' : undefined,
    // KF-0Q7Q3D: wireScrollDividers reports which edges have chips past them.
    'data-kui-scroll-strip': scroll ? '' : undefined,
    'data-scrollable': maxHeight === undefined ? undefined : '',
    style:
      maxHeight === undefined
        ? undefined
        : `--_kui-choice-chips-max-height:${maxHeight}`,
  };
  const titleOf = (choice: ChoiceChipsChoice<Value>) =>
    choice.title ?? (icons ? choice.label : undefined);
  if (choices.some((choice) => choice.swatch !== undefined && choice.icon))
    throw new TypeError('A ChoiceChips choice takes a swatch or an icon.');
  const mode: ChoiceChipsSelectionMode =
    props.multiple === true
      ? 'multiple'
      : props.multiple === 'toggle'
        ? 'toggle'
        : 'single';
  const required = mode === 'single' && props.required === true;
  const checked: readonly Value[] =
    props.multiple === true || props.multiple === 'toggle'
      ? (props.value ?? [])
      : props.value === undefined
        ? []
        : [props.value];
  const content = (choice: ChoiceChipsChoice<Value>) => (
    <>
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
    </>
  );
  if (mode === 'multiple') {
    // One Tab stop: the first selected enabled chip, else the first enabled.
    const enabled = disabled
      ? []
      : choices.filter((choice) => choice.disabled !== true);
    const tabStop =
      enabled.find((choice) => checked.includes(choice.value)) ?? enabled[0];
    return (
      <div
        {...filterDataAttributes(rootAttributes, CHOICE_CHIPS_PROTECTED)}
        id={id}
        class={`kui-choice-chips ${className}`.trim()}
        data-component="choice-chips"
        data-selection-mode="multiple"
        data-size={size}
        {...shape}
        data-disabled={disabled ? '' : undefined}
        data-action={action}
        data-name={name}
        data-form={form}
        role="listbox"
        aria-multiselectable="true"
        aria-orientation="horizontal"
        aria-label={label}
        aria-labelledby={labelledBy}
        aria-disabled={disabled ? 'true' : undefined}
        slot={slot}
      >
        {choices.map((choice) => {
          const unavailable = disabled || choice.disabled === true;
          return (
            <span
              class="kui-choice-chips__chip"
              role="option"
              tabindex={choice === tabStop ? '0' : '-1'}
              aria-selected={checked.includes(choice.value) ? 'true' : 'false'}
              aria-disabled={unavailable ? 'true' : undefined}
              data-choice-value={choice.value}
              data-disabled={unavailable ? '' : undefined}
              title={titleOf(choice)}
            >
              {content(choice)}
            </span>
          );
        })}
        {choices
          .filter((choice) => checked.includes(choice.value))
          .map((choice) => (
            <input
              class="kui-choice-chips__value"
              type="hidden"
              name={name}
              value={choice.value}
              form={form}
              disabled={disabled}
            />
          ))}
      </div>
    );
  }
  const multiple = mode === 'toggle';
  return (
    <div
      {...filterDataAttributes(rootAttributes, CHOICE_CHIPS_PROTECTED)}
      id={id}
      class={`kui-choice-chips ${className}`.trim()}
      data-component="choice-chips"
      data-selection-mode={mode}
      data-size={size}
      {...shape}
      data-disabled={disabled ? '' : undefined}
      role={multiple ? 'group' : 'radiogroup'}
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
            title={titleOf(choice)}
          >
            <input
              class="kui-choice-chips__input"
              type={multiple ? 'checkbox' : 'radio'}
              name={name}
              value={choice.value}
              checked={checked.includes(choice.value)}
              disabled={unavailable}
              required={required}
              form={form}
              data-action={action}
            />
            {content(choice)}
          </label>
        );
      })}
    </div>
  );
}
