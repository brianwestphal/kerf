/**
 * Unit tests for fine-grained signal bindings (KF-294 spike).
 *
 * The headline property: a signal handed straight into an attribute or text
 * hole updates the live DOM WITHOUT re-running the render function — the coarse
 * mount() effect never subscribed to it. These tests pin that (render is spied
 * and must stay at one call across binding-driven updates), plus SSR/toString
 * snapshot fallback, teardown, and survival across a coarse (morph) re-render.
 */

import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { each } from '../../src/each.js';
import { jsx } from '../../src/jsx-runtime.js';
import { mount } from '../../src/mount.js';
import { computed,signal } from '../../src/reactive.js';

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.appendChild(root);
});

afterEach(() => {
  root.remove();
});

describe('mixed content: a bound hole sharing its parent with static siblings (KF-374 — the morph dropped the static text)', () => {
  // KF-374: the wiring pass inserts the hole's live text node AFTER its marker
  // comment, but templates carry only the marker — so the morph's positional
  // child pairing matched a template static sibling against the inserted node,
  // overwrote it, and removed the real static text in the trailing pass. After
  // the re-wire the div held only the hole's value. These walk the full
  // transition matrix (bind-update ↔ coarse morph, repeated) for every hole /
  // static ordering.
  it('keeps a trailing static sibling across repeated morphs and updates (the svg-scrubber time-label shape)', () => {
    const playhead = signal(0);
    const playing = signal(false);
    const timeLabel = computed(() => `0:0${playhead.value}`);
    const render = vi.fn(() =>
      jsx('div', {
        children: [
          jsx('button', { id: 'b', children: playing.value ? 'pause' : 'play' }),
          jsx('div', { id: 'time', children: [timeLabel, ' / 0:05'] }),
        ],
      }),
    );
    const dispose = mount(root, render);
    const time = root.querySelector('#time') as HTMLElement;
    expect(time.textContent).toBe('0:00 / 0:05');

    // bind-update → morph → bind-update → morph → bind-update
    playhead.value = 1;
    expect(time.textContent).toBe('0:01 / 0:05');
    playing.value = true; // structural change → morph runs over the surrounds
    expect((root.querySelector('#b') as HTMLElement).textContent).toBe('pause');
    expect(time.textContent).toBe('0:01 / 0:05');
    playhead.value = 2;
    expect(time.textContent).toBe('0:02 / 0:05');
    playing.value = false; // and back again
    expect(time.textContent).toBe('0:02 / 0:05');
    playhead.value = 3;
    expect(time.textContent).toBe('0:03 / 0:05');
    // Fine-grained the whole way: only the two structural flips re-rendered.
    expect(render).toHaveBeenCalledTimes(3);
    dispose();
  });

  it('keeps leading, trailing, and in-between statics for every hole position', () => {
    const v = signal('X');
    const t = signal(0);
    const dispose = mount(root, () =>
      jsx('div', {
        'data-tick': String(t.value), // structural: changes the surrounds HTML
        children: [
          jsx('p', { id: 'lead', children: ['pre ', v] }),
          jsx('p', { id: 'trail', children: [v, ' post'] }),
          jsx('p', { id: 'both', children: ['pre ', v, ' post'] }),
        ],
      }),
    );
    const read = (id: string): string =>
      (root.querySelector(`#${id}`) as HTMLElement).textContent as string;
    expect(read('lead')).toBe('pre X');
    expect(read('trail')).toBe('X post');
    expect(read('both')).toBe('pre X post');

    t.value = 1; // morph
    expect(read('lead')).toBe('pre X');
    expect(read('trail')).toBe('X post');
    expect(read('both')).toBe('pre X post');

    v.value = 'Y'; // bindings still live post-morph
    expect(read('lead')).toBe('pre Y');
    expect(read('trail')).toBe('Y post');
    expect(read('both')).toBe('pre Y post');

    t.value = 2; // morph again with the NEW bound value in the nodes
    expect(read('both')).toBe('pre Y post');
    dispose();
  });

  it('keeps the static separator between two holes in one parent', () => {
    const a = signal('0:01');
    const b = signal('0:05');
    const t = signal(0);
    const dispose = mount(root, () =>
      jsx('div', {
        'data-tick': String(t.value),
        children: [jsx('div', { id: 'time', children: [a, ' / ', b] })],
      }),
    );
    const time = root.querySelector('#time') as HTMLElement;
    expect(time.textContent).toBe('0:01 / 0:05');
    t.value = 1; // morph
    expect(time.textContent).toBe('0:01 / 0:05');
    a.value = '0:02';
    b.value = '0:06';
    expect(time.textContent).toBe('0:02 / 0:06');
    t.value = 2; // morph again
    expect(time.textContent).toBe('0:02 / 0:06');
    dispose();
  });

  it('a hole element removed by a structural change comes back intact when re-added', () => {
    const v = signal('val');
    const show = signal(true);
    const dispose = mount(root, () =>
      jsx('div', {
        children: show.value
          ? jsx('div', { id: 'mixed', children: [v, ' static'] })
          : jsx('span', { id: 'alt', children: 'gone' }),
      }),
    );
    expect((root.querySelector('#mixed') as HTMLElement).textContent).toBe('val static');
    show.value = false; // hole element removed entirely
    expect(root.querySelector('#mixed')).toBeNull();
    v.value = 'ignored-while-hidden';
    show.value = true; // re-added: fresh marker, fresh node, current value
    expect((root.querySelector('#mixed') as HTMLElement).textContent).toBe('ignored-while-hidden static');
    v.value = 'live-again';
    expect((root.querySelector('#mixed') as HTMLElement).textContent).toBe('live-again static');
    dispose();
  });

  it('row scope: a row mixing a bound hole and static text survives an in-place row update', () => {
    // The row's static text changes via update() (a text diff AFTER a text
    // marker → the KF-374 fast-path guard bails to the morph, which must
    // pair the marker-owned node correctly), while the bound hole keeps its
    // own signal instance so the binding carries across the update.
    const label = signal('a');
    const items = arraySignal([{ id: 1, unit: 'ms' }]);
    const dispose = mount(root, () =>
      jsx('ul', {
        children: each(
          items,
          (it) => jsx('li', { children: [label, ' in ', it.unit] }),
          (it) => it.id,
        ),
      }),
    );
    const li = (): HTMLElement => root.querySelector('li') as HTMLElement;
    expect(li().textContent).toBe('a in ms');
    label.value = 'b'; // fine-grained row update
    expect(li().textContent).toBe('b in ms');
    items.update(0, (it) => ({ ...it, unit: 's' })); // static row text changes → row reconcile
    expect(li().textContent).toBe('b in s');
    label.value = 'c'; // binding still live on the surviving row node
    expect(li().textContent).toBe('c in s');
    dispose();
  });
});

