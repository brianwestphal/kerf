# Animate list changes with document View Transitions

`each()` and `bindList()` update synchronously when their source changes. An app
can opt into the browser's document View Transition around the **source write**.
Kerf does not start, name, or style transitions. This recipe is for ordinary,
non-virtualized lists; the [design decision](view-transitions-design.md) explains
the timing and scope.

## Render rows with stable names

Use a stable, CSS-safe row ID and prefix it with a list ID. The resulting
`view-transition-name` must be unique across the whole document in each
snapshot, including sibling and nested lists. Keep `data-key` for Kerf's DOM
identity; the CSS name serves the browser's snapshot matching.

```tsx
import { each, mount, signal } from "kerfjs";

type Row = { id: "a" | "b" | "c"; label: string };
const rows = signal<Row[]>([
  { id: "a", label: "Alpha" },
  { id: "b", label: "Beta" },
  { id: "c", label: "Gamma" },
]);

mount(root, () => (
  <ul class="tasks">
    {each(rows.value, (row) => (
      <li data-key={row.id} class="task-row"
          style={`--row-vt-name: vt-tasks-${row.id}`}>
        {row.label}
      </li>
    ))}
  </ul>
));
```

The same row naming works with `each(arraySignalRows, render)` and either
`bindList()` source path. For `bindList()`, set the property on the rendered
element:

```ts
import { bindList } from "kerfjs/list";

bindList(listElement, rows, {
  key: (row) => row.id,
  render: (row) => {
    const li = document.createElement("li");
    li.className = "task-row";
    li.style.setProperty("--row-vt-name", `vt-tasks-${row.id}`);
    li.textContent = row.label;
    return li;
  },
});
```

For arbitrary IDs, map them to unique CSS identifiers before constructing
names. Do not use array indexes: they change on reorder. A second list should
use another prefix, such as `vt-archive-`.

## Own the motion in CSS

```css
.task-row { view-transition-name: var(--row-vt-name); }

/* Prevent unnamed page content from flashing over the named rows. */
::view-transition-old(root),
::view-transition-new(root) { animation: none; }

/* Replace the selector's names with this list's known names. */
::view-transition-group(vt-tasks-a),
::view-transition-group(vt-tasks-b),
::view-transition-group(vt-tasks-c) { animation-duration: 350ms; }

::view-transition-old(vt-tasks-a),
::view-transition-old(vt-tasks-b),
::view-transition-old(vt-tasks-c) { animation: 350ms ease-out both row-leave; }

::view-transition-new(vt-tasks-a),
::view-transition-new(vt-tasks-b),
::view-transition-new(vt-tasks-c) { animation: 350ms ease-out both row-enter; }

@keyframes row-enter { from { opacity: 0; } to { opacity: 1; } }
@keyframes row-leave { from { opacity: 1; } to { opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) { animation-duration: 0.01ms !important; }
}
```

This CSS pairs surviving rows for reorder motion and gives inserted or removed
rows a one-sided fade. Replace the finite example selectors with the row names
your app actually renders. Inspect your own page's `root` snapshot and adjust
the CSS if surrounding content also changes.

## Wrap the action, not the list reconciler

```ts
function reorder(): void {
  rows.value = [rows.value[2]!, rows.value[0]!, rows.value[1]!];
}

if (document.startViewTransition &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.startViewTransition(reorder);
} else {
  reorder();
}
```

An `arraySignal` action such as `rows.move(2, 0)` can replace the assignment.
Use one callback to mutate all affected sources when sibling or nested lists
change together. The browser takes its old snapshot before running the callback;
therefore the state write happens later than a direct call. Once the callback
runs, Kerf's signal, mount, and `bindList()` updates remain synchronous. If the
write itself must happen immediately, call the action directly.

For rapid actions, keep data updates in order and do not wait for
`transition.finished` to apply a newer edit. A small app-level coordinator can
queue actions that arrive while the old snapshot is pending, flush them inside
the callback, and apply further actions directly while animation runs:

```ts
let pendingCapture = false;
let active: ViewTransition | undefined;
const queued: Array<() => void> = [];

function change(update: () => void): void {
  if (!document.startViewTransition ||
      matchMedia("(prefers-reduced-motion: reduce)").matches) {
    update();
  } else if (pendingCapture) {
    queued.push(update);
  } else if (active) {
    update();
  } else {
    pendingCapture = true;
    const transition = document.startViewTransition(() => {
      try {
        update();
        for (const next of queued.splice(0)) next();
      } finally {
        pendingCapture = false;
      }
    });
    active = transition;
    const clear = () => { if (active === transition) active = undefined; };
    void transition.finished.then(clear, clear);
  }
}
```

Call `change(reorder)` for a user action. This coordinator prioritizes the
latest data over uninterrupted animation; a new edit during motion can cut the
old visual short. It does not replace a pending callback with a direct write,
which would change the old snapshot. Do not use `skipTransition()` to cancel an
update: it skips motion but still invokes the callback.

The [browser test](../tests/browser/view-transitions.spec.ts) covers both
`each()` sources, `bindList()` snapshot and patch paths, reorder, insert,
remove, empty/refill, rapid edits, nested and sibling lists, fallback,
reduced motion, and focus retention. Virtualized scrolling and dynamic row-name
rule generation need separate app-specific validation.
