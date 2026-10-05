# CollapsiblePanel + wireSidebar — reusable sidebar / drawer support

`@kerfjs/ui/collapsible-panel` and `@kerfjs/ui/wire-sidebar` are the standalone,
reusable pieces for an app's own **side rails** and **bottom drawers** — the same
collapse semantics the `Workbench` shell and the catalog sidebar use, but outside
a full shell so you can dock one panel wherever your layout needs it. They are
subpath-only, tree-shakeable modules that add nothing to the main barrel.

```bash
npm install @kerfjs/ui # kerfjs is a peer
```

A browser bundler that honors the `browser` export condition loads the panel's CSS
and that of the components it renders (`Pane`, `Toolbar`, `ToolbarControlGroup`,
`LucideIcon`) with `@kerfjs/ui/collapsible-panel`. Without that condition, import
`@kerfjs/ui/collapsible-panel.css` plus those stylesheets alongside `foundation.css`.

## The pieces

- **`CollapsiblePanel({ id, side, collapsed?, size?, label?, children })`** — the
  docked panel: a `'left'` / `'right'` rail or a `'bottom'` drawer. It owns only
  presentation. Collapsing snaps the panel's own size to zero in one reflow while
  the fixed-size content slides out via `transform` (composited, clipped) — never
  a per-frame width/height animation. A bottom drawer anchors that fixed-size
  content to its stable bottom edge, so opening and closing move monotonically
  through the transform alone instead of transitioning from a changing layout
  origin and snapping at the end. The app owns the `collapsed` signal; `size`
  overrides the CSS default width/height.
  A collapsed panel renders `inert` together with `aria-hidden="true"`, straight
  from `collapsed`, so neither Tab, a pointer, nor assistive technology reaches
  content that has slid out of view, and focusing a control can never scroll
  the clipped content back into view. `inert` does not affect rendering, so the
  slide-out still animates; expanding removes both attributes in the same
  render. `aria-hidden` alone had left the panel's controls focusable inside a
  hidden subtree; it stays beside `inert` so the emptied landmark is hidden
  even from tooling that does not prune inert subtrees. Do not add your own
  `inert`, `aria-hidden`, or `tabindex` to hide the content. The
  `restoreControl` renders outside the panel and stays reachable.
  Reusable shell policies are typed props: `separator`, `collapseMotion`,
  `contentOverflow`, and `presentation`. A collapsed panel may also receive a
  `restoreControl`, which Kerf places at the safe-area-aware `restorePosition`
  corner of the panel's own container (the element holding the panel), never
  of the viewport, so an embedded panel's control stays inside it and scrolls
  with it. While the control shows, that container becomes its containing block
  and isolates its stacking (an app's own `position` on the container still
  wins). The corner is inset by `--kui-collapsible-panel-restore-inset` plus the
  container's edge insets, and it owns that inset, so a `FloatingToolbar` hosting
  the control floats from the corner without adding its own. When the same
  container also holds an expanded inline bottom drawer — a bottom
  `CollapsiblePanel` or a bottom `ResizableRegion` (`axis="vertical"`,
  `edge="start"`) — as a direct child, or inside one of its direct children
  (the app's work-area column), the corner floats that inset above the
  drawer's top edge instead of over the drawer, and returns to the container's
  bottom when the drawer collapses. It follows the drawer through CSS anchor
  positioning, so a drag-resize moves it too; an engine without anchor
  positioning keeps the container's bottom corner. A drawer nested deeper,
  inside the work area's own content, belongs to that content and does not move
  the corner. The corner stacks beneath open overlays: an open overlay is the
  page's top layer, so it covers another panel's restore control as it covers
  the rest of the page, including under the compact overlay's backdrop. The
  control takes `--kui-collapsible-panel-restore-z`, which defaults to two less
  than `--kui-collapsible-panel-overlay-z` (38); the backdrop defaults to one
  less (39), so moving the overlay z-index moves both. While a left or right
  overlay is open (the `wireSidebar` compact overlay, or
  `presentation="overlay"`), the content's floating controls — restore
  corners and any `FloatingToolbar` — are also hidden outright (out of the
  tab order and the accessibility tree), so they never paint over the overlay
  whatever stacking context the app creates; they return as it closes. The
  overlay's own floating controls stay, and a bottom overlay hides nothing. A
  horizontal `presentation="overlay"` `ResizableRegion` does the same for its
  siblings. Escape, a backdrop
  press, or the panel's own close control reveals the control again, and a
  collapsed overlay leaves it clickable. `ResizableRegion`'s `restoreControl`
  follows the same rules, two below `--kui-resizable-region-overlay-z` (39).
  A collapsed `ResizableRegion` likewise renders `inert` and `aria-hidden` on
  the region itself (and `inert` on its `.kui-resizable-region__content`
  wrapper), so its label leaves the accessibility tree with its content; its
  separator is already hidden while collapsed, and the restore control stays
  outside the region. Its `restorePosition` accepts top or bottom start/end
  corners, with typed `restoreInset` for the corner distance. Set
  `restorePlacement="inline"` when the container should place the control in
  normal flow. An inline region's surface uses
  `--kui-resizable-region-background`; an open descendant `PopupMenu` or Web
  Awesome dropdown releases clipping and raises the popup layer for its
  lifecycle. Set `contentOverflow="visible"` for other anchored content that
  must escape the region's content box.
  Overlay presentation also clamps fixed-size animated content to the configured
  responsive overlay maximum, so a remembered desktop size cannot escape a narrow
  viewport.
- **`CollapsiblePanelToggle({ side, collapsed, action, panelId?, label? })`** and
  **`collapsiblePanelToggleIcon(side, collapsed)`** — the standard toggle
  affordance and its icon convention, so every sidebar reads the same: `PanelLeft*`
  for a left rail, `PanelRight*` for a right rail, `PanelBottom*` for a bottom
  drawer — the `Close` glyph while open, the `Open` glyph while collapsed. Placement
  is the app's: put a collapse toggle in the panel's own header and an expand toggle
  somewhere always-visible (a toolbar) so it is reachable while collapsed.
- **`wireSidebar(root, { panels, deviceClass?, storage? })`** — the interaction
  semantics. Each `panels` entry is
  `{ id, collapsed, toggleAction, storageKey?, inlineCollapsed? }`. It:
  - **toggles** the panel's `collapsed` signal when any `[data-action=toggleAction]`
    button is clicked, and remembers the trigger;
  - **manages focus** — moves focus into the panel when it opens (without
    scrolling, so the sliding content doesn't jump), and restores it
    to the trigger when it closes. When that trigger is the collapse toggle inside
    the now-hidden panel, focus goes to the panel's toggle outside it instead, so
    an app may render its expand toggle only while the panel is collapsed (one
    control per action, as the recipe does);
  - **presents a compact overlay** when `deviceClass.compact` is true (pass a
    `deviceClass()` signal): the open panel floats over the content with a
    dismissable backdrop, Escape and backdrop-click collapse it, and Tab is trapped
    within the panel (the ARIA dialog pattern). The overlay and its backdrop are
    fixed to the screen; an ancestor that establishes a containing block for
    fixed descendants (such as the catalog's `height: "app"` frame) docks them to
    its edges instead;
  - accepts `compactPresentation: "hidden"` when a compact application replaces
    the panel with different navigation instead of overlaying it;
  - **starts every compact overlay closed** (see
    [Compact initial state](#compact-initial-state));
  - keeps compact overlays exclusive by default, collapsing another open panel
    when a new one opens (`exclusiveCompact: false` opts out);
  - **persists** the inline collapsed state to `storage` (default
    `localStorage`) under `storageKey`, seeding the signal on wire-up. An
    overlay's open/closed state is never persisted;
  - **owns the root's `data-collapsible-responsive` / `data-collapsible-overlay`
    attributes and the injected backdrop.** Your app may re-render (and morph)
    the wired root for reasons that never touch a panel signal — a nav
    selection, say — and the morph drops attributes and nodes its template
    doesn't emit. The wire observes the root and re-applies them before the
    next paint, so don't render these attributes yourself.

  Returns a disposer. Retain it and call it on teardown.

## Panel toolbars and relocated controls

Give a panel a `toolbar` (the same roles as a
[Workbench panel toolbar](workbench.md#panel-toolbars)) and it composes its own
top toolbar over a `Pane`:

- `title` precedes the `leading` zone; `leading`, `center`, and `trailing`
  place groups wherever the open panel needs them;
- a `ToolbarControlGroup` marked `relocateOnCollapse` stays available in the
  work area when the panel closes; the standard `toggle: { action, name,
showLabel?, hideLabel? }` is always the final group.

The panel can also take `header` under its toolbar, `footer` below its content,
`bottomToolbar` below that, `headerList` / `footerList` for those fixed content
stacks, and `headerPlacement` / `footerPlacement` (`fixed`, `scroll`, or `auto`).
These slots share the panel's one `Pane` scroll owner; the bottom toolbar uses
footer semantics. With no `toolbar`, the panel renders its children directly
and ignores the chrome slots.

The toolbar also takes the `Toolbar`'s configuration (`dividerSides`,
`centerAlign`, `responsive`, `responsiveAt`, `safeAreaEdges`); it draws no
divider of its own unless `dividerSides` says so. The `Pane` under it draws
the line under the toolbar only while its content is scrolled (see
[Scroll dividers](./layout.md#scroll-dividers)), and takes the panel's `pane`
(`PaneConfig`: `contentElement`, `contentLabel`, `separators`,
`safeAreaEdges`, `chromeDividers`) — for example `{ contentElement: "nav",
contentLabel: "Sections" }` for a navigation rail. An omitted or `undefined`
field keeps the `Pane` default; without a `toolbar` there is no `Pane`, so
`pane` is ignored.

A standalone panel does not own the rest of the screen, so the app places a
`CollapsiblePanelRelocated` in its own work-area toolbar: it renders the panel's
marked groups and toggle while the panel is collapsed, and nothing while it
is open. Put it first in the leading zone for a left rail, last in the trailing
zone for a right rail, and last in a bottom toolbar for a bottom drawer. With no
bottom toolbar, pass it inside a `FloatingToolbar` as the drawer's
`restoreControl`.
Marked groups move in `leading`, `center`, `trailing` order. Pass each marked
group directly or in an array rather than wrapping it in a JSX fragment, so
the panel can read its render-time annotation. Its copy in the closed panel is
inert; avoid duplicate `id` attributes on marked groups.

```tsx
const toolbar: CollapsiblePanelToolbar = {
  label: "Navigator",
  leading: <NewFileGroup />,
  trailing: <ToolbarControlGroup relocateOnCollapse label="Search files"><SearchButton /></ToolbarControlGroup>,
  toggle: { action: "toggle-nav", name: "navigator" },
};

<Row fill gap="none">
  <CollapsiblePanel id="nav" side="left" collapsed={navCollapsed.value} toolbar={toolbar}>
    <Files />
  </CollapsiblePanel>
  <List flex>
    <Pane
      header={
        <Toolbar
          label="Editor"
          leading={
            <>
              <CollapsiblePanelRelocated panelId="nav" side="left" collapsed={navCollapsed.value} toolbar={toolbar} />
              <ToolbarText text="Editor" size="xlarge" />
            </>
          }
        />
      }
    >
      <Editor />
    </Pane>
  </List>
</Row>;
```

Wire it with `wireSidebar` (`toggleAction` is the toggle's `action`): closing the
panel from its own toggle hands focus to the relocated toggle, even when the app
renders it a frame later, and opening it moves focus into the panel. Each toggle
carries a stable `data-key`, so the morph never reuses a focused toggle's button
for another control as it moves.

## Compact initial state

A compact overlay is transient chrome the user summons, like a slide-over
sidebar on a phone: it covers the content, traps focus, and must be dismissed.
It therefore opens **only on a user action** (a toggle, or the app setting the
signal in response to one), never by itself:

- **Wire-up on a compact device.** Every panel starts collapsed, whatever its
  signal, `inlineCollapsed`, or stored choice says. No backdrop, focus trap, or
  Escape handling is active until the user opens a panel.
- **Wide → compact crossing.** Open panels collapse; nothing covers the page.
- **Compact → wide crossing.** Each panel returns to its remembered inline state
  (open or collapsed), whatever the user did with the overlay meanwhile.
- **Disposal** hands the inline state back to the signals.
- **Persistence** records only the inline choice. A stored "open" rail restores
  inline on a wide screen and is remembered, not opened, on a compact one.

These presentation changes never move focus, except to rescue focus that a
collapse would strand inside the hidden panel (it returns to the panel's last
trigger). `compactPresentation: "hidden"` leaves the signals alone.

`wireSidebar` runs after the first render, so an app that seeds an open inline
default would render the rail open for that first frame on a compact device.
Seed the signal from the device class instead, and declare the inline default
with `inlineCollapsed` so a later wide crossing still opens it:

```ts
const device = deviceClass();
const navCollapsed = signal(device.value.compact);
// …
wireSidebar(app, {
  panels: [
    {
      id: "nav",
      collapsed: navCollapsed,
      toggleAction: "toggle-nav",
      inlineCollapsed: false,
    },
  ],
  deviceClass: device,
});
```

A stored inline choice takes precedence over `inlineCollapsed`.

## Example

```tsx
import { signal, mount } from "kerfjs";
import { deviceClass } from "@kerfjs/ui/device-class";
import {
  CollapsiblePanel,
  CollapsiblePanelToggle,
} from "@kerfjs/ui/collapsible-panel";
import { wireSidebar } from "@kerfjs/ui/wire-sidebar";

const device = deviceClass();
// Start collapsed on a compact device; `inlineCollapsed` keeps the open inline
// default for wide screens.
const navCollapsed = signal(device.value.compact);

const app = document.querySelector("#app")!;
mount(app, () => (
  <div class="layout">
    <CollapsiblePanel
      id="nav"
      side="left"
      collapsed={navCollapsed.value}
      label="Navigator"
    >
      <header>
        <CollapsiblePanelToggle
          side="left"
          collapsed={navCollapsed.value}
          action="toggle-nav"
          panelId="nav"
        />
      </header>
      {/* nav items */}
    </CollapsiblePanel>
    <main>
      {navCollapsed.value && (
        <CollapsiblePanelToggle
          side="left"
          collapsed
          action="toggle-nav"
          label="Show navigator"
        />
      )}
      {/* content */}
    </main>
  </div>
));

const stop = wireSidebar(app, {
  panels: [
    {
      id: "nav",
      collapsed: navCollapsed,
      toggleAction: "toggle-nav",
      storageKey: "app.nav-collapsed",
      inlineCollapsed: false,
    },
  ],
  deviceClass: device,
});
```

## Sizing in a flex layout

An expanded panel holds its `size` in a flex row or column (`flex-shrink: 0`):
its content keeps that fixed size so collapsing slides it out instead of
squeezing it, and a shrunk track would only clip the content's trailing edge.
Give the sibling work area `min-width: 0` / `min-height: 0` (a `Pane` or
`List flex` already has it) so it is the region that gives way, and switch the
panel to the compact overlay (`wireSidebar`) where the viewport cannot hold it.

## Safe areas

A panel grows by the unsafe inset of the edge it docks to and pads its content
for every edge it touches except its interior edge. While expanded inline, it
also clears that edge for every other direct child of its container, so a
neighboring pane gains the inset when the panel collapses. When you wrap the panel in your own grid
cell, pass each sibling `Pane` a `safeAreaEdges` that omits the edge the panel
covers. See [Choosing an app layout › Safe areas](app-layouts.md#safe-areas).

## When to use which

- One or two independent rails / a drawer you place yourself → **`CollapsiblePanel` +
  `wireSidebar`**.
- A whole Xcode-like workspace (left rail + right rail + bottom drawer + work area
  in one shell) → **[`Workbench`](workbench.md)**, which owns the layout and the same
  collapse animation.
- Drag-to-resize a panel → compose **[`ResizableRegion`](../src/components/layout/resizable-region/resizable-region.tsx)**
  / `wireResizableRegions`; the app owns the size signal.

The app still owns everything domain-specific — which panels exist, their order,
sizes, content, and any per-project persistence — exactly as with the other layouts.

## Recipe and coverage

The catalog ships a runnable **Collapsible sidebar** recipe — a left rail and a
bottom drawer with the standard toggles, the compact overlay, and per-panel
persistence: [open it](../ux-demo/?component=recipe-collapsible-sidebar) or read
[`recipes.md`](recipes.md#collapsible-sidebar) · [TSX source](../ux-demo/recipes/collapsible-sidebar.tsx).
It is covered end-to-end across Chromium, Firefox, and WebKit by
`tests/browser/collapsible-sidebar-recipe.spec.ts` (collapse/expand, focus
move/restore, the compact overlay + Escape/backdrop dismiss, the Tab trap, and
the compact initial state across first load and wide/compact crossings),
alongside the component/wire unit tests.

The focused [CollapsiblePanel route](../ux-demo/?component=collapsible-panel)
([TSX source](../ux-demo/demos/collapsible-panel.tsx)) also has a **Restore
control** example: a bottom drawer that starts collapsed, with a
`FloatingToolbar` `restoreControl` in its frame's bottom-end corner and its
own hide toggle in the drawer header. Both toggles share one `data-action`,
and the catalog wires them with `wireSidebar`, so the corner control really
restores the drawer and focus moves between the two. It is covered by
`tests/browser/app-layout-catalog.spec.ts` at wide and compact widths.
