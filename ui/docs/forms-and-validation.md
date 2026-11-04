# Forms and validation

Start with the [Composer Form recipe](./recipes.md#composer-form). Use one `List` for major section rhythm; give each field its own visible label and nearby hint. A `TextField` owns its label, hint, error, native input, and focus. Use `FieldLabel` for a read-only or click-to-edit field preview, and `ListInsetText` for supporting copy that needs the same text column. Let fields and action rows own their insets instead of wrapping the form in another padded card.

For exact phrases, names, or numeric strings, configure `TextField` with the native `autocapitalize`, `autocorrect`, `spellcheck`, and `inputMode` props as needed. They reach its input or textarea; `spellcheck={false}` renders `spellcheck="false"` explicitly. `inputMode="numeric"` hints at a numeric keyboard without changing the value to a number or applying number-input validation.

The application owns validation, draft state, permissions, and submission. Validate at the point where the person can act on a problem, keep an invalid field's specific error beside that field, and move focus to the first actionable error after a failed submit. Use a header-area `StateBanner` for a persistent form-level failure or recovery path. A toast suits a short confirmation, not an error that must remain available while the person edits. Never clear a draft or close a popup because unrelated state rerendered.

Keep an unavailable choice or action visible and disabled when that helps explain the current state; hide it only when the person has no access to the feature. Put Cancel before the trailing primary or destructive submit action, with space separating them. Use a native form submit button so Enter and browser form behavior work; preserve the draft on transport failure and prevent duplicate submissions while one is in flight. Test live values, `aria-invalid`, focus, and emitted events, not attributes alone.

See [accessibility contracts](./accessibility.md#textfield) for field behavior, [interaction conventions](./interaction-conventions.md) for dialog and action order, and [application testing](./testing-applications.md) for form assertions.

## Form

Group fields that are saved or sent together in a `Form` from `@kerfjs/ui/form`, not a raw `<form>`. It renders a native `form` with no inset, chrome, or layout of its own (`display: contents`), so its children lay out as the parent's own; put a `List`, `Row`, or `Grid` inside it for rhythm. A parent rule that selects its direct children does not reach through it.

Submission follows one contract:

- Call `wireForms(root)` from `@kerfjs/ui/wire-forms` once. It cancels the native submission's page navigation for every `Form` below `root`, whether a submit `Button` or Enter in a field submitted it. It listens in the capture phase, so no handler can let a submission through, and it leaves a native `<form>` that is not a `Form` alone.
- Give the `Form` an `action`. Like a `Button`'s, it is a delegated `data-action`, not the native URL: handle it with `delegateActions(root, 'submit', { [action]: (event, form) => … })` and read the fields with `new FormData(form)`.
- Native constraint validation runs before `submit` fires. Set `noValidate` when the application validates the fields and shows their errors itself.
- A submit `Button` outside the form, such as in a `DialogSurface` footer, takes `type="submit"` and `form={id}`. A click action that reads `new FormData(document.getElementById(id))` also works.

```tsx
import { Button } from "@kerfjs/ui/button";
import { Form } from "@kerfjs/ui/form";
import { List } from "@kerfjs/ui/list";
import { TextField } from "@kerfjs/ui/text-field";
import { wireForms } from "@kerfjs/ui/wire-forms";
import { delegateActions } from "kerfjs/actions";

<Form id="project-form" action="save-project">
  <List gap="xs" controlInsets="rl">
    <TextField name="project" label="Project Name" required />
    <Button type="submit" tone="brand">
      Save
    </Button>
  </List>
</Form>;

wireForms(root);
delegateActions(root, "submit", {
  "save-project": (_event, form) => {
    const data = new FormData(form as HTMLFormElement);
    saveProject(String(data.get("project")));
  },
});
```
