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

Each `TabScaffoldTab` has an `id`, `label`, optional `icon`, and `content`. The
bottom bar respects the home-indicator safe area (`env(safe-area-inset-bottom)`)
and keeps 44px targets. On larger device classes, promote the tab set to a
`Workbench` rail or a persistent sidebar instead of a bottom bar.
