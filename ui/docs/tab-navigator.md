# Tab navigator

`@kerfjs/ui/tab-navigator` is a mobile-first, iOS-like bottom tab bar that switches
between major app sections, where **each tab keeps its own content mounted** —
usually a `NavStack`, so each tab's stack and scroll survive a switch. One of the
opt-in app layouts (see [`../../docs/23-app-layouts.md`](../../docs/23-app-layouts.md)).
It is distinct from `TabBar` (document-oriented, reorderable strips).

## Migration from TabScaffold

The deprecated `TabScaffold` API was removed during the 5.0 beta series. Replace names and import
paths when updating an app:

| Previous                                                                           | Current                                                                                |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `TabScaffold`, `TabScaffoldTab`, `TabScaffoldProps` from `@kerfjs/ui/tab-scaffold` | `TabNavigator`, `TabNavigatorTab`, `TabNavigatorProps` from `@kerfjs/ui/tab-navigator` |
| `wireTabScaffold`, `WireTabScaffoldOptions` from `@kerfjs/ui/wire-tab-scaffold`    | `wireTabNavigator`, `WireTabNavigatorOptions` from `@kerfjs/ui/wire-tab-navigator`     |
| `@kerfjs/ui/tab-scaffold.css`                                                      | `@kerfjs/ui/tab-navigator.css`                                                         |

Props, rendered DOM classes, data attributes, and wiring behavior are unchanged.
The old JS and CSS subpaths are no longer exported. Import the new CSS path
when your build does not use the package's `browser` condition.

```ts
import { TabNavigator } from "@kerfjs/ui/tab-navigator";
import { wireTabNavigator } from "@kerfjs/ui/wire-tab-navigator";
```

In a browser bundler that honors the `browser` export condition (Vite, esbuild, and
webpack do by default), the import above also
loads TabNavigator's stylesheet and those of the components it renders internally
(the tab `Badge`). Without that condition, import the manual stylesheets instead:
`@kerfjs/ui/tab-navigator.css` plus those components' CSS, or `@kerfjs/ui/styles.css`.

## Controlled selection

The app owns the active tab (a signal); `TabNavigator` renders every tab's scene
(only the active one visible) plus the bottom bar, and `wireTabNavigator` reports
clicks.

```tsx
const active = signal("home");

<TabNavigator
  id="app"
  label="Sections"
  active={active.value}
  tabs={[
    { id: "home", label: "Home", icon: <HomeIcon />, content: <HomeStack /> },
    {
      id: "search",
      label: "Search",
      icon: <SearchIcon />,
      content: <SearchStack />,
    },
  ]}
/>;

// once, after first render:
const dispose = wireTabNavigator(root, {
  onSelect: (id) => {
    active.value = id;
  },
});
```

