---
title: Mini Kanban
description: Three columns, ten cards, drag-to-reorder across columns. Pointer events + delegateCapture + data-morph-skip on the dragging card.
---

**[▶ Run live](/kerf/run/kanban/)** · [View source on GitHub](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/kanban)

A mini Kanban board. Three columns (`To do` / `Doing` / `Done`), drag any card across columns or within a column. Not a full Trello — three columns, ~10 cards, drag works, that's it.

<div class="video-placeholder">
  🎬 <strong>Demo clip — Coming Soon</strong>
  <p>30-second screen-record showing a card dragged across columns + per-column count updating live.</p>
</div>

**What to look at:**

- **One `each()` per column.** Three keyed lists, one parent each. The list reconciler owns the rows of each column independently — moving a card across columns is just a remove from one list and insert into another.
- **`delegateCapture('pointerdown', '.card', …)`** captures the drag start. `pointerdown` *does* bubble, but capture-phase fires *first* — so even if a child of `.card` swallows the event, drag still initiates. The remaining `pointermove` / `pointerup` listeners go on `window` because the cursor can leave the board.
- **`data-morph-skip` on the dragging card.** While dragged, the card is marked skip and given a `transform: translate(...)` style. The diff would otherwise see the moving transform as an attribute drift on every render and might fight identity. Skipping it makes the dragged card a stable, owned-by-the-drag-handler element until drop.
- **Optimistic store update on drop.** The drag handler computes the target column + slot from `elementFromPoint`, then calls `board.actions.move(cardId, toCol, toIdx)`. The store mutation triggers exactly one re-render — the dropped card lands in its new home.

[View source on GitHub →](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/kanban)

```tsx
// site/src/examples/complete/kanban/main.tsx (excerpt — full source on GitHub)
import { defineStore, signal, mount, each, delegateCapture } from 'kerfjs';

const board = defineStore({
  initial: () => ({
    cols: { todo: [/* ... */], doing: [/* ... */], done: [/* ... */] },
  }),
  actions: (set, get) => ({
    move: (cardId, toCol, toIdx) => { /* find + remove + splice + set */ },
  }),
});

const drag = signal<{ id: string; dx: number; dy: number; w: number; h: number } | null>(null);

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
              return (
                <li
                  data-key={card.id}
                  class={`card ${dragging ? 'dragging' : ''}`}
                  data-card={card.id}
                  style={dragging ? `transform:translate(${d!.dx}px,${d!.dy}px);…` : ''}
                  {...(dragging ? { 'data-morph-skip': '' } : {})}
                >
                  {card.text}
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

// Capture-phase pointerdown — fires first, even if a child handles the bubble.
delegateCapture(root, 'pointerdown', '.card', (e, el) => {
  // …capture rect, set drag signal, attach window listeners for move/up
});
```
