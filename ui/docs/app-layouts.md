# Choosing an app layout

`@kerfjs/ui` ships four opt-in, tree-shakeable whole-screen layouts plus the
[`device-class`](device-class.md) signal that drives their responsive behavior.
This guide maps a **data + interaction + device** situation to the layout to
reach for, and states the device-class threshold at which the presentation
changes. The layouts:

- [`NavStack`](nav-stack.md) — push/pop navigation (a single pane is a one-entry stack).
- [`SplitView`](split-view.md) — list-detail (two panes, collapsing to a stack).
- [`Workbench`](workbench.md) — the Xcode-like collapsible rails + drawer.
- [`TabScaffold`](tab-scaffold.md) — the iOS bottom tab bar (each tab a stack).
- [`CollapsiblePanel` + `wireSidebar`](collapsible-panel.md) — a standalone
  collapsible rail or bottom drawer (with `CollapsiblePanelToggle`), outside a full
  shell: the standard collapse animation, icon convention, and `wireSidebar`
  semantics (focus, compact overlay, persistence).

Derive responsiveness from `deviceClass()`: `compact` (a handset or portrait
tablet) means "one pane at a time"; `atLeast('tablet')` / `atLeast('desktop')`
gate the roomier presentations.

Full-height shells retain `height: 100%` so they remain embeddable. Give a
top-level shell a definite height chain by importing `@kerfjs/ui/document.css`
and applying `.kui-app-root` to the direct mount container; see the
[document baseline](document-baseline.md). Do not replace an embeddable shell's
height with `100dvh`.

## Safe areas

On a device with unsafe areas (a notch, rounded corners, a home indicator) and a
page that opts into them with `<meta name="viewport" content="…, viewport-fit=cover">`,
the layouts handle the insets for you. There is nothing to configure:

- **Surfaces paint edge to edge.** Pane and panel backgrounds, separators, and
  dividers run through the unsafe area. A collapsible rail or drawer grows by
  the inset it reaches, so its content keeps its configured width or height.
- **Content is padded on the sides it touches.** Inline insets pad the sides a
  region actually reaches. Block insets become padding _inside_ the scroll
  container (with matching `scroll-padding`), so content scrolls under the
  status bar or home indicator but its first and last items can always be
  scrolled clear.
- **Interior edges get nothing.** A `Workbench` center next to an expanded rail,
  a `SplitView` detail beside its list, or a `NavStack` view under its chrome is
  not inset on that edge. Collapse the rail and the center picks up the edge.
- **No double inset.** Whichever region applies an inset clears it for its
  descendants. A layout region whose only child is a `Pane` or another layout
  lets that child own the insets. That child fills the region — a `Workbench`
  area or panel, a `NavStack` view, a `TabScaffold` scene — so a sole `Pane`'s
  header stays pinned while its own content scrolls. A `Pane` header or footer whose only child is
  a `Toolbar` hands the inline insets to the toolbar, so the toolbar's dividers
  still reach the edge.

A plain `Pane` follows the same rules. It assumes it may touch every screen edge
unless its layout says otherwise. When your own markup puts panes side by side,
say which sides each pane reaches with `safeAreaEdges`:

```tsx
<div class="app-columns">
  <Pane label="Library" safeAreaEdges={['block-start', 'block-end', 'inline-start']}>…</Pane>
  <Pane label="Reader" safeAreaEdges={['block-start', 'block-end', 'inline-end']}>…</Pane>
</div>
```

An app bar or bottom bar that sits directly at a screen edge, outside any
`Pane` header or footer, claims its edges the same way. A `Toolbar` only pads
the inline edges an owner hands it until you list the sides it reaches:

```tsx
<List fill>
  <Toolbar
    label="App bar"
    safeAreaEdges={['block-start', 'inline-start', 'inline-end']}
    leading={<ToolbarText text="Atlas" />}
  />
  <Row gap="none" flex>…panes that list block-end and their outer side…</Row>
</List>
```

Each claimed side pads by the edge context, or the full device inset when
nothing routes that edge, while the bar's surface and divider still reach the
screen edge. A claimed toolbar inside a `Pane` header or footer adds nothing
extra, because the pane already owns those edges.

Pass `safeAreaEdges={[]}` for a pane that never sits at a screen edge. In an
arrangement you own, give each `Pane` (and each edge-claiming `Toolbar`)
`safeAreaEdges` listing only the sides its region reaches. The toolbar
configurations layouts accept (a Workbench `mainToolbar` / `mainBottomToolbar`,
and a Workbench panel's or `CollapsiblePanel`'s `toolbar`) forward
`safeAreaEdges` to their `Toolbar` the same way.
A `CollapsiblePanel` clears the edge it covers for its direct flex siblings
automatically; a panel wrapped in your own grid cell cannot see its siblings,
so pass the neighboring panes' `safeAreaEdges` yourself.

The device insets come from `--kui-safe-area-block-start`, `-block-end`,
`-inline-start`, and `-inline-end`, which default to `env(safe-area-inset-*)`.
Override them on `:root` to reserve room for app-owned chrome or to simulate a
device in tests.

### Edge-to-edge content inside a Pane

