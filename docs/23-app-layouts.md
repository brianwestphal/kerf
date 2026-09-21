# 23. App and dialog layouts

**Status: Shipped.** The device-class foundation and all four layouts
(`NavStack`, `SplitView`, `Workbench`, `TabScaffold`) plus the AI
layout-selection guidance are implemented as opt-in `@kerfjs/ui` subpaths. This
document remains the design source of truth; the ratified public names and the
declarative + wire model below match what shipped. The consumer-facing decision
guide is [`ui/docs/app-layouts.md`](../ui/docs/app-layouts.md), and each layout
has its own consumer doc under `ui/docs/`. Still open: the UX-demo recipes +
three-engine Playwright coverage and the AI-catalog promotion decision (tracked
as a follow-up).

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

Proposed default breakpoints (min-width, `rem` at the ui 16px baseline; tunable
via CSS custom properties so an app can shift them without forking the logic):

| Bucket       | Min width       | Typical device               |
| ------------ | --------------- | ---------------------------- |
| `xs-mobile`  | 0               | small phones (< 360px)       |
| `mobile`     | 22.5rem (360px) | phones                       |
| `tablet`     | 45rem (720px)   | tablets, small split windows |
| `desktop`    | 64rem (1024px)  | laptops / desktops           |
| `xl-desktop` | 90rem (1440px)  | large / wide desktops        |

Orientation is `matchMedia('(orientation: portrait)')`. Segments come from the
Viewport Segments media features, feature-detected (absent on most engines →
treated as a single segment).

### 2.2 Proposed API — `@kerfjs/ui/device-class`

Reactive, signals-based (kerf has no hooks; a device class is a
`ReadonlySignal`, not a `useX`):

```ts
import { deviceClass, type DeviceClass } from "@kerfjs/ui/device-class";

const device = deviceClass(); // ReadonlySignal<DeviceClass>

interface DeviceClass {
  size: "xs-mobile" | "mobile" | "tablet" | "desktop" | "xl-desktop";
  orientation: "portrait" | "landscape";
  segments: number; // horizontal viewport segments, ≥ 1
  verticalSegments: number; // ≥ 1
  // Convenience predicates for the common queries:
  atLeast(size): boolean; // e.g. device.value.atLeast('tablet')
  handset: boolean; // size ∈ {xs-mobile, mobile}
  compact: boolean; // handset || (tablet && portrait) — "one pane at a time"
}
```

- One shared set of `matchMedia` listeners backs every reader (created lazily,
  reference-counted, torn down when the last reader disposes) so N components do
  not install N listener sets.
- `deviceClass({ breakpoints })` accepts an override map; the defaults are also
  exposed as CSS custom properties (`--kui-bp-tablet`, …) so CSS media queries
  and the JS logic read the same numbers.
- A pure `classifyViewport(width, orientation, segments)` helper is directly
  unit-testable without a DOM, mirroring how `list-render-state.ts` reifies the
  reconciler's state machine.
- SSR: `deviceClass()` on the server resolves to a caller-supplied default class
  (default `desktop`/`landscape`/`1`) and hydrates to the real class on first
  client read.

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
and cross-fades the chrome, returning a disposer. Back is a delegated control;
the app's `onBack` pops its own signal. This replaces the earlier imperative
`navStack({ root }).push()` sketch.

```ts
const views = signal<NavStackView[]>([{ key: 'home', content: <HomeView/> }]);
// render: <NavStack id="nav" label="Detail flow" views={views.value} />
// once: const dispose = wireNavStack(root, { onBack: () => views.value = views.value.slice(0, -1) });
// push: views.value = [...views.value, { key: id, title: 'Detail', content: <DetailView id={id}/> }];
```

**Implementation:** ticket **NavStack layout**.

### 3.2 List-detail (split view) — `SplitView` (`@kerfjs/ui/split-view`)

