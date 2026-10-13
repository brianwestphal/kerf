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
`placement` (`bottom` or `top`), `align` (`start` or `end`), `gap`, and
`viewportMargin` feed the shared `kerfjs/overlay` positioning core: it flips
vertically when the other side fits, keeps the surface `viewportMargin` (default
8px) inside the viewport edges, and follows scroll and resize. The surface fits
its height to the room beside the anchor: when neither side holds it, it opens
on the roomier side, caps its height to that room, and scrolls its content.
The room is exposed to the content as `--kui-anchored-surface-available-height`
and refreshed on every reposition, so a tall help surface fits beside a field on
a phone without application media queries or `max-height` overrides.

```tsx
openAnchoredSurfaceAt(
  { x: event.clientX, y: event.clientY, context: event.target as Element },
  () => <ContextHelp />,
  { label: 'Context help' },
);
```

Pass `context` for a pointer opened inside a modal dialog. Inside a Web
Awesome `wa-dialog` or `wa-drawer`, the surface stays interactive with no extra
markup: `kerfjs/overlay` finds the modal `<dialog>` in the element's shadow
root and hosts the surface in the element's light DOM, slotted inside the
dialog. Dialogs opened by `kerfjs/overlay` get a host automatically too. For an
app-owned native `<dialog>`, include
`<div data-kerf-overlay-host data-morph-skip></div>` in the dialog markup so
controls in the anchored surface stay interactive. For any other modal context,
pass `container`: an element inside the open modal, where the surface is
appended instead. The helper uses the browser top layer where available, and
the shared overlay fallback elsewhere.

Closing the anchor's modal dialog also closes the surface. Escape closes only
the surface; the dialog beneath stays open. The temporary pointer anchor is
removed when the surface closes.

## Dark tone for media chrome

A popup anchored to dark media chrome (a volume control in a
`ToolbarControlGroup tone="dark"` over a video or image preview) passes
`tone: 'dark'`:

```tsx
openAnchoredSurface(volumeButton, () => <VolumeControls />, {
  label: 'Volume',
  tone: 'dark',
  placement: 'top',
});
```

The tone is the same loud, inverse tone as a dark `ToolbarControlGroup` or
`ToolbarText`: dark beside a light page and light beside a dark one, so the
popup matches the group that opened it. When the surface opens it takes the
opposite of the anchor's color scheme (an explicit `color-scheme` on the anchor
or an ancestor wins; `light dark` follows the user's preference), and the
surface is marked `data-tone="dark"`. Nothing else changes. Every semantic
color token is a `light-dark()` pair, so the surface fill, border, and shadow,
and the text, borders, and focus rings of the Kerf UI and Web Awesome
components inside it (a `ListItem` mute row, a `wa-slider`), resolve to the
other side by inheritance. The content needs no tone props and no overrides.
Text and focus rings keep WCAG AA in both page schemes. A theme that replaces a
semantic token with a single color instead of a `light-dark()` pair opts that
token out of the flip. The scheme is chosen when the surface opens; close and
reopen it after the page switches schemes.

## Theming

Override `--kui-anchored-surface-inset` and
`--kui-anchored-surface-radius` for a theme; content can compose any Kerf UI
components without the surface applying action policy. Prefer `PopupMenu` for
a typed command list and `Select` for choosing a persistent value. See
[component selection](component-selection.md).
