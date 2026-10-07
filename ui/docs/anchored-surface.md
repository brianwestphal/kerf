# AnchoredSurface

Use `openAnchoredSurface` from `@kerfjs/ui/anchored-surface` for interactive help
or other arbitrary content beside a control. Use `openAnchoredSurfaceAt` for a
pointer location. Import `@kerfjs/ui/styles.css` or the individual
`@kerfjs/ui/anchored-surface.css` stylesheet. The surface draws its own raised
background, border, inset, radius, shadow, and viewport size limit; the app
supplies the content and decides when to open or close it.

```tsx
import { openAnchoredSurface } from '@kerfjs/ui/anchored-surface';

const help = openAnchoredSurface(button, () => <HelpContent />, {
  label: 'Pricing help',
});
// Close after an app action: help.close();
```

The returned `OverlayHandle` has `el`, idempotent `close()`, and `result`.
The surface is a non-modal `role="dialog"` named by the required nonempty `label`.
Focus moves to its first focusable descendant by default and returns to the
focusable anchor on close (or the previously focused element for a nonfocusable
anchor). Pass `initialFocus: false` for read-only
help that leaves focus on its trigger. Escape and an outside press dismiss it;
`dismiss`, `onDismiss`, and `outsideIgnore` can customize that behavior.
`placement` (`bottom` or `top`), `align` (`start` or `end`), and `gap` feed the
shared `kerfjs/overlay` positioning core: it flips vertically when the other
side fits, clamps horizontally, and follows scroll and resize. Content taller
than the viewport scrolls inside the surface.

```tsx
openAnchoredSurfaceAt(
  { x: event.clientX, y: event.clientY, context: event.target as Element },
  () => <ContextHelp />,
  { label: 'Context help' },
);
```

Pass `context` for a pointer opened inside a modal `<dialog>`. For app-owned
dialogs, include `<div data-kerf-overlay-host data-morph-skip></div>` in the
dialog markup so controls in the anchored surface stay interactive. Dialogs
opened by `kerfjs/overlay` get that host automatically. The helper uses the
browser top layer where available, and the shared overlay fallback elsewhere.
Closing an anchor's modal dialog also closes the surface. The temporary pointer
anchor is removed when the surface closes.

Override `--kui-anchored-surface-inset` and
`--kui-anchored-surface-radius` for a theme; content can compose any Kerf UI
components without the surface applying action policy. Prefer `PopupMenu` for
a typed command list and `Select` for choosing a persistent value. See
[component selection](component-selection.md).
