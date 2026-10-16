import { ChevronDown } from 'lucide';

import { filterDataAttributes } from '../../../shared/dom/extension-attributes.js';
import { LucideIcon } from '../../media/lucide-icon/lucide-icon.js';
import type { ColorPickerMode } from '../color-picker/color-picker.js';
import { formatHex, parseColor } from '../color-picker/model/color-model.js';

/** `default` matches TextField's box; `compact` its compact size. */
export type ColorFieldSize = 'default' | 'compact';

/** Application `data-*` metadata; the field's own markers stay protected. */
export type ColorFieldRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined>
>;

const COLOR_FIELD_PROTECTED = new Set([
  'data-component',
  'data-size',
  'data-value',
  'data-mode',
  'data-alpha',
  'data-invalid',
  'data-color-field-id',
]);

export type ColorFieldProps = {
  /** The trigger's id; it also prefixes the hint and error ids. */
  id: string;
  /** CSS color text; invalid text shows black. */
  value: string;
  /** The picker's model when it opens (default `rgb`). */
  mode?: ColorPickerMode;
  /** Offer opacity in the picker (default true). */
  alpha?: boolean;
  /** A form field name the hex value submits under. */
  name?: string;
  /** Associate the hidden input with a form outside its ancestor chain. */
  form?: string;
  /** Supporting text below the field, also its description. */
  hint?: string;
  /** An error below the field that marks it invalid. */
  error?: string;
  size?: ColorFieldSize;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  rootAttributes?: ColorFieldRootAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
} & (
  { label: string; ariaLabel?: never } | { label?: never; ariaLabel: string }
);

/**
 * A form field for a color: a label above a trigger that shows the current
 * color as a swatch and its hex value. Pressing it opens a ColorPicker in an
 * AnchoredSurface anchored to the field; Escape or a press outside closes it
 * and focus returns to the trigger. Wire `wireColorFields` from
 * `@kerfjs/ui/wire-color-fields`; it previews edits on the trigger, reports
 * them, and the app re-renders with the new value.
 */
export function ColorField({
  id,
  value,
  mode = 'rgb',
  alpha = true,
  name,
  form,
  label,
  ariaLabel,
  hint,
  error,
  size = 'default',
  disabled = false,
  required = false,
  className = '',
  rootAttributes = {},
  slot,
}: ColorFieldProps) {
  const parsed = parseColor(value) ?? { r: 0, g: 0, b: 0, a: 1 };
  const hex = formatHex(alpha ? parsed : { ...parsed, a: 1 });
  const describedBy =
    [hint === undefined ? '' : `${id}-hint`, error ? `${id}-error` : '']
      .filter(Boolean)
      .join(' ') || undefined;
  return (
    <div
      {...filterDataAttributes(rootAttributes, COLOR_FIELD_PROTECTED)}
      class={`kui-color-field ${className}`.trim()}
      data-component="color-field"
      data-color-field-id={id}
      data-size={size}
      data-value={hex}
      data-mode={mode}
      data-alpha={alpha ? '' : undefined}
      data-invalid={error ? '' : undefined}
      slot={slot}
    >
      {label === undefined ? (
        <span id={`${id}-label`} hidden>
          {ariaLabel}
        </span>
      ) : (
        <label class="kui-color-field__label" id={`${id}-label`} for={id}>
          {label}
          {required ? (
            <span class="kui-color-field__required" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      )}
      <button
        type="button"
        id={id}
        class="kui-color-field__trigger"
        aria-labelledby={`${id}-label ${id}-value`}
        aria-haspopup="dialog"
        aria-expanded="false"
        aria-describedby={describedBy}
        aria-invalid={error ? 'true' : undefined}
        disabled={disabled}
      >
        <span
          class="kui-color-field__swatch"
          style={`--_kui-color-field-color:${hex}`}
          aria-hidden="true"
        />
        <span class="kui-color-field__hex" id={`${id}-value`}>
          {hex.slice(1).toUpperCase()}
        </span>
        <span class="kui-color-field__chevron" aria-hidden="true">
          <LucideIcon icon={ChevronDown} name="chevron-down" size="s" />
        </span>
      </button>
      {hint === undefined ? null : (
        <span class="kui-color-field__hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
      {error ? (
        <span class="kui-color-field__error" id={`${id}-error`}>
          {error}
        </span>
      ) : null}
      {name === undefined ? null : (
        <input type="hidden" name={name} value={hex} form={form} />
      )}
    </div>
  );
}
