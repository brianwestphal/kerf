# Dialog and popup surface scaffolds

`DialogSurface` and `PopupSurface` configure recurring Web Awesome surface
geometry without application `::part()` overrides. They do not replace Web
Awesome behavior: the application still owns open state, dismissal policy, ids,
labels, and content. With `@kerfjs/ui/popup-menu/register` imported, a dropdown
inside `PopupSurface` also keeps keyboard item navigation made during its show
animation when Web Awesome completes its initial focus handoff.

Wrap one `wa-dialog` with `DialogSurface`. Choose `size` (`small`, `medium`, or
`large`), `presentation` (`modal`, `side-sheet`, or `fullscreen`), and independent
`bodyInset` / `footerInset` (`none`, `compact`, or `comfortable`). The defaults
match Kerf's medium modal, 8px body, and 16px footer rhythm.

The modal size presets have preferred widths of 400px, 560px, and 800px,
respectively, before the viewport width cap. They cannot preserve a different
desktop width exactly. A migration that requires exact shell-width parity needs
an explicit preferred-width capability; changing resource tracks or preview
aspect sizing inside the dialog does not change that outer-width requirement.

### Modal viewport bounds

`viewportGutter` accepts a branded `CssLength` from `@kerfjs/ui/css-values`.
It sets the minimum horizontal clearance, while `size` remains the preferred
width. `maxHeight` accepts a branded length or `"viewport"`; explicit caps are
clamped to the dynamic viewport height minus twice the gutter (16px per edge
when the gutter is omitted). Negative gutters/caps clamp to zero. Omitting
both options preserves Web Awesome's existing width and phone height caps.
These options apply only to `presentation="modal"`; side sheets and fullscreen
surfaces keep their own geometry.

```tsx
import '@kerfjs/ui/surface-scaffold/register';
import { remify } from '@kerfjs/ui/css-values';
import { DialogSurface } from '@kerfjs/ui/surface-scaffold';

<DialogSurface viewportGutter={remify(8)} maxHeight="viewport" bodyInset="none">
  <wa-dialog label="Close workspace">{/* Application-owned content and footer */}</wa-dialog>
</DialogSurface>;
```

This gives a phone modal an 8px edge gutter and a `calc(100dvh - 16px)` height
cap without application selectors on Kerf roots or Web Awesome parts. A cap
is not a fixed height: short content stays naturally sized, and taller content
scrolls in Web Awesome's body while its header/footer remain outside that
scroll owner. Choosing a larger cap cannot guarantee that arbitrary content
fits without scrolling; preview tracks, canvas aspect ratios and content sizing
remain application-owned.

Responsive policy is explicit application state: read `deviceClass()` during
the render to choose the gutter, cap or presentation. For example use
`viewportGutter={remify(device.value.handset ? 8 : 16)}` with `maxHeight="viewport"`.
The scaffold introduces no hidden breakpoint or automatic fullscreen switch.
An application can configure device-class breakpoints when its phone policy
differs from the default. Prefer a typed cap such as `maxHeight={remify(640)}`
when the modal should stop growing before the viewport bound.

Treat a dialog body as a `List` by default. When its rows or sections own their
standard list geometry, set `bodyInset="none"` so the dialog does not add a
second inset. Bare prose is still a list child: wrap it in `ListInsetText` so its
text edge receives the standard 8px margin + 1px transparent border + 8px
padding and aligns with bordered siblings. Reserve `compact` or `comfortable`
body insets for exceptional content that does not already have list/content-item
geometry.

Wrap one `PopupMenu` (or another single `wa-dropdown`) with `PopupSurface`. `inset="list-zero"` removes menu
padding for a child that already owns row insets, `compact` uses 4px, and
`standard` uses the shared 8px surface inset. Keep the dropdown trigger named and
preserve `data-morph-skip-children` when its upgraded light-DOM items must retain
identity across Kerf rerenders. Import `@kerfjs/ui/popup-menu/register` once for
the focus handoff fix when wrapping a raw `wa-dropdown`.

Import `@kerfjs/ui/surface-scaffold/register` once when using `DialogSurface`: it registers `wa-dialog` and repairs Web Awesome 3.12 native dialog names before the first modal opening. Headed dialogs reference the rendered title, including live slotted labels; headerless dialogs use the public `label`. Explicit host `aria-label` and pre-existing native names are preserved. Geometry-only markup stays CSS-free and does not register Web Awesome implicitly.
