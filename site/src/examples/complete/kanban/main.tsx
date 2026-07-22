import { defineStore, signal, mount, each, delegate } from 'kerfjs';

type Tag = 'design' | 'code' | 'docs' | 'bug' | 'ops';
type Avatar = 'a' | 'b' | 'c' | 'd' | 'e';
interface Card { id: string; text: string; tag: Tag; who: Avatar; initial: string }
type ColId = 'todo' | 'doing' | 'done';

const board = defineStore({
  initial: () => ({
    cols: {
      todo: [
        { id: 'a', text: 'Design new hero illustration',     tag: 'design', who: 'a', initial: 'A' },
        { id: 'b', text: 'Draft v1.0 announcement post',     tag: 'docs',   who: 'b', initial: 'M' },
        { id: 'c', text: 'Investigate flicker on slow 4G',   tag: 'bug',    who: 'c', initial: 'J' },
        { id: 'd', text: 'Sketch component playground UX',   tag: 'design', who: 'a', initial: 'A' },
      ] as Card[],
      doing: [
        { id: 'e', text: 'Wire up streaming chat example',   tag: 'code',   who: 'd', initial: 'S' },
        { id: 'f', text: 'Migrate CI to ARM runners',        tag: 'ops',    who: 'e', initial: 'T' },
        { id: 'g', text: 'Rewrite onboarding tour',          tag: 'docs',   who: 'b', initial: 'M' },
      ] as Card[],
      done: [
        { id: 'h', text: 'Ship granular array signals',      tag: 'code',   who: 'd', initial: 'S' },
        { id: 'i', text: 'Tune morph for IME composition',   tag: 'code',   who: 'c', initial: 'J' },
        { id: 'j', text: 'Audit American-English spelling',  tag: 'docs',   who: 'b', initial: 'M' },
      ] as Card[],
    } satisfies Record<ColId, Card[]>,
  }),
  actions: (set, get) => ({
    move: (cardId: string, toCol: ColId, toIdx: number) => {
      const cols = { ...get().cols };
      let card: Card | undefined;
      for (const c of ['todo', 'doing', 'done'] as ColId[]) {
        const i = cols[c].findIndex((x) => x.id === cardId);
        if (i >= 0) {
          card = cols[c][i];
          cols[c] = [...cols[c].slice(0, i), ...cols[c].slice(i + 1)];
        }
      }
      if (!card) return;
      const target = [...cols[toCol]];
      target.splice(toIdx, 0, card);
      cols[toCol] = target;
      set({ cols });
    },
  }),
});

// drag holds only what the render needs (id + initial geometry). The live `dx, dy`
// transform is applied imperatively in `onMove` (see KF-163) because:
//   1. Updating dx/dy through the signal would either freeze the row (each() memo is
//      `id-drag` while dragging, so a cache-hit reuses stale HTML — the original bug)
//      or, if dx/dy were folded into the memo, re-render the row at pointer rate for
//      a pure visual effect.
//   2. The dragging row carries `data-morph-skip`, so it's already "owned by the drag
//      handler" by contract. Direct DOM writes are the natural way to drive it.
interface DragState { id: string; w: number; h: number }
const drag = signal<DragState | null>(null);

const root = document.getElementById('app')!;

const COLS: ColId[] = ['todo', 'doing', 'done'];
const COL_TITLES: Record<ColId, string> = { todo: 'To do', doing: 'Doing', done: 'Done' };

