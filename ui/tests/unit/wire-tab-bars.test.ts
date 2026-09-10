import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppTab } from '../../src/app-tab.js';
import { TabBar } from '../../src/tab-bar.js';
import { reorderTabs, wireTabBars } from '../../src/wire-tab-bars.js';

const roots: HTMLElement[] = [];
let originalScrollIntoView: typeof Element.prototype.scrollIntoView;

function bar(id = 'documents') {
  const root = document.createElement('div');
  root.innerHTML = String(TabBar({ id, label: 'Documents', children: [
    AppTab({ id: 'one', name: 'One', selected: true, draggable: true }),
    AppTab({ id: 'two', name: 'Two', draggable: true }),
    AppTab({ id: 'three', name: 'Three', draggable: true }),
  ] }));
  document.body.append(root);
  roots.push(root);
  return root;
}

beforeEach(() => {
  originalScrollIntoView = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  Element.prototype.scrollIntoView = originalScrollIntoView;
  for (const root of roots.splice(0)) root.remove();
});

describe('TabBar wiring', () => {
  it('reorders immutably before and after and leaves invalid requests unchanged', () => {
    const items = ['one', 'two', 'three'];
    expect(reorderTabs(items, (item) => item, 'three', 'one', 'before')).toEqual(['three', 'one', 'two']);
    expect(reorderTabs(items, (item) => item, 'one', 'two', 'after')).toEqual(['two', 'one', 'three']);
    expect(reorderTabs(items, (item) => item, 'one', 'one', 'after')).toEqual(items);
    expect(reorderTabs(items, (item) => item, 'missing', 'two', 'after')).toEqual(items);
    expect(reorderTabs(items, (item) => item, 'one', 'missing', 'after')).toEqual(items);
    expect(reorderTabs(items, (item) => item, 'one', 'two', 'before')).not.toBe(items);
  });

  it('navigates, closes, and reports keyboard reorder while preserving tab focus', async () => {
    const root = bar();
    const onReorder = vi.fn();
    const stop = wireTabBars(root, { onReorder });
    const tabs = [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    tabs[0]!.focus();
    tabs[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(tabs[1]);
    tabs[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(document.activeElement).toBe(tabs[0]);
    tabs[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(document.activeElement).toBe(tabs[2]);
    const close = vi.spyOn(root.querySelector<HTMLButtonElement>('[data-tab-id="three"].kui-app-tab__close')!, 'click');
    tabs[2]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
    expect(close).toHaveBeenCalledOnce();
    tabs[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, shiftKey: true, bubbles: true }));
    expect(onReorder).toHaveBeenCalledWith({ barId: 'documents', sourceId: 'two', targetId: 'three', position: 'after', source: 'keyboard' });
    tabs[2]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true, shiftKey: true, bubbles: true }));
    expect(onReorder).toHaveBeenCalledWith({ barId: 'documents', sourceId: 'three', targetId: 'two', position: 'before', source: 'keyboard' });
    tabs[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(document.activeElement).toBe(tabs[2]);
    tabs[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await Promise.resolve();
    expect(document.activeElement).toBe(tabs[2]);
    stop();
  });

  it('reports only same-bar pointer drops and clears transient markers', () => {
    const root = bar();
    const other = bar('other');
    root.append(...other.childNodes);
    const onReorder = vi.fn();
    const stop = wireTabBars(root, { onReorder });
    const source = root.querySelector<HTMLElement>('[data-tab-bar-id="documents"] .kui-app-tab[data-tab-id="one"]')!;
    const target = root.querySelector<HTMLElement>('[data-tab-bar-id="documents"] .kui-app-tab[data-tab-id="two"]')!;
    const crossBar = root.querySelector<HTMLElement>('[data-tab-bar-id="other"] .kui-app-tab[data-tab-id="two"]')!;
    Object.defineProperty(target, 'getBoundingClientRect', { value: () => ({ left: 0, width: 100, right: 100, top: 0, bottom: 32, height: 32, x: 0, y: 0, toJSON: () => ({}) }) });
    const transfer = { effectAllowed: '', dropEffect: '', setData: vi.fn() };
    const start = new Event('dragstart', { bubbles: true });
    Object.defineProperty(start, 'dataTransfer', { value: transfer });
    source.dispatchEvent(start);
    expect(transfer.effectAllowed).toBe('move');
    expect(transfer.setData).toHaveBeenCalledWith('application/x-kerf-tab', 'documents:one');
    crossBar.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
    expect(crossBar.hasAttribute('data-tab-drop-position')).toBe(false);
    const over = new Event('dragover', { bubbles: true, cancelable: true });
    Object.defineProperty(over, 'clientX', { value: 75 });
    Object.defineProperty(over, 'dataTransfer', { value: transfer });
    target.dispatchEvent(over);
    expect(target.getAttribute('data-tab-drop-position')).toBe('after');
    expect(transfer.dropEffect).toBe('move');
    const third = root.querySelector<HTMLElement>('[data-tab-bar-id="documents"] .kui-app-tab[data-tab-id="three"]')!;
    Object.defineProperty(third, 'getBoundingClientRect', { value: () => ({ left: 0, width: 100, right: 100, top: 0, bottom: 32, height: 32, x: 0, y: 0, toJSON: () => ({}) }) });
    const overBefore = new Event('dragover', { bubbles: true, cancelable: true });
    Object.defineProperty(overBefore, 'clientX', { value: 25 });
    third.dispatchEvent(overBefore);
    expect(target.hasAttribute('data-tab-drop-position')).toBe(false);
    expect(third.getAttribute('data-tab-drop-position')).toBe('before');
    const drop = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(drop, 'clientX', { value: 75 });
    target.dispatchEvent(drop);
    expect(onReorder).toHaveBeenCalledWith({ barId: 'documents', sourceId: 'one', targetId: 'two', position: 'after', source: 'pointer' });
    expect(root.querySelector('[data-tab-dragging], [data-tab-drop-position]')).toBeNull();
    const startBefore = new Event('dragstart', { bubbles: true });
    source.dispatchEvent(startBefore);
    const dropBefore = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(dropBefore, 'clientX', { value: 25 });
    target.dispatchEvent(dropBefore);
    expect(onReorder).toHaveBeenCalledWith({ barId: 'documents', sourceId: 'one', targetId: 'two', position: 'before', source: 'pointer' });
    source.dispatchEvent(new Event('dragstart', { bubbles: true }));
    crossBar.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    expect(root.querySelector('[data-tab-dragging], [data-tab-drop-position]')).toBeNull();
    stop();
  });

  it('ignores malformed and non-draggable tabs and removes listeners on disposal', () => {
    const root = bar();
    const onReorder = vi.fn();
    const stop = wireTabBars(root, { onReorder });
    const tab = root.querySelector<HTMLElement>('.kui-app-tab[data-tab-id="one"]')!;
    tab.setAttribute('draggable', 'false');
    tab.dispatchEvent(new Event('dragstart', { bubbles: true }));
    root.insertAdjacentHTML('beforeend', '<button role="tab">Malformed</button>');
    root.lastElementChild!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    root.lastElementChild!.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    root.insertAdjacentHTML('beforeend', '<div data-component="app-tab" draggable="true" data-tab-id="orphan"><button role="tab">Orphan</button></div>');
    root.lastElementChild!.dispatchEvent(new Event('dragstart', { bubbles: true }));
    const tabs = root.querySelector('[data-kui-tab-list]')!;
    tabs.insertAdjacentHTML('beforeend', '<div data-component="app-tab" draggable="true"><button role="tab">No id</button></div>');
    tabs.lastElementChild!.dispatchEvent(new Event('dragstart', { bubbles: true }));
    const barRoot = root.querySelector<HTMLElement>('[data-component="tab-bar"]')!;
    barRoot.insertAdjacentHTML('beforeend', '<div data-component="app-tab" data-tab-id="outside" draggable="true"><button role="tab">Outside list</button></div>');
    barRoot.lastElementChild!.querySelector('[role="tab"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    const savedBarId = barRoot.dataset.tabBarId;
    delete barRoot.dataset.tabBarId;
    root.querySelector('.kui-app-tab')!.dispatchEvent(new Event('dragstart', { bubbles: true }));
    barRoot.dataset.tabBarId = savedBarId!;
    const fixedMarkup = String(AppTab({ id: 'fixed', name: 'Fixed', closable: false }));
    tabs.insertAdjacentHTML('beforeend', fixedMarkup);
    tabs.lastElementChild!.querySelector('[role="tab"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    tabs.lastElementChild!.querySelector('[role="tab"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true, shiftKey: true, bubbles: true }));
    stop();
    root.querySelector('[role="tab"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, shiftKey: true, bubbles: true }));
    expect(onReorder).not.toHaveBeenCalled();

    const documentStop = wireTabBars(document, { onReorder });
    document.dispatchEvent(new Event('dragstart'));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    document.dispatchEvent(new FocusEvent('focusin'));
    documentStop();
  });
});
