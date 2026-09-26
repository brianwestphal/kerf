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
 * Trade-off (same as `<details>`): a controlled `open={false}` cannot close one
 * of these through the template; drive `open` imperatively instead.
 */
export function isUserAgentOwnedAttr(
  tagNameUpper: string,
  name: string,
): boolean {
  return (
    name === 'open' &&
    (tagNameUpper === 'DETAILS' ||
      tagNameUpper === 'DIALOG' ||
      tagNameUpper.includes('-'))
  );
}
