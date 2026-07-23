/**
 * KF-389 — `each()` rows inside an `<svg>` root must keep the SVG namespace
 * on EVERY parse, not only the first render.
 *
 * Rows are re-parsed from HTML on every path that creates a row node. That
 * parse used to go through a bare `<template>`, which parses in the HTML
 * namespace: a row like `<circle/>` came back an `HTMLUnknownElement`, which a
 * real browser will not paint. First render escaped it — rows are inlined into
 * the mount root's `innerHTML`, where the surrounding `<svg>` puts the parser
 * into foreign-content mode — so the bug presented as a flake: the initial
 * picture was right and everything added later was invisible.
 *
 * `utils/rowContract.ts` now selects the parse namespace from the list's live
 * parent. The fix re-enters foreign content the same way first render does
 * (wrap in `<svg>`, let the HTML parser namespace the rows, lift them out)
 * rather than switching to the XML parser, so both paths accept exactly the
 * same row markup.
 *
 * `<foreignObject>` is the exception that proves the rule and is pinned below:
 * it is SVG-namespaced itself, but its children are HTML again.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { each, mount, signal } from '../../src/index.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const XHTML_NS = 'http://www.w3.org/1999/xhtml';

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.appendChild(root);
});

afterEach(() => { document.body.innerHTML = ''; });

const nsOf = (sel: string): string | null =>
  (root.querySelector(sel) as Element | null)?.namespaceURI ?? null;

describe('KF-389: SVG-namespaced row parsing', () => {
  it('a granular insert produces an SVG-namespaced row', () => {
    const pts = arraySignal([{ id: 'p1' }]);
    const dispose = mount(root, () => (
      <svg viewBox="0 0 10 10">
        {each(pts, (p) => <circle data-key={p.id} cx="1" cy="1" r="1" />)}
      </svg>
    ));
    expect(nsOf('[data-key="p1"]')).toBe(SVG_NS); // first render was always fine
    pts.push({ id: 'p2' });
    expect(nsOf('[data-key="p2"]')).toBe(SVG_NS);
    dispose();
  });

  it('a bulk granular insert run namespaces every row in the run', () => {
    // The contiguous-insert bulk path parses several rows in ONE pass, so it
    // exercises the multi-row lift out of the <svg> wrapper.
    const pts = arraySignal([{ id: 'p1' }]);
    const dispose = mount(root, () => (
      <svg viewBox="0 0 10 10">
        {each(pts, (p) => <circle data-key={p.id} cx="1" cy="1" r="1" />)}
      </svg>
    ));
    pts.push({ id: 'p2' });
    pts.push({ id: 'p3' });
    for (const id of ['p1', 'p2', 'p3']) {
      expect(nsOf(`[data-key="${id}"]`)).toBe(SVG_NS);
    }
    dispose();
  });

  it('a snapshot append (plain array, new identity) produces an SVG-namespaced row', () => {
    const list = signal([{ id: 's1' }]);
    const dispose = mount(root, () => (
      <svg viewBox="0 0 10 10">
        {each(list.value, (p) => <circle data-key={p.id} cx="1" cy="1" r="1" />)}
      </svg>
    ));
    list.value = [...list.value, { id: 's2' }];
    expect(nsOf('[data-key="s2"]')).toBe(SVG_NS);
    dispose();
  });

  it('a structural row update (replaceChild) produces an SVG-namespaced row', () => {
    const shapes = arraySignal([{ id: 'g1', big: false }]);
    const dispose = mount(root, () => (
      <svg viewBox="0 0 10 10">
        {each(shapes, (p) => (p.big
          ? <rect data-key={p.id} width="5" height="5" />
          : <circle data-key={p.id} cx="1" cy="1" r="1" />))}
      </svg>
    ));
    shapes.update(0, (r) => ({ ...r, big: true }));
    const el = root.querySelector('[data-key="g1"]') as Element;
    expect(el.tagName.toLowerCase()).toBe('rect');
    expect(el.namespaceURI).toBe(SVG_NS);
    dispose();
  });

  it('nested SVG structure inside a row is namespaced all the way down', () => {
    const shapes = arraySignal([{ id: 'n1' }]);
    const dispose = mount(root, () => (
      <svg viewBox="0 0 10 10">
        {each(shapes, (p) => (
          <g data-key={p.id}><circle cx="1" cy="1" r="1" /></g>
        ))}
      </svg>
    ));
    shapes.push({ id: 'n2' });
    const g = root.querySelector('[data-key="n2"]') as Element;
    expect(g.namespaceURI).toBe(SVG_NS);
    expect((g.firstElementChild as Element).namespaceURI).toBe(SVG_NS);
    dispose();
  });

  it('rows under <foreignObject> stay in the HTML namespace', () => {
    // foreignObject is SVG-namespaced but its children are HTML — so the
    // namespace decision cannot be "is the parent SVG?" alone.
    const rows = arraySignal([{ id: 'f1' }]);
    const dispose = mount(root, () => (
      <svg viewBox="0 0 10 10">
        <foreignObject width="10" height="10">
          {each(rows, (r) => <div data-key={r.id}>x</div>)}
        </foreignObject>
      </svg>
    ));
    rows.push({ id: 'f2' });
    expect(nsOf('[data-key="f2"]')).toBe(XHTML_NS);
    dispose();
  });

  it('ordinary HTML lists are unaffected', () => {
    const rows = arraySignal([{ id: 'h1' }]);
    const dispose = mount(root, () => (
      <ul>{each(rows, (r) => <li data-key={r.id}>{r.id}</li>)}</ul>
    ));
    rows.push({ id: 'h2' });
    expect(nsOf('[data-key="h2"]')).toBe(XHTML_NS);
    expect(root.querySelectorAll('li').length).toBe(2);
    dispose();
  });

  it('the row contract still throws for a multi-root SVG row', () => {
    // The contract check runs on the namespaced parse too — a two-root row is
    // still a row-precise error, not a silent misbind. It fires at first
    // render (fail-fast), before any reconcile path is reached.
    const rows = arraySignal([{ id: 'c1' }]);
    expect(() => mount(root, () => (
      <svg viewBox="0 0 10 10">
        {each(rows, (r) => <>
          <circle data-key={r.id} cx="1" cy="1" r="1" />
          <circle cx="2" cy="2" r="1" />
        </>)}
      </svg>
    ))).toThrow(/exactly one/);
  });

  it('the row contract throws for a multi-root SVG row introduced by a later insert', () => {
    // Same contract, but reached through the granular parse path — the row
    // that violates it is added after mount, so first render can't catch it.
    const rows = arraySignal<{ id: string; split?: boolean }>([{ id: 'd1' }]);
    const dispose = mount(root, () => (
      <svg viewBox="0 0 10 10">
        {each(rows, (r) => (r.split === true
          ? <>
            <circle data-key={r.id} cx="1" cy="1" r="1" />
            <circle cx="2" cy="2" r="1" />
          </>
          : <circle data-key={r.id} cx="1" cy="1" r="1" />))}
      </svg>
    ));
    expect(() => rows.push({ id: 'd2', split: true })).toThrow(/exactly one/);
    dispose();
  });
});
