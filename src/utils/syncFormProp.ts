/**
 * Form-state property sync — shared by the morph's attribute writer and the
 * fine-grained binding writer (KF-335: controlled checked/value/selected went
 * stale after user interaction).
 *
 * Browsers detach a form control's live property from its attribute once the
 * control is "dirty" (the user — or script — has touched it): the attribute
 * becomes only the *default*. An attribute-only reconciler therefore updates
 * `checked=""` / `value="…"` / `selected=""` while the visible state stays
 * stale.
 *
 * The rule: callers invoke this ONLY at the moment they actually MUTATE one of
 * these attributes (set, change, or remove). The property then follows the
 * attribute. Attribute-unchanged elements are never touched, so uncontrolled
 * usage — JSX that never mentions the attribute — keeps user-driven state
 * exactly as before. This is the same philosophy as the user-agent-owned
 * `open` carve-out on `<details>`/`<dialog>`: kerf only touches what the
 * template expressed an opinion about.
 *
 * The focused-element exception: a focused text-entry control's `value` is the
 * user's in-progress edit — the morph's preservation rule owns it, so `value`
 * sync is skipped for `document.activeElement`.
 */
export function syncFormProp(
  el: Element,
  name: string,
  value: string,
  present: boolean,
): void {
  const tag = el.tagName;
  if (name === 'checked') {
    if (tag === 'INPUT') (el as HTMLInputElement).checked = present;
  } else if (name === 'value') {
    if (tag === 'INPUT' && el !== document.activeElement) {
      (el as HTMLInputElement).value = present ? value : '';
    }
  } else if (name === 'selected') {
    if (tag === 'OPTION') (el as HTMLOptionElement).selected = present;
  }
}