mount(root, () => (
  <div class="board">
    {COLS.map((col) => {
      const cards = board.state.value.cols[col];
      return (
        <section class="col" data-col={col} data-key={col}>
          <div class="col-header">
            <h2>{COL_TITLES[col]}</h2>
            <span class="count">{cards.length}</span>
          </div>
          <ul class="cards">
            {each(
              cards,
              (card) => {
                const d = drag.value;
                const dragging = d?.id === card.id;
                // Initial style snapshot at drag start. `onMove` mutates `transform`
                // imperatively from here; the row is `data-morph-skip` so the morph
                // won't fight that.
                const style = dragging
                  ? `position:relative;z-index:10;transform:translate(0px,0px) rotate(2deg);width:${d!.w}px;pointer-events:none`
                  : '';
                return (
                  <li
                    data-key={card.id}
                    class={`card ${dragging ? 'dragging' : ''}`}
                    data-card={card.id}
                    style={style}
                    {...(dragging ? { 'data-morph-skip': '' } : {})}
                  >
                    <span class={`card-tag ${card.tag}`}>{card.tag}</span>
                    <div class="card-text">{card.text}</div>
                    <div class="card-meta">
                      <span><span class={`avatar ${card.who}`}>{card.initial}</span></span>
                      <span>#{card.id.toUpperCase()}</span>
                    </div>
                  </li>
                );
              },
              (card) => `${card.id}-${drag.value?.id === card.id ? 'drag' : 'rest'}`,
            )}
          </ul>
        </section>
      );
    })}
  </div>
));

let startX = 0;
let startY = 0;
let dragEl: HTMLElement | null = null;

// `delegate()` here (vs `delegateCapture()`): pointerdown bubbles natively, so
// bubble-phase delegation reaches it — no need for capture. Matching walks up
// from `event.target` via `closest('.card')`, so a pointerdown on any descendant
// of `.card` (the tag span, the text div, the meta row) climbs to the card
// itself. (Both helpers default to this `closest()` walk-up now; `delegate` is
// the right pick here purely because pointerdown bubbles.)
//
// Page-lifetime registration: `root` is the kanban mount root, attached once at
// module load and never torn down. The leading `void` is the explicit-discard
// sigil for `kerfjs/require-delegate-disposer` — it signals "I know this is
// page-lifetime and intentionally discarded the disposer." For transient roots
// (modals, route views, mount swaps) capture and call the disposer — see
// docs/5-event-delegation.md §5.3.
void delegate(root, 'pointerdown', '.card', (e, el) => {
  if (drag.value) return;
  const ev = e as PointerEvent;
  if (ev.button !== 0) return;
  // KF-163: suppress the browser's default text-selection start. `user-select: none`
  // in CSS prevents the *visual* highlight inside the card but doesn't stop pointerdown
  // from initiating a selection that drifts into siblings as the cursor moves. Calling
  // preventDefault on the down event is the canonical fix and keeps the page selection
  // empty for the duration of the drag.
  ev.preventDefault();
  const card = el as HTMLElement;
  const rect = card.getBoundingClientRect();
  startX = ev.clientX;
  startY = ev.clientY;
  drag.value = { id: card.dataset.card!, w: rect.width, h: rect.height };
  // The signal write above runs the mount() re-render synchronously (signals-core
  // effects are synchronous), so the `.dragging` + `data-morph-skip` row already
  // exists in the DOM by the time we look it up here.
  dragEl = root.querySelector(`.card.dragging[data-card="${card.dataset.card!}"]`) as HTMLElement | null;
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp, { once: true });
});

function onMove(ev: PointerEvent) {
  if (!dragEl) return;
  const dx = ev.clientX - startX;
  const dy = ev.clientY - startY;
  // Imperative: bypass the reactive path so we update at pointer rate without
  // re-rendering the row. The row is `data-morph-skip` so the morph won't undo this.
  dragEl.style.transform = `translate(${dx}px, ${dy}px) rotate(2deg)`;
}

function onUp(ev: PointerEvent) {
  window.removeEventListener('pointermove', onMove);
  const d = drag.value;
  dragEl = null;
  drag.value = null;
  if (!d) return;
  // Find the column and slot the cursor was over.
  const colEl = (document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null)?.closest('.col') as HTMLElement | null;
  if (!colEl) return;
  const toCol = colEl.dataset.col as ColId;
  const cards = Array.from(colEl.querySelectorAll<HTMLElement>('.card:not(.dragging)'));
  let toIdx = cards.length;
  for (let i = 0; i < cards.length; i++) {
    const r = cards[i].getBoundingClientRect();
    if (ev.clientY < r.top + r.height / 2) {
      toIdx = i;
      break;
    }
  }
  board.actions.move(d.id, toCol, toIdx);
}
