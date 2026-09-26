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
  lets that child own the insets. A `Pane` header or footer whose only child is
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

Pass `safeAreaEdges={[]}` for a pane that never sits at a screen edge. For a
region you own, set `--kui-edge-inset-block-start`, `--kui-edge-inset-block-end`,
`--kui-edge-inset-inline-start`, or `--kui-edge-inset-inline-end` to `0px` on the
region for each edge it does not reach, and kerf descendants follow. A
`CollapsiblePanel` does this for its direct flex siblings automatically. A
panel wrapped in your own grid cell cannot see its siblings, so route those
edges yourself.

The device insets come from `--kui-safe-area-block-start`, `-block-end`,
`-inline-start`, and `-inline-end`, which default to `env(safe-area-inset-*)`.
Override them on `:root` to reserve room for app-owned chrome or to simulate a
device in tests.

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
  signal. Only offer this `atLeast('desktop')`.
- **Social app (tabbed):** `TabScaffold` with Home / Search / Profile tabs, each
  `content` a `NavStack`. On a tablet/desktop, render the same sections as a
  `Workbench` left rail instead of a bottom bar.

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
