# Workbench

`@kerfjs/ui/workbench` is the Xcode-like multi-panel workspace: a collapsible
left rail, right rail, and bottom drawer around a central work area (any absent).
It generalizes the instant-width / sliding-content collapse used by the catalog
sidebar. One of the opt-in app layouts (see
[`../../docs/23-app-layouts.md`](../../docs/23-app-layouts.md)); best on
desktop-class devices.

```ts
import { Workbench } from "@kerfjs/ui/workbench";
```

In a browser bundler that honors the `browser` export condition (Vite, esbuild, and
webpack do by default), the import above also
loads Workbench's stylesheet and those of the components it renders internally
(`Pane`, `NavStack`, `Toolbar`, `ToolbarControlGroup`, `FloatingToolbar`,
`ResizableRegion`, `List`, `LucideIcon`). Without that condition, import the manual stylesheets instead:
`@kerfjs/ui/workbench.css` plus those components' CSS, or `@kerfjs/ui/styles.css`.

A top-level `Workbench` needs a definite containing height. Import the opt-in
`@kerfjs/ui/document.css` baseline and add `.kui-app-root` to the direct mount
container, or provide an equivalent definite height in application-owned
layout. The component intentionally uses `height: 100%` rather than `100dvh` so
it can also be embedded. See [Document baseline](document-baseline.md).

## State lives in the app

