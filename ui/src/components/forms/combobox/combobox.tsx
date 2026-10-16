/** A suggestion: a plain string, or a value with a distinct visible label. */
export type ComboboxSuggestion = string | { value: string; label: string };

export interface ComboboxProps {
  /** Unique id; it also identifies the field in `wireComboboxes` reports. */
  id: string;
  /** Visible field label. */
  label: string;
  /** Suggestions to filter as the person types. */
  suggestions: readonly ComboboxSuggestion[];
  /** Initial text; the field owns its text while the person types. */
  value?: string;
  placeholder?: string;
  /** Optional hint below the field, such as "Press Enter to add". */
  hint?: string;
  /** Form field name. */
  name?: string;
  /**
   * Offer to create the typed text when it matches no suggestion; the option
   * reads `createLabel` with `{value}` replaced. Omit to only allow
   * suggestions. Default `Create “{value}”`.
   */
  createLabel?: string | false;
  disabled?: boolean;
  className?: string;
}

const optionParts = (suggestion: ComboboxSuggestion) =>
  typeof suggestion === 'string'
    ? { value: suggestion, label: suggestion }
    : suggestion;

/**
 * A free-text field with a filtered suggestion list that can also create a new
 * value: the ARIA combobox pattern on a native input with the themed Web
 * Awesome field chrome. `wireComboboxes` filters, moves the active option,
 * and reports commits (Enter, comma, or a click). Use `Select` when only
 * existing values are allowed and nothing is typed.
 */
export function Combobox({
  id,
  label,
  suggestions,
  value = '',
  placeholder,
  hint,
  name,
  createLabel = 'Create “{value}”',
  disabled = false,
  className = '',
}: ComboboxProps) {
  const listId = `${id}-listbox`;
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div
      class={`kui-combobox ${className}`.trim()}
      data-component="combobox"
      data-combobox-id={id}
      data-create-label={createLabel === false ? undefined : createLabel}
      data-disabled={disabled ? 'true' : undefined}
    >
      <label class="kui-combobox__label" for={id}>
        {label}
      </label>
      <div class="kui-combobox__control">
        <input
          id={id}
          class="kui-combobox__input"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded="false"
          aria-controls={listId}
          aria-describedby={hintId}
          autocomplete="off"
          spellcheck="false"
          name={name}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
        />
        <ul
          class="kui-combobox__listbox"
          id={listId}
          role="listbox"
          popover="manual"
          hidden
        >
          {suggestions.map((suggestion, index) => {
            const option = optionParts(suggestion);
            return (
              <li
                class="kui-combobox__option"
                id={`${id}-option-${index}`}
                role="option"
                aria-selected="false"
                data-value={option.value}
              >
                {option.label}
              </li>
            );
          })}
          {createLabel !== false && (
            <li
              class="kui-combobox__option"
              id={`${id}-option-create`}
              role="option"
              aria-selected="false"
              data-create=""
              hidden
            />
          )}
        </ul>
      </div>
      {hint && (
        <div class="kui-combobox__hint" id={hintId}>
          {hint}
        </div>
      )}
    </div>
  );
}
