import { signal, mount, each, delegate } from 'kerfjs';

interface Row { id: string; label: string }

const rows = signal<Row[]>([
  { id: 'a', label: 'Alpha'   },
  { id: 'b', label: 'Bravo'   },
  { id: 'c', label: 'Charlie' },
]);
const ticking = signal(true);

let nextId = 1;
let timer: ReturnType<typeof setInterval> | undefined;

function shuffle(): void {
  rows.value = [...rows.value].sort(() => Math.random() - 0.5);
}

function startTicking(): void {
  if (timer !== undefined) return;
  timer = setInterval(shuffle, 1500);
}
function stopTicking(): void {
  if (timer === undefined) return;
  clearInterval(timer);
  timer = undefined;
}

if (ticking.value) startTicking();

const root = document.getElementById('app')!;

mount(root, () => (
  <div>
    <p style="margin: 0 0 0.5rem; font-size: 0.85rem; opacity: 0.85;">
      Type into a row's input. The list reshuffles every 1.5s — your focus, your text, and your caret all survive.
    </p>
    <div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem;">
      <button data-action="toggle-tick">
        {ticking.value ? 'Pause auto-shuffle' : 'Resume auto-shuffle'}
      </button>
    </div>
    <ul style="padding-left: 0; list-style: none;">
      {each(
        rows.value,
        (r) => (
          <li data-key={r.id} style="display: flex; gap: 0.5rem; margin-bottom: 0.35rem;">
            <input value={r.label} data-id={r.id} />
            <button data-action="delete" data-id={r.id}>×</button>
          </li>
        ),
        (r) => r.id,
      )}
    </ul>
    <details style="margin-top: 0.75rem; font-size: 0.85rem; opacity: 0.8;">
      <summary style="cursor: pointer;">Manual triggers (these will steal focus when clicked)</summary>
      <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
        <button data-action="insert">Insert at top</button>
        <button data-action="shuffle-now">Shuffle now</button>
      </div>
      <p style="margin: 0.5rem 0 0;">
        Clicks transfer focus to the button itself, so by the time the list reconciles there's no focused input to preserve. The auto-shuffle above is what actually demos focus survival.
      </p>
    </details>
  </div>
));

delegate(root, 'click', '[data-action="toggle-tick"]', () => {
  ticking.value = !ticking.value;
  if (ticking.value) startTicking(); else stopTicking();
});
delegate(root, 'click', '[data-action="insert"]', () => {
  rows.value = [{ id: `new-${nextId++}`, label: `Row ${nextId}` }, ...rows.value];
});
delegate(root, 'click', '[data-action="shuffle-now"]', shuffle);
delegate(root, 'click', '[data-action="delete"]', (_, btn) => {
  const id = (btn as HTMLElement).dataset.id!;
  rows.value = rows.value.filter((r) => r.id !== id);
});
