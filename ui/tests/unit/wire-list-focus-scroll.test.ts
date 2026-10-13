import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { List } from '../../src/components/collections/list/list.js';
import { wireListFocusScroll } from '../../src/components/collections/list/wiring/wire-list-focus-scroll.js';
import { ListItem } from '../../src/components/collections/list-item/list-item.js';

const roots: HTMLElement[] = [];
let scrollIntoView: ReturnType<
  typeof vi.fn<(arg?: boolean | ScrollIntoViewOptions) => void>
>;
let originalScrollIntoView: typeof Element.prototype.scrollIntoView;
let originalMatches: typeof Element.prototype.matches;
let focusVisible: boolean;

/** Viewport rects by element: the list's box and each row's box. */
const rects = new Map<Element, { top: number; bottom: number }>();

beforeEach(() => {
  focusVisible = true;
  originalScrollIntoView = Element.prototype.scrollIntoView;
  scrollIntoView = vi.fn<(arg?: boolean | ScrollIntoViewOptions) => void>();
  Element.prototype.scrollIntoView = scrollIntoView;
  originalMatches = Element.prototype.matches;
  // happy-dom has no focus-visible heuristics; drive the modality directly.
  vi.spyOn(Element.prototype, 'matches').mockImplementation(function (
    this: Element,
    selector: string,
  ) {
    if (selector === ':focus-visible') return focusVisible;
    return originalMatches.call(this, selector);
  });
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
});

afterEach(() => {
  vi.restoreAllMocks();
  Element.prototype.scrollIntoView = originalScrollIntoView;
  rects.clear();
  for (const root of roots.splice(0)) root.remove();
});

function mount(scrollable = true) {
  const root = document.createElement('div');
  root.innerHTML = String(
    List({
      scrollable,
      children: [
        ListItem({ action: 'pick', itemId: 'a', label: 'A' }),
        ListItem({ action: 'pick', itemId: 'b', label: 'B' }),
      ],
    }),
  );
  document.body.append(root);
  roots.push(root);
  const list = root.querySelector<HTMLElement>('[data-component="list"]')!;
  Object.defineProperty(list, 'clientHeight', { value: 100 });
  const buttons = [...root.querySelectorAll<HTMLElement>('button')];
  for (const button of buttons) {
    button.style.outline = '3px solid blue';
    button.style.outlineOffset = '1px';
  }
  rects.set(list, { top: 0, bottom: 100 });
  return { root, list, buttons };
}

describe('wireListFocusScroll', () => {
  it('scrolls a keyboard-focused row whose ring crosses the clip into view', () => {
    const { root, buttons } = mount();
    // The row sits 2px inside the bottom edge; its 4px ring reach crosses it.
    rects.set(buttons[1]!, { top: 60, bottom: 98 });
    const dispose = wireListFocusScroll(root);
    buttons[1]!.focus();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: 'nearest',
      inline: 'nearest',
    });
    expect(scrollIntoView.mock.contexts[0]).toBe(buttons[1]);
    dispose();
  });

  it('catches a ring crossing the top edge too', () => {
    const { root, buttons } = mount();
    rects.set(buttons[0]!, { top: 2, bottom: 40 });
    const dispose = wireListFocusScroll(root);
    buttons[0]!.focus();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    dispose();
  });

  it('leaves a row whose whole ring is inside the clip alone', () => {
    const { root, buttons } = mount();
    rects.set(buttons[0]!, { top: 10, bottom: 50 });
    const dispose = wireListFocusScroll(root);
    buttons[0]!.focus();
    expect(scrollIntoView).not.toHaveBeenCalled();
    dispose();
  });

  it('ignores pointer focus, so a click never scrolls the row away', () => {
    const { root, buttons } = mount();
    rects.set(buttons[1]!, { top: 80, bottom: 130 });
    focusVisible = false;
    const dispose = wireListFocusScroll(root);
    buttons[1]!.focus();
    expect(scrollIntoView).not.toHaveBeenCalled();
    dispose();
  });

  it('ignores rows of a List that does not scroll', () => {
    const { root, buttons } = mount(false);
    rects.set(buttons[1]!, { top: 80, bottom: 130 });
    const dispose = wireListFocusScroll(root);
    buttons[1]!.focus();
    expect(scrollIntoView).not.toHaveBeenCalled();
    dispose();
  });

  it('ignores the scrollable List itself taking focus', () => {
    const { root, list } = mount();
    list.tabIndex = 0;
    rects.set(list, { top: 0, bottom: 100 });
    const dispose = wireListFocusScroll(root);
    list.focus();
    expect(scrollIntoView).not.toHaveBeenCalled();
    dispose();
  });

  it('measures an element with no focus ring by its border box alone', () => {
    const { root, buttons } = mount();
    buttons[1]!.style.outline = 'none';
    rects.set(buttons[1]!, { top: 60, bottom: 98 });
    const dispose = wireListFocusScroll(root);
    buttons[1]!.focus();
    expect(scrollIntoView).not.toHaveBeenCalled();
    rects.set(buttons[0]!, { top: -5, bottom: 30 });
    buttons[0]!.focus();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    dispose();
  });

  it('stops after disposal, and wires a document root', () => {
    const { root, buttons } = mount();
    rects.set(buttons[1]!, { top: 60, bottom: 98 });
    const dispose = wireListFocusScroll(root);
    dispose();
    buttons[1]!.focus();
    expect(scrollIntoView).not.toHaveBeenCalled();
    buttons[1]!.blur();
    const disposeDocument = wireListFocusScroll(document);
    buttons[1]!.focus();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    disposeDocument();
  });
});