`Workbench` is declarative and the collapse is **pure CSS** — no wire. The app
owns each panel's `collapsed` flag (usually a signal) and toggles it; the panel
animates itself. Panels are fixed-size by default; a panel can opt in to drag
and keyboard resizing (see [Resizable panels](#resizable-panels)), and
`wireWorkbench` can make overlay panels transient (see
[Transient overlays](#transient-overlays)).

A collapsed panel renders `inert` and `aria-hidden="true"` on the rail or
drawer itself, and `inert` on its content, straight from `collapsed`, so
neither Tab nor assistive technology reaches controls that have slid out of
view, none of them can scroll back into view, and no empty labeled landmark
stays behind. The slide-out still animates,
and the panel's `restoreControl` lives outside the inert content, so it stays
reachable. Expanding the panel makes its content reachable again in the same
render. When the panel closes with focus inside it, `wireWorkbench` (given the
panel's `collapsed` signal) moves focus back out (see
[Transient overlays](#transient-overlays)); without it, that focus move is the
app's.

```tsx
const navCollapsed = signal(false);

<Workbench
  id="studio"
  label="Studio"
  main={<Editor />}
  leftRail={{
    content: <Navigator />,
    label: "Navigator",
    collapsed: navCollapsed.value,
    size: 280,
  }}
  rightRail={{
    content: <Inspector />,
    label: "Inspector",
    collapsed: inspectorCollapsed.value,
  }}
  bottomDrawer={{
    content: <Console />,
    label: "Console",
    collapsed: consoleCollapsed.value,
  }}
/>;
```

## Focusable regions

Set `mainTabIndex={0}` for a Tab stop on the central work area, or `-1` to
focus it from application code. `mainOutlined` keeps the standard focus ring
visible as an application-controlled state, such as a drop target. Keyboard
focus shows the same ring. Each rail or drawer accepts its own `tabIndex` and
`outlined`; a collapsed or hidden panel cannot become a Tab stop and its
outline is hidden until it expands. `mainPane` and a panel's `pane` forward the
same options to an inner Pane when that is the intended focus owner. Give
the central region `mainLabel` when it needs its own named landmark; panel
regions use their `label`.
When a sole Pane fills the main region, the Workbench ring paints above opaque
edge-to-edge Pane content without blocking pointer input in that content.

Each static `WorkbenchPanel` takes `content`, an optional `toolbar` and `footer` (see
[Panel toolbars](#panel-toolbars)), an optional `collapsed`, an optional
`size` (rail width or drawer height in px, overriding the CSS default —
`--kui-workbench-rail-width` 280px, `--kui-workbench-drawer-height` 220px), and
an optional `label`. Common shell behavior is configured rather than restyled:

- `separator: "auto" | "hidden"` controls the owned dock-edge separator;
- `collapseMotion: "slide" | "fade-slide" | "none"` keeps the track change
  instant while choosing composited content motion;
- `contentOverflow: "clip" | "auto" | "visible"` chooses the resting overflow
  policy. An open descendant `PopupMenu` or Web Awesome dropdown temporarily
  releases rail/drawer clipping and raises its popup layer automatically;
- `presentation: "inline" | "overlay" | "hidden"` supports compact overlays
  or a responsive replacement. An overlay rail spans the Workbench height at
  its side and an overlay drawer spans the work-area column at the bottom,
  each exactly at its configured size (its separator border included, as in
  flow) up to the viewport-relative overlay maximum; the content fills the
  panel inside its border, so it is clamped with it;
- `overlayBackdrop` on the Workbench opts in to a `--kui-color-scrim` backdrop
  whenever a static or responsive rail/drawer overlay is open. It sits below
  the panel and above the work area, absorbs an outside press, and lets
  `wireWorkbench` close the overlay without activating the control underneath.
  It is off by default; without it, the compact rail's dismiss strip remains
  transparent. Pair it with `wireWorkbench` for outside-press dismissal;
- `responsiveOverlayAt: "narrow" | "compact" | "never" | number` presents a rail or the
  bottom drawer as an overlay below a Workbench container breakpoint — 704px
  or less for `narrow`, 448px or less for `compact`, the breakpoints of
  `ResizableRegion`'s `responsiveFillAt` — and inline above it. A positive
  number such as `1024` uses that many CSS pixels of Workbench width. Numeric
  thresholds require `wireWorkbench` with that panel's `collapsed` signal;
  its resize observer applies the overlay layout and the collapse/restore
  transition together. **Rails
  default to `narrow`**, so on a small screen a sidebar covers the work area
  (and an open drawer) instead of squeezing it; pass `never` to keep a rail
  inline. The drawer stays inline unless it opts in. On a compact (448px or
  less) Workbench an overlay rail fills the Workbench less a dismiss strip on
  the side away from its edge — `--kui-workbench-overlay-dismiss-margin`,
  44px, one touch target — so a press beside it closes it;
  `compactOverlay: "full"` (per rail) fills the Workbench instead, which
  usually wants app-level handling of its own. Pass each rail's `collapsed`
  signal to `wireWorkbench` so only one overlay is open at a time and a press
  outside closes it. The CSS
  decides, so the app needs no `deviceClass` check for presentation; a
  collapsed overlay drops its surface and shadow so nothing covers the work
  area, and the work area keeps the safe-area inset of the edge the overlay
  covers. When overlays meet, the order is fixed rather than by which opened
  last: both rails stack above the drawer, as inline rails span the
  Workbench's full height beside the drawer's column, and the right rail
  stacks above the left. Rails take `--kui-workbench-overlay-z` (41) and the
  drawer one less. Restore controls take `--kui-workbench-restore-z`, which
  defaults to two less than the overlay z-index (39), so they sit beneath
  every overlay: an open overlay covers another panel's restore control as
  it covers the rest of the work area, and a collapsed overlay, which drops
  its pointer events, leaves the control beneath it usable. While a rail
  overlay is open (static, or a responsive one whose breakpoint applies), the
  work area's floating controls — restore corners and any `FloatingToolbar`
  in `main` — are also hidden outright (out of the tab order and the
  accessibility tree), so they can never paint over the rail whatever
  stacking context the app gives the work area; they return as it closes.
  The rail's own floating controls stay, and a drawer overlay hides nothing;
- `restoreControl` places an application-owned restore affordance in a
  corner of the Workbench itself while the panel is collapsed. Prefer a
  `toolbar.toggle`, which the Workbench relocates for you; keep
  `restoreControl` for a custom affordance. `restorePosition` chooses the
  corner, inset by
  `--kui-workbench-restore-inset` (16px) plus the unsafe area of each edge the
  corner reaches. A rail's control sits in the Workbench's corner; the
  drawer's sits in the corner of the work-area column it restores into, so it
  never lands on an expanded rail. A collapsed rail's control floats the
  same inset above the top edge of an expanded inline bottom drawer, which
  spans the column reaching that corner once the rail collapses, so it never
  covers the drawer's content; it returns to the corner when the drawer
  collapses (the drawer publishes its edge as a CSS anchor scoped to its own
  Workbench; without anchor positioning the control keeps the corner). An
  overlay drawer publishes no edge: an open one covers the control, as every
  open overlay does. Because it is anchored to the Workbench
  rather than the viewport, an embedded Workbench never floats it over page
  chrome outside it, and it scrolls with the Workbench. Compose it from the
  package controls — a `single` `ToolbarControlGroup` around one icon button
  carrying `collapsiblePanelToggleIcon(side, true)` — rather than a bare
  button. To give it `FloatingToolbar`'s toolbar role and floating look, wrap
  that group in a `FloatingToolbar` whose `position` matches the corner: the
  corner owns the inset (it zeroes the toolbar's default inset), so omit
  `inset` there and the toolbar floats from the corner instead of doubling it.

- `resizable: true | { min, max }` opts the panel in to drag and keyboard
  resizing, driven by `wireWorkbench` (off by default).

The same policy props are available on `ResizableRegion` and
`CollapsiblePanel`, so a resizable application shell does not need to reach
into `.kui-resizable-region__content`.

## Panel toolbars

A panel with `navStack` hosts a controlled `NavStack` in place of the static
`content` and `Pane` slots. Give it a `toolbar` with a `toggle`; each
`navStack.views` entry then supplies its own structured `toolbar` with a title
and leading/center/trailing groups, optional `header` / `footer` and `pane`
configuration, and scrolling `content`. The active view's toolbar is
the panel's only toolbar row, with the standard toggle always last. On
collapse, marked groups from the active view and the toggle relocate to the
work-area toolbar; the view stack stays mounted. The app owns the view array
and calls `wireNavStack` for animated push/pop and focus movement. See
[Navigation stack](nav-stack.md) and the catalog's navigation ticket rail.

```tsx
<Workbench
  id="tickets"
  label="Tickets workspace"
  main={<Workspace />}
  rightRail={{
    label: "Tickets",
    collapsed: ticketsCollapsed.value,
    toolbar: { toggle: { action: "toggle-tickets", name: "tickets" } },
    navStack: { id: "ticket-stack", label: "Tickets", views: ticketViews.value },
  }}
/>
```

A panel's controls follow it open and closed when the Workbench composes the
toolbars. Give a panel a `toolbar` and the work area a `mainToolbar` (and, for
a drawer, optionally a `mainBottomToolbar`); the Workbench renders each as a
standard `Toolbar` over a `Pane`, and moves groups between them as panels open
and close. A panel's `toolbar` has these parts:

- `title` — the panel's `ToolbarText` (the quiet default size in a rail).
- `leading`, `center`, and `trailing` — the open panel's toolbar zones. Put
  `ToolbarControlGroup`s in any order in these zones. Mark a group with
  `relocateOnCollapse` to make it available in the work area while the panel
  is closed; unmarked groups remain in the inert panel. Pass marked groups
  directly or in arrays, including nested arrays, rather than JSX fragments
  so their render-time annotation remains available.
- `toggle: { action, name, showLabel?, hideLabel? }` — the standard collapse
  toggle, which the Workbench renders: the per-side panel glyph,
  `aria-controls` naming the panel, `aria-expanded`, a "Show …"/"Hide …"
  label (or your localized `showLabel` / `hideLabel`), and the `data-action`
  the app handles. It is always the last group.

While a panel is closed, marked groups follow their open-panel zone order
(`leading`, `center`, `trailing`), followed by its toggle:

| Panel         | Where they go                                                                                                   |
| ------------- | --------------------------------------------------------------------------------------------------------------- |
| Left rail     | The leading edge of `mainToolbar`, before its `title`                                                           |
| Right rail    | The trailing edge of `mainToolbar`, after its `trailing` groups, so the toggle is the toolbar's last group      |
| Bottom drawer | The trailing edge of `mainBottomToolbar`; without one, a `FloatingToolbar` in the work area's bottom-end corner |

A rail with no `mainToolbar` floats its groups in its corner the same way, so
a closed panel can always be reopened. An open overlay panel carries its own
toggle, so it never depends on a control it covers. An app's own
`restoreControl` still wins over the floating fallback.

```tsx
<Workbench
  id="studio"
  label="Studio"
  mainToolbar={{ label: "Editor", title: <ToolbarText text="Editor" size="xlarge" /> }}
  main={<Editor />}
  leftRail={{
    label: "Navigator",
    toolbar: {
      label: "Navigator",
      title: <ToolbarText text="Navigator" />,
      leading: <NewFileGroup />,
      trailing: <ToolbarControlGroup relocateOnCollapse label="Search files"><SearchButton /></ToolbarControlGroup>,
      toggle: { action: "toggle-navigator", name: "navigator" },
    },
    content: <Files />,
    collapsed: navCollapsed.value,
  }}
/>
```

The work area's `Pane` can carry more fixed chrome: `mainHeader` renders under
`mainToolbar` (supporting copy) and `mainFooter` over `mainBottomToolbar` (a status
line or a resource toolbar), each divided from the scrolling `main`.
`mainHeaderPlacement` and `mainFooterPlacement` (`"fixed"` by default, or
`"scroll"`) let that header or footer chrome scroll away with `main` instead —
useful where large text would leave pinned chrome little room. `"auto"` keeps
it pinned while the work area is tall enough and lets it scroll with `main`
when the work area is short (the Pane's `chromePlacement="auto"`; it applies to
the pinned header and footer together).

A toolbar panel has the same fixed chrome sequence: `toolbar`, optional
`header`, scrolling `content`, optional `footer`, and optional
`bottomToolbar`. `header` sits below the panel toolbar, so an inspector can
keep its title, notices, and section tabs visible while its detail content
scrolls in the one `Pane` scroll owner. `headerList` and `footerList` configure
their `List` wrappers. `headerPlacement` and `footerPlacement` accept
`"fixed"` (default), `"scroll"`, or `"auto"` with the same behavior as the
work area's placement props. The panel's bottom toolbar renders a semantic
`footer`. These panel slots apply only when the panel has a `toolbar`; a panel
without one continues to render `content` as supplied.

Every toolbar the Workbench composes — `mainToolbar`, `mainBottomToolbar`, and
each panel's `toolbar` — takes the `Toolbar`'s configuration (`ToolbarConfig`):
`dividerSides`, `centerAlign`, `responsive`, `responsiveAt`, and
`safeAreaEdges`. Configure the toolbar through these props rather than styling
it. No toolbar draws a divider by default: each `Pane` draws one line under
its header chrome and one over its footer chrome, wherever that chrome ends,
only while its content is scrolled beneath it (see
[Scroll dividers](./layout.md#scroll-dividers) — call `wireScrollDividers`
once at the app root). Set `dividerSides` only for a permanent separator edge,
or `chromeDividers: "always"` on the pane for a line that never hides.
`responsive: "wrap"` keeps a long title whole and wraps its actions
below it. `mainBottomToolbar` also takes a `center`. A panel's
`restorePosition` also places its floating restore controls.

The `Pane`s and `List`s the Workbench composes around your content are
configurable the same way:

- `mainPane` (`PaneConfig`: `contentElement`, `contentLabel`, `separators`,
  `safeAreaEdges`, `chromeDividers`, `appearance`) configures the work area's
  `Pane`, which exists whenever the work area has a toolbar, `mainHeader`, or
  `mainFooter`. Without that chrome, `appearance: "sunken"` paints the main
  region's own scroll surface;
- a panel's `pane` configures the `Pane` a `toolbar` panel's `content` renders
  in — for example `{ contentElement: "nav", contentLabel: "Files" }` for a
  navigator rail. Without a toolbar, `appearance: "sunken"` paints the panel
  scroll region;
- `mainHeaderList` / `mainFooterList` and a panel's `headerList` /
  `footerList` (`ListConfig`: `gap`, `hAlign`,
  `vAlign`, `dividerSides`, `textInsets`, `controlInsets`) configure the
  `List`s holding `mainHeader` / `mainFooter`.

An omitted or `undefined` field keeps the default, including the scroll
dividers described above.

Size a rail so its title and groups fit at its narrowest (a resizable rail's
`min`); a toolbar that cannot hold them drops the title rather than
truncating it. Relocated content renders in both places while the panel is
closed (the panel's copy is inert), so give it no `id`s. With `wireWorkbench`
given the panel's `collapsed` signal, focus follows the toggle: closing a
panel from its own toggle focuses the relocated toggle in the work area, and
opening it from there focuses the panel's own toggle. A panel's optional
`footer` renders below its content, for a sidebar's bottom toolbar. Without a
`toolbar` or `mainToolbar`, `content` and `main` render exactly as given.

## Resizable panels

Resizing is **opt-in per panel**. Give a panel `resizable` — `true` for the
default limits (rails 180–480px, drawer 120–480px) or `{ min, max }` — and
render its `size` from an app-owned signal. The panel then owns a separator on
its inner edge (the left rail's end, the right rail's start, the drawer's top)
with the same focusable `role="separator"` contract as a `ResizableRegion`
handle. `wireWorkbench` drives it:

```tsx
import { wireWorkbench } from "@kerfjs/ui/wire-workbench";

const navSize = signal(280);
const consoleSize = signal(200);

<Workbench
  id="studio"
  label="Studio"
  main={<Editor />}
  mainMinSize={320} // the default: the editor never drops below 320px wide
  mainMinHeight={120} // the default: the drawer leaves it 120px of height
  leftRail={{
    content: <Navigator />,
    label: "Navigator",
    collapsed: navCollapsed.value,
    size: navSize.value,
    resizable: { min: 200, max: 420 },
    responsiveOverlayAt: "narrow", // an overlay when the Workbench is 704px or narrower
  }}
  bottomDrawer={{
    content: <Console />,
    label: "Console",
    size: consoleSize.value,
    resizable: true,
  }}
/>;

// once, after mount:
const stop = wireWorkbench(root, {
  id: "studio",
  panels: {
    leftRail: {
      size: navSize,
      storageKey: "studio.nav-width",
      collapsed: navCollapsed, // a transient overlay: takes focus, closes on Escape / outside press
    },
    bottomDrawer: { size: consoleSize, storageKey: "studio.console-height" },
  },
});
```

- **Pointer:** dragging the separator resizes the panel live (the wire marks
  the rail or drawer `data-resizing` and suppresses its content transform
  transition) and commits the final size to the signal on release.
- **Keyboard:** focus the separator; arrow keys resize by `step` (16px),
  Shift+arrow by `largeStep` (64px), Home/End jump to `min`/`max`. The
  separator's `aria-valuenow`/`aria-valuemin`/`aria-valuemax` report the size
  and limits.
- **Limits:** every size — dragged, typed, restored from storage, or passed
  by the app — is clamped to `min`/`max` when rendered.
- **Work-area minimum:** beside its inline rails, fixed or resizable, the work
  area keeps at least `mainMinSize` px of width (a `Workbench` prop, default
  320; `0` turns it off), and above an inline bottom drawer at least
  `mainMinHeight` px of height (default 120; `0` turns it off). A dragged or
  keyed rail stops growing where the work area would drop below its width,
  and the drawer where it would drop below its height, so wide rails or a tall
  drawer cannot crowd out the editor; `aria-valuemax` reports that reachable
  maximum. When the Workbench itself narrows, the rails shrink in proportion
  to their sizes, and when it gets shorter the drawer shrinks (their content
  follows the shown size) while the work area holds its minimum; a squeezed
  panel can still be made smaller, never larger, and never below its own
  `min`. Two fixed 280px rails in a 720px Workbench show 200px each rather
  than leaving the editor 160px. Each minimum applies only to a Workbench with a
  panel on its axis, and never exceeds the Workbench itself.
- **Squeezed below `min`:** when the Workbench is too narrow for a rail's
  `min` beside the work-area minimum, the rail shows less than its `min` (a
  172px Navigator whose `min` is 180). Its separator then reports that shown
  width in `aria-valuenow`, and `aria-valuemin`/`aria-valuemax` pin to the
  same value: the WAI-ARIA window splitter's value is the separator's actual
  position, and the range must contain it, so a screen reader hears the width
  on screen rather than a configured limit the layout cannot honor — and a
  range that does not move, because the separator cannot move a rail the
  container holds. A pinned separator commits nothing: arrow keys, Home/End,
  and drags leave the rail's remembered size (and its storage) alone, so a
  rail remembered at 280px returns at 280px, with the configured range, once
  there is room.
- **Small Workbenches:** inline panels have no shrink floor of their own, by
  design; the work area's minimums win, so in a very small Workbench a rail or
  the drawer can become a sliver. Do not add your own `min-width` /
  `min-height` to hold a panel open. Give the panel
  `responsiveOverlayAt: "narrow"` (704px of Workbench width or less) or
  `"compact"` (448px or less) instead: below that breakpoint it presents as a
  full-size overlay over the work area rather than squeezing beside it (see
  the catalog's resizable and responsive-drawer Workbench examples).
  A numeric value measures the Workbench container, not the viewport. If the
  app has no numeric Workbench breakpoint, the overlay wiring does not measure
  the Workbench on ordinary panel updates. For numeric breakpoints the wiring
  mirrors the active panel state onto the Workbench root, keeping work-area
  styles local to actual overlay transitions. If the rest of an app switches
  by viewport width and its Workbench can be narrower
  than the viewport, keep the app's viewport decision in
  `presentation: "overlay"` and pass its `collapsed` signals to
  `wireWorkbench`. On entering that mode, collapse the panels; after leaving,
  restore their preferred inline state once the inline presentation has
  rendered, so exclusive overlay handling cannot close a sibling rail.
- **Collapse:** `collapsed` never changes a size. A collapsed panel keeps its
  size (its content slides out at that width), its separator leaves the tab
  order, and expanding it returns it at the size it had.
- **Persistence:** with a `storageKey`, the size is loaded from `storage`
  (default `localStorage`) at wire-up and saved on every change, like
  `wireSidebar`'s collapsed state.
- **Overlays never resize:** an overlay or hidden panel — including a rail
  whose `responsiveOverlayAt` breakpoint currently applies — hides its
  separator and is never resizable, and it leaves the work-area minimum to the
  rails still in flow. With `responsiveOverlayAt` no device check is needed;
  otherwise pass `deviceClass` and resizing is suspended while `compact` is
  true, where rails present as overlay drawers or are replaced.
- `wireWorkbench` drives only the panels it is given, matched by the
  Workbench `id`, so it never double-drives a `ResizableRegion` (or another
  Workbench) under the same root. `onResize({ panel, size, source })` reports
  each committed resize.

## Transient overlays

An overlay panel covers the work area, so it should open only when the user
asks for it and close as easily as it opened. Give `wireWorkbench` a panel's
app-owned `collapsed` signal (`size` is optional, so a panel need not be
resizable) and it treats the panel as a transient overlay whenever it
presents as one, mirroring `wireSidebar`'s compact overlay:

- **Collapsed on entering the breakpoint:** when a panel's
  `responsiveOverlayAt` breakpoint begins to apply — at wire-up, when the
  Workbench first renders, or when it narrows across the breakpoint — the
  wiring remembers the panel's inline `collapsed` state and collapses it, so
  nothing covers the work area until the user opens it. When the breakpoint
  stops applying (and on disposal) the remembered inline state comes back.
  These presentation changes skip the collapse motion.
- **Focus moves in, and Tab stays in:** a panel that opens while it presents
  as an overlay takes focus on its first focusable control (typically the
  close control in its header), because it covers the work area and the
  control that opened it. While it is open, Tab and Shift+Tab cycle through
  its controls and never reach the covered work area; Escape, its own close
  control, or an outside press leaves it. This is the ARIA dialog pattern
  `wireSidebar`'s compact overlay follows. A panel opening inline never moves
  focus.
- **Escape** closes the open overlay panel that holds focus, else the most
  recently opened one. An Escape another handler already handled
  (`defaultPrevented`) is left alone.
- **Outside press:** a pointer press that starts and ends outside an open
  overlay panel closes it. The app's own toggle still works: its click closes
  the panel before the wiring looks, and the press that opens a panel never
  closes it. For a body-level menu, dialog, or other portal opened from a
  panel, set that panel's `keepOpenOn: (target) => target === portalRoot` in
  `wireWorkbench`. The predicate receives each node in the press's composed
  path, so matching the portal root keeps the panel open when the press starts
  or ends anywhere inside the portal. Escape and Tab inside that portal remain
  with its own keyboard handler. Other outside presses still close the panel.
- **Focus:** when a panel closes with focus inside it — whatever closed it,
  including the app's own control inside the panel — focus returns to the
  control that had it when the panel opened (typically its toggle; one inside
  another panel that has closed since is skipped), else to
  the first focusable control in the panel's `restoreControl`, else to a
  focusable control outside the panel whose `aria-controls` names the panel
  (or an element inside it). The last is what a panel already open at
  wire-up relies on, since nothing opened it: give the app's toggle
  `aria-controls` naming the panel. A pointer press inside the panel that
  drops focus to the page counts as focus inside: Safari never focuses a
  clicked button, so pressing the panel's own Hide control blurs the focused
  control before the click closes it, and focus still returns. Focus the user
  has moved to another element since is left alone. Each panel's `id` derives from the
  Workbench's — `<id>-left-rail`, `<id>-right-rail`, `<id>-bottom-drawer`:

  ```tsx
  <button
    data-action="toggle-navigator"
    aria-controls="editor-left-rail"
    aria-expanded={String(!navCollapsed.value)}
    aria-label={navCollapsed.value ? "Show navigator" : "Hide navigator"}
  >
    <LucideIcon {...collapsiblePanelToggleIcon("left", navCollapsed.value)} />
  </button>
  ```

An open overlay can cover the control that opened it: a narrow Workbench's
right-rail overlay spans the full height at the end edge, over the trailing
end of the work area's toolbar, where its toggle usually sits. Escape and an
outside press still close it, but neither is a visible, pointer-reachable
control. So give every panel that may present as an overlay its own close
control, as a `CollapsiblePanel` puts its collapse toggle in its own header:
render the panel content as a `Pane` whose header `Toolbar` holds the title
and a `single`, borderless `ToolbarControlGroup` around one icon button
carrying `collapsiblePanelToggleIcon(side, false)`. The work area's toggle
stays the always-visible way to show the panel. The catalog's resizable
example does this for both rails.

The drawer works the same way. The catalog's responsive overlay drawer
example is the whole pattern for a bottom drawer:

```tsx
const outputCollapsed = signal(false); // open inline by default

<Workbench
  id="editor"
  label="Editor"
  main={<Editor />} // its toolbar toggles `outputCollapsed`
  bottomDrawer={{
    label: "Output",
    content: <OutputPane />, // a Pane whose header holds its close control
    collapsed: outputCollapsed.value,
    size: 180,
    responsiveOverlayAt: "narrow",
  }}
/>;

wireWorkbench(root, {
  id: "editor",
  panels: { bottomDrawer: { collapsed: outputCollapsed } },
});
```

Above 704px of Workbench width the drawer takes its own track below the
editor. At 704px or less it overlays the bottom of the full-height editor,
starts hidden, and closes from its own header, on Escape, or on a press
outside it; widening the Workbench again brings it back inline in the state
it had before.

Escape and outside-press dismissal apply to static `presentation: "overlay"`
panels too; entering and leaving the collapsed state around a breakpoint is
only for `responsiveOverlayAt`, because a static presentation is the app's
choice. Inline panels are never touched. Pass `dismissOverlays: false` to
leave every `collapsed` write, and all focus handling, to the app.

Overlays are exclusive by default, like `wireSidebar`'s compact overlays:
opening a panel while it presents as an overlay closes every other open
overlay panel, the bottom drawer included. At a narrow width two rails are
wider than the Workbench, so without this the right rail would cover the
navigator's own close control. Panels presenting inline are never closed by
it, so a wide Workbench keeps both rails open. Pass `exclusiveOverlays: false`
to let overlays stay open together; they then stack in the fixed order above,
and Tab stays in the one that holds focus (else the most recently opened
one).

Where the browser supports `overflow-clip-margin`, the 20px hit target
straddles the panel's separator line like a `ResizableRegion` handle;
elsewhere it sits just inside the panel's inner edge, because the panel clips
its sliding content.

## Resizable application-shell migration

An application such as Hot Sheet can replace its shell descendant overrides
with state-derived props:

```tsx
<ResizableRegion
  id="terminal-drawer"
  label="Terminal drawer"
  axis="vertical"
  edge="start"
  size={drawerSize.value}
  min={180}
  max={520}
  collapsed={!drawerVisible.value}
  separator={magnified.value ? "hidden" : "auto"}
  collapseMotion="fade-slide"
  presentation={mobile.value ? "overlay" : "inline"}
  restoreControl={
    <ToolbarControlGroup label="Terminals" single>
      <button data-action="show-drawer" aria-label="Show terminals">
        <LucideIcon {...collapsiblePanelToggleIcon("bottom", true)} />
      </button>
    </ToolbarControlGroup>
  }
>
  <TerminalDrawer />
</ResizableRegion>
```

`wireResizableRegions` marks the active region with `data-resizing` and the
package CSS suppresses content motion during pointer resize. It applies the
live size to both the track and the slide-motion content, so content fills the
region throughout a drag, including any safe-area edge extent, and a later
collapse slides it out at the resized width. A collapsed,
overlay, or hidden region is not resizeable. Together these policies replace
app CSS for separator suppression, instant-track/composited-content collapse,
popup overflow, mobile overlay/hidden replacement, resize-transition guards,
and safe-area restore placement. A descendant `PopupMenu` or Web Awesome
dropdown with `open` releases clipping for its lifecycle, so menu events need
not rerender the region. The app still owns the other signals and decides when
each policy applies.

## Public styling boundary

The component subpath's browser build loads `workbench.css`; import
`@kerfjs/ui/workbench.css` manually only without the `browser` condition. Applications may
set `--kui-workbench-rail-width` and `--kui-workbench-drawer-height` on a
Workbench instance. The supported composition classes are `.kui-workbench`,
`.kui-workbench__rail`, `.kui-workbench__rail--left`,
`.kui-workbench__rail--right`, `.kui-workbench__center`,
`.kui-workbench__main`, `.kui-workbench__drawer`,
`.kui-workbench__panel-content`, `.kui-workbench__handle`,
`.kui-workbench__handle-icon`, and `.kui-workbench__restore`; these exact hooks are cataloged for tools that
must classify public application selectors. Prefer the component props and two
size tokens before selecting internal anatomy, and do not target its data
attributes or descendant tags as styling contracts.

## Safe areas

Each rail and the drawer grows by the unsafe inset of the screen edge it docks
to, so its surface and separator paint through while its content keeps the
configured size and is padded for the edges it touches. The main area pads for
the edges it reaches, inside its scroller: an expanded inline rail or drawer
takes that edge away, and collapsing it (or presenting it as an overlay) hands
the edge back. A region whose only child is a `Pane` or layout lets that child
own the insets. See [Choosing an app layout › Safe areas](app-layouts.md#safe-areas).

Workbench projects panel presentation, collapse, and responsive breakpoint
state onto its own region attributes. Its stylesheet then matches those local
attributes instead of searching descendants during list updates. It clears the
edge context on each region, while a sole Pane or layout child receives the
insets it owns. Applications still pass arbitrary `main` and panel content;
they need no marker classes or extra wrappers.

## How the collapse animates

Collapsing snaps the panel's flex track to zero in a single reflow (so the work
area relayouts once, not per frame) while the panel's fixed-size content slides
out via a composited `transform` — a rail slides horizontally, the drawer
vertically — clipped by the shell's overflow. The drawer content is positioned
against the shell's stable bottom edge, so opening and closing move monotonically
through the transform rather than inheriting a changing normal-flow origin. It
honors `prefers-reduced-motion` (the slide collapses to instant). On smaller
device classes, present the rails' contents through a `NavStack` or overlay
drawers rather than shrinking the three-panel shell.
