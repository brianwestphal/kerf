/**
 * The positional diff must not repurpose a node the template doesn't manage.
 *
 * KF-408 established that a `data-morph-skip` widget must not be adopted as the
 * positional match for a reappearing conditional element. Two more attributes
 * mark a node as "something else" and belong in the same gate:
 *
 *  - **KF-412 `data-morph-skip-children`** — a client-hydrated slot. Repurposing
 *    it destroys the hydrated subtree the consumer manages.
 *  - **KF-413 `data-morph-preserve`** — an imperatively-injected node the
 *    template never emits. Repurposing it destroys its content AND strips the
 *    attribute, so it is then removed on the following render — the exact
 *    opposite of the "keeps existing across renders" promise.
 *
 * The gate is a single `protectionTag` compared on both sides: a template
 * element with no such claim never adopts a protected live node. A KEYED match
 * (step 1) is unaffected, so a protected node WITH a `data-key` still morphs in
 * place as documented.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { mount, signal } from '../../src/index.js';

let root: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.appendChild(root);
});

describe('KF-412/413: protected live nodes are not positionally repurposed', () => {
  it('a data-morph-skip-children slot keeps its node identity and hydrated subtree', () => {
    const show = signal(false);
    const dispose = mount(root, () => (
      <div>
        {show.value ? <div class="cond">conditional</div> : ''}
        <div class="widget" data-morph-skip-children><span>placeholder</span></div>
      </div>
    ));
    const widget = root.querySelector('.widget') as HTMLElement;
    widget.innerHTML = '<canvas id="hydrated"></canvas>'; // library hydrates the slot

    show.value = true;
    expect(root.querySelector('.widget')).toBe(widget);          // same node
    expect(root.querySelector('#hydrated')).not.toBeNull();       // hydrated child survives
    expect(root.querySelector('.cond')?.textContent).toBe('conditional');
    dispose();
  });

  it('an injected data-morph-preserve node survives a conditional reappearing at its position', () => {
    const show = signal(true);
    const dispose = mount(root, () => (
      <div>
        {show.value ? <div class="cond">cond</div> : ''}
        <div class="tail">tail</div>
      </div>
    ));
    show.value = false;
    const tip = document.createElement('div');
    tip.className = 'tooltip';
    tip.setAttribute('data-morph-preserve', '');
    tip.textContent = 'injected';
    root.firstElementChild!.prepend(tip);

    show.value = true; // the conditional reappears where the tooltip sits
    const survivor = root.querySelector('.tooltip');
    expect(survivor).not.toBeNull();
    expect(survivor?.textContent).toBe('injected');               // content intact
    expect(survivor?.hasAttribute('data-morph-preserve')).toBe(true); // attribute intact
    expect(root.querySelector('.cond')?.textContent).toBe('cond'); // conditional rendered fresh
    dispose();
  });

  it('the step-2.5 lookahead does not move up a protected node from further along', () => {
    // A preserved node behind a static sibling: the forward scan must skip it,
    // not adopt it as the match for the reappearing conditional.
    const show = signal(true);
    const dispose = mount(root, () => (
      <div>
        {show.value ? <div class="cond">cond</div> : ''}
        <span class="static">s</span>
        <div class="tail">tail</div>
      </div>
    ));
    show.value = false;
    const tip = document.createElement('div');
    tip.setAttribute('data-morph-preserve', '');
    tip.className = 'tip';
    tip.textContent = 'keep';
    root.querySelector('.tail')!.before(tip);

    show.value = true;
    expect(root.querySelector('.tip')?.textContent).toBe('keep');
    dispose();
  });

  it('a protected node WITH a data-key still matches (and morphs) by key', () => {
    // The gate governs the POSITIONAL fallback only; a keyed match is untouched.
    const cls = signal('a');
    const dispose = mount(root, () => (
      <div>
        <div data-key="w" data-morph-skip-children class={cls.value}><span>child</span></div>
      </div>
    ));
    const widget = root.querySelector('[data-key="w"]') as HTMLElement;
    widget.querySelector('span')!.textContent = 'hydrated';
    cls.value = 'b';
    expect(root.querySelector('[data-key="w"]')).toBe(widget);   // identity kept by key
    expect(widget.getAttribute('class')).toBe('b');               // attrs morphed
    expect(widget.querySelector('span')?.textContent).toBe('hydrated'); // children skipped
    dispose();
  });

  it('a plain data-morph-skip widget still keeps identity (KF-408 unregressed)', () => {
    const show = signal(false);
    const dispose = mount(root, () => (
      <div>
        {show.value ? <div class="cond">cond</div> : ''}
        <div data-morph-skip>widget</div>
      </div>
    ));
    const widget = root.querySelector('[data-morph-skip]');
    show.value = true;
    expect(root.querySelector('[data-morph-skip]')).toBe(widget);
    expect(root.querySelectorAll('[data-morph-skip]').length).toBe(1);
    dispose();
  });
});
