---
title: Mini Kanban
description: Three columns, ten cards, drag-to-reorder across columns. Pointer events + delegate() + data-morph-skip on the dragging card.
---

**[▶ Run live](/kerf/run/kanban/)** · [View source on GitHub](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/kanban)

A mini Kanban board. Three columns (`To do` / `Doing` / `Done`), drag any card across columns or within a column. Not a full Trello — three columns, ~10 cards, drag works, that's it.

<!--
  Video placeholder commented out until the screen-record flow is ready.
  Drop a <video controls> in here when the clip lands, or restore the placeholder
  block below.
<div class="video-placeholder">
  🎬 <strong>Demo clip — Coming Soon</strong>
  <p>30-second screen-record showing a card dragged across columns + per-column count updating live.</p>
</div>
-->

**What to look at:**

- **One `each()` per column.** Three keyed lists, one parent each. The list reconciler owns the rows of each column independently — moving a card across columns is just a remove from one list and insert into another.
- **`delegate('pointerdown', '.card', …)`** kicks off the drag. `delegate()` matches via `closest()`, so a pointer-down landing on any descendant of `.card` (the tag badge, the text, the meta row) climbs up to the card itself. The remaining `pointermove` / `pointerup` listeners go on `window` because the cursor can leave the board.
- **`data-morph-skip` on the dragging card.** While dragged, the card is marked skip and the live `transform: translate(...)` is written imperatively from the `pointermove` handler. The skip stops the morph from fighting the drag handler — the row becomes "owned by the drag handler" until drop. (Doing the transform reactively would either freeze the row to its initial position via memo cache, or thrash a per-frame re-render of pure visuals.)
- **Optimistic store update on drop.** The drag handler computes the target column + slot from `elementFromPoint`, then calls `board.actions.move(cardId, toCol, toIdx)`. The store mutation triggers exactly one re-render — the dropped card lands in its new home.

[View source on GitHub →](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/kanban)

```tsx
// site/src/examples/complete/kanban/main.tsx (excerpt — full source on GitHub)
import { defineStore, signal, mount, each, delegate } from 'kerfjs';

const board = defineStore({
  initial: () => ({
    cols: { todo: [/* ... */], doing: [/* ... */], done: [/* ... */] },
  }),
  actions: (set, get) => ({
    move: (cardId, toCol, toIdx) => { /* find + remove + splice + set */ },
  }),
});

// drag holds only what the render needs. The live translate is written
// imperatively from `onMove` — see the comments in the real source for
// the full rationale.
const drag = signal<{ id: string; w: number; h: number } | null>(null);
let dragEl: HTMLElement | null = null;

mount(root, () => (
  <div class="board">
    {COLS.map((col) => (
      <section class="col" data-col={col} data-key={col}>
        <h2>{COL_TITLES[col]}</h2>
        <ul class="cards">
          {each(
            board.state.value.cols[col],
            (card) => {
              const d = drag.value;
              const dragging = d?.id === card.id;
              const style = dragging
                ? `position:relative;z-index:10;transform:translate(0,0) rotate(2deg);width:${d!.w}px;pointer-events:none`
                : '';
              return (
                <li
                  data-key={card.id}
                  class={`card ${dragging ? 'dragging' : ''}`}
                  data-card={card.id}
                  style={style}
                  {...(dragging ? { 'data-morph-skip': '' } : {})}
                >
                  {/* …tag badge, .card-text, .card-meta children… */}
                </li>
              );
            },
            (card) => `${card.id}-${drag.value?.id === card.id ? 'drag' : 'rest'}`,
          )}
        </ul>
      </section>
    ))}
  </div>
));

// `delegate()` (not `delegateCapture()`) — pointerdown bubbles, and `delegate()`
// uses `closest()` so a click on any descendant of `.card` resolves to the card.
delegate(root, 'pointerdown', '.card', (e, el) => {
  // preventDefault, set drag.value, dragEl = querySelector('.card.dragging[...]'),
  // attach window listeners for pointermove (writes dragEl.style.transform) and
  // pointerup (drops + clears).
});
```
