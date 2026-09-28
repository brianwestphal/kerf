# 23. App and dialog layouts

**Status: Shipped.** The device-class foundation and all four layouts
(`NavStack`, `SplitView`, `Workbench`, `TabScaffold`) plus the AI
layout-selection guidance are implemented as opt-in `@kerfjs/ui` subpaths. This
document remains the design source of truth; the ratified public names and the
declarative + wire model below match what shipped. The consumer-facing decision
guide is [`ui/docs/app-layouts.md`](../ui/docs/app-layouts.md), and each layout
has its own consumer doc under `ui/docs/`. Every shipped application-layout
component is represented in the machine-readable catalog with a focused UX-demo
route and three-engine browser coverage.

## 1. Motivation

`@kerfjs/ui` today ships composable geometry primitives — `.kui-pane`,
`ResizableRegion`, `TabBar`, `AppTab` (see [`layout.md`](../ui/docs/layout.md)) —
but no opinionated, whole-screen layouts. Every real app therefore hand-rolls
the same four or five shells: a pushed/popped navigation stack, a list-detail
split, an IDE-style multi-panel workspace, and a mobile bottom-tab scaffold. It
also hand-rolls breakpoint detection, usually as ad-hoc `matchMedia` calls
scattered through the app.

The goal is first-class, tree-shakeable layouts that:

1. encode the responsive presentation rules that are otherwise re-derived per
   app (when a list-detail becomes a full-screen modal, when a stack's toolbar
   cross-fades, when a sidebar collapses to an overlay);
2. build on the existing pane/resizable primitives rather than replacing them;
3. share one reactive **device-class** signal so an app queries the current size
   / orientation / viewport-segment class once, reactively, instead of wiring
   `matchMedia` by hand;
4. come with AI guidance that maps a data + interaction + device situation to a
   recommended layout.

Everything is opt-in and per-subpath, so an app that imports only `NavStack`
pays for `NavStack` alone. The core runtime stays layout-free; these are
`@kerfjs/ui` concerns.

## 2. Device classes — the foundation

Every layout below chooses its presentation from the current device class, so
the detection mechanism ships first and the layouts depend on it.

### 2.1 The class space

A device class is the product of a **size bucket** and an **orientation**, plus
awareness of **multiple viewport segments** (foldables / dual-screen):

- Size buckets: `xs-mobile`, `mobile`, `tablet`, `desktop`, `xl-desktop`.
- Orientation: `portrait`, `landscape`.
- Segments: the count reported by `@media (horizontal-viewport-segments: N)` and
  `(vertical-viewport-segments: N)`; `1` on ordinary devices.

Default breakpoints (minimum width in px; the JS signal takes an override map
per reader, and the same defaults are mirrored as the `--kui-bp-*` CSS custom
properties so CSS media queries read the same numbers — the custom properties
are a mirror, not an input to the JS logic):

| Bucket       | Min width       | Typical device               |
| ------------ | --------------- | ---------------------------- |
| `xs-mobile`  | 0               | small phones (< 360px)       |
| `mobile`     | 22.5rem (360px) | phones                       |
| `tablet`     | 45rem (720px)   | tablets, small split windows |
| `desktop`    | 64rem (1024px)  | laptops / desktops           |
| `xl-desktop` | 90rem (1440px)  | large / wide desktops        |

Orientation is derived from the viewport's own dimensions — `portrait` when
`innerHeight > innerWidth`, otherwise `landscape` — not from a
`(orientation: …)` media query. Segments come from the Viewport Segments media
features, feature-detected by probing `matchMedia` for 4, 3, then 2 segments
(absent on most engines → treated as a single segment).

### 2.2 Shipped API — `@kerfjs/ui/device-class`

Reactive, signals-based (kerf has no hooks; a device class is a
`ReadonlySignal`, not a `useX`). `ui/docs/device-class.md` is the consumer
reference.

```ts
import {
  classifyViewport,
  DEFAULT_BREAKPOINTS,
  deviceClass,
  type DeviceClass,
} from "@kerfjs/ui/device-class";

function deviceClass(options?: {
  breakpoints?: Partial<DeviceBreakpoints>; // override any default threshold
  ssr?: Partial<Viewport>; // viewport assumed without a DOM
}): ReadonlySignal<DeviceClass>;

interface DeviceClass {
  size: "xs-mobile" | "mobile" | "tablet" | "desktop" | "xl-desktop";
  orientation: "portrait" | "landscape";
  segments: number; // horizontal viewport segments, ≥ 1
  verticalSegments: number; // ≥ 1
  handset: boolean; // size ∈ {xs-mobile, mobile}
  compact: boolean; // handset || (tablet && portrait) — "one pane at a time"
  atLeast(size): boolean; // e.g. device.value.atLeast('tablet')
}

function classifyViewport(
  width: number,
  orientation: DeviceOrientation,
  segments?: number, // default 1
  verticalSegments?: number, // default 1
  breakpoints?: DeviceBreakpoints, // default DEFAULT_BREAKPOINTS
): DeviceClass;
```

- **One shared viewport source.** The first `deviceClass()` call in a browser
  installs a single `resize` + `orientationchange` listener pair on `window`
  and a shared viewport signal; every later reader derives a `computed` from it.
  The listeners are **not** reference-counted or torn down — there is only one
  viewport, so they stay installed for the life of the page.
- **Per-reader breakpoints.** `deviceClass({ breakpoints })` merges the override
  onto `DEFAULT_BREAKPOINTS` for that reader only.
- **Pure core.** `classifyViewport(...)` is DOM-free and directly unit-tested,
  mirroring how `list-render-state.ts` reifies the reconciler's state machine.
- **SSR.** Without a DOM, `deviceClass()` returns a `computed` over a fixed
  snapshot: `options.ssr` merged onto a 1024×768, one-segment default
  (`desktop` / `landscape`). There is no hydration step — that signal never
  changes; a `deviceClass()` called in the browser reads the real viewport.

**Implementation:** ticket **device-class foundation** (see §8). Everything else
depends on it.

## 3. Layout primitives

Each layout is a `@kerfjs/ui` component returning `SafeHtml` plus, where it owns
interactive lifecycle, a disposer-returning `wire…()` helper — the package's
established "state/policy in the app, eventful behavior in disposer-returning
wiring" contract. Each has its own subpath and CSS side-effect boundary.

