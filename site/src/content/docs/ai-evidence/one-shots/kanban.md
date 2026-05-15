---
title: 'One-shot: Mini Kanban (drag across columns)'
description: 'A one-shot transcript: prompt-only re-derivation of the mini-kanban app. Pointer events, delegate(), data-morph-skip on the dragging card.'
---

**[▶ Run the human-written reference](/kerf/run/kanban/)** · [View reference source on GitHub](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/kanban)

This page is one of [five one-shot transcripts](/kerf/ai-evidence/one-shots/) re-deriving the [complete example apps](/kerf/examples/) from prompt-only. The model is given the prompt below and nothing else; it fetches the cited URLs to learn kerf. What it produced is reproduced verbatim further down.

The reference implementation is the human-written kanban in `site/src/examples/complete/kanban/main.tsx` — 174 lines. The one-shot's job is to produce something with the same headline interaction: three columns, drag a card across columns, the drag has visual feedback, the drop lands the card — and a complete buildable project (`package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/style.css`) so `npm install && npm run dev` Just Works.

## The prompt

````
You're writing a UI in kerf (https://github.com/brianwestphal/kerf), a ~6.5 KB
reactive framework: signals + DOM diff + JSX → HTML strings. Read
https://raw.githubusercontent.com/brianwestphal/kerf/main/llms.txt and
https://raw.githubusercontent.com/brianwestphal/kerf/main/docs/ai/usage-guide.md
once before writing any code.

This is a complete one-shot. When you're done the user must be able to run

    npm install
    npm run dev

and open the URL vite prints to see a working app. No further setup steps,
no manual file creation, no fix-up commands. Produce all of these files:

