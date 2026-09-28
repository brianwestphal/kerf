/**
 * Attributes whose live value is owned by the element itself, not the
 * template: the reconcilers never REMOVE them just because the template omits
 * them (setting one from the template still applies). Shared by the morph and
 * the keyed-list fast path so both routes honor one rule.
 *
 * `open` qualifies on:
 *  - `<details>` / `<dialog>` — the user agent toggles it on summary click and
 *    on `show()` / `showModal()`.
 *  - custom elements (any hyphenated tag) — Web Awesome's `wa-select`,
 *    `wa-dropdown`, `wa-details`, `wa-dialog`, `wa-drawer`, `wa-popover`, …
 *    reflect their live open state to `open`, so stripping it on an unrelated
 *    re-render closed an open popup under the user.
 *
 * `role` and every `aria-*` qualify on custom elements (any hyphenated tag).
 * Web components conventionally own their host's ARIA — Web Awesome's
 * `wa-option` sets `role="option"` / `aria-selected` / `aria-disabled` from its
 * live state, `wa-divider` sets `role="separator"` / `aria-orientation`, and
 * Shoelace, FAST, and Spectrum do the same in `connectedCallback` / `updated`
 * — so a template that never mentions them must not strip them. Plain
 * elements keep the ordinary rule: a `role` / `aria-*` the template omits is
 * removed. `tabindex` is deliberately NOT included (too often template-driven).
 *
 * Trade-off (same as `<details open>`): a template cannot REMOVE one of these
 * from a custom element by omitting it — render an explicit value instead
 * (`aria-expanded="false"`), bind it to a signal (a binding set to
 * `null` / `false` removes it; bindings are explicit intent and do not consult
 * this rule), or remove it imperatively.
 */
export function isUserAgentOwnedAttr(
  tagNameUpper: string,
  name: string,
): boolean {
  if (tagNameUpper.includes('-')) {
    return name === 'open' || name === 'role' || name.startsWith('aria-');
  }
  return (
    name === 'open' && (tagNameUpper === 'DETAILS' || tagNameUpper === 'DIALOG')
  );
}
