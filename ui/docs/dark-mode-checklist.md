# Dark mode and theming checklist

Start with the package's semantic colors. Set one brand input with `--kui-color-brand` on `:root` and let the theme derive the ramp. When overriding a loud fill, set its matching `on-loud` foreground and check text and focus contrast in **both** schemes; `KUI-L018` catches an unpaired override but cannot judge the rendered contrast.

Use a component's `background`, `tint`, `tone`, or appearance prop for the surface it owns. A `Pane` tint needs an explicit `scheme`; Kerf does not infer it from the image or color. Do not recolor a component through its private variables or add a second lowered surface behind an already sunken component. Translucent lowered colors change when layered over another surface, so inspect the actual backdrop, including content scrolling beneath sticky chrome.

Before shipping, check:

- Light and dark appearance on the real page background, including raised, lowered, tinted, and image-backed regions.
- Normal, quiet, link, disabled, selected, danger, and `on-loud` text; focus rings and icons must remain visible over their actual fills.
- Sticky headers, menus, dialogs, and floating controls while content scrolls beneath them; a transparent or sunken token must not reveal distracting content or lose contrast.
- Forced colors, increased contrast, reduced transparency, and a scheme switch while a view is open. Drafts, focus, and scroll position should survive.
- Narrow and wide layouts, including clipping, overflow, and any appearance scope applied by an overlay.

See [theme tokens and color scopes](./webawesome-theme.md), [Pane background and tint](./layout.md#background-colors), [the evaluator's limits](./ui-evaluator.md#human-visual-review-stays-human), and [application testing](./testing-applications.md). A green analyzer or doctor run does not replace this visual pass.
