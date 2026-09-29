/**
 * KF-HK7WE8 — delegated-dispatch snapshot (a delegated click could re-fire on
 * a target the synchronous re-render recycled in place).
 *
 * A delegated handler that writes a signal makes `mount()` morph synchronously,
 * INSIDE the same event dispatch. When the morph recycles the clicked element
 * in place (same tag, same position) into a control with a different selector
 * identity, delegates that run later in the dispatch used to resolve their
 * selector against that recycled element and fire too — typically undoing the
 * first handler's state change on the very same click.
 *
 * The contract pinned here: every kerf delegate resolves its match against the
 * DOM as it stood when the event reached the FIRST kerf delegate listener —
 * the set of delegates one event reaches is fixed when it starts dispatching,
 * like per-element listeners. A matched element that an earlier handler
 * removed from the root still suppresses the later delegate (unchanged).
 *
 * The matrix walks: same-position recycle, different-tag replace, keyed moves,
 * each() rows, capture + bubble, nested roots, several delegates on one
 * selector, a handler that removes its target, `stopImmediatePropagation`,
 * re-dispatch of one event object, delegates added / removed mid-dispatch,
 * `{ match: 'direct' }`, and the `delegateActions` table variants.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { delegateActions } from '../../src/actions.js';
import {
  delegate,
  delegateCapture,
  each,
  mount,
  signal,
} from '../../src/index.js';

let root: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.appendChild(root);
});

const q = (sel: string): HTMLElement => root.querySelector(sel) as HTMLElement;

/**
 * The ticket's shape: `[request, close]` → `[p, cancel]`. The morph recycles
 * the clicked `request` button in place into... the `<p>` slot is a different
 * tag, so the clicked button is matched against slot 2 — the `cancel` button.
 */
function confirmFooter(): {
  confirming: ReturnType<typeof signal<boolean>>;
  dispose: () => void;
} {
  const confirming = signal(false);
  const dispose = mount(root, () => (
    <footer>
      {confirming.value ? <p>Sure?</p> : ''}
      {confirming.value ? (
        <button data-action="cancel">Cancel</button>
      ) : (
        <button data-action="request">Delete</button>
      )}
      {confirming.value ? (
        <button data-action="confirm">Confirm</button>
      ) : (
        <button data-action="close">Close</button>
      )}
    </footer>
  ));
  return { confirming, dispose };
}

describe('same-position recycle into a different selector', () => {
  it('a later delegate does not fire on a target the morph recycled into its selector', () => {
    const { confirming, dispose } = confirmFooter();
    const hits: string[] = [];
    delegate(root, 'click', '[data-action="request"]', () => {
      hits.push('request');
      confirming.value = true;
    });
    delegate(root, 'click', '[data-action="cancel"]', () => {
      hits.push('cancel');
      confirming.value = false;
    });
    const req = q('[data-action="request"]');
    req.click();
    expect(hits).toEqual(['request']);
    expect(confirming.value).toBe(true);
    // The recycled element really is now the cancel control, and a NEW click
    // on it fires cancel normally.
    expect(req.getAttribute('data-action')).toBe('cancel');
    req.click();
    expect(hits).toEqual(['request', 'cancel']);
    expect(confirming.value).toBe(false);
    dispose();
  });

  it('a later delegate that matched the ORIGINAL target still fires after the recycle', () => {
    const { confirming, dispose } = confirmFooter();
    const hits: string[] = [];
    delegate(root, 'click', '[data-action="request"]', () => {
      hits.push('request');
      confirming.value = true;
    });
    // A broad click tracker registered later: it matched the button when the
    // click began, so it fires even though the button is now `cancel`.
    delegate(root, 'click', 'footer button', (_e, el) => {
      hits.push(`track:${el.getAttribute('data-action')}`);
    });
    q('[data-action="request"]').click();
    expect(hits).toEqual(['request', 'track:cancel']);
    dispose();
  });

  it('several delegates on the same selector all fire for one click, even after the first recycles the target', () => {
    const { confirming, dispose } = confirmFooter();
    const hits: string[] = [];
    delegate(root, 'click', '[data-action="request"]', () => {
      hits.push('a');
      confirming.value = true;
    });
    delegate(root, 'click', '[data-action="request"]', (_e, el) => {
      hits.push(`b:${el.isConnected}`);
    });
    q('[data-action="request"]').click();
    expect(hits).toEqual(['a', 'b:true']);
    dispose();
  });

  it("{ match: 'direct' } resolves against the dispatch-start DOM too", () => {
    const { confirming, dispose } = confirmFooter();
    const hits: string[] = [];
    delegate(
      root,
      'click',
      '[data-action="request"]',
      () => {
        hits.push('request');
        confirming.value = true;
      },
      { match: 'direct' },
    );
    delegate(
      root,
      'click',
      '[data-action="cancel"]',
      () => hits.push('cancel'),
      { match: 'direct' },
    );
    q('[data-action="request"]').click();
    expect(hits).toEqual(['request']);
    dispose();
  });

  it('a click on a descendant of the recycled control resolves the same way', () => {
    const confirming = signal(false);
    const dispose = mount(root, () => (
      <div>
        {confirming.value ? (
          <button data-action="cancel">
            <span class="icon">x</span>
          </button>
        ) : (
          <button data-action="request">
            <span class="icon">!</span>
          </button>
        )}
      </div>
    ));
    const hits: string[] = [];
    delegate(root, 'click', '[data-action="request"]', () => {
      hits.push('request');
      confirming.value = true;
    });
    delegate(root, 'click', '[data-action="cancel"]', () => {
      hits.push('cancel');
      confirming.value = false;
    });
    q('.icon').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(hits).toEqual(['request']);
    expect(confirming.value).toBe(true);
    dispose();
  });
});

