/**
 * Unit tests for fine-grained signal bindings (KF-294 spike).
 *
 * The headline property: a signal handed straight into an attribute or text
 * hole updates the live DOM WITHOUT re-running the render function — the coarse
 * mount() effect never subscribed to it. These tests pin that (render is spied
 * and must stay at one call across binding-driven updates), plus SSR/toString
 * snapshot fallback, teardown, and survival across a coarse (morph) re-render.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { each } from '../../src/each.js';
import { jsx } from '../../src/jsx-runtime.js';
import { mount } from '../../src/mount.js';
import { computed, signal } from '../../src/reactive.js';

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.appendChild(root);
});

afterEach(() => {
  root.remove();
});

describe('fine-grained bindings — staleness + transition matrix (KF-299)', () => {
  interface Row {
    id: number;
    label: string;
  }

  it('global hole: a re-created computed reading a stable source survives a fast-path re-render', () => {
    // Each coarse render creates a new computed that still reads cls.
    const trigger = signal(0);
    const cls = signal('a');
    const render = vi.fn(() => {
      const prefix = trigger.value; // snapshot deliberately captured by this computed
      return jsx('div', {
        id: 'd',
        class: computed(() => prefix + cls.value),
        children: 'static',
      });
    });
    const dispose = mount(root, render);
    const d = root.querySelector('#d') as HTMLElement;
    expect(d.getAttribute('class')).toBe('0a');

    trigger.value = 1; // coarse re-render, surrounds byte-identical → same node, new computed
    expect(render).toHaveBeenCalledTimes(2);
    expect(root.querySelector('#d')).toBe(d); // same node

    expect(d.getAttribute('class')).toBe('1a');
    cls.value = 'b';
    expect(d.getAttribute('class')).toBe('1b');
    dispose();
  });

  it('adversarial: full binding × reconcile transition walk (arraySignal + select-binding)', () => {
    const r1 = { id: 1, label: 'a' };
    const r2 = { id: 2, label: 'b' };
    const r3 = { id: 3, label: 'c' };
    const rows = arraySignal<Row>([r1, r2, r3]);
    const selectedId = signal<number | null>(null);
    const render = vi.fn(() =>
      jsx('table', {
        children: jsx('tbody', {
          children: each(
            rows,
            (r) =>
              jsx('tr', {
                'data-key': r.id,
                class: computed(() =>
                  r.id === selectedId.value ? 'danger' : '',
                ),
                children: jsx('td', { children: r.label }),
              }),
            (r) => r.id,
          ),
        }),
      }),
    );
    const dispose = mount(root, render);
    const classOf = (id: number) =>
      (root.querySelector(`tr[data-key="${id}"]`) as HTMLElement)?.getAttribute(
        'class',
      );
    const rendersAfterMount = render.mock.calls.length;

    // 1. first-render-inline → select (no reconcile, no re-render)
    selectedId.value = 2;
    expect(classOf(2)).toBe('danger');
    expect(render).toHaveBeenCalledTimes(rendersAfterMount);

    // 2. granular append → select the fresh row
    rows.push({ id: 4, label: 'd' });
    expect(root.querySelectorAll('tr')).toHaveLength(4);
    selectedId.value = 4;
    expect(classOf(4)).toBe('danger');
    expect(classOf(2)).toBe('');

    // 3. granular update (text fast path) on a non-selected row → its bound class survives
    rows.update(0, (r) => ({ ...r, label: 'a!' }));
    expect(
      (root.querySelector('tr[data-key="1"] td') as HTMLElement).textContent,
    ).toBe('a!');
    expect(classOf(1)).toBe(''); // binding intact (row 1 not selected)
    selectedId.value = 1;
    expect(classOf(1)).toBe('danger');

    // 4. granular remove of the selected row → disposed; select survives elsewhere
    const removed = root.querySelector('tr[data-key="1"]') as HTMLElement;
    rows.remove(0);
    expect(root.querySelector('tr[data-key="1"]')).toBeNull();
    selectedId.value = 4;
    expect(removed.getAttribute('class')).toBe('danger'); // detached node frozen (effect disposed)
    expect(classOf(4)).toBe('danger');

    // 5. granular move (swap) → node reused, binding survives
    rows.move(0, rows.value.length - 1); // move row 2 to the end
    expect(classOf(4)).toBe('danger');
    selectedId.value = 3;
    expect(classOf(4)).toBe('');
    expect(classOf(3)).toBe('danger');

    // 6. replace([]) → snapshot path, all disposed → repopulate (snapshot rebuild) → select
    rows.replace([]);
    expect(root.querySelectorAll('tr')).toHaveLength(0);
    rows.replace([
      { id: 10, label: 'x' },
      { id: 11, label: 'y' },
    ]);
    expect(root.querySelectorAll('tr')).toHaveLength(2);
    selectedId.value = 11;
    expect(classOf(11)).toBe('danger');
    expect(classOf(10)).toBe('');

    dispose();
  });
});

describe('fine-grained bindings — lifecycle', () => {
  it('stops updating after dispose', () => {
    const s = signal('a');
    const dispose = mount(root, () => jsx('div', { id: 'd', children: s }));
    const d = root.querySelector('#d') as HTMLElement;
    expect(d.textContent).toBe('a');
    dispose();
    s.value = 'b';
    // Detached + effect torn down: the old node must not update.
    expect(d.textContent).toBe('a');
  });

  it('survives a coarse re-render that rebuilds the surrounds', () => {
    // `show` drives a structural change (morph runs); `label` is a bound hole.
    const show = signal(true);
    const label = signal('one');
    const render = vi.fn(() =>
      jsx('div', {
        id: 'wrap',
        children: show.value
          ? jsx('span', { id: 's', class: label, children: label })
          : jsx('span', {
              id: 's',
              class: label,
              children: label,
              'data-alt': 'y',
            }),
      }),
    );
    const dispose = mount(root, render);

    let s = root.querySelector('#s') as HTMLElement;
    expect(s.textContent).toBe('one');
    expect(s.getAttribute('class')).toBe('one');

    // Coarse re-render: `show` flip changes the surrounds → morph runs.
    show.value = false;
    expect(render).toHaveBeenCalledTimes(2);
    s = root.querySelector('#s') as HTMLElement;
    // Bound attr + text re-applied against the post-morph DOM.
    expect(s.textContent).toBe('one');
    expect(s.getAttribute('class')).toBe('one');

    // And the binding is still live after the re-wire.
    label.value = 'two';
    expect(s.textContent).toBe('two');
    expect(s.getAttribute('class')).toBe('two');
    expect(render).toHaveBeenCalledTimes(2);

    dispose();
  });
});

describe('global binding retargeting', () => {
  it('switches source on the same text node and attribute without disturbing a neighboring effect', () => {
    const choose = signal(true);
    const a = signal('same');
    const b = signal('same');
    const neighbor = signal('stable');
    const dispose = mount(root, () =>
      jsx('p', {
        title: choose.value ? a : b,
        lang: neighbor,
        children: choose.value ? a : b,
      }),
    );
    const node = root.firstElementChild!;
    const text = node.lastChild;
    const set = vi.spyOn(node, 'setAttribute');
    choose.value = false;
    b.value = 'new';
    a.value = 'unused';
    expect([node.textContent, node.getAttribute('title')]).toEqual([
      'new',
      'new',
    ]);
    choose.value = true;
    expect([node.textContent, node.getAttribute('title')]).toEqual([
      'unused',
      'unused',
    ]);
    expect(node.lastChild).toBe(text);
    expect(set.mock.calls.every(([name]) => name === 'title')).toBe(true);
    dispose();
    a.value = 'detached';
    expect(text?.nodeValue).toBe('unused');
  });

  it('clears old form properties before assigning swapped or renamed destinations', () => {
    const flip = signal(false);
    const on = signal(true);
    const off = signal(false);
    const dispose = mount(root, () =>
      jsx(
        'input',
        flip.value
          ? { disabled: on, title: off }
          : { checked: on, disabled: off },
      ),
    );
    const input = root.firstElementChild as HTMLInputElement;
    expect(input.checked).toBe(true);
    flip.value = true;
    expect(input.checked).toBe(false);
    expect(input.disabled).toBe(true);
    expect(input.hasAttribute('checked')).toBe(false);
    dispose();
  });

  it('releases partial subscriptions after a failed switch and wires the next successful render', () => {
    const step = signal(0);
    const a = signal('a');
    const b = signal('b');
    const err = computed<string>(() => {
      throw new Error('bad source');
    });
    const dispose = mount(root, () =>
      jsx('p', {
        [step.value === 2 ? 'lang' : 'title']: step.value ? b : a,
        children: step.value === 1 ? err : a,
      }),
    );
    expect(() => {
      step.value = 1;
    }).toThrow('bad source');
    b.value = 'later';
    expect(root.firstElementChild?.getAttribute('title')).toBe('b');
    step.value = 2;
    expect(root.firstElementChild?.getAttribute('title')).toBeNull();
    expect(root.firstElementChild?.getAttribute('lang')).toBe('later');
    expect(root.textContent).toBe('a');
    dispose();
  });
});
