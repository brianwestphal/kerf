import { beforeEach, describe, expect, it, vi } from 'vitest';

import { action, delegateActions } from '../../src/actions.js';
import type { AttrSpec } from '../../src/attrSelector.js';

function mount(html: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('action()', () => {
  it('produces a data-action AttrSpec spreadable in JSX and usable as a selector', () => {
    const a: AttrSpec<'data-action', 'select-file'> = action('select-file');
    expect(a.name).toBe('data-action');
    expect(a.value).toBe('select-file');
    expect(a.attrs).toEqual({ 'data-action': 'select-file' });
    expect(a.selector).toBe('[data-action="select-file"]');
  });

  it('escapes selector-hostile values safely', () => {
    const a = action('a"b');
    expect(a.selector).toBe('[data-action="a\\"b"]');
  });
});

describe('delegateActions()', () => {
  it('dispatches to the handler keyed by the element\'s data-action value', () => {
    const root = mount(
      `<button data-action="select" data-id="7">s</button>
       <button data-action="remove" data-id="9">r</button>`,
    );
    const select = vi.fn();
    const remove = vi.fn();

    delegateActions(root, 'click', { select, remove });

    (root.querySelector('[data-action="select"]') as HTMLElement).click();
    expect(select).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();
    // handler receives (event, matchedElement)
    const [ev, el] = select.mock.calls[0];
    expect(ev).toBeInstanceOf(Event);
    expect((el as HTMLElement).getAttribute('data-id')).toBe('7');

    (root.querySelector('[data-action="remove"]') as HTMLElement).click();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('walks up (closest) so a click on an inner child still matches the action element', () => {
    const root = mount('<button data-action="go"><span class="label">go</span></button>');
    const go = vi.fn();
    delegateActions(root, 'click', { go });

    (root.querySelector('.label') as HTMLElement).click();
    expect(go).toHaveBeenCalledTimes(1);
    expect((go.mock.calls[0][1] as HTMLElement).tagName).toBe('BUTTON');
  });

  it('ignores an action absent from the table (no-op, like an unmatched switch case)', () => {
    const root = mount('<button data-action="unknown">x</button>');
    const known = vi.fn();
    expect(() => {
      delegateActions(root, 'click', { known });
      (root.querySelector('[data-action="unknown"]') as HTMLElement).click();
    }).not.toThrow();
    expect(known).not.toHaveBeenCalled();
  });

  it('keys off action() .value so the markup and the dispatcher cannot drift', () => {
    const A = { pick: action('pick-me') };
    const root = mount(`<button ${A.pick.name}="${A.pick.value}">p</button>`);
    const pick = vi.fn();
    delegateActions(root, 'click', { [A.pick.value]: pick });

    (root.querySelector(A.pick.selector) as HTMLElement).click();
    expect(pick).toHaveBeenCalledTimes(1);
  });

  it('supports match: "direct" — fires only when the target itself carries the action', () => {
    const root = mount('<button data-action="go"><span class="label">go</span></button>');
    const go = vi.fn();
    delegateActions(root, 'click', { go }, { match: 'direct' });

    (root.querySelector('.label') as HTMLElement).click();
    expect(go).not.toHaveBeenCalled(); // inner span isn't the action element

    (root.querySelector('[data-action="go"]') as HTMLElement).click();
    expect(go).toHaveBeenCalledTimes(1);
  });

  it('supports a custom attribute via options.attr', () => {
    const root = mount('<button data-cmd="save">save</button>');
    const save = vi.fn();
    delegateActions(root, 'click', { save }, { attr: 'data-cmd' });

    (root.querySelector('[data-cmd="save"]') as HTMLElement).click();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('returns a disposer that removes the listener', () => {
    const root = mount('<button data-action="go">go</button>');
    const go = vi.fn();
    const dispose = delegateActions(root, 'click', { go });

    (root.querySelector('[data-action="go"]') as HTMLElement).click();
    expect(go).toHaveBeenCalledTimes(1);

    dispose();
    (root.querySelector('[data-action="go"]') as HTMLElement).click();
    expect(go).toHaveBeenCalledTimes(1); // unchanged after dispose
  });

  it('wires several event types by calling once per type and collecting disposers', () => {
    const root = mount('<input data-action="rename" value="" />');
    const clickH = vi.fn();
    const inputH = vi.fn();
    const d1 = delegateActions(root, 'click', { rename: clickH });
    const d2 = delegateActions(root, 'input', { rename: inputH });

    const input = root.querySelector('[data-action="rename"]') as HTMLInputElement;
    input.click();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(clickH).toHaveBeenCalledTimes(1);
    expect(inputH).toHaveBeenCalledTimes(1);

    d1();
    d2();
    input.click();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(clickH).toHaveBeenCalledTimes(1);
    expect(inputH).toHaveBeenCalledTimes(1);
  });
});
