# TagField

`@kerfjs/ui/tag-field` collects short values as removable tags, each
submitted as its own form value. It is SearchField's token editor in its
`form-field` presentation, so tags look and edit like SearchField chips, plus
a hidden input per tag.

```tsx
import { TagField } from "@kerfjs/ui/tag-field";
import { wireTagFields } from "@kerfjs/ui/wire-tag-fields";

const labels = signal(["bug", "docs"]);

<TagField
  id="labels"
  label="Labels"
  name="labels"
  tags={labels.value}
  hint="Press Enter or a comma to add a label."
/>;

const stop = wireTagFields(root, {
  onChange: ({ tags }) => (labels.value = tags),
});
```

## Props

- `id` and `label` (required): the editor's identity and its visible name.
- `tags` (required): the list, in order. The app owns it.
- `name` and `form`: each tag submits as a hidden `<input name>` (none while
  `disabled`).
- `hint`, or `error`, which replaces the hint, marks the field invalid, and
  turns its frame and message the danger color.
- `max`: the most tags `wireTagFields` accepts.
- `placeholder` (default `Add tag…`) and `morePlaceholder` after the last tag
  (default `Add another…`), `required`, `disabled`, `icon` (default a tag
  glyph), and `clearLabel` (default `Clear Tags`).

## Editing

`wireTagFields(root, options)` wires every TagField under `root`, including
the SearchField editor mechanics it is built on:

- **Adding.** Enter or a delimiter (default `,`) adds the typed text; text
  pasted with delimiters becomes several tags; Tab, or focus leaving the
  editor, adds what is typed (`commitOnBlur: false` turns that off).
- **Refusing.** A duplicate (unless `allowDuplicates`), a value past `max`, or
  a value `normalize` refuses is reported to `onReject({ id, value, reason })`
  with `reason` `duplicate`, `max`, or `invalid`; show it as the `error`.
  `normalize` defaults to trimming and refusing empty text.
- **Removing and editing.** Backspace at the start removes the last tag; a
  chip's × removes it; its label moves it back into the editor to edit; the
  clear button empties the list.
- **Moving.** ArrowLeft at the start reaches the chips; ArrowLeft and
  ArrowRight move between them and back to the editor; Backspace or Delete
  removes the focused chip.

Every change goes to `onChange({ id, tags })`; apply it and re-render. The
caret returns to the editor after a change made while typing. A
`wireSearchFields` on the same root leaves a TagField's keys to
`wireTagFields`, so both can wire one page.

Use `SearchField` instead when the tokens are search filters, and
`ChoiceChips` to pick several values from a short known set. Use this instead
of `wa-tag-input`, which is Discouraged.
