import { signal, mount, delegate } from 'kerfjs';

const count = signal(0);

const root = document.getElementById('app')!;

mount(root, () => (
  <div>
    <button data-action="inc">+1</button>
    <span style="margin: 0 0.75rem; font-family: ui-monospace, monospace; font-size: 1.2rem;">{count.value}</span>
    <button data-action="dec">-1</button>
  </div>
));

delegate(root, 'click', '[data-action="inc"]', () => { count.value += 1; });
delegate(root, 'click', '[data-action="dec"]', () => { count.value -= 1; });
