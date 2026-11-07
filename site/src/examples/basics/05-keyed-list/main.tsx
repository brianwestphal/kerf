import { signal, mount, each, delegate, attr } from 'kerfjs';

interface Row {
  id: string;
  label: string;
}

const rows = signal<Row[]>([
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Bravo' },
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

const ACTIONS = {
  toggleTick: attr('data-action', 'toggle-tick'),
  insert: attr('data-action', 'insert'),
  shuffleNow: attr('data-action', 'shuffle-now'),
  delete: attr('data-action', 'delete'),
} as const;

const root = document.getElementById('app')!;

mount(root, () => (
  <div class="kerf-stack" style="max-width: 26rem;">
    <p class="kerf-helper-text">
      Type into a row's input. The list reshuffles every 1.5 s — your focus,
      your text, and your caret all survive.
    </p>
    <div class="kerf-toolbar">
      <button {...ACTIONS.toggleTick.attrs}>
        {ticking.value ? 'Pause auto-shuffle' : 'Resume auto-shuffle'}
      </button>
    </div>
    <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.4rem;">
      {each(
        rows.value,
        (r) => (
          <li
            data-key={r.id}
            style="display: flex; align-items: center; gap: 0.5rem;"
          >
            <input value={r.label} data-id={r.id} style="flex: 1;" />
            <button
              {...ACTIONS.delete.attrs}
              data-id={r.id}
              aria-label={`Delete ${r.label}`}
            >
              ×
            </button>
          </li>
        ),
        (r) => r.id,
      )}
    </ul>
    <details data-morph-skip class="kerf-helper-text">
      <summary style="cursor: pointer;">
        Manual triggers (these will steal focus when clicked)
      </summary>
      <div class="kerf-toolbar" style="margin-top: 0.5rem;">
        <button {...ACTIONS.insert.attrs}>Insert at top</button>
        <button {...ACTIONS.shuffleNow.attrs}>Shuffle now</button>
      </div>
      <p style="margin-top: 0.5rem;">
        Clicks transfer focus to the button itself, so by the time the list
        reconciles there's no focused input to preserve. The auto-shuffle above
        is what actually demos focus survival.
      </p>
    </details>
  </div>
));

// The demo root lives as long as the page, so each delegate() is
// page-lifetime and its disposer is deliberately discarded with `void`.
void delegate(root, 'click', ACTIONS.toggleTick.selector, () => {
  ticking.value = !ticking.value;
  if (ticking.value) startTicking();
  else stopTicking();
});
void delegate(root, 'click', ACTIONS.insert.selector, () => {
  rows.value = [
    { id: `new-${nextId++}`, label: `Row ${nextId}` },
    ...rows.value,
  ];
});
void delegate(root, 'click', ACTIONS.shuffleNow.selector, shuffle);
void delegate(root, 'click', ACTIONS.delete.selector, (_, btn) => {
  const id = (btn as HTMLElement).dataset.id!;
  rows.value = rows.value.filter((r) => r.id !== id);
});
