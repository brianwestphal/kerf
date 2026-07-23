---
title: Getting started
description: From empty file to a working reactive app — watch the whole loop, then run it yourself in two commands.
---

Here's the entire development loop — write a component, run the dev server, click around, edit, see it update — in forty seconds:

![Animated coding session: a counter component is typed into an editor, the dev server starts in a terminal, the running app is clicked in a browser, then the code is edited into a todo list and the browser picks the change up live](/kerf/demos/getting-started.svg)

Everything in that session is the whole story: plain TypeScript + JSX, your existing dev server (Vite here — anything that does JSX works), and a browser. No framework CLI, no compiler plugin, no devtools extension required.

## Run it yourself

```bash
npm install kerfjs
```

Point your `tsconfig.json` at kerf's JSX runtime:

```jsonc
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "kerfjs"
  }
}
```

And write the counter from the animation:

```tsx
import { signal, mount, delegate } from 'kerfjs';

const count = signal(0);
const root = document.getElementById('app')!;

mount(root, () => (
  <button class="btn" data-action="inc">
    Clicked {count} times
  </button>
));

delegate(root, 'click', '[data-action="inc"]', () => count.value++);
```

Three things to notice, because they're the whole mental model:

- **`{count}` is the signal itself, not `count.value`.** That makes it a *bound hole* — a click updates that one text node directly, with no render re-run. Values bind; structure re-renders.
- **`mount()` re-runs the render only when a signal it *read* changes.** This render reads nothing, so it runs exactly once.
- **`delegate()` is one listener on the root**, dispatched by selector — no per-element handlers, nothing to unbind when the DOM changes.

## Where to go next

- [Overview](/kerf/docs/overview/) — what kerf is, the architecture in one diagram.
- [Reactivity](/kerf/docs/reactivity/) — signals, computeds, effects, and fine-grained bindings.
- [Examples](/kerf/examples/complete/) — seven complete apps, from TodoMVC to a no-build poll served as raw source.
- [Coming from another framework?](/kerf/migrating/) — side-by-side translations from React, Vue, Svelte, and more.

Prefer no build step at all? The [`html` tagged template](/kerf/docs/jsx/#611-tagged-templates--kerfjshtml-no-build-step-at-all) gives you identical semantics from a plain `<script type="module">` — see the [live-poll example](/kerf/examples/complete/live-poll/), whose running source is exactly what its author wrote.
