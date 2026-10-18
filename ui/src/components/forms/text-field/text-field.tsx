import { CircleX } from 'lucide';

import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';
import { LucideIcon } from '../../media/lucide-icon/lucide-icon.js';

/** `default` is the 44px control height; `compact` is 33px with smaller text. */
export type TextFieldSize = 'default' | 'compact';

/** The kinds of single-line value a TextField takes. */
export type TextFieldType =
  'text' | 'email' | 'password' | 'search' | 'url' | 'tel' | 'number' | 'date';

const TEXT_FIELD_PROTECTED = new Set([
  'data-component',
  'data-size',
  'data-invalid',
  'data-multiline',
]);

/** Application `data-*` metadata; the TextField's own markers stay protected. */
export type TextFieldRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined>
>;

/**
 * The field's accessible name: a visible `label`, or `ariaLabel` when the
 * surrounding content already names it.
 */
export type TextFieldName =
  { label: string; ariaLabel?: never } | { label?: never; ariaLabel: string };

export type TextFieldProps = TextFieldName & TextFieldOptions;

export interface TextFieldOptions {
  /** The controlled value. */
  value?: string;
  name?: string;
  placeholder?: string;
  /** Supporting text below the field, also its accessible description. */
  hint?: string;
  /**
   * A validation message: shown below the field in the danger color, added
   * to its description, and marking it `aria-invalid`.
   */
  error?: string;
  size?: TextFieldSize;
  /** A leading decorative icon, such as a `LucideIcon` (single-line only). */
  icon?: KerfUiContent;
  /**
   * A clear button while the field has a value (single-line only). Needs
   * `wireTextFields(root)`, which clears the field and announces `input`.
   */
  clearable?: boolean;
  /** The clear button's accessible name (default `Clear`). */
  clearLabel?: string;
  /** The most characters the field accepts (native `maxlength`). */
  maxLength?: number;
  /**
   * Show a live `count / maxLength` below the field. Needs `maxLength` and
   * `wireTextFields(root)`, which updates it as people type.
   */
  showCount?: boolean;
  /** Single-line value kind (default `text`); `date` uses the native picker. */
  type?: TextFieldType;
  /** Native lower bound for `type="number"` (number or numeric string). */
  min?: number | string;
  /** Native upper bound for `type="number"` (number or numeric string). */
  max?: number | string;
  /** Native number increment (number, numeric string, or `"any"`). */
  step?: number | string;
  /** A multi-line field: a `<textarea>`. */
  multiline?: boolean;
  /** A multi-line field's height in lines (default 3). */
  rows?: number;
  /**
   * Grow a multi-line field with its content from `rows` up to this many
   * lines, then scroll.
   */
  maxRows?: number;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  /** Request native focus on insertion or when the containing dialog opens. */
  autofocus?: boolean;
  autocomplete?: string;
  /** The input's id, for an external label or form. */
  id?: string;
  className?: string;
  /** Safe `data-*` metadata (a `data-key`). */
  rootAttributes?: TextFieldRootAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/**
 * A text input with its label above, an optional leading icon and clear
 * button, and supporting or error text below, at the 44px control height or
 * compact. `multiline` makes it a textarea that can grow with its content.
 * The whole field is one `<label>`, so clicking anywhere on it focuses the
 * input; the input is named by `label` (or `ariaLabel`) directly.
 */
export function TextField({
  label,
  ariaLabel,
  value,
  name,
  placeholder,
  hint,
  error,
  size = 'default',
  icon,
  clearable = false,
  clearLabel = 'Clear',
  maxLength,
  showCount = false,
  type = 'text',
  min,
  max,
  step,
  multiline = false,
  rows = 3,
  maxRows,
  disabled = false,
  readOnly = false,
  required = false,
  autofocus = false,
  autocomplete,
  id,
  className = '',
  rootAttributes = {},
  slot,
}: TextFieldProps) {
  const description = [hint, error].filter(Boolean).join(' ') || undefined;
  const shared = {
    id,
    name,
    // A clearable field always has a placeholder, so CSS can hide its clear
    // button while the field is empty (`:placeholder-shown`); a blank one
    // shows nothing.
    placeholder: clearable && !multiline ? (placeholder ?? ' ') : placeholder,
    disabled,
    readonly: readOnly,
    required,
    autofocus,
    autocomplete,
    maxlength: maxLength,
    // The label element also wraps the clear button and the count, so the
    // input takes its name explicitly rather than from the label's text.
    'aria-label': label ?? ariaLabel,
    'aria-description': description,
    'aria-invalid': error ? 'true' : undefined,
  } as const;
  const hintText =
    hint === undefined ? null : (
      <span class="kui-text-field__hint" aria-hidden="true">
        {hint}
      </span>
    );
  const count =
    showCount && maxLength !== undefined
      ? `${String((value ?? '').length)} / ${String(maxLength)}`
      : undefined;
  const style = [
    multiline ? `--_kui-text-field-rows:${String(rows)}` : '',
    multiline && maxRows !== undefined
      ? `--_kui-text-field-max-rows:${String(Math.max(rows, maxRows))}`
      : '',
  ]
    .filter(Boolean)
    .join(';');
  return (
    <label
      {...filterDataAttributes(rootAttributes, TEXT_FIELD_PROTECTED)}
      class={`kui-text-field ${className}`.trim()}
      data-component="text-field"
      data-size={size}
      data-invalid={error ? '' : undefined}
      data-multiline={
        multiline ? (maxRows === undefined ? '' : 'grow') : undefined
      }
      style={style || undefined}
      slot={slot}
    >
      {label === undefined ? null : (
        <span class="kui-text-field__label" aria-hidden="true">
          {label}
          {required ? (
            <span class="kui-text-field__required" aria-hidden="true">
              *
            </span>
          ) : null}
        </span>
      )}
      <span class="kui-text-field__box">
        {icon === undefined || multiline ? null : (
          <span class="kui-text-field__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        {multiline ? (
          <textarea {...shared} class="kui-text-field__input" rows={rows}>
            {value ?? ''}
          </textarea>
        ) : (
          <input
            {...shared}
            class="kui-text-field__input"
            type={type}
            value={value}
            min={type === 'number' ? min : undefined}
            max={type === 'number' ? max : undefined}
            step={type === 'number' ? step : undefined}
          />
        )}
        {clearable && !multiline ? (
          <button
            type="button"
            class="kui-text-field__clear"
            aria-label={clearLabel}
            data-text-field-clear=""
            disabled={disabled || readOnly}
          >
            <LucideIcon icon={CircleX} name="circle-x" />
          </button>
        ) : null}
      </span>
      {count === undefined ? (
        hintText
      ) : (
        <span class="kui-text-field__footer">
          {hintText}
          <span class="kui-text-field__count" data-text-field-count="">
            {count}
          </span>
        </span>
      )}
      {error === undefined ? null : (
        <span class="kui-text-field__error" aria-hidden="true">
          {error}
        </span>
      )}
    </label>
  );
}
