# Forms and validation

Start with the [Composer Form recipe](./recipes.md#composer-form). Use one `List` for major section rhythm; give each field its own visible label and nearby hint. A `TextField` owns its label, hint, error, native input, and focus. Use `FieldLabel` for a read-only or click-to-edit field preview, and `ListInsetText` for supporting copy that needs the same text column. Let fields and action rows own their insets instead of wrapping the form in another padded card.

The application owns validation, draft state, permissions, and submission. Validate at the point where the person can act on a problem, keep an invalid field's specific error beside that field, and move focus to the first actionable error after a failed submit. Use a header-area `StateBanner` for a persistent form-level failure or recovery path. A toast suits a short confirmation, not an error that must remain available while the person edits. Never clear a draft or close a popup because unrelated state rerendered.

Keep an unavailable choice or action visible and disabled when that helps explain the current state; hide it only when the person has no access to the feature. Put Cancel before the trailing primary or destructive submit action, with space separating them. Use a native form submit button so Enter and browser form behavior work; preserve the draft on transport failure and prevent duplicate submissions while one is in flight. Test live values, `aria-invalid`, focus, and emitted events, not attributes alone.

See [accessibility contracts](./accessibility.md#textfield) for field behavior, [interaction conventions](./interaction-conventions.md) for dialog and action order, and [application testing](./testing-applications.md) for form assertions.
