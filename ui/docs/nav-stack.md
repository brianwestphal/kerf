# Navigation stack

`@kerfjs/ui/nav-stack` is an iOS-style push/pop navigation stack: views slide in
and out over one another while the top chrome settles. A **single-pane layout is
a `NavStack` with one entry**. It is one of the opt-in app layouts (see
[`../../docs/23-app-layouts.md`](../../docs/23-app-layouts.md)).

Import the component and its companion stylesheet:

```ts
import { NavStack, type NavStackView } from "@kerfjs/ui/nav-stack";
import { wireNavStack } from "@kerfjs/ui/wire-nav-stack";
import "@kerfjs/ui/nav-stack.css";
```

## State lives in the app

Like every `@kerfjs/ui` component, `NavStack` is declarative: the app owns the
stack as a `signal<NavStackView[]>`, `NavStack({ views })` renders it, and
`wireNavStack` animates the transitions.

```tsx
const views = signal<NavStackView[]>([
  {
    key: "inbox",
    title: "Inbox",
    content: <InboxView />,
    bottomToolbar: <InboxStatus />,
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
  { key: id, title: "Message", content: <MessageView id={id} /> },
];
```

`NavStack` renders every entry stacked, the last one active and the rest kept
mounted (so their DOM state survives) but hidden. Each entry carries a
`key` (stable identity), `content`, an optional `title`, optional per-view
`toolbar` actions, and an optional per-view `bottomToolbar`. The component-level
`bottomToolbar` remains a persistent fallback for views that do not provide one.
The back control appears automatically once the stack has more than one entry;
`wireNavStack`'s `onBack` is where the app pops its own signal.

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

## Transitions

`wireNavStack(root, { onBack, duration? })` observes the rendered stack and
animates each change: a pushed view slides in from the trailing edge; a popped
view slides back off it over the revealed view; and snapshots of the previous
top and bottom chrome cross-fade into the active view's chrome. Focus moves to
the new top view independently of animation duration. It returns a disposer.
The animation honors `prefers-reduced-motion` (transitions collapse to instant)
and `duration: 0` disables it. Applicable at every device size and inside
dialogs.