describe('reserved marker namespace (KF-314)', () => {
  // The wiring pass matches markers by id across the mounted subtree, so these
  // attribute/comment names are a reserved consumer contract (see
  // docs/2-reactivity.md § "Reserved marker names"). Pin the ACTUAL emitted
  // markers to the documented reserved names — via the public mount()/each()
  // API, so it holds against dist too — so the docs can't silently drift from
  // what the runtime produces. If a marker is ever renamed, this fails and the
  // docs listing the reserved names must be updated in lockstep.
  it('emits exactly the documented reserved marker names', () => {
    const cls = signal('x');
    const txt = signal('y');
    const rows = signal([{ id: 1 }]);
    const dispose = mount(root, () =>
      jsx('div', {
        children: [
          jsx('span', { id: 'g', class: cls, children: txt }),
          jsx('ul', {
            children: each(
              rows.value,
              (r) => jsx('li', { 'data-key': r.id, class: cls, children: txt }),
              (r) => r.id,
            ),
          }),
        ],
      }),
    );
    const html = root.innerHTML;
    // GLOBAL scope: `data-kfb` attribute + `<!--kfb:*-->` text marker.
    expect((root.querySelector('#g') as HTMLElement).hasAttribute('data-kfb')).toBe(true);
    expect(html).toContain('<!--kfb:');
    // ROW scope: `data-kfbrow` attribute + `<!--kfbr:*-->` text marker.
    expect(root.querySelector('[data-kfbrow]')).not.toBeNull();
    expect(html).toContain('<!--kfbr:');
    // each() list boundary marker.
    expect(html).toContain('<!--kf-list:');
    dispose();
  });
});