The Pane's scrolling slot publishes its resolved horizontal padding as
`--kui-pane-content-inset-inline-start` and
`--kui-pane-content-inset-inline-end`. Both inherited values include the safe
area on the corresponding side, plus the extra 8px when `deepInset` is true.
An app component can use them to let a row background or divider reach the
Pane edge while its text stays on the ordinary content axis:

```css
.orders-table {
  margin-inline-start: calc(-1 * var(--kui-pane-content-inset-inline-start));
  margin-inline-end: calc(-1 * var(--kui-pane-content-inset-inline-end));
}

.orders-table th:first-child,
.orders-table td:first-child {
  padding-inline-start: calc(var(--kui-pane-content-inset-inline-start) + 17px);
}

.orders-table th:last-child,
.orders-table td:last-child {
  padding-inline-end: calc(var(--kui-pane-content-inset-inline-end) + 17px);
}
```

Here 17px is the app's chosen text offset from the content slot: a default
`ContentItem` uses 8px outer margin, 1px border, and 8px inner padding. Adjust
that offset to match the neighboring content. Keep the table inside the Pane's
single scrolling slot; the negative margins change only its inline reach. The
[`Pane` UX catalog example](../ux-demo/demos/pane.tsx) shows both `deepInset`
states with the same table component.

## Decision matrix

| Situation                                                                    | Layout                                                                                          | Device threshold                                                                                                                   |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Simple app, a few flat sections                                              | `NavStack` with one entry (single pane); add `TabScaffold` for 2–5 co-equal sections on handset | `TabScaffold` on `compact`; promote its tabs to a `Workbench` rail / sidebar `atLeast('desktop')`                                  |
| Drill-down browsing (list → item → sub-item)                                 | `NavStack`; upgrade to `SplitView` once list + detail fit together                              | `SplitView` two-pane `atLeast('tablet')` landscape / non-`compact`; `NavStack` form on `compact`                                   |
| Two related panes, selecting on the left updates the right                   | `SplitView`                                                                                     | two panes when not `compact`; collapses to `NavStack` (list → detail) on `compact`                                                 |
| Complex tool / editor with peripheral panels (navigator, inspector, console) | `Workbench`                                                                                     | full three-panel `atLeast('desktop')`; on smaller classes present the rails via `NavStack` / overlay drawers, not a shrunken shell |
| Mobile app with 2–5 top-level destinations, each its own drill-down          | `TabScaffold`, each tab a `NavStack`                                                            | bottom bar on `compact`; promote to a rail / sidebar `atLeast('desktop')`                                                          |

### Worked examples

- **Settings screen (simple):** one `NavStack` entry per screen; push a subpage
  on tap. No `SplitView`/`Workbench` — it is a single flow.
- **Mail (drill-down + two-pane):** `SplitView` with `list={<ThreadList/>}` and
  `detail={<Message/>}`, `compact={device.value.compact}`,
  `detailActive={selected != null}`. On desktop both panes show with a resizable
  separator; on a phone it is a `NavStack` (threads → message, back clears the
  selection).
- **IDE (complex tool):** `Workbench` with a left navigator rail, a right
  inspector rail, and a bottom console drawer, each `collapsed` bound to a
  signal. Only offer this `atLeast('desktop')`. To let people size the
  navigator or console, opt those panels in with `resizable` and call
  `wireWorkbench` with their size signals and `deviceClass`; resizing is
  suspended on `compact`, where the rails become overlay drawers — or give each
  rail `responsiveOverlayAt: "narrow"` and let the Workbench's own width decide
  when it overlays, with no device check; pass each rail's `collapsed` signal
  to `wireWorkbench` so the overlay starts collapsed, takes focus and keeps Tab
  inside it while open, and closes on Escape or an outside press. Inline
  rails, fixed or resizable, leave the editor its `mainMinSize` (320px by
  default) and shrink in proportion when the window narrows; the bottom drawer
  leaves it `mainMinHeight` (120px by default) and shrinks when the window gets
  shorter.
- **Social app (tabbed):** `TabScaffold` with Home / Search / Profile tabs, each
  `content` a `NavStack`. On a tablet/desktop, render the same sections as a
  `Workbench` left rail instead of a bottom bar.

Whatever the layout, call `wireScrollDividers(appRoot)` from
`@kerfjs/ui/wire-scroll-dividers` once: every `Pane` a layout renders, every
`NavStack`'s top chrome and bottom toolbar, and every `TabScaffold` bar then
draw the line between the pinned chrome and the scrolling content only while
content is scrolled beneath them, and toolbars need no divider of their own. See [Scroll dividers](layout.md#scroll-dividers).

## Dialogs

Pick the dialog's inner layout by the same complexity axis, then apply the device
class to how it is presented (compose with [`overlay`](../../docs/19-native-overlay-backing.md)):

- **desktop:** an inline dialog — a `SplitView` two-pane body, or a `NavStack`
  for a wizard.
- **portrait tablet / handset:** present a `SplitView`/complex dialog as a
  full-screen modal (its `compact` `NavStack` form).
- **landscape tablet:** a large partial-cover modal (does not need to go full
  screen).

A `NavStack` works as a dialog body at every size — a wizard pushes and pops its
steps with cross-faded chrome.
