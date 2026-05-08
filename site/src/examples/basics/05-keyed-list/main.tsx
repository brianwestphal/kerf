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
  <div class="kerf-stack" style="max-width: 26rem;">
    <p class="kerf-helper-text">
      Type into a row's input. The list reshuffles every 1.5 s — your focus, your text, and your caret all survive.
    </p>
    <div class="kerf-toolbar">
      <button data-action="toggle-tick">
        {ticking.value ? 'Pause auto-shuffle' : 'Resume auto-shuffle'}
      </button>
    </div>
    <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.4rem;">
      {each(
        rows.value,
        (r) => (
          <li data-key={r.id} style="display: flex; align-items: center; gap: 0.5rem;">
            <input value={r.label} data-id={r.id} style="flex: 1;" />
            <button data-action="delete" data-id={r.id} aria-label={`Delete ${r.label}`}>×</button>
          </li>
        ),
        (r) => r.id,
      )}
    </ul>
    <details data-morph-skip class="kerf-helper-text">
      <summary style="cursor: pointer;">Manual triggers (these will steal focus when clicked)</summary>
      <div class="kerf-toolbar" style="margin-top: 0.5rem;">
        <button data-action="insert">Insert at top</button>
        <button data-action="shuffle-now">Shuffle now</button>
      </div>
      <p style="margin-top: 0.5rem;">
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