describe('the fully-bound-mount guarantee (KF-348)', () => {
  // The logical endpoint of "values bind, structure re-renders": a render
  // function that reads no `.value` registers ZERO dependencies on mount()'s
  // wrapped effect, so it runs exactly once, forever — every update flows
  // through the per-hole binding effects. No byte-compare, no morph, no
  // reconcile. Verified in the binding-coverage audit and pinned here.

  it('a single bound text hole: the render fn runs exactly once across writes', () => {
    const count = signal(0);
    let renders = 0;
    const dispose = mount(root, () => {
      renders++;
      return jsx('span', { children: count });
    });
    expect(renders).toBe(1);
    count.value = 1;
    count.value = 2;
    expect(renders).toBe(1);
    expect(root.querySelector('span')!.textContent).toBe('2');
    dispose();
  });

  it('several bound holes in a static frame: still one render, all holes live', () => {
    const label = signal('a');
    const cls = signal('x');
    const n = computed(() => `${label.value}!`);
    let renders = 0;
    const dispose = mount(root, () => {
      renders++;
      return jsx('div', {
        children: [
          jsx('h1', { class: cls, children: 'Static title' }),
          jsx('p', { children: [label, ' / ', n] }),
        ],
      });
    });
    expect(renders).toBe(1);
    label.value = 'b';
    cls.value = 'y';
    expect(renders).toBe(1);
    expect(root.querySelector('h1')!.getAttribute('class')).toBe('y');
    expect(root.querySelector('p')!.textContent).toBe('b / b!');
    dispose();
  });
});