- package.json — declares "kerfjs" as a dependency (latest is 0.6.x, pin it
  however you'd pin a brand-new dep). Plus "vite" (^6) and "typescript"
  (^5.7) as devDependencies. Scripts: "dev", "build", "preview" wired to
  vite.
- tsconfig.json — "jsx": "react-jsx", "jsxImportSource": "kerfjs",
  "target": "ES2022", "module": "ESNext", "moduleResolution": "bundler",
  "strict": true, "include": ["src/**/*"]. No project references, no
  composite, no incremental.
- vite.config.ts — minimal config, no plugins required.
- index.html — <div id="app"></div> for the mount point;
  <script type="module" src="/src/main.tsx"></script>;
  <link rel="stylesheet" href="/src/style.css"> in <head>.
- src/main.tsx — the app code. Single-file; whatever line count it takes.
- src/style.css — visual styles for the class structure your render fn
  emits. No CSS framework. Self-contained.

Use the canonical HTML attribute names in JSX (`class`, `for`, `tabindex`,
`autofocus`) per kerf's migration guide — kerf's JSX runtime aliases the
camelCase forms to their HTML lowercase equivalents on output, so either
spelling produces the same HTML, but the migration guide prefers lowercase.

# What the app does

A mini Kanban board:
- Three columns: "To do", "Doing", "Done".
- ~10 cards distributed across the columns, each card with one line of text.
- Drag a card across columns by pressing and moving the pointer. Drop lands
  it in the column under the pointer at release time.
- The dragging card has visible feedback (opacity, lift, or transform — your
  choice) and the target column shows a drop indicator.
- Use `data-morph-skip` on the dragging card so its transform/opacity isn't
  reverted mid-drag.

# Hard rules (apply throughout)

- `data-action` attributes for action wiring, not inline onClick.
- `delegate(rootEl, …)` for all event handlers — never `addEventListener` on
  a node inside the mount tree.
- `data-key={item.id}` (or `data-key` set to something stable) on every
  `each()` row.
- Signal reads (`.value`) must happen inside the render function passed to
  `mount()` — not in module scope, not captured into a local outside the
  render.
- Components are plain functions returning JSX. No hooks, no lifecycle.
````

## Provenance

- **kerf version pinned by the model:** `kerfjs ^0.6.0` (`main` at git SHA `36841a1` at run time)
- **Model:** Claude Code (Opus 4.7 (1M context), the user's session default — exact model-version-string still not pinned at run time; recording it is a follow-up for v3 prompt instructions)
- **Documentation the model fetched:** `llms.txt` + `docs/ai/usage-guide.md` (the two URLs cited in the prompt). The model re-fetched the usage guide twice via WebFetch and once via `curl` for a total of four `Fetch` log lines — likely tool-retry rather than self-expansion, since it didn't pull `docs/4-render.md` / `docs/5-event-delegation.md` like v1 did.
- **Run date:** 2026-05-15
- **Knowledge of kerf:** none beforehand. A fresh Claude Code session in an empty `~/Documents/kerf-tests/kanban2/`.
- **Wall time:** 5m 38s ("Crunched for 5m 38s" per the agent's session log)
- **Edits to the produced code:** zero. The six files below are the model's verbatim output.

## The produced code

### `package.json`

```json
{
  "name": "kanban-kerf",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "kerfjs": "^0.6.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "kerfjs",
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src/**/*"]
}
```

### `vite.config.ts`

```ts
import { defineConfig } from 'vite';

export default defineConfig({});
```

### `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Kanban</title>
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### `src/main.tsx`

```tsx
import { signal, mount, each, delegate } from 'kerfjs';

type ColId = 'todo' | 'doing' | 'done';
type Card = { id: string; text: string; col: ColId };

const COLUMNS: { id: ColId; title: string }[] = [
  { id: 'todo', title: 'To do' },
  { id: 'doing', title: 'Doing' },
  { id: 'done', title: 'Done' },
];

const cards = signal<Card[]>([
  { id: 'c1', text: 'Sketch the column layout', col: 'todo' },
  { id: 'c2', text: 'Pick the typography', col: 'todo' },
  { id: 'c3', text: 'Wire pointerdown via delegate', col: 'todo' },
  { id: 'c4', text: 'Pin kerf 0.6.x', col: 'todo' },
  { id: 'c5', text: 'Implement the lift transform', col: 'doing' },
  { id: 'c6', text: 'Add the drop-target highlight', col: 'doing' },
  { id: 'c7', text: 'Verify keyed reconciliation', col: 'doing' },
  { id: 'c8', text: 'Read the kerf usage guide', col: 'done' },
  { id: 'c9', text: 'Scaffold Vite + TS', col: 'done' },
  { id: 'c10', text: 'Choose the palette', col: 'done' },
]);

const overCol = signal<ColId | null>(null);

type DragRec = {
  id: string;
  el: HTMLElement;
  startX: number;
  startY: number;
  pointerId: number;
};

let drag: DragRec | null = null;

const root = document.getElementById('app')!;

mount(root, () => {
  const list = cards.value;
  const over = overCol.value;
  const dragging = drag !== null;
  return (
    <>
      <h1 class="page-title">Kanban</h1>
      <div class="board">
        {COLUMNS.map((col) => {
          const colCards = list.filter((c) => c.col === col.id);
          const isTarget = dragging && over === col.id;
          return (
            <section
              class={`column${isTarget ? ' drop-target' : ''}`}
              data-key={col.id}
              data-col-id={col.id}
            >
              <header class="column-header">
                <h2 class="column-title">{col.title}</h2>
                <span class="column-count">{colCards.length}</span>
              </header>
              <div class="card-list">
                {each(colCards, (c: Card) => (
                  <article
                    class="card"
                    data-key={c.id}
                    data-card-id={c.id}
                    data-action="drag"
                    tabindex="0"
                  >
                    {c.text}
                  </article>
                ))}
                {isTarget && colCards.length === 0 ? (
                  <div class="drop-placeholder">Drop here</div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
      <p class="hint">Press and drag a card to move it between columns.</p>
    </>
  );
});

function columnUnder(x: number, y: number): ColId | null {
  const hit = document.elementFromPoint(x, y);
  if (!hit) return null;
  const colEl = (hit as Element).closest('[data-col-id]') as HTMLElement | null;
  if (!colEl) return null;
  return (colEl.dataset.colId as ColId) ?? null;
}

delegate(root, 'pointerdown', '[data-action="drag"]', ((e: Event) => {
  const ev = e as PointerEvent;
  if (ev.button !== 0) return;
  const cardEl = (ev.target as Element).closest(
    '[data-card-id]',
  ) as HTMLElement | null;
  if (!cardEl) return;
  const id = cardEl.dataset.cardId;
  if (!id) return;

  const fromCol = cards.value.find((c) => c.id === id)?.col ?? null;

  cardEl.classList.add('dragging');
  cardEl.style.transform = 'translate(0px, 0px)';
  cardEl.setAttribute('data-morph-skip', '');
  try {
    cardEl.setPointerCapture(ev.pointerId);
  } catch {
    /* ignore */
  }

  drag = {
    id,
    el: cardEl,
    startX: ev.clientX,
    startY: ev.clientY,
    pointerId: ev.pointerId,
  };
  overCol.value = fromCol;
  ev.preventDefault();
}) as EventListener);

delegate(root, 'pointermove', '*', ((e: Event) => {
  if (!drag) return;
  const ev = e as PointerEvent;
  const dx = ev.clientX - drag.startX;
  const dy = ev.clientY - drag.startY;
  drag.el.style.transform = `translate(${dx}px, ${dy}px)`;
  const next = columnUnder(ev.clientX, ev.clientY);
  if (next !== overCol.value) overCol.value = next;
}) as EventListener);

function endDrag(commit: boolean) {
  if (!drag) return;
  const { id, el, pointerId } = drag;
  drag = null;
  try {
    el.releasePointerCapture(pointerId);
  } catch {
    /* ignore */
  }
  el.removeAttribute('data-morph-skip');
  el.classList.remove('dragging');
  el.style.transform = '';
  const target = overCol.value;
  overCol.value = null;
  if (commit && target) {
    cards.value = cards.value.map((c) =>
      c.id === id ? { ...c, col: target } : c,
    );
  }
}

delegate(root, 'pointerup', '*', (() => endDrag(true)) as EventListener);
delegate(
  root,
  'pointercancel',
  '*',
  (() => endDrag(false)) as EventListener,
);
```

### `src/style.css` (187 lines)

187 lines of self-contained CSS — a glassmorphism palette with column-specific accent colors (`#4338ca` for "To do", `#b45309` for "Doing", `#047857` for "Done"), `backdrop-filter: blur(10px)` columns on a soft radial gradient background, drag-state styling (`pointer-events: none`, `z-index: 50`, lifted shadow), and a dashed drop-placeholder for empty target columns. Full file at [`~/Documents/kerf-tests/kanban2/src/style.css`](#) in the captured-transcript artifact bundle. (The CSS isn't reproduced inline here only because it's long and not part of the framework-correctness story; this page is principally about whether the model wrote correct kerf code.)

## Verification status

| Check | Status |
|---|---|
| All six files produced verbatim | ✅ done |
| Provenance pinned (kerf version, model, run date, fetched docs) | ✅ done (model exact-version-string still pending — v3 prompt asks for it) |
| `npm install` | ✅ green (1 dep + 16 devDeps in ~5 s; second invocation pulls vite + typescript) |
| `npm run build` (vite production build) | ✅ green (10 modules → `dist/assets/index-DLqnv_80.js` 27.27 KB / gzip 10.12 KB + `dist/assets/index-B9jCYptp.css` 2.83 KB / gzip 1.18 KB; build time 126 ms) |
| `npm run preview` (serve the production bundle) | ✅ green (`http://localhost:4173/`) |
| `npx tsc --noEmit` against the project | ❌ **fails — 10 errors, all `class` vs `className`** (tracked under the lowercase-attribute-types follow-up). Vite uses esbuild for the dev/build pipeline so this doesn't block running the app, but a `tsc --noEmit` step in CI would catch it |
| Headline-interaction in a real browser (drag → drop) | ⏳ visual smoke pending — running app is up; the targeted Playwright probe (cross-column drag with focus survival) lands when the running version stands up at `/kerf/run/one-shots/kanban/` |
| Running app published at `/kerf/run/one-shots/kanban/` | ⏳ pending |

## What the model got right

The buildable project. The model produced exactly the six files the prompt asked for, with no manual fix-up. `npm install && npm run build && npm run preview` works end-to-end. That's the whole point of the v2 prompt rewrite — v1 produced just `kanban.tsx` and required the user to scaffold the rest by hand.

The framework-correctness inventory:

- **All event wiring via `delegate(root, …)` on the mount root.** Four delegated handlers — `pointerdown`, `pointermove`, `pointerup`, `pointercancel`. No `addEventListener` inside the mount tree. ✅
- **`data-action="drag"`** on every card; the `pointerdown` handler matches on `[data-action="drag"]`. ✅
- **`data-morph-skip` set imperatively on the live card** at `pointerdown` time, removed on drag end. The model wrote it via `setAttribute` rather than as a reactive prop — which is actually cleaner here: the card's drag state is owned by the pointer-handler imperatively for the duration of the drag, not derived from a signal. The morph honors the attribute on the live DOM regardless of how it got there. ✅
- **`each()` per column list** with `data-key={c.id}`. Cross-column moves go through keyed reconciliation, not full rebuilds. ✅
- **Signal reads inside the render fn.** `cards.value` and `overCol.value` are read at the top of `mount()`'s callback. The pointer-move handler updates DOM imperatively via `el.style.transform` and only writes `overCol` when the column actually changes. ✅
- **`setPointerCapture` for the drag stream** plus **`elementFromPoint` (no `pointer-events` toggle needed because `.dragging` CSS sets `pointer-events: none`)** for drop-target detection. The model picked up the same drag-handling idioms as the human reference. ✅
- **`tabindex="0"` on each card.** Keyboard-accessibility nicety the prompt didn't ask for; the model added it on its own. ✅
- **`<>` Fragment for the root render** so the `<h1>`, `<div class="board">`, and `<p class="hint">` siblings sit under `#app` without a wrapper. ✅
- **`drag` state held in a module-level `let`** rather than a signal. The model's note in its summary: "it doesn't need to be a signal because every state transition also writes overCol or cards, which triggers the re-render." Correct call.

## What the model got wrong

### `class` vs `className` types gap (same finding as v1)

Every JSX node uses lowercase `class` — exactly what the migration doc tells incoming developers to do. The runtime emits `class="..."` correctly and the production build works. But `tsc --noEmit` errors on all 10 JSX nodes:

```
src/main.tsx(45,11): error TS2322: Property 'class' does not exist on type
'KerfBaseAttrs'. Did you mean 'className'?
```

…and nine more like it. This is the kerf docs/types inconsistency v1 already surfaced; the fix is a follow-up widening of `KerfBaseAttrs` to accept both spellings. Vite's esbuild pipeline doesn't typecheck, so the app builds and runs in spite of the errors — but a CI `tsc --noEmit` step would catch this in a real-project setup.

### `tabindex="0"` as a string (minor — same root cause)

Same shape: `tabindex` should typecheck as `AttrLike<number>` per `KerfBaseAttrs`'s `tabIndex` declaration. The model wrote it lowercase + as a string literal, which renders correctly in HTML but loses the number-typing the camelCase form provides. Same follow-up will widen `tabindex` lowercase.

### `delegate(root, 'pointermove', '*', …)` — broader selector than needed

The model used selector `'*'` for `pointermove`, `pointerup`, and `pointercancel`. `'*'` matches any element, which is the broadest possible selector — fine because the handlers themselves check `drag !== null` first and bail otherwise. The reference implementation uses `[data-action="drag"]` for the same handlers, which is narrower; `setPointerCapture` makes both work the same way in practice because pointer-captured events route to the capturer regardless of where the cursor is. Either approach is defensible. Worth flagging as a stylistic choice that broadens the delegated-handler scope.

### Stacking-context bug — dragged card appears *behind* the target column

This one bites visually. While dragging a card from column 1 toward column 2, the dragged card slides *under* column 2 instead of over it. The drop still lands correctly when the user releases, but mid-drag the card looks like it's been swallowed by the destination column.

**Root cause** — three CSS rules the model wrote that interact badly:

```css
.column {
  backdrop-filter: blur(10px);           /* ⇐ creates a stacking context */
  -webkit-backdrop-filter: blur(10px);   /* ⇐ same */
}
.column.drop-target {
  transform: translateY(-1px);           /* ⇐ also creates a stacking context */
}
.card.dragging {
  position: relative;
  z-index: 50;                           /* ⇐ scoped to source column's stacking context */
}
```

Every `.column` has its own stacking context from the start (the `backdrop-filter`); when a column becomes a `.drop-target` it gets an *additional* stacking-context source (the `transform`). The dragged card's `z-index: 50` is scoped to its **source column's** stacking context — it cannot escape upward and paint above the neighboring column's stacking context, which sits later in source order and therefore paints later (= on top).

**The minimum fix** — one CSS rule that elevates the source column while a card inside it is being dragged:

```css
.column:has(.card.dragging) {
  z-index: 1000;
  position: relative;
}
```

CSS `:has()` is supported in Chrome 105+ / Safari 15.4+ / Firefox 121+; the rule lifts the entire source-column stacking context above its siblings during a drag, so the card painted inside it ends up on top of everything else. Leaves the dragged card's transform math alone — no JS changes needed.

**Heavier-but-cleaner alternative:** portal the dragged card out to a sibling of `#app` via `data-morph-skip` (so the morph leaves it alone) and absolutely position it. Avoids the stacking-context tangle entirely. The kerf reference implementation goes a step softer — it uses `position: relative; z-index: 10` on the dragging card and gets away with it because its columns don't use `backdrop-filter`. The cleanest one-line CSS for *this* model's design is the `:has()` rule above.

**Why this counts as a real finding:** the model's CSS choices (the glassmorphism palette with `backdrop-filter`, the drop-target `translateY(-1px)` micro-lift, the `position: relative; z-index: 50` on the dragging card) are individually fine. The composition broke in a way that's only visible *while interacting* — `npm run build` succeeds, the running app loads, all the framework hard rules pass, but the drag UX is subtly broken. The empirical-benchmark layer's "subtle-bug presence" probes are designed to catch exactly this class of issue. Tracked as a per-prompt subtle-probe addition for the kanban prompt.

### Doc-fetch behavior (situational, not wrong)

The model invoked the WebFetch tool three times for `usage-guide.md` (twice via raw.githubusercontent.com, once via github.com/blob/...) plus a `curl` of the same URL. That's tool-retry behavior, not self-expansion. Worth recording because the empirical-benchmark layer (krausest-style AI codegen benchmark) will count fetch invocations differently from unique URLs fetched — and the v1 transcript's "4 unique URLs fetched, only 2 cited" framing doesn't apply here.

## Prior runs

The 2026-05-15 v1 run (kerf at git SHA `36841a1`, captured at site commit `45621e4`) produced a single `kanban.tsx` with no project scaffolding under the original prompt that said "Single file." The v2 run captured on this page is the canonical published transcript for the kanban one-shot.

| Run | Prompt | Files produced | Build clean | `tsc --noEmit` |
|---|---|---|---|---|
| v1 (2026-05-15) | Single-file ask | `kanban.tsx` only (147 lines) | n/a (no project scaffolding) | n/a |
| v2 (2026-05-15) | Complete-project ask | All six files | ✅ vite build green | ❌ 10 `class` errors |

## Preliminary honest call

The v2 prompt delivers what the experiment is actually meant to measure: an off-the-shelf model, with kerf's published docs as its only source, produces a complete buildable project that runs. The single remaining defect is a kerf docs/types inconsistency we already knew about — KF-191 fixes it once and the next iteration of this transcript (or any of the other four) will be clean.

This is the v1 score-3 outcome on the operational-evidence axis, modulo the docs/types fix. The empirical-benchmark layer (KF-171's krausest-style cross-framework grid) will produce the broader population numbers; this single transcript is one cell in that grid, captured early for the operational-portfolio publish.
