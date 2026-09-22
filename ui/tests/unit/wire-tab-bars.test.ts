import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppTab } from '../../src/app-tab.js';
import { TabBar } from '../../src/tab-bar.js';
import { reorderTabs, wireTabBars } from '../../src/wire-tab-bars.js';

const roots: HTMLElement[] = [];
let originalScrollIntoView: typeof Element.prototype.scrollIntoView;

function bar(id = 'documents') {
  const root = document.createElement('div');
  root.innerHTML = String(
    TabBar({
      id,
      label: 'Documents',
      children: [
        AppTab({
          id: 'one',
          name: 'One',
          selected: true,
          draggable: true,
          rootAttributes: { 'data-domain-tab': 'one' },
        }),
        AppTab({
          id: 'two',
          name: 'Two',
          draggable: true,
          rootAttributes: { 'data-domain-tab': 'two' },
        }),
        AppTab({
          id: 'three',
          name: 'Three',
          draggable: true,
          rootAttributes: { 'data-domain-tab': 'three' },
        }),
      ],
    }),
  );
  document.body.append(root);
  roots.push(root);
  return root;
}

beforeEach(() => {
  originalScrollIntoView = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
  Element.prototype.scrollIntoView = originalScrollIntoView;
  for (const root of roots.splice(0)) root.remove();
});

