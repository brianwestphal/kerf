# Tab scaffold

`@kerfjs/ui/tab-scaffold` is a mobile-first, iOS-like bottom tab bar that switches
between major app sections, where **each tab keeps its own content mounted** —
usually a `NavStack`, so each tab's stack and scroll survive a switch. One of the
opt-in app layouts (see [`../../docs/23-app-layouts.md`](../../docs/23-app-layouts.md)).
It is distinct from `TabBar` (document-oriented, reorderable strips).

```ts
import { TabScaffold } from "@kerfjs/ui/tab-scaffold";
import { wireTabScaffold } from "@kerfjs/ui/wire-tab-scaffold";
import "@kerfjs/ui/tab-scaffold.css";
```

## Controlled selection

The app owns the active tab (a signal); `TabScaffold` renders every tab's scene
(only the active one visible) plus the bottom bar, and `wireTabScaffold` reports
clicks.

```tsx
const active = signal("home");

<TabScaffold
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
const dispose = wireTabScaffold(root, {
  onSelect: (id) => {
    active.value = id;
  },
});
```

Each `TabScaffoldTab` has an `id`, `label`, optional `icon`, optional `badge`
and `badgeLabel` (see [Tab badges](#tab-badges)), and `content`. The
bottom bar paints through the home-indicator safe area and pads for it and for
the side insets, while each scene pads for the top and side insets (a scene
whose only child is a `NavStack` or `Pane` lets that child own them; see
[Choosing an app layout › Safe areas](app-layouts.md#safe-areas)). The bar keeps 44px targets. Its single-line labels preserve their full line box and
truncate horizontally with an ellipsis when a destination name exceeds its
share of the bar. On larger device classes, promote the tab set to a
`Workbench` rail or a persistent sidebar instead of a bottom bar.

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