### 3.1 Navigation stack — `NavStack` (`@kerfjs/ui/nav-stack`)

Views pushed and popped with an animated horizontal slide (iOS-style): the
incoming view slides in from the trailing edge while the outgoing view parks and
darkens slightly; back reverses it. Chrome and content animate separately — the
**top toolbar and optional bottom toolbar cross-fade** while the **main content
slides** (the pattern already used on several `~/Documents/hotsheet2` dialogs).

- Top toolbar is standard; it can be **hidden** in rare cases, and show/hide is
  itself animated. Bottom toolbar is optional.
- A **single-pane layout is a `NavStack` with one entry** — no separate
  primitive; the doc and guidance say so explicitly.
- Applicable at every device size and inside dialogs of every size.
- Honors reduced motion (cross-fade/slide collapse to instant) and restores
  focus into the new top view after a push/pop.

**Ratified rendering model (declarative + wire).** Consistent with every other
`@kerfjs/ui` component, the app owns the stack as a `signal<NavStackView[]>`;
`NavStack({ views })` renders it as `SafeHtml` (all views stacked, the last
active), and `wireNavStack(root, { onBack })` animates the push/pop transition
and cross-fades the chrome, moves focus into the new top view, and restores the
revealed view's remembered descendant on pop. A consumer can mark the preferred
initial target with `data-nav-focus`; the helper otherwise uses the first
focusable descendant or the view container. It returns a disposer. Back is a
delegated control; the app's `onBack` pops its own signal. This replaces the
earlier imperative `navStack({ root }).push()` sketch.

```ts
const views = signal<NavStackView[]>([{ key: 'home', content: <HomeView/> }]);
// render: <NavStack id="nav" label="Detail flow" views={views.value} />
// once: const dispose = wireNavStack(root, { onBack: () => views.value = views.value.slice(0, -1) });
// push: views.value = [...views.value, { key: id, title: 'Detail', content: <DetailView id={id}/> }];
```

**Implementation:** ticket **NavStack layout**.

### 3.2 List-detail (split view) — `SplitView` (`@kerfjs/ui/split-view`)

Two panes — a list and a detail — side by side, with an **optionally resizable
separator** (with min/max limits). `SplitView` (Apple's term) is the only
public name.

Responsive presentation (device-class driven, but **the app passes the class
in** — `SplitView` does not read `deviceClass()` itself):

- **desktop / xl-desktop / landscape tablet / multi-segment devices:** both panes
  visible; with `resizable`, the list pane is a `ResizableRegion` whose
  separator resizes within limits.
- **compact (handset or portrait tablet):** the split collapses to a `NavStack`
  — the list is the root view and, while `detailActive` is true, the detail is
  pushed over it.
- **as a dialog:** on desktop it is an inline two-pane dialog; on portrait tablet
  it presents as a full-screen modal; on landscape tablet it covers a large
  fraction of the base app without necessarily going full screen (§4).

Shipped shape — a declarative component; interactivity composes existing wires
(`wireResizableRegions` for the separator, `wireNavStack` for the compact back):

```tsx
const device = deviceClass();
// render:
<SplitView
  id="mail"
  label="Mail"
  list={<MessageList />}
  detail={<MessageDetail id={selected.value} />}
  compact={device.value.compact} // collapse to a NavStack on compact classes
  detailActive={selected.value != null} // compact: detail pushed over the list
  listTitle="Inbox"
  detailTitle="Message"
  resizable={{ size: 320, min: 220, max: 480 }} // omit → fixed split
/>;
// once: wireResizableRegions(root, …); wireNavStack(root, { onBack: () => (selected.value = null) });
```

`SplitViewProps` also takes `backLabel` (default `"Back"`), `className`, and
`slot`.

**Implementation:** ticket **SplitView (list-detail) layout**. Depends on
NavStack (it reuses it on compact classes).

### 3.3 Multi-panel / IDE — `Workbench` (`@kerfjs/ui/workbench`)

The "Xcode-like" layout: a **left rail**, a **right rail**, and a **bottom
drawer**, each independently **collapsible**, around a central work area. Any of
the three may be absent (a left-rail-only variant is common).

**Name.** Shipped as **`Workbench`** (§7) — it reads as a tool/IDE workspace,
does not collide with the existing `TabBar`/`AppTab`/`ResizableRegion`
vocabulary, and avoids the PWA-loaded "app shell" term.

- Rails collapse with the **instant-width / sliding-content** animation proven in
  hotsheet2's `app-shell.css` and in the kerf UX demo catalog sidebar (KF-7QKJRK,
  the instant-width / sliding-content sidebar collapse): the panel's grid track
  snaps instantly (one reflow) while its fixed-width content slides via a
  composited `transform`, clipped by the shell's overflow — never a per-frame
  width animation. The bottom drawer uses the vertical analogue while anchoring
  its fixed-height content to the shell's stable bottom edge, so the layout
  origin cannot move underneath the transform transition.
- **The collapse is pure CSS.** The app owns each panel's `collapsed` flag and
  re-renders; the component reflects it as `data-collapsed` and the stylesheet
  animates the change. No wire is involved.
- **Rails overlay on small screens by default (KF-H60XYP).** A rail's
  `responsiveOverlayAt` defaults to `narrow` (704px of Workbench width;
  `never` opts out), so below it a sidebar covers the work area and any open
  drawer instead of sitting beside it; with `wireWorkbench` only one overlay
  is open at a time. The drawer keeps its opt-in. On a compact (448px)
  Workbench an overlay rail fills the Workbench less a 44px dismiss strip
  (`--kui-workbench-overlay-dismiss-margin`) on the side away from its edge;
  `compactOverlay: "full"` makes a rail fill it (per rail).