describe('TabBar wiring', () => {
  it('reorders immutably before and after and leaves invalid requests unchanged', () => {
    const items = ['one', 'two', 'three'];
    expect(
      reorderTabs(items, (item) => item, 'three', 'one', 'before'),
    ).toEqual(['three', 'one', 'two']);
    expect(reorderTabs(items, (item) => item, 'one', 'two', 'after')).toEqual([
      'two',
      'one',
      'three',
    ]);
    expect(reorderTabs(items, (item) => item, 'one', 'one', 'after')).toEqual(
      items,
    );
    expect(
      reorderTabs(items, (item) => item, 'missing', 'two', 'after'),
    ).toEqual(items);
    expect(
      reorderTabs(items, (item) => item, 'one', 'missing', 'after'),
    ).toEqual(items);
    expect(reorderTabs(items, (item) => item, 'one', 'two', 'before')).not.toBe(
      items,
    );
  });

  it('restores automatic activation focus after a controlled strip replacement', async () => {
    const root = bar();
    const other = bar('other');
    const stop = wireTabBars(document, { onReorder: vi.fn() });
    root.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (!target.matches('[role="tab"]')) return;
      const id = target.closest<HTMLElement>('[data-component="app-tab"]')!
        .dataset.tabId;
      for (const button of root.querySelectorAll('[role="tab"]'))
        button.setAttribute('aria-selected', String(button === target));
      root.replaceChildren(
        ...Array.from(root.childNodes, (node) => node.cloneNode(true)),
      );
      expect(
        root.querySelector(
          `[data-component="app-tab"][data-tab-id="${id}"] [role="tab"]`,
        ),
      ).not.toBe(target);
    });
    root.querySelector<HTMLElement>('[role="tab"]')!.focus();
    for (const [key, id] of [
      ['ArrowRight', 'two'],
      ['End', 'three'],
      ['ArrowRight', 'one'],
      ['ArrowLeft', 'three'],
      ['Home', 'one'],
      ['ArrowRight', 'two'],
    ]) {
      document.activeElement!.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true }),
      );
      await Promise.resolve();
      const replacement = root.querySelector<HTMLElement>(
        `[data-component="app-tab"][data-tab-id="${id}"] [role="tab"]`,
      )!;
      expect(document.activeElement).toBe(replacement);
      expect(replacement.getAttribute('aria-selected')).toBe('true');
      expect(other.contains(document.activeElement)).toBe(false);
    }
    stop();
  });

  it.each(['automatic-activation', 'keyboard-reorder'] as const)(
    'does not restore focus after disposal with pending %s',
    async (transition) => {
      const root = bar();
      const outside = document.createElement('button');
      document.body.append(outside);
      const stop = wireTabBars(root, {
        onReorder: () => {
          root.replaceChildren(
            ...Array.from(root.childNodes, (node) => node.cloneNode(true)),
          );
        },
      });
      if (transition === 'automatic-activation') {
        root.addEventListener('click', (event) => {
          if (!(event.target as Element).matches('[role="tab"]')) return;
          root.replaceChildren(
            ...Array.from(root.childNodes, (node) => node.cloneNode(true)),
          );
        });
      }
      const source = root.querySelector<HTMLButtonElement>('[role="tab"]')!;
      source.focus();
      source.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowRight',
          altKey: transition === 'keyboard-reorder',
          shiftKey: transition === 'keyboard-reorder',
          bubbles: true,
        }),
      );
      stop();
      outside.focus();
      await Promise.resolve();
      expect(document.activeElement).toBe(outside);
    },
  );

  it('navigates, closes, and reports keyboard reorder while preserving tab focus', async () => {
    const root = bar();
    const onReorder = vi.fn();
    const stop = wireTabBars(root, { onReorder });
    const tabs = [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    tabs[0]!.focus();
    tabs[0]!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    expect(document.activeElement).toBe(tabs[1]);
    tabs[1]!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Home', bubbles: true }),
    );
    expect(document.activeElement).toBe(tabs[0]);
    tabs[0]!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'End', bubbles: true }),
    );
    expect(document.activeElement).toBe(tabs[2]);
    const close = vi.spyOn(
      root.querySelector<HTMLButtonElement>(
        '[data-tab-id="three"].kui-app-tab__close',
      )!,
      'click',
    );
    tabs[2]!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }),
    );
    expect(close).toHaveBeenCalledOnce();
    tabs[1]!.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        altKey: true,
        shiftKey: true,
        bubbles: true,
      }),
    );
    expect(onReorder).toHaveBeenCalledWith({
      barId: 'documents',
      sourceId: 'two',
      targetId: 'three',
      position: 'after',
      source: 'keyboard',
    });
    tabs[2]!.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        altKey: true,
        shiftKey: true,
        bubbles: true,
      }),
    );
    expect(onReorder).toHaveBeenCalledWith({
      barId: 'documents',
      sourceId: 'three',
      targetId: 'two',
      position: 'before',
      source: 'keyboard',
    });
    tabs[0]!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
    );
    expect(document.activeElement).toBe(tabs[2]);
    tabs[0]!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    await Promise.resolve();
    expect(document.activeElement).toBe(tabs[2]);
    stop();
  });

  function activationBar(id: string, activation?: 'automatic' | 'manual') {
    const root = document.createElement('div');
    root.innerHTML = String(
      TabBar({
        id,
        label: id,
        activation,
        children: [
          AppTab({ id: 'one', name: 'One', selected: true }),
          AppTab({ id: 'two', name: 'Two' }),
        ],
      }),
    );
    document.body.append(root);
    roots.push(root);
    return [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  }

  it('activates on arrow by default but only moves roving focus in manual mode', () => {
    const autoTabs = activationBar('auto');
    const stopAuto = wireTabBars(document.body, { onReorder: vi.fn() });
    const autoClick = vi.spyOn(autoTabs[1]!, 'click');
    autoTabs[0]!.focus();
    autoTabs[0]!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    expect(document.activeElement).toBe(autoTabs[1]); // focus moved
    expect(autoClick).toHaveBeenCalledOnce(); // AND selected
    stopAuto();

    const manualTabs = activationBar('manual');
    const stopManual = wireTabBars(document.body, {
      onReorder: vi.fn(),
      activation: 'manual',
    });
    const manualClick = vi.spyOn(manualTabs[1]!, 'click');
    manualTabs[0]!.focus();
    manualTabs[0]!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    expect(document.activeElement).toBe(manualTabs[1]); // focus moved
    expect(manualClick).not.toHaveBeenCalled(); // but NOT selected
    // Enter / Space activate natively on the tab <button>; an explicit click still selects.
    manualTabs[1]!.click();
    expect(manualClick).toHaveBeenCalledOnce();
    stopManual();
  });

  it('lets a per-bar data-tab-activation attribute override the wireTabBars option', () => {
    // Bar attribute forces manual even though the option is the default automatic.
    const manualBar = activationBar('manual-attr', 'manual');
    expect(
      manualBar[0]!
        .closest('[data-component="tab-bar"]')!
        .getAttribute('data-tab-activation'),
    ).toBe('manual');
    const stopA = wireTabBars(document.body, { onReorder: vi.fn() });
    const manualClick = vi.spyOn(manualBar[1]!, 'click');
    manualBar[0]!.focus();
    manualBar[0]!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    expect(document.activeElement).toBe(manualBar[1]);
    expect(manualClick).not.toHaveBeenCalled();
    stopA();

    // Bar attribute forces automatic even though the option is manual.
    const autoBar = activationBar('auto-attr', 'automatic');
    const stopB = wireTabBars(document.body, {
      onReorder: vi.fn(),
      activation: 'manual',
    });
    const autoClick = vi.spyOn(autoBar[1]!, 'click');
    autoBar[0]!.focus();
    autoBar[0]!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    expect(autoClick).toHaveBeenCalledOnce();
    stopB();
  });

  it('reports only same-bar pointer drops and clears transient markers', () => {
    const root = bar();
    const other = bar('other');
    root.append(...other.childNodes);
    const onReorder = vi.fn();
    const stop = wireTabBars(root, { onReorder });
    const source = root.querySelector<HTMLElement>(
      '[data-tab-bar-id="documents"] .kui-app-tab[data-tab-id="one"]',
    )!;
    const target = root.querySelector<HTMLElement>(
      '[data-tab-bar-id="documents"] .kui-app-tab[data-tab-id="two"]',
    )!;
    const crossBar = root.querySelector<HTMLElement>(
      '[data-tab-bar-id="other"] .kui-app-tab[data-tab-id="two"]',
    )!;
    Object.defineProperty(target, 'getBoundingClientRect', {
      value: () => ({
        left: 0,
        width: 100,
        right: 100,
        top: 0,
        bottom: 32,
        height: 32,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });
    const transfer = { effectAllowed: '', dropEffect: '', setData: vi.fn() };
    const start = new Event('dragstart', { bubbles: true });
    Object.defineProperty(start, 'dataTransfer', { value: transfer });
    source.dispatchEvent(start);
    expect(source.dataset.domainTab).toBe('one');
    expect(source.dataset.tabDragging).toBe('true');
    expect(transfer.effectAllowed).toBe('move');
    expect(transfer.setData).toHaveBeenCalledWith(
      'application/x-kerf-tab',
      'documents:one',
    );
    crossBar.dispatchEvent(
      new Event('dragover', { bubbles: true, cancelable: true }),
    );
    expect(crossBar.hasAttribute('data-tab-drop-position')).toBe(false);
    const over = new Event('dragover', { bubbles: true, cancelable: true });
    Object.defineProperty(over, 'clientX', { value: 75 });
    Object.defineProperty(over, 'dataTransfer', { value: transfer });
    target.dispatchEvent(over);
    expect(target.getAttribute('data-tab-drop-position')).toBe('after');
    expect(target.dataset.domainTab).toBe('two');
    expect(transfer.dropEffect).toBe('move');
    const third = root.querySelector<HTMLElement>(
      '[data-tab-bar-id="documents"] .kui-app-tab[data-tab-id="three"]',
    )!;
    Object.defineProperty(third, 'getBoundingClientRect', {
      value: () => ({
        left: 0,
        width: 100,
        right: 100,
        top: 0,
        bottom: 32,
        height: 32,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });
    const overBefore = new Event('dragover', {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(overBefore, 'clientX', { value: 25 });
    third.dispatchEvent(overBefore);
    expect(target.hasAttribute('data-tab-drop-position')).toBe(false);
    expect(third.getAttribute('data-tab-drop-position')).toBe('before');
    const drop = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(drop, 'clientX', { value: 75 });
    target.dispatchEvent(drop);
    expect(onReorder).toHaveBeenCalledWith({
      barId: 'documents',
      sourceId: 'one',
      targetId: 'two',
      position: 'after',
      source: 'pointer',
    });
    expect(
      root.querySelector('[data-tab-dragging], [data-tab-drop-position]'),
    ).toBeNull();
    expect(source.dataset.domainTab).toBe('one');
    const startBefore = new Event('dragstart', { bubbles: true });
    source.dispatchEvent(startBefore);
    const dropBefore = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(dropBefore, 'clientX', { value: 25 });
    target.dispatchEvent(dropBefore);
    expect(onReorder).toHaveBeenCalledWith({
      barId: 'documents',
      sourceId: 'one',
      targetId: 'two',
      position: 'before',
      source: 'pointer',
    });
    source.dispatchEvent(new Event('dragstart', { bubbles: true }));
    crossBar.dispatchEvent(
      new Event('drop', { bubbles: true, cancelable: true }),
    );
    expect(
      root.querySelector('[data-tab-dragging], [data-tab-drop-position]'),
    ).toBeNull();
    source.dispatchEvent(new Event('dragstart', { bubbles: true }));
    const disposeOver = new Event('dragover', {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(disposeOver, 'clientX', { value: 75 });
    target.dispatchEvent(disposeOver);
    expect(source.dataset.tabDragging).toBe('true');
    expect(target.dataset.tabDropPosition).toBe('after');
    stop();
    expect(
      root.querySelector('[data-tab-dragging], [data-tab-drop-position]'),
    ).toBeNull();
    expect(source.dataset.domainTab).toBe('one');
    expect(target.dataset.domainTab).toBe('two');
  });

  it('continuously scrolls a dragged tab toward either visible strip edge', () => {
    const root = bar();
    const strip = root.querySelector<HTMLElement>('[data-kui-tab-list]')!;
    const source = root.querySelector<HTMLElement>(
      '.kui-app-tab[data-tab-id="one"]',
    )!;
    Object.defineProperties(strip, {
      clientWidth: { configurable: true, value: 200 },
      scrollWidth: { configurable: true, value: 600 },
    });
    Object.defineProperty(strip, 'getBoundingClientRect', {
      value: () => ({
        left: 0,
        width: 200,
        right: 200,
        top: 0,
        bottom: 40,
        height: 40,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });
    strip.scrollLeft = 100;
    let frame: FrameRequestCallback | undefined;
    let frameId = 0;
    const request = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        frame = callback;
        return ++frameId;
      });
    const cancel = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => undefined);
    const stop = wireTabBars(root, { onReorder: vi.fn() });
    source.dispatchEvent(new Event('dragstart', { bubbles: true }));

    const towardEnd = new Event('dragover', {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(towardEnd, 'clientX', { value: 198 });
    strip.dispatchEvent(towardEnd);
    expect(towardEnd.defaultPrevented).toBe(true);
    expect(strip.dataset.tabAutoscroll).toBe('end');
    expect(request).toHaveBeenCalledOnce();
    const endFrame = frame!;
    endFrame(16);
    expect(strip.scrollLeft).toBeGreaterThan(100);
    expect(request).toHaveBeenCalledTimes(2);

    const boundaryFrame = frame!;
    strip.scrollLeft = 400;
    boundaryFrame(32);
    expect(strip.hasAttribute('data-tab-autoscroll')).toBe(false);

    strip.scrollLeft = 100;
    strip.dispatchEvent(towardEnd);
    strip.dispatchEvent(towardEnd);

    const centered = new Event('dragover', { bubbles: true, cancelable: true });
    Object.defineProperty(centered, 'clientX', { value: 100 });
    strip.dispatchEvent(centered);
    expect(strip.hasAttribute('data-tab-autoscroll')).toBe(false);
    expect(cancel).toHaveBeenCalledOnce();

    const towardStart = new Event('dragover', {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(towardStart, 'clientX', { value: 2 });
    strip.scrollLeft = 0;
    strip.dispatchEvent(towardStart);
    expect(strip.hasAttribute('data-tab-autoscroll')).toBe(false);
    strip.scrollLeft = 100;
    strip.dispatchEvent(towardStart);
    expect(strip.dataset.tabAutoscroll).toBe('start');
    const startFrame = frame!;
    startFrame(32);
    expect(strip.scrollLeft).toBeLessThan(100);
    strip.remove();
    const missingStrip = new Event('dragover', {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(missingStrip, 'clientX', { value: 100 });
    root
      .querySelector('[data-component="tab-bar"]')!
      .dispatchEvent(missingStrip);
    root.dispatchEvent(new Event('dragend', { bubbles: true }));
    expect(strip.hasAttribute('data-tab-autoscroll')).toBe(false);
    stop();
  });

  it('ignores malformed and non-draggable tabs and removes listeners on disposal', () => {
    const root = bar();
    const onReorder = vi.fn();
    const stop = wireTabBars(root, { onReorder });
    const tab = root.querySelector<HTMLElement>(
      '.kui-app-tab[data-tab-id="one"]',
    )!;
    tab.setAttribute('draggable', 'false');
    tab.dispatchEvent(new Event('dragstart', { bubbles: true }));
    root.insertAdjacentHTML(
      'beforeend',
      '<button role="tab">Malformed</button>',
    );
    root.lastElementChild!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    root.lastElementChild!.dispatchEvent(
      new FocusEvent('focusin', { bubbles: true }),
    );
    root.insertAdjacentHTML(
      'beforeend',
      '<div data-component="app-tab" draggable="true" data-tab-id="orphan"><button role="tab">Orphan</button></div>',
    );
    root.lastElementChild!.dispatchEvent(
      new Event('dragstart', { bubbles: true }),
    );
    const tabs = root.querySelector('[data-kui-tab-list]')!;
    tabs.insertAdjacentHTML(
      'beforeend',
      '<div data-component="app-tab" draggable="true"><button role="tab">No id</button></div>',
    );
    tabs.lastElementChild!.dispatchEvent(
      new Event('dragstart', { bubbles: true }),
    );
    const barRoot = root.querySelector<HTMLElement>(
      '[data-component="tab-bar"]',
    )!;
    barRoot.insertAdjacentHTML(
      'beforeend',
      '<div data-component="app-tab" data-tab-id="outside" draggable="true"><button role="tab">Outside list</button></div>',
    );
    barRoot
      .lastElementChild!.querySelector('[role="tab"]')!
      .dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      );
    const savedBarId = barRoot.dataset.tabBarId;
    delete barRoot.dataset.tabBarId;
    root
      .querySelector('.kui-app-tab')!
      .dispatchEvent(new Event('dragstart', { bubbles: true }));
    barRoot.dataset.tabBarId = savedBarId!;
    const fixedMarkup = String(
      AppTab({ id: 'fixed', name: 'Fixed', closable: false }),
    );
    tabs.insertAdjacentHTML('beforeend', fixedMarkup);
    tabs
      .lastElementChild!.querySelector('[role="tab"]')!
      .dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }),
      );
    tabs.lastElementChild!.querySelector('[role="tab"]')!.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        altKey: true,
        shiftKey: true,
        bubbles: true,
      }),
    );
    stop();
    root.querySelector('[role="tab"]')!.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        altKey: true,
        shiftKey: true,
        bubbles: true,
      }),
    );
    expect(onReorder).not.toHaveBeenCalled();

    const documentStop = wireTabBars(document, { onReorder });
    document.dispatchEvent(new Event('dragstart'));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    document.dispatchEvent(new FocusEvent('focusin'));
    documentStop();
  });
});
