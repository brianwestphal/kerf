import { signal, mount, delegate } from 'kerfjs';

const count = signal(0);

const root = document.getElementById('app')!;

mount(root, () => (
  <div class="kerf-toolbar">
    <button data-action="dec" aria-label="Decrement">−</button>
    <span class="kerf-mono" style="min-width: 3ch; text-align: center; font-size: 1.25rem;">
      {count.value}
    </span>
    <button data-action="inc" aria-label="Increment">+</button>
  </div>
));

delegate(root, 'click', '[data-action="inc"]', () => { count.value += 1; });
delegate(root, 'click', '[data-action="dec"]', () => { count.value -= 1; });
