import { mount, signal } from 'kerfjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { px } from '../../src/css-values.js';
import { Toolbar } from '../../src/toolbar.js';
import { ToolbarControlGroup } from '../../src/toolbar-control-group.js';
import { ToolbarText } from '../../src/toolbar-text.js';
import { wireToolbarVisibility } from '../../src/wiring/wire-toolbar-visibility.js';

const hidden = (element: Element) =>
  element.getAttribute('data-toolbar-width-hidden') === 'true';
let resize: () => void;
let disconnected = 0;
const observed = new Set<Element>();
let dispose: (() => void) | undefined;

class ResizeObserverFake {
  constructor(callback: () => void) {
    resize = callback;
  }
  observe(element: Element) {
    observed.add(element);
  }
  unobserve(element: Element) {
    observed.delete(element);
  }
  disconnect() {
    disconnected++;
    observed.clear();
  }
}

async function mutations() {
  await new Promise((resolve) => window.setTimeout(resolve, 0));
}

beforeEach(() => {
  disconnected = 0;
  observed.clear();
  vi.stubGlobal('ResizeObserver', ResizeObserverFake);
  const native = window.getComputedStyle.bind(window);
  vi.spyOn(window, 'getComputedStyle').mockImplementation(
    (element: Element) => {
      const style = native(element);
      const parent = element.parentElement;
      if (parent?.hasAttribute('data-toolbar-visibility-probe')) {
        let value = (element as HTMLElement).style.getPropertyValue(
          '--kui-toolbar-visibility-length',
        );
        value = value.replace(/var\((--[\w-]+)\)/g, (_, name: string) =>
          parent.style.getPropertyValue(name),
        );
        let number: number | undefined;
        const terms = value.replace(/^calc\((.*)\)$/, '$1').split(/\s+\+\s+/);
        const pixels = terms.map((term) => {
          const match = /^(-?[\d.]+)(px|rem|em|%)$/.exec(term);
          if (!match) return NaN;
          const factor =
            match[2] === '%'
              ? parseFloat(parent.style.width) / 100
              : match[2] === 'em'
                ? parseFloat(parent.style.fontSize)
                : match[2] === 'rem'
                  ? parseFloat(
                      document.documentElement.style.fontSize || '16px',
                    )
                  : 1;
          return Number(match[1]) * factor;
        });
        if (pixels.every(Number.isFinite))
          number = pixels.reduce((sum, term) => sum + term, 0);
        return new Proxy(style, {
          get(target, property) {
            if (property === 'left')
              return number === undefined ? '-1px' : `${number}px`;
            const value = Reflect.get(target, property);
            return typeof value === 'function' ? value.bind(target) : value;
          },
        });
      }
      // A faithful inherited CSS context for the Happy DOM fixture: real
      // browsers resolve inherited custom properties and font size here.
      if (
        element.matches(
          '[data-component="toolbar-text"], [data-component="toolbar-control-group"]',
        )
      ) {
        const context = document.createElement('div').style;
        const ancestors: Element[] = [];
        for (
          let current: Element | null = element;
          current;
          current = current.parentElement
        )
          ancestors.unshift(current);
        for (const ancestor of ancestors) {
          const source = (ancestor as HTMLElement).style;
          for (let index = 0; index < source.length; index++) {
            const name = source.item(index);
            if (
              name.startsWith('--') ||
              name.startsWith('font-') ||
              name === 'line-height' ||
              name === 'display'
            )
              context.setProperty(name, source.getPropertyValue(name));
          }
        }
        if (!context.fontSize) context.fontSize = '16px';
        return context as CSSStyleDeclaration;
      }
      return style;
    },
  );
});