- **Panel toolbars follow the panel (KF-6GVPW7: toggles were hand-placed, so
  the catalog showed each rail toggle twice while the rails were open and
  put toggles where the guidance does not).** A panel may take a `toolbar`
  (`title`, `panelOnly`, `constant`, `toggle: { action, name }`) and the work
  area a `mainToolbar` / `mainBottomToolbar`; the Workbench composes each as a
  `Toolbar` over a `Pane` (`ui/src/workbench-toolbars.tsx`). Open, a panel's
  toolbar holds its title and panel-only groups, then its constant groups and
  the standard toggle last. Closed, its panel-only groups stay behind (inert)
  and its constant groups plus toggle move to the work area: a left rail's
  lead `mainToolbar` before its title, a right rail's end it, and a drawer's
  trail `mainBottomToolbar`, else float in a `FloatingToolbar` in the work
  area's corner (a rail without a `mainToolbar` floats its groups the same
  way). The move is decided at render time from `collapsed` — moving DOM
  nodes at wire time would fight the morph — and each toggle carries a
  stable `data-key` so the morph never reuses a focused toggle's button for
  another control. `wireWorkbench` keeps focus with the toggle across the
  move: closing from the panel's toggle focuses the relocated one, and
  opening from the work area focuses the panel's own (a focused toggle the
  render removes is remembered through a capture `click` listener for a
  couple of frames, since the app's render may land before or after the
  collapse effect). An app `restoreControl` still wins over the floating
  fallback.
- **A collapsed panel's content is inert (KF-0WARYA: a collapsed rail or
  drawer kept its controls in the Tab order, and focusing one scrolled the
  clipped panel so its hidden content slid back over the work area).** The
  panel's `.kui-workbench__panel-content` wrapper renders `inert` whenever
  `collapsed` is true, straight from the markup, so no wire is needed: neither
  Tab nor assistive technology reaches a control that has slid out of view,
  and nothing can scroll it back into view. `inert` does not affect rendering,
  so the slide-out still animates, and the `restoreControl` sits outside the
  content (and the resize handle already leaves the tab order), so both stay
  as reachable as before. Expanding removes the attribute in the same render.
  The labeled rail/drawer itself also renders `inert` and `aria-hidden="true"`
  while collapsed (KF-JJ2MQR: with only the content inert, the collapsed
  `aside`/`section` stayed in the accessibility tree as an empty labeled
  landmark a screen-reader user could still land on). Its separator is
  already hidden and `display: none` while collapsed, so nothing reachable
  moves into the hidden subtree, and the three collapsible families now hide
  a collapsed panel the same way.
  With `wireWorkbench` given the panel's `collapsed` signal, focus inside a
  closing panel is handed back as described below; an app that closes a
  panel without it owns that focus move.