Two panes — a list and a detail — side by side, with an **optionally resizable
separator** (with min/max limits). `SplitView` is
the public name (Apple's term), `ListDetail` documented as a synonym.

Responsive presentation (device-class driven):

- **desktop / xl-desktop / landscape tablet / multi-segment devices:** both panes
  visible, separator resizable within limits.
- **portrait tablet:** the detail is usually a full-screen (or near-full-screen)
  push over the list — i.e. the `SplitView` collapses to a `NavStack` (list →
  detail). This composition is explicit: on a compact class, `SplitView`
  delegates to an internal `NavStack`.
- **handset:** always collapsed to the `NavStack` form.
- **as a dialog:** on desktop it is an inline two-pane dialog; on portrait tablet
  it presents as a full-screen modal; on landscape tablet it covers a large
  fraction of the base app without necessarily going full screen.

Proposed shape:

```ts
splitView({
  list: () => <List/>,
  detail: (selection) => <Detail sel={selection}/>,
  resizable: { min: 220, max: 480 },   // omit → fixed separator
  collapseAt: 'compact',               // device-class predicate; default 'compact'
});
```

**Implementation:** ticket **SplitView (list-detail) layout**. Depends on
NavStack (it reuses it on compact classes).

### 3.3 Multi-panel / IDE — `Workbench` (`@kerfjs/ui/workbench`)

The "Xcode-like" layout: a **left rail**, a **right rail**, and a **bottom
drawer**, each independently **collapsible**, around a central work area. Any of
the three may be absent (a left-rail-only variant is common).

**Name.** Proposed **`Workbench`** — it reads as a tool/IDE workspace, does not
collide with the existing `TabBar`/`AppTab`/`ResizableRegion` vocabulary, and
avoids the PWA-loaded "app shell" term. Alternatives considered: `AppShell`
(overloaded with PWA shells), `PanelGroup` (too generic), `IdeLayout`
(product-specific), `Studio`. **Open decision — the maintainer may veto the
name; §7.**

- Rails collapse with the **instant-width / sliding-content** animation proven in
  `~/Documents/hotsheet2`'s `app-shell.css` and now in the kerf UX demo catalog
  sidebar (KF-7QKJRK): the panel's grid column snaps instantly (one reflow) while
  its fixed-width content slides via a composited `transform`, clipped by the
  shell's overflow — never a per-frame width animation. `Workbench`
  **generalizes the KF-7QKJRK demo CSS** into a reusable component; the demo
  sidebar can later adopt it.
- Rails/drawer are `ResizableRegion`s with the collapse animation layered on.
- Appropriate for **desktop-size devices**. On smaller classes the guidance is to
  present the rails' contents through a different layout (a `NavStack` or overlay
  drawers), not to shrink the three-panel shell.

Proposed shape:

```ts
workbench({
  leftRail:  { content: () => <Nav/>,       collapsible: true,  resizable: { min: 200, max: 360 } },
  rightRail: { content: () => <Inspector/>, collapsible: true },
  bottomDrawer: { content: () => <Console/>, collapsible: true },
  main: () => <Editor/>,
});
// handle.left.collapsed / .toggle(); same for right, bottom
```

**Implementation:** ticket **Workbench (multi-panel) layout**.

### 3.4 Bottom tab scaffold — `TabScaffold` (`@kerfjs/ui/tab-scaffold`)

A mobile-first, iOS-like **bottom tab bar** switching between major app sections,
where **each tab owns its own `NavStack`** (switching tabs preserves each tab's
stack). Distinct from the existing document-oriented, reorderable `TabBar`; the
name `TabScaffold` (with a `BottomTabBar` sub-part) keeps them separate. **Open
decision — name; §7.**

- Bottom tab bar respects safe-area insets and reduced motion.
- On larger classes the guidance is to promote the tab set to a `Workbench` left
  rail or a persistent sidebar rather than keep a bottom bar.

Proposed shape:

```ts
tabScaffold({
  tabs: [
    { id: 'home', label: 'Home', icon: Home, stack: () => <HomeRoot/> },
    { id: 'search', label: 'Search', icon: Search, stack: () => <SearchRoot/> },
  ],
  active: activeSignal, // controlled; app owns selection
});
```