afterEach(() => {
  dispose?.();
  dispose = undefined;
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('style');
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function fixture(width = 400) {
  document.body.innerHTML = `<section id="app"><header data-component="toolbar" style="width:${width}px;box-sizing:border-box;padding:8px 16px;border:2px solid"><div><span data-component="toolbar-text" data-hide-below="364px">Identity</span><div data-component="toolbar-control-group" data-show-below="364px"><button>Overflow</button></div></div></header></section>`;
  const app = document.getElementById('app')!;
  const toolbar = app.querySelector<HTMLElement>('header')!;
  const text = app.querySelector<HTMLElement>('span')!;
  const group = app.querySelector<HTMLElement>(
    '[data-component="toolbar-control-group"]',
  )!;
  return { app, toolbar, text, group };
}

describe('toolbar width visibility wiring', () => {
  it('keeps measurement identity across real renders without feeding a render observer', async () => {
    document.body.innerHTML = '<section id="app"></section>';
    const app = document.getElementById('app')!;
    const renders = signal(0);
    const stop = mount(app, () =>
      Toolbar({
        label: 'Updating workspace',
        leading: ToolbarText({
          text: `Workspace ${renders.value}`,
          hideBelow: px(364),
        }),
      }),
    );
    dispose = wireToolbarVisibility(app);
    await mutations();
    const probe = app.querySelector('[data-toolbar-visibility-probe]')!;
    const state = app.querySelector('[data-toolbar-visibility-state]')!;
    expect(hidden(state)).toBe(true);
    let observerRenders = 0;
    const observer = new MutationObserver((records) => {
      if (
        records.some((record) =>
          [...record.addedNodes, ...record.removedNodes].some(
            (node) =>
              node.nodeType === 1 &&
              (node as Element).hasAttribute('data-toolbar-visibility-probe'),
          ),
        ) &&
        observerRenders < 8
      ) {
        observerRenders++;
        renders.value++;
      }
    });
    observer.observe(app, { subtree: true, childList: true });
    try {
      renders.value++;
      for (let index = 0; index < 4; index++) await mutations();
      expect(observerRenders).toBe(0);
      expect(app.querySelector('[data-toolbar-visibility-probe]')).toBe(probe);
      expect(app.querySelector('[data-toolbar-visibility-state]')).toBe(state);
      expect(hidden(state)).toBe(true);
      state.remove();
      await mutations();
      expect(app.querySelector('[data-toolbar-visibility-state]')).toBe(state);
    } finally {
      observer.disconnect();
      dispose();
      dispose = undefined;
      expect(app.querySelector('[data-toolbar-visibility-state]')).toBeNull();
      stop();
    }
  });

  it('settles with a second observer that redraws an unrelated layer after probe mutations', async () => {
    const { app, toolbar, text } = fixture();
    text.dataset.hideBelow = 'var(--cutoff)';
    text.style.setProperty('--cutoff', '500px');
    const layer = document.createElement('aside');
    app.append(layer);
    dispose = wireToolbarVisibility(app);
    await mutations();
    let redraws = 0;
    const observer = new MutationObserver((records) => {
      if (
        records.some(({ target }) =>
          (target as Element).closest?.('[data-toolbar-visibility-probe]'),
        ) &&
        redraws < 8
      ) {
        redraws++;
        layer.replaceChildren(document.createElement('span'));
      }
    });
    observer.observe(app, { subtree: true, attributes: true, childList: true });
    try {
      layer.replaceChildren(document.createElement('span'));
      for (let index = 0; index < 3; index++) await mutations();
      expect(redraws).toBe(0);
      expect(hidden(text)).toBe(true);
      text.style.setProperty('--cutoff', '300px');
      for (let index = 0; index < 3; index++) await mutations();
      expect(hidden(text)).toBe(false);
      expect(redraws).toBe(1);
      toolbar.style.width = '250px';
      resize();
      for (let index = 0; index < 3; index++) await mutations();
      expect(hidden(text)).toBe(true);
      expect(redraws).toBe(2);
      text.style.removeProperty('--cutoff');
      for (let index = 0; index < 3; index++) await mutations();
      expect(hidden(text)).toBe(false);
      expect(
        toolbar
          .querySelector<HTMLElement>('[data-toolbar-visibility-probe]')!
          .style.getPropertyValue('--cutoff'),
      ).toBe('');
      expect(redraws).toBe(3);
    } finally {
      observer.disconnect();
    }
  });

  it('compares CSSOM-normalized context without losing quoted token whitespace', async () => {
    const { app, toolbar, text } = fixture();
    text.style.setProperty('--quoted', '"two  spaces"');
    text.style.fontFamily = 'Arial, sans-serif';
    dispose = wireToolbarVisibility(app);
    await mutations();
    const box = toolbar.querySelector<HTMLElement>(
      '[data-toolbar-visibility-probe]',
    )!;
    expect(box.style.getPropertyValue('--quoted')).toBe('"two  spaces"');
    const mutationsSeen: MutationRecord[] = [];
    const observer = new MutationObserver((records) =>
      mutationsSeen.push(...records),
    );
    observer.observe(box, { attributes: true, subtree: true });
    try {
      for (let index = 0; index < 3; index++) resize();
      await mutations();
      expect(mutationsSeen).toHaveLength(0);
      box.style.setProperty('font-size', '99px', 'important');
      box.style.setProperty('font-kerning', 'auto');
      resize();
      expect(box.style.getPropertyPriority('font-size')).toBe('');
      expect(box.style.fontSize).toBe('16px');
      expect(box.style.fontKerning).toBe('');
    } finally {
      observer.disconnect();
    }
  });

  it('serializes typed thresholds on plain text, actionable text and busy groups', () => {
    for (const content of [
      ToolbarText({
        text: 'Workspace',
        hideBelow: px(176),
        showBelow: px(416),
      }),
      ToolbarText({
        text: 'Workspace',
        action: 'rename',
        hideBelow: px(176),
        showBelow: px(416),
      }),
    ]) {
      const rendered = String(content);
      expect(rendered).toContain('data-hide-below="176px"');
      expect(rendered).toContain('data-show-below="416px"');
    }
    const rendered = String(
      ToolbarControlGroup({
        busy: true,
        children: ToolbarText({ text: 'Save' }),
        hideBelow: px(416),
        showBelow: px(600),
      }),
    );
    expect(rendered).toContain('data-hide-below="416px"');
    expect(rendered).toContain('data-show-below="600px"');
    expect(rendered).toContain('role="status"');
  });

  it('stays visible when computed resolution is unavailable and supports observer-free documents', () => {
    const computed = vi
      .mocked(window.getComputedStyle)
      .getMockImplementation()!;
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
      const style = computed(element);
      if (!element.parentElement?.hasAttribute('data-toolbar-visibility-probe'))
        return style;
      return new Proxy(style, {
        get(target, property) {
          if (property === 'left') return 'auto';
          const value = Reflect.get(target, property);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      });
    });
    vi.stubGlobal('matchMedia', undefined);
    const { app, group } = fixture();
    dispose = wireToolbarVisibility(app);
    expect(hidden(group)).toBe(false);
    const detached = document.implementation.createHTMLDocument('Detached');
    const stop = wireToolbarVisibility(detached);
    stop();
    stop();
  });

  it('repairs removed measurement boxes after an unchanged morph', async () => {
    const { app, toolbar, text, group } = fixture();
    dispose = wireToolbarVisibility(app);
    const probes = [
      ...toolbar.querySelectorAll('[data-toolbar-visibility-probe]'),
    ];
    expect(probes.length).toBe(2);
    for (const probe of probes) probe.remove();
    text.removeAttribute('data-toolbar-width-hidden');
    group.removeAttribute('data-toolbar-width-hidden');
    await mutations();
    expect(
      toolbar.querySelectorAll('[data-toolbar-visibility-probe]').length,
    ).toBe(2);
    expect(hidden(text)).toBe(false);
    expect(hidden(group)).toBe(true);
    toolbar.style.width = '300px';
    resize();
    expect(hidden(group)).toBe(false);
  });

  it('refreshes preference tokens and removes media listeners on disposal', () => {
    const listeners = new Set<() => void>();
    const add = vi.fn((_: string, callback: () => void) =>
      listeners.add(callback),
    );
    const remove = vi.fn((_: string, callback: () => void) =>
      listeners.delete(callback),
    );
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ addEventListener: add, removeEventListener: remove })),
    );
    const { app, text } = fixture();
    text.dataset.hideBelow = 'var(--cutoff)';
    text.style.setProperty('--cutoff', '300px');
    dispose = wireToolbarVisibility(app);
    expect(hidden(text)).toBe(false);
    text.style.setProperty('--cutoff', '500px');
    for (const listener of listeners) listener();
    expect(hidden(text)).toBe(true);
    dispose();
    expect(listeners.size).toBe(0);
    expect(remove).toHaveBeenCalledTimes(add.mock.calls.length);
  });

  it('uses content width and strict complementary boundaries through repeated resizes', () => {
    const { app, toolbar, text, group } = fixture();
    dispose = wireToolbarVisibility(app);
    expect(hidden(text)).toBe(false); // 400 - 32 padding - 4 border = 364
    expect(hidden(group)).toBe(true);
    for (const width of [399, 401, 399, 400]) {
      toolbar.style.width = `${width}px`;
      resize();
      expect(hidden(text)).toBe(width < 400);
      expect(hidden(group)).toBe(width >= 400);
    }
    expect(observed.has(toolbar)).toBe(true);
  });

  it('resolves em/rem, calc, variables and percentages in child context without width changes', async () => {
    const { app, toolbar, text, group } = fixture();
    text.setAttribute('data-hide-below', 'var(--break)');
    text.style.setProperty('--break', 'calc(10em + 10px)');
    text.style.fontSize = '40px';
    group.setAttribute('data-show-below', '50%');
    dispose = wireToolbarVisibility(app);
    expect(hidden(text)).toBe(true);
    expect(hidden(group)).toBe(true);
    text.style.fontSize = '20px';
    await mutations();
    expect(hidden(text)).toBe(false);
    text.style.removeProperty('--break');
    document.documentElement.style.setProperty('--break', '24rem');
    await mutations();
    expect(hidden(text)).toBe(true);
    document.documentElement.style.fontSize = '12px';
    await mutations();
    expect(hidden(text)).toBe(false);
    group.setAttribute('data-show-below', '110%');
    await mutations();
    expect(hidden(group)).toBe(false);
    expect(toolbar.style.width).toBe('400px');
  });

  it('keeps content visible for invalid, unresolved, negative and contradictory values', async () => {
    const { app, text, group } = fixture();
    dispose = wireToolbarVisibility(app);
    for (const value of [
      '-10px',
      'var(--missing)',
      'invalid',
      'calc(-10px + 2px)',
    ]) {
      text.setAttribute('data-hide-below', value);
      group.setAttribute('data-show-below', value);
      await mutations();
      expect(hidden(text)).toBe(false);
      expect(hidden(group)).toBe(false);
    }
    text.setAttribute('data-hide-below', '500px');
    text.setAttribute('data-show-below', '400px');
    await mutations();
    expect(hidden(text)).toBe(false);
    text.removeAttribute('data-show-below');
    text.setAttribute('data-hide-below', '0px');
    await mutations();
    expect(hidden(text)).toBe(false);
  });

  it('walks a bounded interval and recovers from invalid bounds', async () => {
    const { app, toolbar, text } = fixture();
    text.setAttribute('data-hide-below', '200px');
    text.setAttribute('data-show-below', '500px');
    dispose = wireToolbarVisibility(app);
    expect(hidden(text)).toBe(false);
    for (const [width, expected] of [
      [136, true],
      [236, false],
      [536, true],
      [400, false],
    ] as const) {
      toolbar.style.width = `${width}px`;
      resize();
      expect(hidden(text)).toBe(expected);
    }
    text.setAttribute('data-hide-below', '600px');
    await mutations();
    expect(hidden(text)).toBe(false);
    text.setAttribute('data-hide-below', '200px');
    toolbar.style.width = '136px';
    await mutations();
    expect(hidden(text)).toBe(true);
  });

  it('tracks insertion, nested ownership, relocation, threshold removal and busy siblings', async () => {
    const { app, toolbar, text, group } = fixture(300);
    group.setAttribute('data-busy', 'true');
    const status = document.createElement('span');
    status.className = 'kui-toolbar-control-group__busy-status';
    status.setAttribute('role', 'status');
    group.after(status);
    group.setAttribute('data-hide-below', '400px');
    group.removeAttribute('data-show-below');
    dispose = wireToolbarVisibility(app);
    expect(hidden(status)).toBe(true);
    const inner = document.createElement('header');
    inner.setAttribute('data-component', 'toolbar');
    inner.style.width = '600px';
    toolbar.append(inner);
    inner.append(text, group, status);
    await mutations();
    expect(hidden(text)).toBe(false);
    expect(hidden(group)).toBe(false);
    expect(hidden(status)).toBe(false);
    inner.style.width = '200px';
    resize();
    expect(hidden(status)).toBe(true);
    group.removeAttribute('data-hide-below');
    await mutations();
    expect(hidden(group)).toBe(false);
    expect(hidden(status)).toBe(false);
    text.remove();
    await mutations();
    expect(hidden(text)).toBe(false);
    expect(observed.has(inner)).toBe(false);
    const replacement = document.createElement('span');
    replacement.setAttribute('data-component', 'toolbar-text');
    replacement.setAttribute('data-hide-below', '300px');
    inner.append(replacement);
    await mutations();
    expect(hidden(replacement)).toBe(true);
    expect(observed.has(inner)).toBe(true);
  });

  it('supports root-inclusive and overlapping registrations with idempotent teardown', () => {
    const { app, text } = fixture(300);
    text.setAttribute('data-toolbar-width-hidden', 'original');
    const outer = wireToolbarVisibility(app);
    dispose = wireToolbarVisibility(text);
    expect(hidden(text)).toBe(true);
    outer();
    outer();
    expect(hidden(text)).toBe(true);
    dispose();
    dispose();
    expect(text.getAttribute('data-toolbar-width-hidden')).toBe('original');
    expect(disconnected).toBe(1);
    expect(app.querySelector('[data-toolbar-visibility-probe]')).toBeNull();
    resize();
    expect(text.getAttribute('data-toolbar-width-hidden')).toBe('original');
    dispose = wireToolbarVisibility(document);
    expect(hidden(text)).toBe(true);
  });

  it('suppresses only a paired busy status when another policy hides its group', async () => {
    const { app, group } = fixture(300);
    group.setAttribute('data-busy', 'true');
    group.style.display = 'none';
    const status = document.createElement('span');
    status.className = 'kui-toolbar-control-group__busy-status';
    status.setAttribute('role', 'status');
    group.after(status);
    dispose = wireToolbarVisibility(app);
    expect(hidden(group)).toBe(false);
    expect(hidden(status)).toBe(true);
    group.style.display = 'inline-flex';
    await mutations();
    expect(hidden(status)).toBe(false);
    group.style.display = 'none';
    await mutations();
    expect(hidden(status)).toBe(true);
    group.setAttribute('data-busy', 'false');
    await mutations();
    expect(hidden(status)).toBe(false);
  });

  it('restores owned markers removed by an otherwise unchanged render', async () => {
    const { app, text, group } = fixture(300);
    group.removeAttribute('data-show-below');
    group.setAttribute('data-hide-below', '400px');
    group.setAttribute('data-busy', 'true');
    const status = document.createElement('span');
    status.className = 'kui-toolbar-control-group__busy-status';
    status.setAttribute('role', 'status');
    group.after(status);
    dispose = wireToolbarVisibility(app);
    for (const item of [text, group, status])
      item.removeAttribute('data-toolbar-width-hidden');
    await mutations();
    expect([text, group, status].map(hidden)).toEqual([true, true, true]);
  });

  it('leaves detached content and unrelated statuses alone, and preserves external marker writes', () => {
    const { app, text, group } = fixture(300);
    const unrelated = document.createElement('span');
    unrelated.setAttribute('role', 'status');
    group.setAttribute('data-busy', 'true');
    group.after(unrelated);
    const detached = document.createElement('span');
    detached.setAttribute('data-component', 'toolbar-text');
    detached.setAttribute('data-hide-below', '900px');
    app.append(detached);
    dispose = wireToolbarVisibility(app);
    expect(hidden(detached)).toBe(false);
    expect(hidden(unrelated)).toBe(false);
    text.setAttribute('data-toolbar-width-hidden', 'external');
    dispose();
    expect(text.getAttribute('data-toolbar-width-hidden')).toBe('external');
  });

  it('works initially and on window resize without ResizeObserver', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const { app, toolbar, text } = fixture(300);
    dispose = wireToolbarVisibility(app);
    expect(hidden(text)).toBe(true);
    toolbar.style.width = '600px';
    window.dispatchEvent(new Event('resize'));
    expect(hidden(text)).toBe(false);
  });

  it('supports a measured auto-width toolbar without either observer', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    vi.stubGlobal('MutationObserver', undefined);
    const { app, toolbar, text } = fixture();
    toolbar.style.width = 'auto';
    vi.spyOn(toolbar, 'getBoundingClientRect').mockReturnValue({
      width: 400,
    } as DOMRect);
    dispose = wireToolbarVisibility(app);
    expect(hidden(text)).toBe(false);
    toolbar.style.width = '300px';
    window.dispatchEvent(new Event('resize'));
    expect(hidden(text)).toBe(true);
  });
});
