# 5. Event delegation

Per-element `addEventListener` calls don't survive morph re-renders for nodes the diff inserts or rebuilds. The fix is delegation: bind one listener at the morph root and dispatch via `closest()`.

kerf ships two helpers — `delegate()` for bubbling events, `delegateCapture()` for non-bubbling — and one convention: `data-morph-skip` for subtrees neither helper should reach into.

## 5.1 The three-tier model

Almost every event you care about falls into one of three tiers.

### Tier 1 — bubbling events

`click`, `input`, `change`, `submit`, `mousedown`/`up`, `keydown`/`up`, `pointerdown`/`up`/`move`, `drag*`, `drop`, `contextmenu`, `wheel`, `copy`/`paste`/`cut`, `focusin`/`focusout`.

Use `delegate()`. Walk-up dispatch via `closest(selector)`.

```ts
import { delegate } from 'kerfjs';

delegate(rootEl, 'click', '[data-action="add"]', (e, btn) => {
  // `btn` is the matched element (the button), not the original target
  console.log('clicked', btn.dataset.id);
});
```

### Tier 2 — non-bubbling events

`focus`, `blur`, `scroll`, `load`, `error`, `mouseenter`, `mouseleave`. These don't propagate during the bubble phase, but they DO during the capture phase.

Use `delegateCapture()`. Same shape as `delegate()`, but the listener is installed with `capture: true`:

```ts
import { delegateCapture } from 'kerfjs';

delegateCapture(rootEl, 'focus', 'input, textarea', (e, target) => {
  highlight(target as HTMLElement);
});
```

`focus`/`blur` are by far the most common Tier 2 events. `focusin`/`focusout` are bubbling alternatives — if your target browsers support them (every modern browser does), `delegate()` with `focusin`/`focusout` is even cleaner.

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

`delegate()` uses `closest()`. `delegateCapture()` uses `target.matches()` because non-bubbling events are typically tied to a specific element (focus on the input itself, not the input's descendants).

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
- **Don't rely on `mouseenter` / `mouseleave` bubbling** — they don't. Use `delegateCapture` or switch to `mouseover`/`mouseout` (which bubble) and check inside the handler.
- **Don't try to compute "is this fresh DOM or preserved DOM" in a delegated handler** — the handler doesn't care. It just sees an event and a target.
