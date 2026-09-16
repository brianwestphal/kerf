# Navigation stack

`@kerfjs/ui/nav-stack` is an iOS-style push/pop navigation stack: views slide in
and out over one another while the top chrome settles. A **single-pane layout is
a `NavStack` with one entry**. It is one of the opt-in app layouts (see
[`../../docs/23-app-layouts.md`](../../docs/23-app-layouts.md)).

Import the component and its companion stylesheet:

```ts
import { NavStack, type NavStackView } from '@kerfjs/ui/nav-stack';
import { wireNavStack } from '@kerfjs/ui/wire-nav-stack';
import '@kerfjs/ui/nav-stack.css';
```

## State lives in the app

Like every `@kerfjs/ui` component, `NavStack` is declarative: the app owns the
stack as a `signal<NavStackView[]>`, `NavStack({ views })` renders it, and
`wireNavStack` animates the transitions.

```tsx
const views = signal<NavStackView[]>([{ key: 'inbox', title: 'Inbox', content: <InboxView /> }]);

// render inside mount():
<NavStack id="mail" label="Mail" views={views.value} />;

// once, after first render:
const dispose = wireNavStack(root, { onBack: () => { views.value = views.value.slice(0, -1); } });

// push / pop by editing the signal:
views.value = [...views.value, { key: id, title: 'Message', content: <MessageView id={id} /> }];
```

`NavStack` renders every entry stacked, the last one active and the rest kept
mounted (so their DOM state and focus survive) but hidden. Each entry carries a
`key` (stable identity), `content`, an optional `title`, and optional per-view
`toolbar` actions. The back control appears automatically once the stack has more
than one entry; `wireNavStack`'s `onBack` is where the app pops its own signal.

## Transitions

`wireNavStack(root, { onBack, duration? })` observes the rendered stack and
animates each change: a pushed view slides in from the trailing edge; a popped
view slides back off it over the revealed view. It returns a disposer. The
animation honors `prefers-reduced-motion` (transitions collapse to instant) and
`duration: 0` disables it. Applicable at every device size and inside dialogs.