describe('replace, move, and remove', () => {
  it('different-tag replace: the detached original target suppresses later delegates, the replacement is not matched', () => {
    const confirming = signal(false);
    const dispose = mount(root, () => (
      <div>
        {confirming.value ? (
          <a href="#" data-action="cancel">
            Cancel
          </a>
        ) : (
          <button data-action="request">Delete</button>
        )}
      </div>
    ));
    const hits: string[] = [];
    delegate(root, 'click', '[data-action="request"]', () => {
      hits.push('request');
      confirming.value = true;
    });
    delegate(root, 'click', '[data-action]', (_e, el) => {
      hits.push(`any:${el.getAttribute('data-action')}`);
    });
    const req = q('[data-action="request"]');
    req.click();
    expect(req.isConnected).toBe(false);
    expect(hits).toEqual(['request']);
    dispose();
  });

  it('a handler that removes its target suppresses later delegates for that target', () => {
    const shown = signal(true);
    const dispose = mount(root, () => (
      <div>{shown.value ? <button class="x">x</button> : <p>gone</p>}</div>
    ));
    const hits: string[] = [];
    delegate(root, 'click', '.x', () => {
      hits.push('remove');
      shown.value = false;
    });
    delegate(root, 'click', '.x', () => hits.push('after'));
    q('.x').click();
    expect(hits).toEqual(['remove']);
    dispose();
  });

  it('keyed move: a later delegate still fires for the moved (still-attached) target', () => {
    const order = signal(['a', 'b', 'c']);
    const dispose = mount(root, () => (
      <ul>
        {order.value.map((id) => (
          <li data-key={id} class="row" data-id={id}>
            {id}
          </li>
        ))}
      </ul>
    ));
    const hits: string[] = [];
    delegate(root, 'click', '.row', (_e, el) => {
      hits.push(`move:${el.getAttribute('data-id')}`);
      const id = el.getAttribute('data-id') as string;
      order.value = [id, ...order.value.filter((x) => x !== id)];
    });
    delegate(root, 'click', '.row', (_e, el) =>
      hits.push(`after:${el.getAttribute('data-id')}`),
    );
    const c = q('[data-id="c"]');
    c.click();
    expect(root.querySelector('li')).toBe(c);
    expect(hits).toEqual(['move:c', 'after:c']);
    dispose();
  });
});

