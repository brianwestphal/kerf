/**
 * Integration: `kerfjs/timing` composed with signals + mount. A `debouncedSignal`
 * trails a source signal, and a `mount()` region rendered off the debounced
 * value only repaints once the source's writes go quiet — the search-as-you-type
 * shape without a hand-rolled timer.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { jsx } from '../../src/jsx-runtime.js';
import { mount } from '../../src/mount.js';
import { signal } from '../../src/reactive.js';
import { debounce, debouncedSignal } from '../../src/timing.js';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('timing — full pipeline', () => {
  it('a debouncedSignal drives a mount() region that repaints only after typing settles', () => {
    const query = signal('');
    const debounced = debouncedSignal(query, 200);
    const app = document.createElement('div');
    document.body.appendChild(app);

    let renders = 0;
    mount(app, () => {
      renders++;
      return jsx('p', { class: 'result', children: `results for: ${debounced.value}` });
    });
    const rendersAfterMount = renders;
    expect(app.querySelector('.result')?.textContent).toBe('results for: ');

    // Simulate fast typing — the source updates each keystroke…
    query.value = 'k';
    query.value = 'ke';
    query.value = 'ker';
    query.value = 'kerf';
    // …but the debounced signal (and thus the region) hasn't moved yet.
    expect(app.querySelector('.result')?.textContent).toBe('results for: ');
    expect(renders).toBe(rendersAfterMount); // no repaint during the burst

    vi.advanceTimersByTime(200);
    expect(app.querySelector('.result')?.textContent).toBe('results for: kerf');
    expect(renders).toBe(rendersAfterMount + 1); // exactly one repaint after settle
  });

  it('debounce() coalesces a burst of imperative saves into a single call', () => {
    const saved: string[] = [];
    const save = debounce((v: string) => saved.push(v), 300);

    for (const v of ['a', 'ab', 'abc']) save(v);
    vi.advanceTimersByTime(299);
    expect(saved).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(saved).toEqual(['abc']); // one write, last value wins
  });
});
