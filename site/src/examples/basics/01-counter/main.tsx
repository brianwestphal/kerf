import { signal, mount, delegate, attr } from 'kerfjs';

const count = signal(0);

const ACTIONS = {
  inc: attr('data-action', 'inc'),
  dec: attr('data-action', 'dec'),
} as const;

const root = document.getElementById('app')!;

mount(root, () => (
  <div class="kerf-toolbar">
    <button {...ACTIONS.dec.attrs} aria-label="Decrement">
      −
    </button>
    <span
      class="kerf-mono"
      style="min-width: 3ch; text-align: center; font-size: 1.25rem;"
    >
      {count.value}
    </span>
    <button {...ACTIONS.inc.attrs} aria-label="Increment">
      +
    </button>
  </div>
));

// The demo root lives as long as the page, so each delegate() is
// page-lifetime and its disposer is deliberately discarded with `void`.
void delegate(root, 'click', ACTIONS.inc.selector, () => {
  count.value += 1;
});
void delegate(root, 'click', ACTIONS.dec.selector, () => {
  count.value -= 1;
});
