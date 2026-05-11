# 5. Event delegation

Per-element `addEventListener` calls don't survive morph re-renders for nodes the diff inserts or rebuilds. The fix is delegation: bind one listener at the morph root and dispatch via `closest()`.

kerf ships two helpers — `delegate()` (which auto-promotes the well-known non-bubbling event types to capture phase under the hood) and `delegateCapture()` (the explicit-capture escape hatch) — plus one convention: `data-morph-skip` for subtrees neither helper should reach into.

## 5.1 The three-tier model

Almost every event you care about falls into one of three tiers.

### Tier 1 — `delegate()`

Default helper for "interactive thing happens on a descendant." Works for both genuinely-bubbling events and the well-known non-bubbling ones.

Bubbling events handled directly: `click`, `input`, `change`, `submit`, `mousedown`/`up`, `keydown`/`up`, `pointerdown`/`up`/`move`, `drag*`, `drop`, `contextmenu`, `wheel`, `copy`/`paste`/`cut`, `focusin`/`focusout`.

Non-bubbling events that `delegate()` auto-promotes to capture phase under the hood: `focus`, `blur`, `scroll`, `load`, `error`, `mouseenter`, `mouseleave`. Selector matching stays `closest()`-style — same as for bubbling events — so a wrapper selector still matches when the event fires on a descendant.

```ts
import { delegate } from 'kerfjs';

delegate(rootEl, 'click', '[data-action="add"]', (e, btn) => {
  // `btn` is the matched element (the button), not the original target
  console.log('clicked', btn.dataset.id);
});

// Auto-capture under the hood; the call site looks the same.
delegate(rootEl, 'focus', '.field-row', (_e, row) => {
  row.classList.add('field-row--active');
});
```

### Tier 2 — `delegateCapture()`

Explicit-capture escape hatch. After `delegate()`'s auto-promotion list expanded to cover focus / blur / scroll / load / error / mouseenter / mouseleave, the only remaining cases for `delegateCapture()` are:

1. **Custom non-bubbling events** that a third-party library or your own code dispatches without bubbling, which `delegate()`'s auto-promotion list doesn't know about.
2. **Capture-phase interception** — you want the listener to run BEFORE any descendant's bubble-phase handler sees the event.
3. **Strict element-match semantics** — `delegateCapture()` uses `target.matches()` (no `closest()` walk-up), so the handler fires only when the event lands on the exact element the selector identifies.

```ts
import { delegateCapture } from 'kerfjs';

// 1. Custom non-bubbling event from a third-party widget.
//    e.g. `xterm-resize` is dispatched on the terminal element and doesn't bubble:
delegateCapture(rootEl, 'xterm-resize', '.terminal-host', (event, host) => {
  // host === the .terminal-host element; event was dispatched on it directly.
  void event; void host;
});

// 2. Intercept clicks BEFORE the bubble-phase delegate handler sees them
//    (e.g. to validate before a "submit" handler runs).
delegateCapture(rootEl, 'click', '[data-action="submit"]', (event) => {
  if (!isValid()) event.stopPropagation();  // bubble-phase handler won't fire
});

// 3. Strict-match: only fire when the click lands ON the element, not a child.
delegateCapture(rootEl, 'click', '.exact-target', (_event, exact) => {
  // descendant clicks won't trigger this — `target.matches('.exact-target')` is false.
  void exact;
});
```

In practice you almost never need `delegateCapture()` — `delegate()` covers the common cases. Reach for it only when the three scenarios above apply.

### Tier 3 — per-element instances / library-owned subtrees

xterm.js terminals, Monaco editors, D3/Plotly charts, embedded YouTube iframes, anything that owns its own children and would be corrupted if the diff recursed inside.

There's no helper. The pattern:

1. Render the host element with `data-morph-skip` once via `mount()`.
2. Mount the library imperatively into the host after the first render.
3. Add direct event listeners on the library's API (or on elements inside the host); they survive every parent re-render because the host is morph-skipped.

```tsx
mount(rootEl, () => (
  <div>
    <h2>Live chart</h2>
    <div id="chart-mount" data-morph-skip />
  </div>
));

const chart = new MyChart(document.getElementById('chart-mount')!);
chart.on('select', (point) => { /* ... */ });   // direct listener — fine
```

`IntersectionObserver` / `ResizeObserver` keyed to morph-replaceable elements are theoretically Tier 3 but uncommon in practice — observers usually attach to a stable parent and observe descendants generically.

## 5.2 Why `closest()` over `target.matches()`

A click on an icon inside a button should fire the button's handler, not the icon's. `closest()` walks UP from the original target until it finds a matching ancestor — which is what you almost always want.

`delegate()` uses `closest()` for **every** event type, including the auto-promoted non-bubblers. So `delegate(root, 'focus', '.field-row', ...)` fires when a descendant `<input>` of `.field-row` receives focus, with the row as the matched element.

`delegateCapture()` uses `target.matches()` (direct match only). This is the escape-hatch behavior — useful when you want the listener to fire only when the event lands on the exact element the selector identifies, not any descendant.

## 5.3 Disposers

Both helpers return a `() => void` disposer. Call it when the host element leaves the DOM:

```ts
const offClick = delegate(rootEl, 'click', '[data-action]', handler);
// later:
offClick();
```

If you don't dispose, the listener stays bound for the lifetime of the rootEl — which is usually fine, since the root element typically lives as long as the page does.

## 5.4 What you should NOT do

- **Don't `addEventListener` on individual rendered elements** unless they're inside a `data-morph-skip` subtree. Listeners attached to nodes the diff rebuilds will silently disappear on the next re-render.
- **Don't worry about `mouseenter` / `mouseleave` not bubbling** — `delegate()` auto-promotes them to capture phase. The call site is identical to `mouseover`/`mouseout`, but you get the cleaner enter/leave semantics (no fires on internal element transitions).
- **Don't try to compute "is this fresh DOM or preserved DOM" in a delegated handler** — the handler doesn't care. It just sees an event and a target.