Each `TabNavigatorTab` has an `id`, `label`, optional `icon`, optional `badge`
and `badgeLabel` (see [Tab badges](#tab-badges)), and `content`. The
bottom bar paints through the home-indicator safe area and pads for it and for
the side insets, while each scene pads for the top and side insets (a scene
whose only child is a `NavStack` or `Pane` lets that child own them; see
[Choosing an app layout › Safe areas](app-layouts.md#safe-areas)). The bar keeps 44px targets. Its single-line labels preserve their full line box and
truncate horizontally with an ellipsis when a destination name exceeds its
share of the bar. On larger device classes, promote the tab set to a
`Workbench` rail or a persistent sidebar instead of a bottom bar.

Set `deepInset: true` on a plain tab scene to add 8px of padding on every side
of its scrolling content, giving ordinary content items a 16px inline edge inset.
The default is `false`. A scene whose only child is a `Pane` or layout lets
that child own its content gutter: for a nested `NavStack`, set
`pane: { deepInset: true }` on its views instead. The navigator bar and a
stack's top toolbar remain full width.

A plain scene can opt into `tabIndex: 0` to become a Tab stop or `tabIndex: -1`
to accept programmatic focus. `outlined: true` keeps the standard focus ring
visible independently of focus, for example for a drop target. Keyboard focus
also draws that ring. Only the active scene receives the requested tab index or
outline; inactive scenes stay out of the Tab order and hide the outline. A
scene containing a `Pane` or another layout should put these options on its
inner focus owner instead. A focusable scene is a tabpanel named by its tab label.

## A NavStack with a top toolbar and Pane

Put the `NavStack` directly in a tab's `content`. Give each view a structured
`toolbar` and `pane` configuration. Leave `bottomToolbar` off both the views
and the stack: the navigator's tab bar is the only bottom chrome. The view's
Pane owns scrolling, while the stack keeps its toolbar above it and the
navigator keeps the tab bar below it.

```tsx
import { List } from "@kerfjs/ui/list";
import { ListItem } from "@kerfjs/ui/list-item";
import { NavStack, type NavStackView } from "@kerfjs/ui/nav-stack";

const projectViews: NavStackView[] = [
  {
    key: "projects",
    toolbar: { title: "Projects" },
    pane: { appearance: "sunken" },
    content: <List><ListItem label="Project Atlas" /></List>,
  },
];

<TabNavigator
  id="app"
  label="Sections"
  active={active.value}
  tabs={[
    {
      id: "projects",
      label: "Projects",
      content: (
        <NavStack
          id="projects-stack"
          label="Projects navigation"
          views={projectViews}
        />
      ),
    },
    { id: "search", label: "Search", content: <SearchScene /> },
  ]}
/>;
```

The app owns each stack's view array and the navigator's active tab. Call
`wireTabNavigator` for tab selection and `wireNavStack` for back navigation
and transitions, each on its own component root. Push a detail by appending
a view with its own `toolbar` and `pane`; switching tabs keeps that view
mounted. The catalog's **NavStack inside a tab** example demonstrates the
push, tab switch, and return flow.

Set a tab's `appearance: "sunken"` when its scene owns scrolling and should
paint the lowered surface behind short or long content. For a scene whose
only child is a `Pane` or `NavStack`, set appearance on that child's scroll
owner. See [Lowered work surfaces](layout.md#lowered-work-surfaces).

## Scroll divider

The bar has no permanent top border. With `wireScrollDividers(appRoot)`
installed (see [Layout › Scroll dividers](layout.md#scroll-dividers)), it shows
a line along its top edge only while the active scene's content continues below
it — not at the scroll end and not when the content fits. The line keys on
whatever actually scrolls in the scene: the scene itself or, through a sole
child, a `NavStack`'s active view or a `Pane`'s content. A `NavStack` with its
own bottom toolbar sits between them, so that toolbar's line applies instead.
The line is the bar's always-present 1px top border, colored only while shown,
so it never moves the bar or a tab.

`chromeDividers` configures it, with the same values as a `Pane`'s: `scroll`
(the default) follows the scroll state and draws nothing until the wiring runs;
`always` keeps the line, with or without the wiring; `none` drops it even when
the wiring reports content below.

## Tab badges

Give a tab a `badge` (a count or short string such as `3`, `"99+"`, or
`"New"`) to show the iOS tab-bar badge: a compact, solid `danger` `Badge` at the
top-trailing corner of the tab's icon, growing outward as the text lengthens
(without an icon it sits above the label). The badge is decorative
(`aria-hidden`); its meaning reaches assistive technology through `badgeLabel`,
which the tab folds into its accessible name as `"<label>, <badgeLabel>"`:

```tsx
{
  id: "inbox",
  label: "Inbox",
  icon: <LucideIcon icon={Inbox} name="inbox" />,
  badge: unread.value,
  badgeLabel: `${unread.value} unread`,
  content: <InboxStack />,
}
```

`badgeLabel` defaults to the badge text itself, so supply a localized phrase
whenever the bare text would be ambiguous. Omitting `badge` (or passing an
empty string or a non-finite number) renders no badge and leaves the tab's name
as its label; `0` renders, so pass `undefined` when a count should disappear.
Keep the text short — clamp large counts (`"99+"`) in the app. The tone follows
the platform convention and is fixed; do not restyle the badge.

### Dot badges

For new content without a count, pass `badge: true`. The tab shows the iOS
tab-bar dot — an 8px solid `danger` `Badge` (`size="dot"`) centered on the
icon's top-trailing corner (above the label without an icon). A dot has no
text to fall back on, so `badgeLabel` is required by the types:

```tsx
{
  id: "feed",
  label: "Feed",
  icon: <LucideIcon icon={Rss} name="rss" />,
  badge: hasNewPosts.value ? true : undefined,
  badgeLabel: "New activity",
  content: <FeedStack />,
}
```

The tab's accessible name becomes `"Feed, New activity"`. Pass `undefined` to
clear the dot; `false` is not a badge value.