**Implementation:** ticket **TabScaffold (bottom tabs) layout**. Depends on
NavStack.

### 3.5 Standalone collapsible panel — `CollapsiblePanel` + `wireSidebar` (`@kerfjs/ui/collapsible-panel`, `@kerfjs/ui/wire-sidebar`)

A single collapsible **side rail or bottom drawer** for apps that want one panel
outside the full `Workbench` shell. `CollapsiblePanel({ id, side, collapsed?,
size? })` reuses the §3.3 instant-size/sliding-content collapse for a `'left'` /
`'right'` rail or a `'bottom'` drawer; `CollapsiblePanelToggle` +
`collapsiblePanelToggleIcon` are the standard toggle affordance and per-side icon
convention (`PanelLeft*` / `PanelRight*` / `PanelBottom*`). `wireSidebar(root, {
panels, deviceClass?, storage? })` adds the semantics: toggle delegation with
focus restore, focus-into on open, a compact overlay (dismissable backdrop +
Escape + Tab focus trap, driven by a §2 `deviceClass()` signal), and a per-panel
persistence hook. The app owns each `collapsed` signal, the panels, sizes, and
content; drag-resize composes `ResizableRegion`. Subpath-only with a companion
CSS import. See [`ui/docs/collapsible-panel.md`](../../ui/docs/collapsible-panel.md).

**Implementation:** shipped (KF-T17Q1X). UX-demo recipe (the "Collapsible sidebar"
recipe: a left rail + bottom drawer with toggles, compact overlay, and persistence)
and three-engine Playwright coverage of collapse/expand, focus move/restore, the
compact overlay + Escape/backdrop dismiss, and Tab trap shipped in KF-JP6KVY
(`ui/tests/browser/collapsible-sidebar-recipe.spec.ts`). The whole-screen layouts'
own recipes + e2e remain pending.

## 4. Responsive presentation matrix

The rule each layout encodes, summarized (`compact` = handset or portrait
tablet — "one pane at a time"):

| Layout                | handset                            | portrait tablet                 | landscape tablet / multi-segment           | desktop+                                |
| --------------------- | ---------------------------------- | ------------------------------- | ------------------------------------------ | --------------------------------------- |
| `NavStack`            | stack                              | stack                           | stack                                      | stack (or one column of a larger shell) |
| `SplitView`           | → NavStack                         | → NavStack (full-screen detail) | two panes (detail may not be full-screen)  | two panes, resizable                    |
| `Workbench`           | not recommended → NavStack/overlay | rails as overlay drawers        | left rail inline; right/bottom as overlays | full three-panel                        |
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

Still open (follow-up, not blocking): the UX-demo recipes + three-engine
Playwright coverage for the layouts, and whether to promote them into the
machine-readable component catalog (they currently ship as non-barrel,
manual-CSS subpaths, which the catalog gates do not require).

These are recorded on the implementation tickets so they are resolved as each
lands rather than blocking the design.

## 8. Decomposition

Implementation is sequenced; each ticket ships its component + CSS + unit and
three-engine Playwright coverage + a UX-demo recipe + consumer docs
(`ui/docs/`), and updates the machine-readable catalog and AI catalog.

1. **Device-class foundation** — `@kerfjs/ui/device-class` (§2). Blocks all
   others.
2. **NavStack layout** (§3.1). Blocks SplitView and TabScaffold.
3. **SplitView / list-detail layout** (§3.2).
4. **Workbench / multi-panel layout** (§3.3); generalizes the KF-7QKJRK sidebar
   animation.
5. **TabScaffold / bottom-tabs layout** (§3.4).
6. **AI layout-selection guidance** (§5) — decision matrix into `ui/ai/skill.md`,
   `ui/llms.txt`, decision-guidance, and consumer docs.

When the epic ships, flip this doc's status to **Shipped**, add it to the
`CLAUDE.md` docs reading order, and update
[`docs/ai/requirements-summary.md`](ai/requirements-summary.md).
