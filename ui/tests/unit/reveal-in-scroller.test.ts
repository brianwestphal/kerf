import { afterEach, describe, expect, it, vi } from 'vitest';

import { revealInScroller } from '../../src/components/actions/popup-menu/internal/reveal-in-scroller.js';

const rects = new Map<Element, { top: number; bottom: number }>();
const roots: HTMLElement[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  rects.clear();
  for (const root of roots.splice(0)) root.remove();
});

function measure() {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: Element) {
      const rect = rects.get(this) ?? { top: 0, bottom: 0 };
      return {
        ...rect,
        left: 0,
        right: 100,
        width: 100,
        height: rect.bottom - rect.top,
        x: 0,
        y: rect.top,
        toJSON: () => rect,
      } as DOMRect;
    },
  );
}

/** A 100px-tall scroller whose content is 400px tall. */
function scroller(element: HTMLElement, top = 0) {
  element.style.overflowY = 'auto';
  Object.defineProperty(element, 'scrollHeight', { value: 400 });
  Object.defineProperty(element, 'clientHeight', { value: 100 });
  Object.defineProperty(element, 'clientTop', { value: 0 });
  rects.set(element, { top, bottom: top + 100 });
  return element;
}

function mount(html: string) {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.append(root);
  roots.push(root);
  return root;
}

describe('revealInScroller', () => {
  it('scrolls the container down by the overflow below its clip', () => {
    measure();
    const root = mount('<div data-scroller><div data-item></div></div>');
    const container = scroller(root.querySelector('[data-scroller]')!);
    const item = root.querySelector<HTMLElement>('[data-item]')!;
    container.scrollTop = 10;
    rects.set(item, { top: 80, bottom: 130 });
    revealInScroller(item);
    expect(container.scrollTop).toBe(40);
  });

  it('scrolls the container up by the overflow above its clip', () => {
    measure();
    const root = mount('<div data-scroller><div data-item></div></div>');
    const container = scroller(root.querySelector('[data-scroller]')!, 50);
    const item = root.querySelector<HTMLElement>('[data-item]')!;
    container.scrollTop = 100;
    rects.set(item, { top: 20, bottom: 60 });
    revealInScroller(item);
    expect(container.scrollTop).toBe(70);
  });

  it('leaves an item already inside the clip alone', () => {
    measure();
    const root = mount('<div data-scroller><div data-item></div></div>');
    const container = scroller(root.querySelector('[data-scroller]')!);
    const item = root.querySelector<HTMLElement>('[data-item]')!;
    container.scrollTop = 30;
    rects.set(item, { top: 10, bottom: 60 });
    revealInScroller(item);
    expect(container.scrollTop).toBe(30);
  });

  it('follows slot assignment into a shadow scroller, skipping non-scrolling ancestors', () => {
    measure();
    const root = mount('<div data-host><div data-item></div></div>');
    const host = root.querySelector<HTMLElement>('[data-host]')!;
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML =
      '<div part="submenu"><div data-wrapper><slot></slot></div></div>';
    const submenu = scroller(shadow.querySelector<HTMLElement>('[part]')!);
    const item = root.querySelector<HTMLElement>('[data-item]')!;
    // happy-dom does not implement slot assignment.
    Object.defineProperty(item, 'assignedSlot', {
      value: shadow.querySelector('slot'),
    });
    rects.set(item, { top: 120, bottom: 150 });
    revealInScroller(item);
    expect(submenu.scrollTop).toBe(50);
  });

  it('crosses a shadow root to the host when no slot assigns the node', () => {
    measure();
    const root = mount('<div data-scroller><div data-host></div></div>');
    const container = scroller(root.querySelector('[data-scroller]')!);
    const host = root.querySelector<HTMLElement>('[data-host]')!;
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<div data-item></div>';
    const item = shadow.querySelector<HTMLElement>('[data-item]')!;
    rects.set(item, { top: 90, bottom: 120 });
    revealInScroller(item);
    expect(container.scrollTop).toBe(20);
  });

  it('does nothing without a scrolling ancestor', () => {
    measure();
    const root = mount('<div><div data-item></div></div>');
    const item = root.querySelector<HTMLElement>('[data-item]')!;
    rects.set(item, { top: 900, bottom: 950 });
    expect(() => revealInScroller(item)).not.toThrow();
  });
});
