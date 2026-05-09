/**
 * Unit tests for `each()` — keyed list iteration with per-item memoisation.
 */

import { describe, expect, it, vi } from 'vitest';

import { each, raw } from '../../src/index.js';

describe('each', () => {
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

  it('reuses cached HTML on repeat calls with the same item identity', () => {
    const items = [{ id: 1 }, { id: 2 }];
    const render = vi.fn((item: { id: number }) => `<li>${item.id}</li>`);
    each(items, render);
    expect(render).toHaveBeenCalledTimes(2);
    each(items, render);
    expect(render).toHaveBeenCalledTimes(2);
  });

  it('re-renders when an item is replaced with a fresh object', () => {
    const a = { id: 1 };
    const b = { id: 2 };
    const render = vi.fn((item: { id: number }) => `<li>${item.id}</li>`);
    each([a, b], render);
    expect(render).toHaveBeenCalledTimes(2);
    const bPrime = { id: 2 };
    each([a, bPrime], render);
    expect(render).toHaveBeenCalledTimes(3);
  });

  it('re-renders when the optional key changes for an item', () => {
    const a = { id: 1 };
    const b = { id: 2 };
    let highlight = 1;
    const render = vi.fn((item: { id: number }) =>
      `<li class="${item.id === highlight ? 'on' : 'off'}">${item.id}</li>`);
    const key = (item: { id: number }): boolean => item.id === highlight;
    each([a, b], render, key);
    expect(render).toHaveBeenCalledTimes(2);
    highlight = 2;
    each([a, b], render, key);
    expect(render).toHaveBeenCalledTimes(4);
  });

  it('hits the cache when key is unchanged across calls', () => {
    const items = [{ id: 1 }, { id: 2 }];
    const render = vi.fn((item: { id: number }) => `<li>${item.id}</li>`);
    const key = (item: { id: number }): number => item.id;
    each(items, render, key);
    expect(render).toHaveBeenCalledTimes(2);
    each(items, render, key);
    expect(render).toHaveBeenCalledTimes(2);
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

  it('does NOT collide across two each() calls with different render fns over the same items (KF-73)', () => {
    const items = [{ id: 1 }, { id: 2 }];
    const a = each(items, (it) => `<li class="A">${it.id}</li>`);
    const b = each(items, (it) => `<li class="B">${it.id}</li>`);
    expect(a.toString()).toBe('<li class="A">1</li><li class="A">2</li>');
    expect(b.toString()).toBe('<li class="B">1</li><li class="B">2</li>');
  });

  it('still shares the cache when two each() calls reuse the SAME render fn over the same items', () => {
    const items = [{ id: 1 }, { id: 2 }];
    const render = vi.fn((it: { id: number }) => `<li>${it.id}</li>`);
    each(items, render);
    expect(render).toHaveBeenCalledTimes(2);
    each(items, render); // same render fn → cache HIT
    expect(render).toHaveBeenCalledTimes(2);
  });
});
