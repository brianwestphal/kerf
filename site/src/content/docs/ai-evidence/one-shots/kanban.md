---
title: 'One-shot: Mini Kanban (drag across columns)'
description: 'A one-shot transcript: prompt-only re-derivation of the mini-kanban app. Pointer events, delegate(), data-morph-skip on the dragging card.'
---

**[▶ Run the human-written reference](/kerf/run/kanban/)** · [View reference source on GitHub](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/kanban)

This page is one of [five one-shot transcripts](/kerf/ai-evidence/one-shots/) re-deriving the [complete example apps](/kerf/examples/) from prompt-only. The model is given the prompt below and nothing else; it fetches the cited URLs to learn kerf. What it produced is reproduced verbatim further down.

The reference implementation is the human-written kanban in `site/src/examples/complete/kanban/main.tsx` — 174 lines. The one-shot's job is to produce something with the same headline interaction: three columns, drag a card across columns, the drag has visual feedback, the drop lands the card.

## The prompt

````
You're writing a UI in kerf (https://github.com/brianwestphal/kerf), a ~6.5 KB
reactive framework: signals + DOM diff + JSX → HTML strings. Read
https://raw.githubusercontent.com/brianwestphal/kerf/main/llms.txt and
https://raw.githubusercontent.com/brianwestphal/kerf/main/docs/ai/usage-guide.md
once before writing any code.

Build a mini Kanban board:
- Three columns: "To do", "Doing", "Done".
- ~10 cards distributed across the columns, each card with one line of text.
- Drag a card across columns by pressing and moving the pointer. Drop lands it
  in the column under the pointer at release time.
- The dragging card has visible feedback (opacity, lift, or transform — your
  choice) and the target column shows a drop indicator.
- Apply hard rules: data-action attributes (not inline onClick); delegate()
  for clicks and pointer events; data-morph-skip on the dragging card so its
  transform/opacity isn't reverted mid-drag; signal reads inside the render fn.

Single file. Whatever line count it takes. Tailwind not allowed — emit a
CSS-friendly class structure and assume an external stylesheet handles the
look.
````

## Provenance

- **kerf version:** 0.6.0 (`main` at git SHA `36841a1`, the head when the run kicked off)
- **Model:** Claude (Claude Code, Opus 4.7 (1M context) default). The exact `model_version_string` was not pinned at run time — recording it in future runs is a follow-up.
- **Documentation the model fetched:** four URLs from raw.githubusercontent.com `kerf/main` — `llms.txt` (3.3 KB), `docs/ai/usage-guide.md` (14.1 KB), `docs/5-event-delegation.md` (6.2 KB), `docs/4-render.md` (21.3 KB). The prompt only cited the first two; the model decided on its own to pull the event-delegation and render docs as well.
- **Run date:** 2026-05-15
- **Knowledge of kerf:** none beforehand. A fresh Claude Code session in an empty `~/Documents/kerf-tests/kanban/` directory; the prompt + the four fetched URLs were the model's only source.
- **Edits to the produced code:** zero so far. The page below is the model's verbatim output. The build / run verification is the remaining work — see *Verification status* at the bottom.

## The produced code