describe('each() rows', () => {
  it('a row control recycled from select into deselect does not toggle back on the same click', () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const selected = signal<number | null>(null);
    const dispose = mount(root, () => (
      <ul>
        {each(
          items,
          (item) => (
            <li data-key={String(item.id)}>
              <button
                data-action={selected.value === item.id ? 'deselect' : 'select'}
                data-id={String(item.id)}
              >
                {String(item.id)}
              </button>
            </li>
          ),
          () => selected.value,
        )}
      </ul>
    ));
    const hits: string[] = [];
    delegate(root, 'click', '[data-action="select"]', (_e, el) => {
      hits.push('select');
      selected.value = Number(el.getAttribute('data-id'));
    });
    delegate(root, 'click', '[data-action="deselect"]', () => {
      hits.push('deselect');
      selected.value = null;
    });
    const btn = q('[data-id="2"]');
    btn.click();
    expect(hits).toEqual(['select']);
    expect(selected.value).toBe(2);
    expect(btn.getAttribute('data-action')).toBe('deselect');
    btn.click();
    expect(hits).toEqual(['select', 'deselect']);
    expect(selected.value).toBe(null);
    dispose();
  });
});

describe('capture, bubble, and nested roots', () => {
  it('a capture-phase handler that recycles the target does not redirect a bubble-phase delegate', () => {
    const { confirming, dispose } = confirmFooter();
    const hits: string[] = [];
    // Registered AFTER the bubble delegate, but capture runs first.
    delegate(root, 'click', '[data-action="cancel"]', () => {
      hits.push('cancel');
      confirming.value = false;
    });
    delegateCapture(root, 'click', '[data-action="request"]', () => {
      hits.push('request');
      confirming.value = true;
    });
    q('[data-action="request"]').click();
    expect(hits).toEqual(['request']);
    expect(confirming.value).toBe(true);
    dispose();
  });

  it('an ancestor-root delegate does not fire on a target an inner-root handler recycled', () => {
    const { confirming, dispose } = confirmFooter();
    const hits: string[] = [];
    delegate(root, 'click', '[data-action="request"]', () => {
      hits.push('inner:request');
      confirming.value = true;
    });
    delegate(document.body, 'click', '[data-action="cancel"]', () => {
      hits.push('outer:cancel');
      confirming.value = false;
    });
    q('[data-action="request"]').click();
    expect(hits).toEqual(['inner:request']);
    expect(confirming.value).toBe(true);
    dispose();
  });

  it('an ancestor-root capture handler that recycles the target does not redirect an inner bubble delegate', () => {
    const { confirming, dispose } = confirmFooter();
    const hits: string[] = [];
    delegate(root, 'click', '[data-action="cancel"]', () => {
      hits.push('inner:cancel');
      confirming.value = false;
    });
    delegateCapture(document.body, 'click', '[data-action="request"]', () => {
      hits.push('outer:request');
      confirming.value = true;
    });
    q('[data-action="request"]').click();
    expect(hits).toEqual(['outer:request']);
    dispose();
  });
});