describe('in-place updates re-wire changed binding instances (KF-347)', () => {
  // The audit-confirmed gap: an in-place row update (surgical fast path,
  // _morphElement, or an html-identical no-op — a self-reading hole's value
  // lives behind a marker, so the string never changes) used to carry the OLD
  // effects forward and drop the fresh render's bindings. The old effects
  // closed over the pre-update row object → self-reading holes went silently
  // stale. carryOrRewireRowBindings now re-wires on any per-hole signal
  // instance change and carries for free when instances match (cache hits /
  // stable external signals).

  interface Row { id: number; label: string; done?: boolean; big?: boolean }

  it('granular update(): self-reading bound TEXT hole updates (html-identical no-op arm)', () => {
    const rows = arraySignal<Row>([{ id: 1, label: 'a' }, { id: 2, label: 'b' }]);
    const dispose = mount(root, () =>
      jsx('ul', {
        children: each(rows, (item) =>
          jsx('li', { 'data-key': String(item.id), children: computed(() => item.label) })),
      }));
    expect(root.querySelectorAll('li')[0].textContent).toBe('a');
    rows.update(0, (r) => ({ ...r, label: 'A!' }));
    expect(root.querySelectorAll('li')[0].textContent).toBe('A!');
    // Sibling untouched, and its hole is still live-wired.
    expect(root.querySelectorAll('li')[1].textContent).toBe('b');
    rows.update(1, (r) => ({ ...r, label: 'B!' }));
    expect(root.querySelectorAll('li')[1].textContent).toBe('B!');
    dispose();
  });

  it('granular update(): self-reading bound ATTR hole updates (html-identical no-op arm)', () => {
    const rows = arraySignal<Row>([{ id: 1, label: 'a', done: false }]);
    const dispose = mount(root, () =>
      jsx('ul', {
        children: each(rows, (item) =>
          jsx('li', {
            'data-key': String(item.id),
            class: computed(() => (item.done ? 'done' : '')),
            children: item.label,
          })),
      }));
    const li = (): Element => root.querySelector('li') as Element;
    expect(li().getAttribute('class')).toBe('');
    rows.update(0, (r) => ({ ...r, done: true }));
    expect(li().getAttribute('class')).toBe('done');
    rows.update(0, (r) => ({ ...r, done: false }));
    expect(li().getAttribute('class')).toBe('');
    dispose();
  });

  it('granular update(): bound hole stays correct when static content changes too (morph/fast-path arm)', () => {
    const rows = arraySignal<Row>([{ id: 1, label: 'x', done: false }]);
    const dispose = mount(root, () =>
      jsx('ul', {
        children: each(rows, (item) =>
          jsx('li', {
            'data-key': String(item.id),
            children: [item.label, ' ', jsx('em', { children: computed(() => (item.done ? 'yes' : 'no')) })],
          })),
      }));
    expect(root.querySelector('li')!.textContent).toBe('x no');
    // Static text AND the self-read hole change in one update.
    rows.update(0, (r) => ({ ...r, label: 'y', done: true }));
    expect(root.querySelector('li')!.textContent).toBe('y yes');
    dispose();
  });

  it('granular update(): a mixed row keeps its external-signal hole live after re-wire', () => {
    const ext = signal('one');
    const rows = arraySignal<Row>([{ id: 1, label: 'a' }]);
    const dispose = mount(root, () =>
      jsx('ul', {
        children: each(rows, (item) =>
          jsx('li', {
            'data-key': String(item.id),
            children: [computed(() => item.label), '/', computed(() => ext.value)],
          })),
      }));
    expect(root.querySelector('li')!.textContent).toBe('a/one');
    rows.update(0, (r) => ({ ...r, label: 'b' }));
    expect(root.querySelector('li')!.textContent).toBe('b/one');
    ext.value = 'two';   // the re-wired external hole must still track
    expect(root.querySelector('li')!.textContent).toBe('b/two');
    dispose();
  });

  it('snapshot in-place: a cacheKey re-render re-wires the changed row; untouched rows carry for free and stay live', () => {
    const ext = signal('E');
    const sel = signal<number | null>(null);
    const items = signal<Row[]>([{ id: 1, label: 'a' }, { id: 2, label: 'b' }]);
    const dispose = mount(root, () =>
      jsx('ul', {
        children: each(items.value, (item) =>
          jsx('li', {
            'data-key': String(item.id),
            class: computed(() => (item.id === sel.value ? 'sel' : '')),
            children: [item.label, ':', computed(() => ext.value)],
          }), (item) => (item.id === sel.value ? 'sel' : '')),
      }));
    const lis = (): NodeListOf<Element> => root.querySelectorAll('li');
    sel.value = 1;  // cacheKey drift → snapshot in-place: row 1 re-renders, row 2 cache-hits
    expect(lis()[0].getAttribute('class')).toBe('sel');
    // Row 1's fresh (re-wired) holes AND row 2's carried holes both track ext.
    ext.value = 'F';
    expect(lis()[0].textContent).toBe('a:F');
    expect(lis()[1].textContent).toBe('b:F');
    // And selection keeps working afterwards (new instances live).
    sel.value = 2;
    expect(lis()[0].getAttribute('class')).toBe('');
    expect(lis()[1].getAttribute('class')).toBe('sel');
    dispose();
  });

  it('granular update(): a row that LOSES its bound hole disposes the old effect and wires nothing', () => {
    const rows = arraySignal<Row>([{ id: 1, label: 'a', done: true }]);
    const dispose = mount(root, () =>
      jsx('ul', {
        children: each(rows, (item) =>
          jsx('li', {
            'data-key': String(item.id),
            children: item.done ? computed(() => item.label) : item.label,
          })),
      }));
    expect(root.querySelector('li')!.textContent).toBe('a');
    // The update swaps the bound hole for plain static text (newLen === 0):
    // the old effect must be disposed, nothing re-wired, content correct.
    rows.update(0, (r) => ({ ...r, label: 'plain', done: false }));
    expect(root.querySelector('li')!.textContent).toBe('plain');
    // And a later update keeps working through the binding-free shape.
    rows.update(0, (r) => ({ ...r, label: 'still-plain' }));
    expect(root.querySelector('li')!.textContent).toBe('still-plain');
    dispose();
  });

  it('snapshot in-place: a tag-changed row gets its fresh bindings WIRED (previously dropped unwired)', () => {
    const ext = signal('v1');
    const sel = signal(false);
    const items = signal<Row[]>([{ id: 1, label: 'a' }]);
    const dispose = mount(root, () =>
      jsx('ul', {
        children: each(items.value, (item) =>
          jsx('li', {
            'data-key': String(item.id),
            children: jsx(sel.value ? 'strong' : 'span', { children: computed(() => ext.value) }),
          }), () => String(sel.value)),
      }));
    expect(root.querySelector('li span')).not.toBeNull();
    sel.value = true;  // cacheKey drift → in-place re-render → nested tag changes
    expect(root.querySelector('li strong')).not.toBeNull();
    ext.value = 'v2';  // the re-rendered row's bound hole must be live
    expect(root.querySelector('li')!.textContent).toBe('v2');
    dispose();
  });
});
