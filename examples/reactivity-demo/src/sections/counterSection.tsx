/**
 * §1 — Counter via a single signal + Tier 1 click delegation.
 * The simplest possible "reactive primitive in action" example.
 */

import { attr, delegate, mount, signal, type AttrSpec } from 'kerfjs';

const ACTIONS = {
  inc:   attr('data-action', 'inc'),
  dec:   attr('data-action', 'dec'),
  reset: attr('data-action', 'reset'),
} as const satisfies Record<string, AttrSpec<'data-action'>>;

export function mountCounter(root: HTMLElement): void {
  const count = signal(0);

  mount(root, () => (
    <div className="demo-card">
      <h2>1. Counter <span className="demo-tag">single signal • Tier 1 click delegation</span></h2>
      <div className="demo-row">
        <button type="button" {...ACTIONS.dec.attrs} className="demo-btn">−</button>
        <output className="demo-counter-value">{count.value}</output>
        <button type="button" {...ACTIONS.inc.attrs} className="demo-btn">+</button>
        <button type="button" {...ACTIONS.reset.attrs} className="demo-btn demo-btn-ghost">reset</button>
      </div>
      <p className="demo-note">
        One signal, one consumer. The buttons are wired via a single
        bubble-phase <code>click</code> listener on the section root and
        dispatched by <code>data-action</code> (spread from a typed
        <code>attr()</code> map so renames stay in sync).
      </p>
    </div>
  ));

  delegate(root, 'click', ACTIONS.inc.selector, () => { count.value += 1; });
  delegate(root, 'click', ACTIONS.dec.selector, () => { count.value -= 1; });
  delegate(root, 'click', ACTIONS.reset.selector, () => { count.value = 0; });
}
