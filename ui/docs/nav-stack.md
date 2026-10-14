# Navigation stack

`@kerfjs/ui/nav-stack` is an iOS-style push/pop navigation stack: views slide in
and out over one another while the top chrome settles. A **single-pane layout is
a `NavStack` with one entry**. It is one of the opt-in app layouts (see
[`../../docs/23-app-layouts.md`](../../docs/23-app-layouts.md)).

Import the component and its wiring helper:

```ts
import { NavStack, type NavStackView } from "@kerfjs/ui/nav-stack";
import { wireNavStack } from "@kerfjs/ui/wire-nav-stack";
```

In a browser bundler that honors the `browser` export condition (Vite, esbuild, and
webpack do by default), the import above also
loads NavStack's stylesheet and those of the components it renders internally
(`Toolbar`, `ToolbarControlGroup`, `ToolbarText`, `Pane`, `List`, `LucideIcon`). Without that condition, import the manual stylesheets instead:
`@kerfjs/ui/nav-stack.css` plus those components' CSS, or `@kerfjs/ui/styles.css`.

## State lives in the app

Like every `@kerfjs/ui` component, `NavStack` is declarative: the app owns the
stack as a `signal<NavStackView[]>`, `NavStack({ views })` renders it, and
`wireNavStack` animates the transitions.

```tsx
const views = signal<NavStackView[]>([
  {
    key: "inbox",
    toolbar: { title: "Inbox" },
    content: <InboxView />,
    bottomToolbar: {
      label: "Inbox status",
      leading: <InboxStatus />,
    },
  },
]);

// render inside mount():
<NavStack id="mail" label="Mail" views={views.value} />;

// once, after first render:
const dispose = wireNavStack(root, {
  onBack: () => {
    views.value = views.value.slice(0, -1);
  },
});

// push / pop by editing the signal:
views.value = [
  ...views.value,
  { key: id, toolbar: { title: "Message" }, content: <MessageView id={id} /> },
];
```

`NavStack` renders every entry stacked, the last one active and the rest kept
mounted (so their DOM state survives) but hidden. Each entry carries a
`key` (stable identity), `content`, an optional `toolbar` object with `title`,
`leading`, `center`, and `trailing` groups, and an optional structured
`bottomToolbar`. The component-level structured
`bottomToolbar` remains a persistent fallback for views that do not provide one.
Each view can also provide `header`, `footer`, `headerList`, `footerList`, and
`pane` configuration, as a `WorkbenchStaticPanel` does. With any of these,
the view renders a `Pane`: its header and footer stay pinned around the view's
scrolling content, and slide with that view during navigation. The header and
footer list configuration forwards to their `List`s; `pane` forwards
`contentElement`, `contentLabel`, `separators`, `safeAreaEdges`,
`chromeDividers`, `appearance`, `deepInset`, `scrollClearance`, `headerPresentation`, `tabIndex`,
and `outlined` to the Pane. Without those fields, the view
keeps its simple direct scroll area. Use `pane: { appearance: "sunken" }` for a
lowered scrolling work surface.
The back control appears automatically once the stack has more than one entry;
`wireNavStack`'s `onBack` is where the app pops its own signal.