- **Panels are fixed-size by default.** A panel's `size` sets the rail width or
  drawer height in px (overriding the CSS default). Panels reuse `ResizableRegion`'s
  presentation vocabulary as options — `separator` (`auto` | `hidden`),
  `collapseMotion` (`none` | `slide` | `fade-slide`), `contentOverflow`
  (`clip` | `auto` | `visible`), `presentation` (`inline` | `overlay` |
  `hidden`) — plus an optional `restoreControl` shown in a safe-area-aware
  corner (`restorePosition`) while the panel is collapsed. The corner is the
  Workbench's own (KF-TXP944: it was `position: fixed` to the viewport, so an
  embedded Workbench floated it over the UX catalog's footer). It is
  absolutely positioned against the Workbench (a rail's) or the center column
  (the drawer's, so it never covers an expanded rail), inset by
  `--kui-workbench-restore-inset` plus that container's safe-area edge
  insets; the Workbench is `isolation: isolate`, so its overlay and restore
  z-indexes stack within it. A collapsed rail's control floats above an
  expanded inline bottom drawer instead of over it (KF-GBETFJ: the drawer's
  column reaches the Workbench's bottom corners once the rail collapses, so
  the control sat on the drawer's content). It reuses the standalone
  `CollapsiblePanel` anchor: the Workbench sets `anchor-scope:
--kui-restore-drawer`, an expanded `data-presentation="inline"` drawer
  publishes `anchor-name: --kui-restore-drawer` (at `:where()` specificity,
  so each responsive-overlay container query's `anchor-name: none` wins
  while the drawer presents as an overlay), and a rail's control — a direct
  child of the Workbench — takes `inset-block-end: calc(inset +
anchor(--kui-restore-drawer top, <safe-area fallback>))` with
  `position-visibility: always`. The corner returns when the drawer
  collapses; an engine without anchor positioning keeps the corner; an open
  overlay drawer covers the control like any overlay; and a drawer inside a
  nested Workbench in the work area is scoped to that Workbench, so it moves
  only its own rails' controls. The drawer's own control never anchors. A
  `FloatingToolbar` may host the control: the
  corner sets `--kui-floating-toolbar-inset: 0px`, and `FloatingToolbar` now
  resolves its inset from that inheritable token (a private
  `--_kui-floating-toolbar-inset` instead of redeclaring the public token on
  itself), so the toolbar floats from the corner's point instead of doubling
  the inset; its `position` should match `restorePosition`.
- **Resizing is opt-in and configurable per panel (KF-2FG7VB: drag-resizable
  Workbench rails).** `resizable: true | { min, max }` (defaults: rails
  180–480px, drawer 120–480px) gives the panel a separator on its inner edge
  with the `ResizableRegion` handle contract (`role="separator"`,
  `aria-valuenow/min/max`, a 20px hit target, the dormant grip). The app owns
  the size as a signal and renders `size={signal.value}`; `wireWorkbench`
  (`@kerfjs/ui/wire-workbench`) drives the separator through the same internal
  resize wiring as `wireResizableRegions` — live pointer drag with
  `data-resizing`, arrow/Shift+arrow/Home/End keys, clamping to the limits —
  and commits each resize to the signal. Rules:
  - off by default: a panel without `resizable` renders no handle and no resize
    attributes, byte-identical to before;
  - collapse keeps the size: the size stays on the collapsed panel (its content
    slides out at that width), the handle leaves the tab order, and expanding
    restores the last size;
  - optional persistence (`storageKey` + `storage`, default `localStorage`)
    loads the size at wire-up and saves every change, like `wireSidebar`;
  - no resizing where rails become drawers: an overlay or hidden panel's handle
    is hidden and inert, and with `deviceClass` the wire suspends resizing while
    `compact` is true;
  - responsive overlay panels (KF-0KXZT2: an overlay presentation that needs no
    app device-class check): a rail's `responsiveOverlayAt: "narrow" |
"compact"` mirrors `ResizableRegion`'s `responsiveFillAt` — same names,
    same 704px / 448px breakpoints, measured on the component's container. The
    rail renders `data-responsive-overlay-at`, the Workbench becomes a named
    `kui-workbench` inline-size container only when a panel opts in, and below
    the breakpoint the CSS applies the overlay presentation (out of flow at its
    edge, the overlay z-index/maximums/shadow, separator hidden, the work area
    keeping its safe-area inset) while `data-presentation` stays `inline`.
    The bottom drawer takes the same prop (KF-N64H06: an overlay drawer used
    to collapse to its 1px border because its content is absolutely
    positioned): it overlays the work-area column (the center is its containing block) from the bottom edge at
    its configured height, and the work area keeps its bottom safe-area inset
    beneath it. Every overlay drawer, static or responsive, now takes that
    explicit height, with its content clamped to the overlay maximum. A
    static overlay rail likewise takes its extent width explicitly
    (KF-06JXTE: an out-of-flow rail sized to its content plus its 1px border,
    281px for a 280px rail), and rails and the drawer are `border-box`, so a
    panel's size is its whole track, separator border included, in or out of
    flow and whatever box model the app defaults to; overlay content fills the
    panel inside that border. A collapsed overlay (static or
    responsive) drops its surface and shadow — the sliding content carries the
    surface — so an invisible box no longer covers the work area;
  - transient overlays (KF-KVSXS3: a responsive overlay rail used to stay
    expanded over the editor after the breakpoint applied): a panel may pass
    its app-owned `collapsed` signal to `wireWorkbench` (`size` became
    optional). With `dismissOverlays` (default `true`, mirroring
    `wireSidebar`'s compact overlay, which is on once `deviceClass` is given)
    the wiring collapses a panel when its `responsiveOverlayAt` breakpoint
    begins to apply — detected by the panel computing `position: absolute`
    while `data-presentation` stays `inline`, re-checked by a
    `ResizeObserver` on the Workbench plus a `MutationObserver` for a
    Workbench that renders later or a changed presentation — remembering and
    later restoring its inline state (also on disposal), with the content's
    transition suspended across one style flush so no slide plays. Escape
    (unless already `defaultPrevented`) closes the focused, else most
    recently opened, open overlay panel; a press that starts (`pointerdown`,
    capture) and ends (`click`) outside it closes it, decided at the click so
    an app toggle closes first. Focus stranded in a closing panel returns to
    the control focused when it opened, else to the panel's restore control
    (looked up again after the current batch), else it is blurred. Static
    overlays get the dismissal but not the breakpoint collapse. The focus
    return runs for any close of a wired panel — including the app's own
    close control inside it, and inline panels — because it is driven by the
    `collapsed` signal rather than by the dismissal (KF-TRX0PW: at 390px the
    catalog's inspector overlay covered its own editor-toolbar toggle; each
    catalog rail now carries its own close control in its `Pane` header, and
    closing from there must not strand focus in the hidden rail). Internal
    module `ui/src/workbench-overlays.ts`. A panel already open at wire-up
    has no recorded opener (KF-WR9B71: closing it from its own header
    dropped focus to `<body>`), so after the opener and the restore control
    the focus fallback is a focusable control outside the panel whose
    `aria-controls` tokens name the panel or an element inside it. To make
    that nameable, every Workbench panel renders an `id` equal to its region
    id (`<workbench id>-left-rail` / `-right-rail` / `-bottom-drawer`, the
    same string as a resizable panel's `data-region-id`);
  - exclusive overlays (KF-5S6ZW7: at 390px the catalog's navigator (240px)
    and inspector (160px) overlays were wider than the Workbench together, so
    the right rail covered the navigator's own header close control).
    `exclusiveOverlays` (default `true`, mirroring `wireSidebar`'s
    `exclusiveCompact`) makes a wired panel that opens while it presents as an
    overlay (static or responsive, by the same check as dismissal) close every
    other open overlay panel of that Workbench — rails and the bottom drawer
    alike, since a rail also covers the drawer's header — whatever opened it:
    the app's toggle, a keyboard activation (which has no outside press), or a
    programmatic write. Panels presenting inline are never closed by it, so a
    wide Workbench keeps both rails open. It is part of the overlay wiring, so
    it applies only with `dismissOverlays`; `false` restores simultaneous
    overlays, which then stack in the fixed order below;
  - overlay focus (KF-Q7AN1Z: overlays dismissed and returned focus but left
    it on the covered toggle, and Tab walked into the work area the overlay
    covers). Decided to match `wireSidebar`'s compact overlay — the ARIA
    dialog pattern — rather than stay non-modal: an overlay covers the work
    area, so a keyboard user left behind it tabs through controls they cannot
    see (WCAG 2.4.11, focus not obscured), and the two collapsible-panel
    wires should behave alike. A wired panel that opens while it presents as
    an overlay moves focus to its first focusable control (else the panel
    element), with `preventScroll` so the clipped, sliding content is not
    scrolled; the opener is recorded first, and exclusive closes of other
    overlays run after the focus move, so none of them hands focus back. A
    document `keydown` listener (skipping `defaultPrevented`) keeps Tab and
    Shift+Tab inside the open overlay that holds focus, else the most
    recently opened one: it wraps at either end and pulls focus that is
    elsewhere back in. Its focusable list drops `display: none` controls via
    `checkVisibility()` (a responsive overlay's separator is rendered with
    `tabindex="0"` but hidden by the container query). Inline panels never
    move focus. Returning focus on close skips an opener inside another wired
    panel that has closed since (an exclusive overlay opened from inside the
    one it closed), falling through to the restore control and the
    `aria-controls` toggle. A close also returns focus when the latest
    `pointerdown` (capture) started inside the open panel while focus was
    inside it and focus is now on the body, until the next `focusin` anywhere
    clears that record (KF-SSW2B2: Safari and macOS WebKit never focus a
    clicked button, so pressing a panel's own Hide control blurred the focused
    control to the body before the click collapsed the panel, and the
    focus-inside check at collapse time saw the body and returned nothing).
    `wireSidebar` needs no counterpart: its toggle close always restores
    focus, independent of where focus is;
  - overlay stacking order (KF-3FM7G6: with the drawer and a rail both
    overlays, their order followed document order, so the drawer covered the
    left rail while the right rail covered the drawer): both rails stack above
    the drawer, as inline rails span the Workbench's full height beside the
    drawer's column, and the right rail above the left (document order at an
    equal z-index). Rails keep `--kui-workbench-overlay-z` (default 41), the
    drawer takes that value minus one (static and responsive overlays alike),
    and restore controls take `--kui-workbench-restore-z`. The order is static
    CSS, not most-recently-opened, so it needs no wiring;
  - restore controls beneath open overlays (KF-J0HC37: restore controls sat at
    z 42, above every overlay, so the collapsed drawer's corner restore
    control floated over an open right-rail overlay's content in that
    corner). Decided that an open overlay is the top layer of the Workbench,
    as a sheet or popover covers the view beneath it: a restore control is
    base-layer chrome for a collapsed panel, so it must not float over
    another panel's open overlay, where it covers that panel's content and
    reads as part of it. Keyboard users cannot reach it anyway while the
    overlay traps Tab, and Escape, an outside press, or the overlay's own
    close control reveals it again. `--kui-workbench-restore-z` now defaults
    to `calc(var(--kui-workbench-overlay-z, 41) - 2)` (39), below the drawer
    (40) and the rails (41), so it follows an app's overlay z-index. A
    collapsed overlay keeps its box for the slide-out but drops
    `pointer-events`, so a restore control beneath it stays clickable, and
    its sliding content passes over the control only while it slides away;
  - the UX catalog's Workbench route demonstrates a responsive overlay drawer
    (KF-T3XMZW: `responsiveOverlayAt` on the drawer was only exercised by an
    injected test scenario): a Workbench with just a work area and an
    `Output` drawer (`size: 180`, `responsiveOverlayAt: "narrow"`, open inline
    by default) whose `collapsed` signal is passed to `wireWorkbench`, so it
    is inline above 704px and a transient overlay at or below it; the editor
    toolbar toggles it and the drawer's `Pane` header carries its own close
    control;
  - the wire matches only its own panels by Workbench `id`, so it never
    double-drives a `ResizableRegion` or another Workbench under the same root;
  - the work area keeps a minimum width beside resizable rails (KF-D79A29:
    two ~480px rails on a ~1024px Workbench left almost no main area).
    `Workbench`'s `mainMinSize` (default 320px, `0` turns it off, ignored
    without a rail) is rendered as `data-main-min-size` plus a private
    width variable. The center's `min-width` is that minimum (never wider than
    the Workbench); inline rails become `flex-shrink: 1` with content
    that follows their shown width, so a narrowing container squeezes them in
    proportion to their sizes instead of the work area. `wireWorkbench` stops
    drag and keyboard resizing of a rail where the work area would drop below
    the minimum — the Workbench width less the minimum, the other in-flow
    rails as shown, and the rail's own safe-area extent — and never below the
    rail's own `min`; a rail the container has already squeezed can shrink but
    not grow.
  - both minimums cover every inline panel, fixed or resizable (KF-GCDT74:
    `mainMinSize` used to apply only beside a resizable rail, and nothing kept
    the work area's height above the drawer). Fixed inline rails give way like
    resizable ones, and `Workbench`'s `mainMinHeight` (default 120px, `0`
    turns it off, ignored without a drawer) is the drawer's counterpart of
    `mainMinSize`: rendered as `data-main-min-height` plus a private height
    variable, it is the work area's `min-height` (never taller than the
    column); an inline, expanded drawer becomes `flex-shrink: 1` with content
    that follows its shown height, and `wireWorkbench` stops the drawer's drag
    and keyboard resizing where the work area would drop below it — the
    column height less the minimum and the drawer's own safe-area extent.
    Decision: the "drawer minimum height" is the work area's minimum height
    beside the drawer rather than a floor on the drawer, mirroring the width
    axis, where rails give way without a floor of their own (a panel squeezed
    below its `min` reports the size it shows, as below). The 120px default
    keeps the editor toolbar and a line of content, equals the drawer's own
    default `min`, and leaves every catalog Workbench's height as it was;
    `mainMinSize` now applies to Workbenches whose rails are all fixed, so the
    catalog's full workspace gives its fixed 280px rails about 207px each and
    the editor 320px instead of 174px. Decision (KF-S9F2H6: should squeezed
    inline panels get a floor?): no per-panel shrink floor — neither
    `resizable.min` as a floor nor a new `WorkbenchPanel.minSize`. A floor
    would make the work-area minimums soft and needs a rule for what gives
    way when the floors and minimums cannot both fit; the existing answer for
    a Workbench too small for its panels is `responsiveOverlayAt`, which
    presents the panel as a full-size overlay below its breakpoint.
  - a rail the container squeezes below its own `min` (KF-4MBYRQ: a 180px-min
    Navigator showing ~172px reported `aria-valuenow="180"`) reports the width
    it shows: `aria-valuenow` is that width and `aria-valuemin` /
    `aria-valuemax` pin to it. Decision rationale: the WAI-ARIA window-splitter
    value is the separator's actual position, ARIA requires the value to lie
    inside the range, and a screen-reader user needs the layout that is on
    screen, not a configured limit it cannot honor; the pinned range says the
    separator cannot move a track its container holds. A pinned separator
    (squeezed, or a reachable range collapsed to one size) commits nothing
    (KF-X055ZC: a key press used to rewrite a rail remembered at 280px to its
    180px `min`, silently, in the app's signal and storage), so the rail
    returns at its remembered size, with the configured range, when there is
    room; the configured `min` still bounds every size that is committed. The shared resize wiring applies the same rule to a
    `ResizableRegion` a parent clamps below its `min`.
- Appropriate for **desktop-size devices**. On smaller classes the guidance is to
  present the rails' contents through a different layout (a `NavStack` or overlay
  drawers), not to shrink the three-panel shell.

Shipped shape:

```tsx
<Workbench
  id="ide"
  label="Editor workspace"
  main={<Editor />}
  leftRail={{ content: <Nav />, label: "Navigator", collapsed: leftCollapsed.value, size: 260 }}
  rightRail={{ content: <Inspector />, label: "Inspector", collapsed: rightCollapsed.value }}
  bottomDrawer={{ content: <Console />, label: "Console", collapsed: consoleCollapsed.value }}
/>
// toggle: leftCollapsed.value = !leftCollapsed.value (the app owns every flag)

// opt-in resizing: resizable + an app-owned size signal, driven by wireWorkbench
<Workbench
  id="ide"
  label="Editor workspace"
  main={<Editor />}
  leftRail={{ content: <Nav />, label: "Navigator", size: navSize.value, resizable: { min: 200, max: 420 }, responsiveOverlayAt: "narrow" }}
/>
// once: wireWorkbench(root, { id: "ide", panels: { leftRail: { size: navSize, storageKey: "ide.nav", collapsed: leftCollapsed } }, deviceClass: device });
// a panel given `collapsed` is a transient overlay: collapsed on entering its breakpoint, takes focus and keeps Tab inside while open, closed by Escape / an outside press
// the editor keeps 320px by default; mainMinSize={400} asks for more, 0 turns it off
// a panel given `collapsed` is a transient overlay: collapsed on entering its breakpoint, closed by Escape / an outside press
// the editor keeps 320px of width and 120px of height by default; mainMinSize={400} / mainMinHeight={200} ask for more, 0 turns either off
```

**Implementation:** ticket **Workbench (multi-panel) layout**.

### 3.4 Bottom tab scaffold — `TabScaffold` (`@kerfjs/ui/tab-scaffold`)

A mobile-first, iOS-like **bottom tab bar** switching between major app sections,
where each tab's content — typically its own `NavStack` — stays mounted, so
switching tabs preserves each tab's stack and scroll. Distinct from the existing
document-oriented, reorderable `TabBar`. The bottom bar is rendered by
`TabScaffold` itself (a `role="tablist"` `<nav>`); there is no separate exported
sub-part component.

- Bottom tab bar respects safe-area insets and reduced motion.
- On larger classes the guidance is to promote the tab set to a `Workbench` left
  rail or a persistent sidebar rather than keep a bottom bar.

Shipped shape — controlled; the app owns `active`, and
`wireTabScaffold(root, { onSelect })` (`@kerfjs/ui/wire-tab-scaffold`) delegates
tab clicks to `onSelect(tabId)` and returns a disposer:

```tsx
const active = signal<"home" | "search">("home");
// render:
<TabScaffold
  id="app-tabs"
  label="Sections"
  active={active.value}
  tabs={[
    { id: "home", label: "Home", icon: homeIcon, content: <HomeStack /> },
    { id: "search", label: "Search", icon: searchIcon, content: <SearchStack /> },
  ]}
/>;
// once: const dispose = wireTabScaffold(root, { onSelect: (id) => (active.value = id as "home" | "search") });
```

**Implementation:** ticket **TabScaffold (bottom tabs) layout**. Depends on
NavStack.

### 3.5 Standalone collapsible panel — `CollapsiblePanel` + `wireSidebar` (`@kerfjs/ui/collapsible-panel`, `@kerfjs/ui/wire-sidebar`)

A single collapsible **side rail or bottom drawer** for apps that want one panel
outside the full `Workbench` shell. `CollapsiblePanel({ id, side, collapsed?,
size? })` reuses the §3.3 instant-size/sliding-content collapse for a `'left'` /
`'right'` rail or a `'bottom'` drawer. Bottom-drawer content is anchored to the
panel's stable bottom edge so the transform cannot overshoot and snap while the
track changes size. `CollapsiblePanelToggle` +
`collapsiblePanelToggleIcon` are the standard toggle affordance and per-side icon
convention (`PanelLeft*` / `PanelRight*` / `PanelBottom*`). `wireSidebar(root, {
panels, deviceClass?, storage? })` adds the semantics: toggle delegation with
focus restore, focus-into on open, a compact overlay (dismissable backdrop +
Escape + Tab focus trap, driven by a §2 `deviceClass()` signal), and a per-panel
persistence hook. An overlay is transient and opens only on a user action
(KF-717E65: the recipe used to open its rail as a blocking overlay on load at
compact widths): wire-up on a compact device and a wide → compact crossing
collapse every panel, a compact → wide crossing (or disposal) restores the
remembered inline state, and persistence records only that inline choice. A
per-panel `inlineCollapsed` declares the inline default when the app seeds its
signal from the device class for a flash-free compact first render. The app owns each `collapsed` signal, the panels, sizes, and
content; drag-resize composes `ResizableRegion`. Subpath-only with a companion
CSS import. See [`ui/docs/collapsible-panel.md`](../../ui/docs/collapsible-panel.md).

A collapsed panel is inert (KF-HVJ4RM: a collapsed `CollapsiblePanel` or
`ResizableRegion` kept its controls in the Tab order, and the panel's
`aria-hidden` put those focusable controls inside a hidden subtree), matching
the §3.3 Workbench rule. `CollapsiblePanel` renders `inert` beside its existing
`aria-hidden="true"` on the collapsed `aside` itself — the panel holds nothing
but its content, and `aria-hidden` keeps the emptied landmark hidden even from
tooling that does not prune inert subtrees. `ResizableRegion` first rendered
`inert` only on its `.kui-resizable-region__content` wrapper, because its
separator lives inside the region; since KF-JJ2MQR (the collapsed region stayed
behind as an empty labeled landmark) the region itself also renders `inert` and
`aria-hidden="true"`, like a collapsed Workbench panel — its separator is
already hidden and not displayed while collapsed. All come straight from
`collapsed`, so no wire is
needed, the slide-out still animates, and each `restoreControl` renders outside
the inert subtree. `wireSidebar`'s focus hand-off is unchanged: a panel
collapsing from inside hands focus to its toggle outside it, a wide → compact
crossing rescues focus stranded inside, and opening moves focus to the panel's
first control after the render that removes `inert`.

A collapsed `CollapsiblePanel`'s or `ResizableRegion`'s optional
`restoreControl` floats in a corner (`restorePosition`) of the component's own
container — the element that holds the panel and its sibling restore control —
never of the viewport (KF-EC756H: it was `position: fixed`, so a panel embedded
in a page floated the control over unrelated page content, the defect §3.3's
Workbench corner already fixed). While the control is shown, a zero-specificity
`:where(:has(> …__restore))` rule makes that container `position: relative`
and `isolation: isolate`, so the corner is its containing block and its
z-index stacks within it; an app that positions the container itself (fixed,
absolute, sticky) keeps its own value, which is equally a containing block.
The corner is inset by `--kui-collapsible-panel-restore-inset` /
`--kui-resizable-region-restore-inset` plus the container's
`--kui-edge-inset-*` edges (falling back to the device safe area), so a
full-viewport shell still places it clear of the unsafe areas. Like the
Workbench corner, it sets `--kui-floating-toolbar-inset: 0px`, so a
`FloatingToolbar` hosting the control floats from the corner instead of
doubling the inset.

The corner also routes around an expanded bottom drawer beside the collapsed
component (KF-S5VYVM: a collapsed rail's control used to float over an open
drawer sharing its container). An expanded inline bottom `CollapsiblePanel`,
or an expanded inline bottom `ResizableRegion` (`axis="vertical"`,
`edge="start"`), publishes a CSS anchor (`anchor-name: --kui-restore-drawer`).
While a restore control is shown, its container scopes that name
(`anchor-scope`) and so do the container's great-grandchildren, which leaves
exactly the drawers that are direct children of the container or of one of its
direct children (the app's work-area column) in scope. The corner's second
`inset-block-end` declaration is the restore inset plus
`anchor(--kui-restore-drawer top, <container bottom edge inset>)`: with a drawer
in scope it floats that inset above the drawer's top edge — and follows a
drag-resize — and without one it falls back to the container corner. A drawer
nested deeper, inside the work area's own content, belongs to that content and
never moves the corner. An engine without anchor positioning drops the second
declaration and keeps the container corner (the prior behavior). The corner
sets `position-visibility: always` so it is never hidden with a scrolled-away
anchor. `Workbench`'s own rail corners are out of this rule's scope.

The corner stacks beneath open overlays, the rule §3.3's Workbench corners
follow (KF-JHG76H: both corners stacked at z 42, above their own overlays —
`CollapsiblePanel`'s at 40 with `wireSidebar`'s compact backdrop at 39, and an
overlay `ResizableRegion` at 41 — so another panel's collapsed restore control
floated over an open compact overlay's backdrop, or over an overlay drawer's
content in its corner, and stayed clickable behind the overlay's focus trap).
Decided for consistency with the Workbench decision rather than as a taste
call: an open overlay is the top layer of the page, as a sheet or dialog
covers the view beneath it, and `wireSidebar`'s compact overlay is modal in
every other respect — it traps Tab and dismisses on a backdrop press — so a
pointer should not reach base-layer chrome that the keyboard cannot. A restore
control is base-layer chrome for a collapsed panel. Escape, a backdrop or
outside press, or the overlay's own close control reveals it again.
`--kui-collapsible-panel-restore-z` defaults to
`calc(var(--kui-collapsible-panel-overlay-z, 40) - 2)` (38) and
`--kui-resizable-region-restore-z` to
`calc(var(--kui-resizable-region-overlay-z, 41) - 2)` (39). The compact
backdrop's `--kui-collapsible-panel-backdrop-z` now defaults to
`calc(var(--kui-collapsible-panel-overlay-z, 40) - 1)` (still 39) instead of a
literal, so an app that moves the overlay z-index moves the backdrop and the
restore control with it and the order holds. A collapsed overlay passes
pointer events through (a collapsed overlay panel's track is zero-sized; a
collapsed overlay region drops `pointer-events`), so the control beneath it is
usable as soon as the overlay closes. The corner still stacks above ordinary
content, content-overflow popups (5), and app `FloatingToolbar`s (4).
Covered by `ui/tests/browser/restore-anchor.spec.ts` (hit-tests at 1280 and
390 in all three engines) and the CSS unit tests.

**Implementation:** shipped (KF-T17Q1X). UX-demo recipe (the "Collapsible sidebar"
recipe: a left rail + bottom drawer with toggles, compact overlay, and persistence)
and three-engine Playwright coverage of collapse/expand, focus move/restore, the
compact overlay + Escape/backdrop dismiss, and Tab trap shipped in KF-JP6KVY
(`ui/tests/browser/collapsible-sidebar-recipe.spec.ts`). The whole-screen layouts
also ship focused component demos and three-engine catalog coverage. The
focused CollapsiblePanel route's "Restore control" example (KF-DRMN5Q: no demo
exercised a standalone `restoreControl` before) collapses a bottom drawer to a
`FloatingToolbar` corner control wired with `wireSidebar`, covered in
`ui/tests/browser/app-layout-catalog.spec.ts`.

### 3.6 Safe areas (KF-CZ3CBS: surfaces through unsafe areas, content padded on touched edges)

**Status: Shipped.** Every layout and a plain `Pane` handle device safe-area
insets structurally, with no per-app configuration. The consumer summary is the
"Safe areas" section of [`ui/docs/app-layouts.md`](../ui/docs/app-layouts.md).

**Rules.**

1. Surfaces (pane and panel backgrounds, separators, dividers) paint edge to
   edge through unsafe areas. A pane root never pads. A collapsible rail/drawer
   (`Workbench` rails and drawer, `CollapsiblePanel`, a `SplitView` list, and a
   `ResizableRegion` via `--kui-resizable-region-edge-extent`) grows its track
   by the inset of the edge it docks to, so its content keeps the configured
   size.
2. Content gets compensating padding: inline on the sides a region actually
   touches, block top/bottom as padding inside the scroll owner plus matching
   `scroll-padding-block`. Content may scroll under an unsafe edge, but its
   first and last items can always be scrolled into the safe area.
3. An edge a region does not reach gets no inset. Interior edges (the side of a
   `Workbench` center next to an expanded inline rail, a `SplitView` detail's
   list side, a `NavStack` view under its chrome) are cleared. Collapsing a rail,
   or presenting it as an overlay, hands the edge back.
4. No double inset: the element that applies an inset clears the context for
   its descendants.

**Mechanism.** Two custom-property layers:

- `--kui-safe-area-{block-start,block-end,inline-start,inline-end}` on `:root`
  (foundation.css) default to `env(safe-area-inset-*)` (inline sides swap under
  `:root:dir(rtl)`). They are the override point for tests and app-owned chrome.
- `--kui-edge-inset-*` is the inherited **edge context**: how far each edge of
  the current region still reaches into an unsafe area. Unset means the full
  device inset, so a top-level `Pane` is inset on every side with no setup.
  Layout CSS routes it: each region sets `0px` for edges it does not reach
  (`:has()` and sibling selectors track expanded/collapsed rails, a present
  chrome/bottom toolbar, and an expanded drawer). Consumers (Pane slots,
  NavStack chrome/views/bottom, TabScaffold scenes/bar, Workbench main and panel
  content, CollapsiblePanel content, SplitView list/detail) pad from it and
  reset it to `0px` for their children.

A layout region whose only child is a `Pane`, `NavStack`, `SplitView`,
`Workbench`, or `TabScaffold` delegates to that child instead of padding, so the
child can paint through and own scroll-through padding. A Pane header/footer
whose only child is a `Toolbar` hands the toolbar the inline edges; the toolbar
adds them to its own inline padding so its dividers reach the edge. A toolbar
outside that hand-off treats an unset context as zero, unless it claims its
screen edges with `Toolbar.safeAreaEdges` (KF-EEPPQE: an app shell's top app
bar sat outside any Pane header and never cleared the status area). A claimed
side pads like a Pane slot — the routed edge context, or the full device inset
when nothing routes it — and the toolbar's minimum height grows by the claimed
block insets. Inside a Pane header or footer the context is already cleared, so
a claim there never double-insets.

**Opt-outs / app routing.** `Pane.safeAreaEdges` (typed
`readonly PaneSeparatorSide[]`, default all four) limits the sides a pane may
compensate; `[]` opts out. `Toolbar.safeAreaEdges` (same type, default none)
lets an app bar or bottom bar at a screen edge claim those sides. An app-owned layout sets `--kui-edge-inset-*: 0px` on
its regions. A `CollapsiblePanel` routes its direct flex siblings automatically;
a panel wrapped in an app grid cell cannot, so the app routes those edges.

**Verification.** `ui/tests/browser/safe-area.spec.ts` renders each layout full
screen with simulated insets (via the `--kui-safe-area-*` overrides) and asserts
edge-to-edge surfaces and separators, touched-side padding, scroll-through
padding, the center regaining an edge when a rail collapses, an app bar and a
bottom bar claiming their screen edges with `Toolbar.safeAreaEdges`, and no
interior or nested inset.

## 4. Responsive presentation matrix

The rule each layout encodes, summarized (`compact` = handset or portrait
tablet — "one pane at a time"):

| Layout                | handset                            | portrait tablet                 | landscape tablet / multi-segment           | desktop+                                |
| --------------------- | ---------------------------------- | ------------------------------- | ------------------------------------------ | --------------------------------------- |
| `NavStack`            | stack                              | stack                           | stack                                      | stack (or one column of a larger shell) |
| `SplitView`           | → NavStack                         | → NavStack (full-screen detail) | two panes (detail may not be full-screen)  | two panes, resizable                    |
| `Workbench`           | not recommended → NavStack/overlay | rails as overlay drawers        | left rail inline; right/bottom as overlays | full three-panel, opt-in resizable      |
| `TabScaffold`         | bottom tabs + per-tab stacks       | bottom tabs                     | promote tabs to rail                       | promote tabs to sidebar/`Workbench`     |
| Dialog w/ `SplitView` | full-screen modal                  | full-screen modal               | large partial-cover modal                  | inline two-pane dialog                  |

Dialogs integrate with `kerfjs/overlay` and its native top-layer backing
([`19-native-overlay-backing.md`](19-native-overlay-backing.md)); a layout used
as a dialog body renders inside the overlay surface.

## 5. AI guidance — choosing a layout

The AI guidance (`ui/ai/skill.md`, `ui/llms.txt`, the decision-guidance data,
and the consumer docs) must map a situation to a layout. The decision axis:

- **Simple app / few flat sections, any device →** single pane = `NavStack` with
  one entry; add `TabScaffold` if there are 2–5 co-equal major sections on
  handset.
- **Drill-down browsing (list → item → sub-item), any device →** `NavStack`;
  `SplitView` once there is room to show list and detail together (tablet
  landscape and up).
- **Two related panes where selecting on the left updates the right →**
  `SplitView`, collapsing to `NavStack` on compact classes.
- **Complex tool / editor with peripheral panels (navigator, inspector, console)
  on desktop →** `Workbench`; degrade to `NavStack`/overlays on small classes.
- **Mobile app with 2–5 top-level destinations, each its own drill-down →**
  `TabScaffold`; promote to a rail/sidebar on desktop.
- **Dialogs:** pick the same layout by complexity, then apply the dialog
  presentation column of §4 for the device class.

The guidance must give a worked example per row and state the device-class
threshold at which the presentation changes, so an assistant can pick both the
layout and its responsive behavior. **Implementation:** ticket **AI
layout-selection guidance**.

## 6. Tree-shaking

Each layout and the device-class module is its own opt-in subpath, kept out of
the root barrel so an app importing `@kerfjs/ui/nav-stack` must not pull
`Workbench` or its CSS. Because the layouts are not barrel components, they
deliver styling through a **companion CSS import** (`@kerfjs/ui/nav-stack.css`,
the same manual pattern as `layout.css`) rather than the browser auto-condition —
so the component's own JS import stays CSS-free and the app opts into the
stylesheet explicitly. Node/SSR paths stay DOM- and CSS-free (device-class SSR
resolves to the caller default without touching `matchMedia`). The package's
bundle/CSS tree-shaking gates extend to cover the new subpaths.

## 7. Resolved decisions

1. **`Workbench`** — shipped as the multi-panel/IDE layout name.
2. **`TabScaffold`** — shipped as the bottom-tab container name, kept distinct
   from `TabBar`.
3. **Default breakpoints** — shipped as proposed in §2.1 (mobile 360, tablet 720,
   desktop 1024, xl-desktop 1440), tunable per reader and mirrored as `--kui-bp-*`.
4. **Subpath** — the module shipped at `@kerfjs/ui/device-class`. A broader
   `@kerfjs/ui/responsive` umbrella can still be introduced later if more
   responsive helpers appear.

The shipped layouts are represented in the machine-readable component catalog,
including explicit manual-CSS delivery metadata, focused UX-demo routes, and
three-engine Playwright coverage.

These decisions are reflected in the shipped implementation, catalog metadata,
consumer guidance, demos, and tests.

## 8. Decomposition

Implementation shipped in six phases; each phase included its component + CSS,
unit and three-engine Playwright coverage, a UX-demo recipe, consumer docs
(`ui/docs/`), and machine-readable and AI catalog updates.

1. **Device-class foundation** — `@kerfjs/ui/device-class` (§2).
2. **NavStack layout** (§3.1).
3. **SplitView / list-detail layout** (§3.2).
4. **Workbench / multi-panel layout** (§3.3); generalizes the KF-7QKJRK sidebar
   animation.
5. **TabScaffold / bottom-tabs layout** (§3.4).
6. **AI layout-selection guidance** (§5) — decision matrix into `ui/ai/skill.md`,
   `ui/llms.txt`, decision-guidance, and consumer docs.

All phases above are shipped and indexed in `CLAUDE.md` and
[`docs/ai/requirements-summary.md`](ai/requirements-summary.md).
