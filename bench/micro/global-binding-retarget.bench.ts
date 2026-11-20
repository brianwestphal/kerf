/** Equal-surrounds mount workload. Copy this fixture to the base revision to compare. */
import { bench, describe } from 'vitest';

import { each } from '../../src/each.js';
import { jsx } from '../../src/jsx-runtime.js';
import { mount } from '../../src/mount.js';
import { signal } from '../../src/reactive.js';

for (const count of [0, 1, 100, 1000]) {
  describe(`global holes: ${count}`, () => {
    for (const changed of new Set([0, Math.min(count, 1), count])) {
      const root = document.createElement('div');
      const toggle = signal(false);
      const a = signal('a');
      const b = signal('b');
      const slots = Array.from({ length: count }, (_, i) => i);
      mount(root, () => {
        const flip = toggle.value;
        return jsx('div', {
          children: slots.map((i) =>
            jsx('span', { title: flip && i < changed ? b : a }),
          ),
        });
      });
      bench(`switch ${changed}`, () => {
        toggle.value = !toggle.peek();
      });
    }
  });
}
describe('1000 rows with row-scope holes only', () => {
  const root = document.createElement('div');
  const tick = signal(false);
  const label = signal('label');
  const items = Array.from({ length: 1000 }, (_, id) => ({ id }));
  mount(root, () => {
    void tick.value;
    return each(items, (row) =>
      jsx('p', { 'data-key': row.id, children: label }),
    );
  });
  bench('unchanged coarse render', () => {
    tick.value = !tick.peek();
  });
});
