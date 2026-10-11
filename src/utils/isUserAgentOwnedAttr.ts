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

/**
 * Expando on a custom element (any hyphenated tag): the attribute names the
 * template rendered onto it the last time a reconciler synced its attributes.
 * Custom elements reflect their own defaults onto the host (Web Awesome's
 * `wa-button` sets `variant="neutral"`, `wa-tag` sets `size="m"`, …), so the
 * reconcilers only REMOVE an attribute the template omits when the previous
 * template rendered it. Removing a reflected default made the element put it
 * straight back, so every unrelated re-render forced an update on every such
 * host. Elements the reconcilers create are seeded with their template's
 * names before they connect (`seedRenderedAttrs`); an element with no record
 * (one kerf did not create, or one the keyed-list fast path last wrote) gets
 * the ordinary rule on its next sync. Stored on the element, so it lives
 * exactly as long as the element.
 */
export const RENDERED_ATTRS: unique symbol = Symbol();

/** A live element that may carry the {@link RENDERED_ATTRS} record. */
export type RenderedAttrsHost = Element & {
  [RENDERED_ATTRS]?: readonly string[];
};

/** Markup that opens a custom element (a hyphenated tag name). */
const CUSTOM_TAG = /<[a-z][^\s/>-]*-/i;

/** Whether `html` may contain a custom element worth seeding. */
export function hasCustomTag(html: string): boolean {
  return CUSTOM_TAG.test(html);
}

/**
 * Seed the {@link RENDERED_ATTRS} record on every custom element under
 * `from` — and on `from` itself when it is an element — so a freshly created
 * element's first sync already knows what its template rendered and leaves
 * reflected defaults alone. Must run before the nodes connect (and so before
 * the element can reflect anything): the names come from the template.
 * `to` is the live copy when the reconciler inserts a clone of `from`; the
 * two subtrees are walked in parallel and an element whose tag does not line
 * up is left unseeded (the ordinary rule then applies once).
 */
export function seedRenderedAttrs(
  from: Element | DocumentFragment,
  to: Element | DocumentFragment = from,
): void {
  if (from.nodeType === 1) seedOne(from as Element, to as Element);
  const a = from.querySelectorAll('*');
  const b = to.querySelectorAll('*');
  for (let i = 0; i < a.length; i++) seedOne(a[i], b[i]);
}

function seedOne(from: Element, to: Element | undefined): void {
  const tag = from.localName;
  if (tag.includes('-') && to?.localName === tag) {
    (to as RenderedAttrsHost)[RENDERED_ATTRS] = from.getAttributeNames();
  }
}
