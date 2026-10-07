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
`chromeDividers`, and `appearance` to the Pane. Without those fields, the view
keeps its simple direct scroll area. Use `pane: { appearance: "sunken" }` for a
lowered scrolling work surface.
The back control appears automatically once the stack has more than one entry;
`wireNavStack`'s `onBack` is where the app pops its own signal.

See [Lowered work surfaces](layout.md#lowered-work-surfaces) for nested Pane
and layout content.

## The top toolbar

The top chrome is a real `Toolbar`, so it follows the same zone,
group, and responsive rules as every other toolbar. Its leading zone holds the
back control (a borderless `ToolbarControlGroup`, shown once the stack has
depth), then `toolbar.leading`, then `toolbar.title` as a `ToolbarText`.
`toolbar.center` fills the center zone and `toolbar.trailing` fills the
trailing zone. Give each zone `ToolbarControlGroup`s or `ToolbarText`,
as in any toolbar.

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
  `ToolbarText` size, default `large`), and `headingLevel` (expose the title as
  a heading; default a plain span). The defaults keep the stack's own chrome:
  no divider, the standard Toolbar height (a 44px control band with 8px above and below), and the top and side safe-area edges
  claimed.
- `backIcon` replaces the default chevron-left icon. `backText` adds visible
  text beside it (for example, the previous view's title); visible text names
  the control, so `backLabel` applies only to the icon-only control.

`panelToggle` supplies a persistent final group in the trailing zone of every
view's top toolbar. `Workbench` uses it for a navigation panel's standard
collapse toggle; the active view still owns the preceding toolbar groups.

The catalog's **Configured toolbar** example shows these together: a level-2
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
