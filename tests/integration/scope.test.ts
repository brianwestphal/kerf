/**
 * Integration: `kerfjs/scope` in the append-heavy-feed scenario it exists for.
 * Cards register a mount + an effect in their scope; when a card is removed,
 * observeRemovals auto-disposes it, so its effect stops re-running — the leak
 * every app hand-rolled a fix for.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { signal } from '../../src/reactive.js';
import { disposeScope, observeRemovals } from '../../src/scope.js';

const microtask = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  document.body.innerHTML = '';
});

describe('scope — append-heavy feed', () => {
  it('removed cards stop their effects (no leak); surviving cards keep updating', async () => {
    const feed = document.createElement('div');
    document.body.appendChild(feed);
    const stop = observeRemovals(feed);

    const tick = signal(0);
    const runs: Record<string, number> = { a: 0, b: 0 };

    const addCard = (id: string): HTMLElement => {
      const card = document.createElement('div');
      card.dataset.id = id;
      feed.appendChild(card);
      const s = disposeScope(card);
      s.mount(card, () => `card ${id}`);
      s.effect(() => {
        void tick.value; // subscribe
        runs[id]++;
      });
      return card;
    };

    addCard('a');
    addCard('b');
    expect(runs).toEqual({ a: 1, b: 1 }); // effects ran once on setup
    expect(feed.querySelector('[data-id="a"]')?.textContent).toBe('card a');

    tick.value++; // both re-run
    expect(runs).toEqual({ a: 2, b: 2 });

    // Remove card A — observeRemovals auto-disposes its scope (mount + effect).
    feed.querySelector('[data-id="a"]')?.remove();
    await microtask();

    tick.value++; // only B is still subscribed
    expect(runs.a).toBe(2); // A's effect was disposed — did NOT re-run (no leak)
    expect(runs.b).toBe(3); // B keeps updating

    stop();
  });
});