```tsx
import { signal, batch, mount, delegate, each } from 'kerfjs';

type ColId = 'todo' | 'doing' | 'done';
interface Card { id: string; text: string; col: ColId; }

const COLUMNS: { id: ColId; title: string }[] = [
  { id: 'todo',  title: 'To do' },
  { id: 'doing', title: 'Doing' },
  { id: 'done',  title: 'Done' },
];

const cards = signal<Card[]>([
  { id: 'c1',  text: 'Sketch homepage hero',      col: 'todo'  },
  { id: 'c2',  text: 'Write API auth doc',        col: 'todo'  },
  { id: 'c3',  text: 'Onboard new designer',      col: 'todo'  },
  { id: 'c4',  text: 'Send investor update',      col: 'todo'  },
  { id: 'c5',  text: 'Refactor pricing module',   col: 'doing' },
  { id: 'c6',  text: 'Fix calendar timezone bug', col: 'doing' },
  { id: 'c7',  text: 'Review Q2 roadmap',         col: 'doing' },
  { id: 'c8',  text: 'Ship dark mode toggle',     col: 'done'  },
  { id: 'c9',  text: 'Migrate analytics events',  col: 'done'  },
  { id: 'c10', text: 'Audit npm dependencies',    col: 'done'  },
]);

const draggingId = signal<string | null>(null);
const targetCol = signal<ColId | null>(null);

let drag: {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  el: HTMLElement;
} | null = null;

const app = document.getElementById('app')!;

mount(app, () => {
  const list = cards.value;
  const dragId = draggingId.value;
  const tgt = targetCol.value;

  return (
    <div class="kanban">
      {COLUMNS.map(col => {
        const inCol = list.filter(c => c.col === col.id);
        const isTarget = dragId !== null && tgt === col.id;
        return (
          <section
            class={`column${isTarget ? ' is-target' : ''}`}
            data-column-id={col.id}
            data-key={col.id}
          >
            <header class="column-head">
              <h2 class="column-title">{col.title}</h2>
              <span class="column-count">{inCol.length}</span>
            </header>
            <ul class="card-list">
              {each(
                inCol,
                (c) => {
                  const isDragging = dragId === c.id;
                  const attrs: Record<string, unknown> = {
                    class: `card${isDragging ? ' is-dragging' : ''}`,
                    'data-card-id': c.id,
                    'data-action': 'card',
                  };
                  if (isDragging) attrs['data-morph-skip'] = '';
                  return <li {...attrs}>{c.text}</li>;
                },
                (c) => c.id,
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
});

delegate(app, 'pointerdown', '[data-action="card"]', (e, el) => {
  const pe = e as PointerEvent;
  if (pe.button !== 0 || drag) return;
  const card = el as HTMLElement;
  const id = card.dataset.cardId!;
  const home = cards.value.find(c => c.id === id)?.col ?? null;
  card.setPointerCapture(pe.pointerId);
  drag = { id, pointerId: pe.pointerId, startX: pe.clientX, startY: pe.clientY, el: card };
  batch(() => {
    draggingId.value = id;
    targetCol.value = home;
  });
});

delegate(app, 'pointermove', '[data-action="card"]', (e) => {
  if (!drag) return;
  const pe = e as PointerEvent;
  if (pe.pointerId !== drag.pointerId) return;

  const dx = pe.clientX - drag.startX;
  const dy = pe.clientY - drag.startY;
  drag.el.style.transform = `translate(${dx}px, ${dy}px) rotate(2deg)`;
  drag.el.style.opacity = '0.85';
  drag.el.style.zIndex = '1000';

  drag.el.style.pointerEvents = 'none';
  const under = document.elementFromPoint(pe.clientX, pe.clientY);
  drag.el.style.pointerEvents = '';
  const colEl = under && (under as Element).closest('[data-column-id]');
  const colId = (colEl ? (colEl as HTMLElement).dataset.columnId : null) as ColId | null;
  if (colId !== targetCol.value) targetCol.value = colId;
});

delegate(app, 'pointerup', '[data-action="card"]', (e) => {
  if (!drag) return;
  const pe = e as PointerEvent;
  if (pe.pointerId !== drag.pointerId) return;

  const drop = targetCol.value;
  const id = drag.id;
  const el = drag.el;
  try { el.releasePointerCapture(pe.pointerId); } catch { /* released already */ }
  el.style.transform = '';
  el.style.opacity = '';
  el.style.zIndex = '';
  drag = null;

  batch(() => {
    if (drop) {
      cards.value = cards.value.map(c => (c.id === id ? { ...c, col: drop } : c));
    }
    draggingId.value = null;
    targetCol.value = null;
  });
});

delegate(app, 'pointercancel', '[data-action="card"]', () => {
  if (!drag) return;
  drag.el.style.transform = '';
  drag.el.style.opacity = '';
  drag.el.style.zIndex = '';
  drag = null;
  batch(() => {
    draggingId.value = null;
    targetCol.value = null;
  });
});
```

## What the model got right

A scan of the produced code against the hard rules it was given:

- **`data-action` instead of inline `onClick`.** Every card has `data-action="card"`. The four pointer events (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`) all wire through `delegate(app, …, '[data-action="card"]', …)` on the mount root. No `addEventListener` inside the mount tree. ✅
- **`data-morph-skip` on the dragging card.** Conditionally spread into the `<li>` via the `attrs` map when `dragId === c.id`. While the card is in the dragging state the morph leaves the element — and the imperatively-written `transform` / `opacity` / `z-index` — alone. ✅
- **Signal reads inside the render fn.** `cards.value`, `draggingId.value`, `targetCol.value` are all read at the top of the `mount()` callback. The pointer-move handler updates DOM imperatively (via `style`) and only writes to `targetCol` when the column under the pointer actually changes. ✅
- **`each()` with keyed identity.** Each column's list goes through `each(inCol, render, c => c.id)` so cross-column reorders are keyed reconciliation, not full rebuilds. ✅
- **`batch()` around the drop transaction.** The drop's three signal writes (`cards`, `draggingId`, `targetCol`) coalesce into a single re-render. Same on cancel. ✅
- **`setPointerCapture` for the drag stream.** Keeps the pointer events delivering to the card element even when the cursor passes over other elements that would otherwise hit-test first. ✅
- **`elementFromPoint` with `pointer-events: none` toggle for drop-target detection.** Standard idiom for "find what's under the cursor while a card is being dragged." ✅
- **No `addEventListener` on rebuilt nodes.** Everything goes through `delegate()` on the mount root, which is exactly what the rule asks for. ✅

## What the model got wrong

One real finding and a couple of small ones.

### Lowercase `class` vs camelCase `className` — types gap

The model used `class={...}` everywhere instead of `className={...}`. That's consistent with `docs/10-migrating.md` / `site/src/content/docs/migrating/react.md`'s explicit guidance ("Kerf JSX uses HTML attribute names — `class`, `for`, `tabindex`, `autofocus` — not React's `className` …"). It is **inconsistent with `src/jsx-types.ts`**, which only declares the camelCase forms.

What happens:

- **At runtime:** the JSX runtime emits the attribute name verbatim (after the `ATTR_ALIASES` table, which only maps camelCase *into* lowercase — never the other direction), so `class="..."` ends up in the HTML output correctly. Visually, the page renders fine.
- **At typecheck:** `tsc --noEmit` would flag `Property 'class' does not exist on type 'KerfBaseAttrs'. Did you mean 'className'?` on every JSX node that uses `class`.

This is a kerf docs/types inconsistency the model exposed by trusting the more recent migration page. The fix is to widen `KerfBaseAttrs` to accept both forms, the same widening that was applied to `autocomplete` and `spellcheck` previously. Filed as a follow-up sub-ticket.

### `Record<string, unknown>` for the conditional `data-morph-skip` spread

The model used a `Record<string, unknown>` map and spread it into the `<li>` so it could conditionally include `data-morph-skip`. This works at runtime but the spread loses per-attribute type safety inside that tag. A more idiomatic kerf shape would be a JSX ternary on the attribute itself or two `<li>` branches in a ternary. The model's choice is defensible (avoids duplication) but worth flagging as a stylistic difference from the reference implementation.

### The model decided which docs to fetch beyond what the prompt cited

The prompt cited two URLs (`llms.txt` and `docs/ai/usage-guide.md`); the model proactively pulled `docs/5-event-delegation.md` and `docs/4-render.md` on its own. That's not "wrong" per se — kerf's `llms.txt` indexes those pages — but it's worth recording for the empirical-bench layer (KF-171's krausest-style benchmark) because token-cost-per-cell calculations will need to reflect that the model self-expands the doc-fetch beyond the prompt's explicit citations. The expansion is what made the code work; without `docs/5-event-delegation.md`, the model likely would not have known about the `delegate()` selector contract.

## Verification status

| Check | Status |
|---|---|
| Code captured verbatim from the fresh Claude Code session | ✅ done |
| Provenance pinned (kerf version, model, run date, fetched docs) | ✅ done (model exact-version-string pending) |
| Code typechecks against `dist/jsx-runtime.d.ts` | ⏳ NOT yet — would fail today on `class` (see *What the model got wrong*) |
| Code builds in a vite + tsconfig scaffold with `"jsxImportSource": "kerfjs"` | ⏳ NOT yet — pending scaffold + run |
| Headline-interaction test passes (drag a card across columns, drop lands) | ⏳ NOT yet — pending the running app at `/kerf/run/one-shots/kanban/` |
| Running app published at `/kerf/run/one-shots/kanban/` | ⏳ NOT yet |

The transcript ships now; the stand-up-the-app work is the remaining piece.

## What this run says (preliminary, before the run-it-and-test step)

The model produced code that *reads* correct on every hard rule the prompt gave it, plus picked up the non-obvious `setPointerCapture` + `elementFromPoint` + `pointer-events: none` idiom for drop-target detection without being told. The one real defect is a docs/types-inconsistency in kerf itself (the `class` vs `className` thing) that the model walked into by trusting the more recently-edited migration page. That counts as a finding on kerf, not on the model. Once the type widening lands and the running app is verified, this looks like a clean score-3 outcome on the operational-evidence axis. The honest call after the running-app verification will go here.
