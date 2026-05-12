import { defineStore, signal, mount, each, delegateCapture } from 'kerfjs';

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

interface DragState { id: string; dx: number; dy: number; w: number; h: number }
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
                // While dragging, freeze the card via data-morph-skip and apply a transform.
                // Without skip, the diff might recurse and the transform would fight identity.
                const style = dragging
                  ? `position:relative;z-index:10;transform:translate(${d!.dx}px,${d!.dy}px) rotate(2deg);width:${d!.w}px;pointer-events:none`
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

// One delegateCapture for pointerdown — capture-phase makes it predictable inside
// nested containers. The other phases (move/up) bind to window during the drag.
let startX = 0;
let startY = 0;

delegateCapture(root, 'pointerdown', '.card', (e, el) => {
  if (drag.value) return;
  const ev = e as PointerEvent;
  if (ev.button !== 0) return;
  const card = el as HTMLElement;
  const rect = card.getBoundingClientRect();
  startX = ev.clientX;
  startY = ev.clientY;
  drag.value = { id: card.dataset.card!, dx: 0, dy: 0, w: rect.width, h: rect.height };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp, { once: true });
});

function onMove(ev: PointerEvent) {
  const d = drag.value;
  if (!d) return;
  drag.value = { ...d, dx: ev.clientX - startX, dy: ev.clientY - startY };
}

function onUp(ev: PointerEvent) {
  window.removeEventListener('pointermove', onMove);
  const d = drag.value;
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
