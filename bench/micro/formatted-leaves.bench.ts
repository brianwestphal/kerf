// Run with npm run bench:micro -- bench/micro/formatted-leaves.bench.ts.
// Timings describe JavaScript plus happy-dom work, without browser layout.
import { afterAll, bench, describe, expect } from 'vitest';

import { each } from '../../src/each.js';
import { html } from '../../src/html.js';
import { jsx } from '../../src/jsx-runtime.js';
import { mount } from '../../src/mount.js';
import { computed, signal } from '../../src/reactive.js';

type Mode = 'coarse' | 'stable' | 'inline';
const derived = (read: () => string) => computed(read);

function fixture(size: number, mode: Mode) {
  const root = document.createElement('section');
  const sources = Array.from({ length: size }, () => signal(0));
  const tick = signal(0);
  const stats = { renders: 0, formats: 0, computeds: 0 };
  const readers = sources.map((source) => () => {
    stats.formats++;
    return `${source.value} items`;
  });
  const bind = (read: () => string) => {
    stats.computeds++;
    return derived(read);
  };
  const stable = mode === 'stable' ? readers.map(bind) : [];
  const dispose = mount(root, () => {
    stats.renders++;
    void tick.value;
    return jsx('div', {
      children: readers.map((read, index) => {
        const leaf =
          mode === 'stable'
            ? stable[index]
            : mode === 'coarse'
              ? read()
              : bind(read);
        // Same formatted scalar in an attribute and a text child.
        return jsx('span', { class: leaf, children: leaf });
      }),
    });
  });
  return {
    root,
    stats,
    update: () => {
      sources[0].value++;
    },
    rerender: () => {
      tick.value++;
    },
    dispose,
  };
}

for (const size of [1, 100, 1000]) {
  describe(`${size} formatted elements (class + text)`, () => {
    for (const mode of ['coarse', 'stable', 'inline'] as const) {
      const live = fixture(size, mode);
      // Validate the benchmark path and count user formatter evaluations separately.
      const before = { ...live.stats };
      live.update();
      expect(live.root.querySelector('span')?.className).toBe('1 items');
      expect(live.root.querySelector('span')?.textContent).toBe('1 items');
      expect(live.stats.formats - before.formats).toBe(
        mode === 'coarse' ? size : 1,
      );
      expect(live.stats.renders - before.renders).toBe(
        mode === 'coarse' ? 1 : 0,
      );
      const allocated = live.stats.computeds;
      live.rerender();
      expect(live.stats.computeds - allocated).toBe(
        mode === 'inline' ? size : 0,
      );
      // Collect teardown separately; Tinybench's paired case includes construction.
      const samples: number[] = [];
      for (let sample = 0; sample < 15; sample++) {
        const owned = fixture(size, mode);
        const started = performance.now();
        owned.dispose();
        samples.push(performance.now() - started);
      }
      samples.sort((a, b) => a - b);
      console.info('dispose median ms', size, mode, samples[7]);
      afterAll(live.dispose);
      bench(`${mode} single write`, live.update);
      bench(`${mode} setup + dispose`, () => {
        fixture(size, mode).dispose();
      });
    }
  });
}

// Bound and snapshot surfaces go through Kerf's own conversion and escaping.
describe('formatted leaf parity', () => {
  const count = signal(2);
  const label = derived(() => `<${count.value}>`);
  const template = () => html`<span title=${label}>${label}</span>`;
  expect(template().toString()).toEqual(
    jsx('span', { title: label, children: label }).toString(),
  );
  expect(template().toString()).not.toContain('kfb');
  const host = document.createElement('div');
  const stop = mount(host, template);
  count.value = 3;
  expect(host.firstElementChild?.getAttribute('title')).toBe('<3>');
  expect(host.textContent).toBe('<3>');
  stop();
  count.value = 4;
  expect(host.textContent).toBe('<3>');
  bench('SSR formatted tag', () => {
    template().toString();
  });
});

describe('lifetime probes', () => {
  const source = signal(1);
  const other = signal(12);
  const left = signal(true);
  let calls = 0;
  const project = derived(() => {
    calls++;
    const value = left.value ? source.value : other.value;
    if (value < 0) throw new Error('invalid count');
    return String(value);
  });
  const rows = signal([{ id: 1 }]);
  const root = document.createElement('div');
  const stop = mount(root, () =>
    jsx('ul', {
      children: each(rows.value, (row) =>
        jsx('li', { 'data-key': row.id, title: project, children: project }),
      ),
    }),
  );
  const peer = document.createElement('div');
  const detachPeer = mount(peer, () => html`<span>${project}</span>`);
  expect(calls).toBe(1);
  left.value = false;
  source.value = 99;
  expect(root.textContent).toBe('12');
  expect(calls).toBe(2);
  expect(() => {
    other.value = -1;
  }).toThrow('invalid count');
  other.value = 4;
  expect(peer.textContent).toBe('4');
  const oldRow = root.querySelector('li')!;
  rows.value = [];
  other.value = 5;
  expect(oldRow.textContent).toBe('4');
  expect(peer.textContent).toBe('5');
  stop();
  detachPeer();
  const previous = calls;
  other.value++;
  expect(calls).toBe(previous);

  // Fresh closure over a plain prop on a coarse rerender: record actual routing
  // so this benchmark remains useful on both sides of the retargeting change.
  const trigger = signal('old');
  const captureRoot = document.createElement('div');
  const end = mount(captureRoot, () => {
    const prefix = trigger.value;
    return jsx('span', { children: derived(() => prefix + other.value) });
  });
  trigger.value = 'new';
  console.info(
    'inline captured prop after coarse rerender:',
    captureRoot.textContent,
  );
  end();
  bench('unwatched formatted snapshot', () => {
    project.peek();
  });
});