See [Lowered work surfaces](layout.md#lowered-work-surfaces) for nested Pane
and layout content.

## The top toolbar

The top chrome is a real `Toolbar`, so it follows the same zone,
group, and responsive rules as every other toolbar. Its leading zone holds the
back control (a contained, bordered `ToolbarControlGroup`, shown once the stack has
depth), then `toolbar.leading`. `toolbar.trailing` fills the trailing zone.
Give each zone `ToolbarControlGroup`s or `ToolbarText`, as in any toolbar.

Where `toolbar.title` goes depends on the back control:

- **At the root** (no back control) the title is a filling `ToolbarText` at
  the end of the leading zone, so it reads left-aligned.
- **Once the stack has depth**, the title is the center zone's only child and
  the toolbar is `centerAlign="balanced"`, like a platform navigation bar. The
  title sits on the bar's midpoint while the sides leave room, moves away from
  a wider side when they do not, and truncates with an ellipsis before it
  reaches the back control or a trailing group. It keeps the root title's
  full-strength text color at its smaller size. This overrides a configured
  `centerAlign`, which applies to view-owned center content.
- **A view that sets `toolbar.center`** owns the center zone, so its title
  stays left-aligned in the leading zone at any depth.

Configure the toolbar with `toolbarConfig` instead of styling it:

```tsx
<NavStack
  id="mail"
  label="Mail"
  views={views.value}
  backText={previousTitle}
  toolbarConfig={{
    headingLevel: 1,
    titleSize: "xlarge",
    dividerSides: "b",
    responsive: "wrap",
  }}
/>
```

- Each view's `toolbar` can forward the `Toolbar` configuration (`dividerSides`,
  `centerAlign`, `responsive`, `responsiveAt`, `safeAreaEdges`) and its `label`,
  `titleSize`, and `headingLevel`. A view value overrides the corresponding
  `toolbarConfig` default. Its `bottomToolbar` forwards the same `Toolbar`
  configuration and has a required accessible `label`.
- `toolbarConfig` supplies stack-wide defaults (`dividerSides`,
  `centerAlign`, `responsive`, `responsiveAt`, `safeAreaEdges`) and adds
  `label` (the toolbar's accessible name), `titleSize` (the title's
  `ToolbarText` size; default `xlarge` at the root, where the title is the page
  heading, and `large` once a back control shares the bar; a Workbench panel's
  stack keeps `large` at every depth), and `headingLevel` (expose the title as
  a heading; default a plain span). The defaults keep the stack's own chrome:
  no divider, the standard Toolbar height (a 44px control band with 8px above and below), and the top and side safe-area edges
  claimed.
