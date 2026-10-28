import { Tag } from 'lucide';

import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import {
  filterDataAttributes,
  type RootDataAttributes,
} from '../../../shared/dom/extension-attributes.js';
import { LucideIcon } from '../../media/lucide-icon/lucide-icon.js';
import { SearchField } from '../search-field/search-field.js';

/** The delegated actions a TagField's controls carry; `wireTagFields` handles them. */
export const tagFieldActions = {
  edit: 'edit-tag-field-tag',
  remove: 'remove-tag-field-tag',
  clear: 'clear-tag-field',
} as const;

export interface TagFieldProps {
  /** The field's id: the editor's identity and the prefix of its label and hint ids. */
  id: string;
  /** The visible label, which also names the field. */
  label: string;
  /** The tags, in order. Each is submitted as its own `name` value. */
  tags: readonly string[];
  /** The form field name each tag submits under. */
  name?: string;
  /** Associate the hidden inputs with a form outside their ancestor chain. */
  form?: string;
  /** Placeholder while the field is empty (default `Add tag…`). */
  placeholder?: string;
  /** Placeholder after the last tag (default `Add another…`). */
  morePlaceholder?: string;
  /** Supporting text below the field, also its description. */
  hint?: string;
  /** An error that replaces the hint and marks the field invalid. */
  error?: string;
  /** The most tags it accepts; `wireTagFields` refuses more. */
  max?: number;
  required?: boolean;
  disabled?: boolean;
  /** The leading glyph (default a Lucide `tag`). */
  icon?: KerfUiContent;
  /** The clear button's accessible name (default `Clear Tags`). */
  clearLabel?: string;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
  /** Application `data-*` metadata on the root, such as a row key or an
   * editor node marker; the component's own markers stay protected. */
  rootAttributes?: RootDataAttributes;
}

const TAG_FIELD_PROTECTED = new Set([
  'data-component',
  'data-invalid',
  'data-max',
  'data-tag-field-id',
]);

/**
 * A form field that collects short values as removable tags: SearchField's
 * token editor in its `form-field` presentation, with each tag a chip and a
 * hidden input that submits it under `name`. Typing then Enter (or a
 * delimiter such as a comma) adds a tag; Backspace at the start removes the
 * last one; each chip's label edits it and its × removes it. The app owns
 * the tag list: wire `wireTagFields` from `@kerfjs/ui/wire-tag-fields` and
 * re-render with the list its `onChange` reports.
 */
export function TagField({
  id,
  label,
  tags,
  name,
  form,
  placeholder = 'Add tag…',
  morePlaceholder = 'Add another…',
  hint,
  error,
  max,
  required = false,
  disabled = false,
  icon,
  clearLabel = 'Clear Tags',
  className = '',
  slot,
  rootAttributes = {},
}: TagFieldProps) {
  if (max !== undefined && (!Number.isInteger(max) || max < 1))
    throw new RangeError('TagField max must be a positive integer.');
  return (
    <div
      {...filterDataAttributes(rootAttributes, TAG_FIELD_PROTECTED)}
      class={`kui-tag-field ${className}`.trim()}
      data-component="tag-field"
      data-tag-field-id={id}
      data-max={max === undefined ? undefined : String(max)}
      data-invalid={error ? '' : undefined}
      slot={slot}
    >
      <SearchField
        id={id}
        label={label}
        presentation="form-field"
        hint={error ?? hint}
        required={required}
        tokens={tags.map((tag) => ({ value: tag, label: tag }))}
        placeholder={placeholder}
        tokenPlaceholder={morePlaceholder}
        disabled={disabled}
        leading={icon ?? <LucideIcon icon={Tag} name="tag" />}
        editAction={tagFieldActions.edit}
        removeAction={tagFieldActions.remove}
        clearAction={tagFieldActions.clear}
        clearLabel={clearLabel}
        editorAttributes={{ 'data-tag-field-editor': id }}
      />
      {name === undefined || disabled
        ? null
        : tags.map((tag) => (
            <input type="hidden" name={name} value={tag} form={form} />
          ))}
    </div>
  );
}