describe('dispatch lifecycle', () => {
  it('stopImmediatePropagation still stops later delegates, and the next click resolves fresh', () => {
    const { confirming, dispose } = confirmFooter();
    const hits: string[] = [];
    delegate(root, 'click', '[data-action="request"]', (e) => {
      hits.push('request');
      confirming.value = true;
      e.stopImmediatePropagation();
    });
    delegate(root, 'click', 'button', () => hits.push('any'));
    const btn = q('[data-action="request"]');
    btn.click();
    expect(hits).toEqual(['request']);
    // Fresh event: resolved against the now-current `cancel` button.
    btn.click();
    expect(hits).toEqual(['request', 'any']);
    dispose();
  });

  it('re-dispatching the same event object resolves against the DOM at the second dispatch', () => {
    const { confirming, dispose } = confirmFooter();
    const hits: string[] = [];
    delegate(root, 'click', '[data-action="request"]', () => {
      hits.push('request');
      confirming.value = true;
    });
    delegate(root, 'click', '[data-action="cancel"]', () => {
      hits.push('cancel');
      confirming.value = false;
    });
    const btn = q('[data-action="request"]');
    const ev = new MouseEvent('click', { bubbles: true });
    btn.dispatchEvent(ev);
    expect(hits).toEqual(['request']);
    btn.dispatchEvent(ev);
    expect(hits).toEqual(['request', 'cancel']);
    dispose();
  });

  it('a nested dispatch from inside a handler keeps its own snapshot and leaves the outer one intact', () => {
    const confirming = signal(false);
    const dispose = mount(root, () => (
      <div>
        {confirming.value ? (
          <button data-action="cancel">Cancel</button>
        ) : (
          <button data-action="request">Delete</button>
        )}
        <button class="helper">helper</button>
      </div>
    ));
    const hits: string[] = [];
    delegate(root, 'click', '[data-action="request"]', () => {
      hits.push('request');
      confirming.value = true;
      // A programmatic click is a NEW event dispatched synchronously, while
      // the outer click is still mid-dispatch.
      q('.helper').click();
    });
    delegate(root, 'click', '.helper', () => hits.push('helper'));
    delegate(root, 'click', '[data-action="cancel"]', () => {
      hits.push('cancel');
      confirming.value = false;
    });
    q('[data-action="request"]').click();
    expect(hits).toEqual(['request', 'helper']);
    expect(confirming.value).toBe(true);
    dispose();
  });

  it('a delegate added mid-dispatch on an ancestor root resolves on its own and fires', () => {
    root.innerHTML = '<button class="b">b</button>';
    const hits: string[] = [];
    delegate(root, 'click', '.b', () => {
      hits.push('first');
      delegate(document.body, 'click', '.b', () => hits.push('late'));
    });
    q('.b').click();
    expect(hits).toEqual(['first', 'late']);
  });

  it('a disposed delegate leaves the dispatch snapshot', () => {
    root.innerHTML = '<button class="b">b</button>';
    const hits: string[] = [];
    const off = delegate(root, 'click', '.b', () => hits.push('gone'));
    delegate(root, 'click', '.b', () => hits.push('kept'));
    off();
    q('.b').click();
    expect(hits).toEqual(['kept']);
  });

  it('only delegates for the dispatched event type are resolved', () => {
    root.innerHTML = '<button class="b">b</button>';
    const hits: string[] = [];
    delegate(root, 'mousedown', '.b', () => hits.push('mousedown'));
    delegate(root, 'click', '.b', () => hits.push('click'));
    q('.b').click();
    expect(hits).toEqual(['click']);
  });
});

describe('delegateActions() × synchronous re-render', () => {
  it('two tables on one root: the second does not dispatch the recycled action', () => {
    const { confirming, dispose } = confirmFooter();
    const hits: string[] = [];
    delegateActions(root, 'click', {
      request: () => {
        hits.push('request');
        confirming.value = true;
      },
    });
    delegateActions(root, 'click', {
      cancel: () => {
        hits.push('cancel');
        confirming.value = false;
      },
    });
    q('[data-action="request"]').click();
    expect(hits).toEqual(['request']);
    expect(confirming.value).toBe(true);
    dispose();
  });

  it('a table after a delegate() handler dispatches by the action the click began on', () => {
    const { confirming, dispose } = confirmFooter();
    const hits: string[] = [];
    delegate(root, 'click', '[data-action="request"]', () => {
      hits.push('delegate:request');
      confirming.value = true;
    });
    delegateActions(root, 'click', {
      request: (_e, el) =>
        hits.push(`table:request:${el.getAttribute('data-action')}`),
      cancel: () => hits.push('table:cancel'),
    });
    q('[data-action="request"]').click();
    // The table saw `request` — the action the user clicked — even though the
    // element now reads `cancel`.
    expect(hits).toEqual(['delegate:request', 'table:request:cancel']);
    dispose();
  });

  it('a single table still toggles cleanly across clicks on the recycled control', () => {
    const { confirming, dispose } = confirmFooter();
    const hits: string[] = [];
    delegateActions(root, 'click', {
      request: () => {
        hits.push('request');
        confirming.value = true;
      },
      cancel: () => {
        hits.push('cancel');
        confirming.value = false;
      },
    });
    const btn = q('[data-action="request"]');
    btn.click();
    btn.click();
    btn.click();
    expect(hits).toEqual(['request', 'cancel', 'request']);
    expect(confirming.value).toBe(true);
    dispose();
  });
});
