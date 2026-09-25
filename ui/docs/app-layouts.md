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
