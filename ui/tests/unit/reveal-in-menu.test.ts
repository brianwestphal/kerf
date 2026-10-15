import { describe, expect, it, vi } from 'vitest';

import { revealInMenu } from '../../src/components/actions/popup-menu/internal/reveal-in-menu.js';

function menuOf(scrollHeight: number, clientHeight: number, top = 100) {
  const menu = document.createElement('div');
  Object.defineProperty(menu, 'scrollHeight', { value: scrollHeight });
  Object.defineProperty(menu, 'clientHeight', { value: clientHeight });
  Object.defineProperty(menu, 'clientTop', { value: 1 });
  vi.spyOn(menu, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, top, 200, clientHeight + 2),
  );
  const item = document.createElement('button');
  menu.append(item);
  const at = (itemTop: number, height = 40) =>
    vi
      .spyOn(item, 'getBoundingClientRect')
      .mockReturnValue(new DOMRect(0, itemTop, 200, height));
  return { menu, item, at };
}

describe('revealInMenu', () => {
  it('leaves a menu that does not scroll alone', () => {
    const { menu, item, at } = menuOf(200, 200);
    at(400);
    revealInMenu(item, menu);
    expect(menu.scrollTop).toBe(0);
  });

  it('scrolls an item below the visible rows up to the bottom edge', () => {
    const { menu, item, at } = menuOf(800, 200);
    at(320);
    revealInMenu(item, menu);
    // The clip runs from 101 to 301; the item ends at 360.
    expect(menu.scrollTop).toBe(59);
  });

  it('scrolls an item above the visible rows down to the top edge', () => {
    const { menu, item, at } = menuOf(800, 200);
    menu.scrollTop = 100;
    at(61);
    revealInMenu(item, menu);
    expect(menu.scrollTop).toBe(60);
  });

  it('leaves an item already inside the visible rows', () => {
    const { menu, item, at } = menuOf(800, 200);
    menu.scrollTop = 10;
    at(150);
    revealInMenu(item, menu);
    expect(menu.scrollTop).toBe(10);
  });
});
