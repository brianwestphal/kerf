/**
 * Unit tests for `each()` — keyed list iteration with per-item memoization.
 *
 * KF-87 changed the cache scope from per-render-fn (module-level) to
 * per-(mount, listId) (mount-owned). Caching is now a `mount()` feature —
 * outside a mount the cache is bypassed and `render` runs every call. The
 * cache-hit tests below exercise the cache via real `mount()` calls so they
 * validate the public surface, not internals.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { each, mount, raw, signal } from '../../src/index.js';

describe('each — basics (no mount context)', () => {
  it('renders each item in order', () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const html = each(items, (item) => `<li>${item.id}</li>`);
    expect(html.toString()).toBe('<li>1</li><li>2</li><li>3</li>');
  });

  it('returns empty string for an empty array', () => {
    expect(each([] as object[], () => '<li/>').toString()).toBe('');
  });

  it('passes the index to render', () => {
    const items = [{}, {}, {}];
    const html = each(items, (_item, i) => `<li>${i}</li>`);
    expect(html.toString()).toBe('<li>0</li><li>1</li><li>2</li>');
  });

  it('accepts SafeHtml from render', () => {
    const items = [{ id: 1 }];
    const html = each(items, (item) => raw(`<li>${item.id}</li>`));
    expect(html.toString()).toBe('<li>1</li>');
  });

  it('does NOT cache across calls when there is no mount context (KF-87)', () => {
    // Outside a mount, caching is bypassed — caching is a mount feature, not
    // a global one. This sidesteps the KF-73 cross-callsite collision class
    // entirely (different render fns can never share an entry because the
    // cache doesn't exist).
    const items = [{ id: 1 }, { id: 2 }];
    const render = vi.fn((item: { id: number }) => `<li>${item.id}</li>`);
    each(items, render);
    expect(render).toHaveBeenCalledTimes(2);
    each(items, render);
    expect(render).toHaveBeenCalledTimes(4);  // re-runs every call — no cache outside mount
  });

  it('throws a descriptive error for primitive items', () => {
    expect(() => each([1, 2, 3] as unknown as object[], (item) => `<li>${String(item)}</li>`))
      .toThrow(/each\(\): items must be objects.*got number at index 0/s);
    expect(() => each(['a'] as unknown as object[], () => '<li/>'))
      .toThrow(/got string at index 0/);
    expect(() => each([null] as unknown as object[], () => '<li/>'))
      .toThrow(/got null at index 0/);
  });

  it('throws when the same object reference appears at multiple indices', () => {
    const obj = { id: 7 };
    expect(() => each([obj, obj], (it) => `<li>${it.id}</li>`))
      .toThrow(/same object reference appears at multiple indices.*again at index 1/s);
  });

  it('throws when a duplicate reference appears mid-list', () => {
    const a = { id: 1 };
    const b = { id: 2 };
    expect(() => each([a, b, a], (it) => `<li>${it.id}</li>`))
      .toThrow(/again at index 2/);
  });

  it('does NOT collide across two each() calls with different render fns over the same items (KF-73 / KF-87)', () => {
    // Outside a mount, no caching happens at all, so this collision class
    // can't occur regardless of the render-fn keying scheme.
    const items = [{ id: 1 }, { id: 2 }];
    const a = each(items, (it) => `<li class="A">${it.id}</li>`);
    const b = each(items, (it) => `<li class="B">${it.id}</li>`);
    expect(a.toString()).toBe('<li class="A">1</li><li class="A">2</li>');
    expect(b.toString()).toBe('<li class="B">1</li><li class="B">2</li>');
  });
});

describe('each — caching (inside a real mount)', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('caches HTML across renders within a mount, even with inline render arrows (KF-87 regression test)', () => {
    // The render fn is an inline arrow inside the mount closure — a fresh
    // function reference on every render. Under KF-73's per-render-fn cache
    // scoping this would defeat the cache; under KF-87's per-(mount, listId)
    // scoping it works correctly.
    const items = [{ id: 1 }, { id: 2 }];
    const tick = signal(0);
    const renders = { count: 0 };
    mount(root, () => {
      void tick.value;  // signal read for re-render trigger
      return each(items, (item: { id: number }) => {
        renders.count += 1;
        return `<li data-key="${item.id}">${item.id}</li>`;
      });
    });
    expect(renders.count).toBe(2);  // initial render runs once per item
    tick.value = 1;
    expect(renders.count).toBe(2);  // cache hit — render not called for unchanged items
  });

  it('re-renders only items that changed across renders (partial-update perf)', () => {
    const a = { id: 1, label: 'a' };
    const b = { id: 2, label: 'b' };
    const itemsSig = signal<{ id: number; label: string }[]>([a, b]);
    const renders = { count: 0 };
    mount(root, () =>
      each(itemsSig.value, (item) => {
        renders.count += 1;
        return `<li data-key="${item.id}">${item.label}</li>`;
      }),
    );
    expect(renders.count).toBe(2);
    // Replace just `b` with a fresh object — `a` stays identity-stable.
    const bPrime = { id: 2, label: 'b!' };
    itemsSig.value = [a, bPrime];
    expect(renders.count).toBe(3);  // only the new b' triggers a render
  });

  it('re-renders an item when its optional cache key changes (selection-flip pattern)', () => {
    const a = { id: 1 };
    const b = { id: 2 };
    const items = [a, b];
    const selected = signal<number | null>(null);
    const renders = { count: 0 };
    mount(root, () => {
      const sel = selected.value;
      return each(
        items,
        (item) => {
          renders.count += 1;
          return `<li data-key="${item.id}" class="${item.id === sel ? 'on' : 'off'}">${item.id}</li>`;
        },
        (item) => (item.id === sel ? 1 : 0),
      );
    });
    expect(renders.count).toBe(2);
    // Select item 2 — only its cacheKey flips. Item 1's stays at 0. So only
    // item 2 re-renders.
    selected.value = 2;
    expect(renders.count).toBe(3);
    // Select item 1 — both items' cacheKeys flip (1 from 0→1, 2 from 1→0).
    // Both re-render.
    selected.value = 1;
    expect(renders.count).toBe(5);
  });

  it('two each() callsites in the same mount get separate caches (KF-73 collision-free)', () => {
    // Two each() callsites at different positions within the same render get
    // different listIds and therefore different caches, even when render fn
    // returns different HTML for the same items. The KF-73 collision can't
    // occur.
    const items = [{ id: 1 }, { id: 2 }];
    let lastA = '';
    let lastB = '';
    mount(root, () => {
      const a = each(items, (it: { id: number }) => `<li data-key="a-${it.id}" class="A">${it.id}</li>`);
      const b = each(items, (it: { id: number }) => `<li data-key="b-${it.id}" class="B">${it.id}</li>`);
      lastA = a.toString();
      lastB = b.toString();
      return raw(a.toString() + b.toString());
    });
    expect(lastA).toBe('<li data-key="a-1" class="A">1</li><li data-key="a-2" class="A">2</li>');
    expect(lastB).toBe('<li data-key="b-1" class="B">1</li><li data-key="b-2" class="B">2</li>');
  });
});