- `backIcon` replaces the default chevron-left icon. `backText` adds visible
  text beside it (for example, the previous view's title); visible text names
  the control, so `backLabel` applies only to the icon-only control.

`panelToggle` supplies a persistent final group in the trailing zone of every
view's top toolbar. `Workbench` uses it for a navigation panel's standard
collapse toggle; the active view still owns the preceding toolbar groups.

The catalog's **Configured Toolbar** example shows these together: a level-2
heading title over a bottom divider, leading and center groups on the root
view, a trailing group on the pushed view, and `backText` set to the previous
view's title.

Focus follows the controlled stack automatically. On push, `wireNavStack`
remembers the focused descendant of the departing view and moves focus into the
new top view. On pop it restores that exact descendant when it still exists. A
new view prefers a descendant marked `data-nav-focus`, then its first enabled
focusable descendant, and finally the view container itself. Use
`data-nav-focus` for a heading or primary control when DOM order is not the best
initial reading position; it may use `tabindex="-1"` for programmatic focus.
When a remembered control was removed during the controlled rerender, the same
fallback order applies. Disposing the helper stops future transitions and
cleans up any temporary fallback `tabindex` it added.

## Separators and scroll dividers

`separator="auto"` (the default) draws a line under the top chrome and above
the optional bottom toolbar when the active view's Pane has
`appearance="sunken"`, even if its content fits and no scroll wiring runs. The
line follows the active view on push and pop. Set `separator="hidden"` to hide
both stack-owned edges, including lines requested by `chromeDividers`. The
existing 1px edges change color without moving the content. A view's own Pane
header and footer separators remain controlled by that Pane.

For a flat active view, the stack draws no permanent line. With
`wireScrollDividers(appRoot)` installed (see
[Layout › Scroll dividers](layout.md#scroll-dividers)), the top chrome shows a
line along its bottom edge only while the active view's content is scrolled
beneath it, and the bottom toolbar a line along its top edge only while more
content lies below it — neither when the content fits. The line follows the
active view across a push or pop. The chrome's line is overlaid on its bottom
edge and the bottom toolbar's is its always-present 1px top border, colored
only while shown, so neither ever moves the chrome or the content. When the view's only child is a `Pane`,
the line keys on whichever actually scrolls — the view, or the Pane's content —
and a Pane header or footer draws its own boundary instead. An explicit
`toolbarConfig.dividerSides` still draws a permanent Toolbar edge.

`chromeDividers` configures both lines for flat views, with the same values as a `Pane`'s:
`scroll` (the default) follows the scroll state above and draws nothing until
the wiring runs; `always` keeps both lines, with or without the wiring; `none`
drops them even when the wiring reports scroll state. A sunken active Pane still
shows the separator unless `separator="hidden"`. This option does not change the
top Toolbar's own `dividerSides`.

```tsx
<NavStack id="settings" label="Settings" views={views.value} chromeDividers="always" />
```

## Background colors

`background` paints the stack, its docked chrome and bottom toolbar, and every
view in an app-chosen color from `@kerfjs/ui/css-values` instead of the
surface. One view's own color goes in its `pane: { background }`, which paints
over the stack's. Overlay chrome keeps the chrome material. The app keeps text
at AA over the color; forced colors paint `Canvas`. See
[Background colors](layout.md#background-colors).

```tsx
<NavStack id="music" label="Music" views={views.value} background={uiColor("surface-raised")} />
```

`tint={{ color, scheme }}` re-derives the stack's surface and text tokens from
an app color instead, so its chrome, views, and content all take on the color
with text kept at AA. See [Tinted surfaces](layout.md#tinted-surfaces).

## Overlay chrome

`chromePresentation="overlay"` lays the top chrome over the active view's top
edge, like an iOS navigation bar, instead of docking it above the view
(`"docked"`, the default). The chrome paints the shared chrome material,
`--kui-chrome-material` behind `--kui-chrome-material-filter`, so content
scrolls visibly, blurred, beneath it.

```tsx
<NavStack id="mail" label="Mail" views={views.value} chromePresentation="overlay" />
```

- **`wireNavStack` measures it.** The helper you already call for transitions
  reads the live chrome's border-box height with a `ResizeObserver`, publishes
  it on the stack root, and marks the root `data-chrome-overlay="measured"`.
  Only then does the chrome leave its band. Unwired, or with `hideToolbar`, the
  chrome stays docked, so it never covers content it has not measured. The
  measurement follows the chrome as its title wraps, text grows, or a pushed
  view changes its toolbar. A re-render that strips the measurement gets it
  back before paint.
- **Every view clears it automatically.** The measured height becomes the
  viewport's block-start edge context (`--kui-edge-inset-block-start`), the
  same context that carries safe areas. A plain view pads and scroll-pads by
  it, a sole `Pane` adds it to its content's (or its header's) block-start
  inset, and a nested layout hands it on. The first item rests just below the
  chrome, and anything focused or scrolled into view stops clear of it. No
  `scrollClearance` prop is involved, so a Pane that also opts into
  `scrollClearance` does not clear the chrome twice.
- **Safe area.** The chrome keeps claiming the top safe area: its toolbar pads
  for it while the material paints through it. The measured height already
  includes that padding, so views clear the chrome and the safe area exactly
  once.
- **Transitions.** Only the live chrome is measured, never a cross-fading
  copy. The copy keeps painting over the top edge with the same material while
  it fades, and the incoming view settles at the incoming chrome's clearance.
- **Classic scrollbars.** Where the active view's scroller (the view, or a
  sole header-less Pane's content) shows a classic, space-taking scrollbar,
  `wireNavStack` measures it and the chrome ends where its track begins, so
  the thumb and arrows stay visible and usable. An overlay scrollbar takes no
  space and passes beneath the material like the content.
- **Dividers.** With `wireScrollDividers`, the line under the chrome still
  appears only while content is scrolled beneath it.
- **Contrast.** The material keeps normal text at AA over any content. An
  untoned `ToolbarText` in the chrome lifts itself: its title takes the normal
  text color at every size and its `description` mixes the quiet color halfway
  toward it, and a default-tone `ToolbarControlGroup` takes the normal text
  color for its controls. Other quiet copy you place in the chrome has no such
  lift, so keep it in the view (see
  [Accessibility › Chrome material](accessibility.md#chrome-material)). The
  material turns opaque under `prefers-reduced-transparency`,
  `prefers-contrast: more`, or without `backdrop-filter`, and forced colors
  paint `Canvas` with a `CanvasText` bottom edge.

`SplitView`'s `compactStack.chromePresentation` and a Workbench navigation
panel's `navStack.chromePresentation` forward the same option.
`chromePresentation` governs only the top chrome; the bottom toolbar has its
own option below.

### Overlay bottom toolbar

`bottomToolbarPresentation="overlay"` does the same for the bottom toolbar,
like an iOS toolbar: it lies over the active view's bottom edge on the same
chrome material instead of docking below the view (`"docked"`, the default).
It is a separate prop, so either bar can be overlaid alone, and it mirrors
`Pane.headerPresentation` and `DialogSurface.footerPresentation` in naming one
edge.

```tsx
<NavStack
  id="mail"
  label="Mail"
  views={views.value}
  chromePresentation="overlay"
  bottomToolbarPresentation="overlay"
  bottomToolbar={{ label: 'Mail Actions', trailing: composeGroup }}
/>
```

- **`wireNavStack` measures it.** It reads the live bottom toolbar's
  border-box height (never a cross-fading copy's), publishes it on the stack
  root, and marks the root `data-bottom-toolbar-overlay="measured"`. Only then
  does the toolbar leave its band. Unwired, or while no bottom toolbar is
  shown (a view without one and no stack-level fallback), it stays docked. The
  measurement follows a view-owned toolbar as views push and pop, and a
  re-render that strips it gets it back before paint.
- **Every view clears it automatically.** The measured height becomes the
  viewport's block-end edge context (`--kui-edge-inset-block-end`). A plain
  view pads and scroll-pads by it, a sole `Pane` adds it to its content's
  block-end inset (or its footer's, so the footer rests just above the
  toolbar), and a nested layout hands it on. The last item rests just above
  the toolbar, and anything focused or scrolled into view stops clear of it.
- **Safe area.** The toolbar keeps claiming the bottom safe area (the home
  indicator), and the measured height includes it, so views clear both exactly
  once. Inside a `TabNavigator` scene the tab bar owns that edge, so the
  stack's toolbar sits just above the tab bar and counts no safe area.
- **Classic scrollbars and dividers.** The toolbar ends where a classic
  scrollbar's track begins (a sole Pane with a footer ends its scroller above
  the toolbar, so nothing needs leaving there). With `wireScrollDividers`, the
  toolbar's top line still appears only while more content lies below.
- **Contrast.** An untoned `ToolbarText` lifts itself as in the top chrome,
  and a default-tone `ToolbarControlGroup` in either overlaid bar takes the
  normal text color for its controls, so labels and icons keep AA over the
  content beneath. The material has the same opaque fallbacks; in forced
  colors the toolbar paints `Canvas` and its always-present 1px top border
  becomes a `CanvasText` edge, which the measurement includes.

`SplitView`'s `compactStack.bottomToolbarPresentation` and a Workbench
navigation panel's `navStack.bottomToolbarPresentation` forward it too.

## Safe areas

The stack paints through a device's unsafe areas. Its chrome pads for the top
and side insets, its bottom toolbar for the bottom and side insets, and each
view pads the remaining edges inside its scroller, so content scrolls under the
unsafe area but can always be scrolled clear. A view whose only child is a
`Pane` or layout lets that child own the insets. See [Choosing an app layout › Safe areas](app-layouts.md#safe-areas).

## Transitions

`wireNavStack(root, { onBack, duration? })` observes the rendered stack and
animates each change: a pushed view slides in from the trailing edge; a popped
view slides back off it over the revealed view; and snapshots of the previous
top and bottom chrome cross-fade into the active view's chrome. The preserved
underlying view remains visible during a push, while remaining inaccessible.
Starting transforms and opacity apply instantly before the transition begins.
A new navigation settles the previous transition and cancels its pending frames
and cleanup timers; disposal removes temporary copies and exiting views. Focus moves to
the new top view independently of animation duration. It returns a disposer.
The animation honors `prefers-reduced-motion` (transitions collapse to instant)
and `duration: 0` disables it. Applicable at every device size and inside
dialogs.
