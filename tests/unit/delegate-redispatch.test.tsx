/**
 * @vitest-environment jsdom
 *
 * KF-50DWVS — re-dispatching one Event object whose first dispatch was stopped
 * part-way (a later delegate listener could consume a stale dispatch-snapshot
 * entry resolved against the first dispatch's DOM).
 *
 * jsdom rather than happy-dom: the DOM spec clears an event's stop-propagation
 * flags when its dispatch ends (and throws on dispatching an event that is
 * already dispatching); happy-dom does neither, so a stopped event can never be
 * re-dispatched there and these sequences cannot be modeled. Real browsers
 * follow the spec, as does jsdom.
 *
 * Contract: each dispatch of an event object resolves every delegate against
 * the DOM and the propagation path of THAT dispatch — whatever the first
 * dispatch left unconsumed is discarded once the path differs, and a
 * same-path re-dispatch re-resolves at its first kerf listener.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { delegate, delegateCapture, mount, signal } from '../../src/index.js';

let root: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.appendChild(root);
});

const q = (sel: string): HTMLElement => root.querySelector(sel) as HTMLElement;

/** `[request, close]` → `[p, cancel, confirm]`: the clicked button is recycled into `cancel`. */
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

describe('re-dispatching an event object whose first dispatch was stopped', () => {
  /**
   * `<div.zone-a><button.a></div> <div.zone-b><button.b></div>` inside the
   * root, a stopping delegate on `.zone-a` and a tracking delegate on the
   * root. The first dispatch (on `.a`) stops at `.zone-a`, so the root
   * delegate never consumes its entry; the re-dispatch reaches the root
   * delegate first, and it must resolve against the second dispatch.
   */
  function zones(): {
    zoneA: HTMLElement;
    a: HTMLElement;
    b: HTMLElement;
  } {
    root.innerHTML =
      '<div class="zone-a"><button class="a">a</button></div>' +
      '<div class="zone-b"><button class="b">b</button></div>';
    return { zoneA: q('.zone-a'), a: q('.a'), b: q('.b') };
  }

  it('stopPropagation (bubble), then the same event on a different target', () => {
    const { zoneA, a, b } = zones();
    const hits: string[] = [];
    delegate(zoneA, 'click', 'button', (e) => {
      hits.push('stop');
      e.stopPropagation();
    });
    delegate(root, 'click', 'button', (_e, el) => hits.push(el.className));
    const ev = new MouseEvent('click', { bubbles: true });
    a.dispatchEvent(ev);
    expect(hits).toEqual(['stop']);
    b.dispatchEvent(ev);
    expect(hits).toEqual(['stop', 'b']);
  });

  it('stopImmediatePropagation, then the same event on a different target', () => {
    const { zoneA, a, b } = zones();
    const hits: string[] = [];
    delegate(zoneA, 'click', 'button', (e) => {
      hits.push('stop');
      e.stopImmediatePropagation();
    });
    delegate(zoneA, 'click', 'button', () => hits.push('never'));
    delegate(root, 'click', 'button', (_e, el) => hits.push(el.className));
    const ev = new MouseEvent('click', { bubbles: true });
    a.dispatchEvent(ev);
    expect(hits).toEqual(['stop']);
    b.dispatchEvent(ev);
    expect(hits).toEqual(['stop', 'b']);
  });

  it('a capture-phase stop, then the same event on a different target', () => {
    const { zoneA, a, b } = zones();
    const hits: string[] = [];
    delegateCapture(zoneA, 'click', 'button', (e) => {
      hits.push('stop');
      e.stopPropagation();
    });
    delegate(root, 'click', 'button', (_e, el) => hits.push(el.className));
    const ev = new MouseEvent('click', { bubbles: true });
    a.dispatchEvent(ev);
    expect(hits).toEqual(['stop']);
    b.dispatchEvent(ev);
    expect(hits).toEqual(['stop', 'b']);
  });

  it('a stop by a non-kerf listener, then the same event on a different target', () => {
    const { zoneA, a, b } = zones();
    const hits: string[] = [];
    // A kerf delegate takes the snapshot, a plain listener stops.
    delegate(zoneA, 'click', 'button', () => hits.push('zone'));
    zoneA.addEventListener('click', (e) => e.stopPropagation());
    delegate(root, 'click', 'button', (_e, el) => hits.push(el.className));
    const ev = new MouseEvent('click', { bubbles: true });
    a.dispatchEvent(ev);
    expect(hits).toEqual(['zone']);
    b.dispatchEvent(ev);
    expect(hits).toEqual(['zone', 'b']);
  });

  it('the same target, moved between dispatches, resolves its new ancestors', () => {
    root.innerHTML =
      '<div class="card" id="c1"><div class="stopper"><button>x</button></div></div>' +
      '<div class="card" id="c2"></div>';
    const hits: string[] = [];
    delegate(q('.stopper'), 'click', 'button', (e) => {
      hits.push('stop');
      e.stopPropagation();
    });
    delegate(root, 'click', '.card', (_e, card) => hits.push(card.id));
    const btn = q('button');
    const ev = new MouseEvent('click', { bubbles: true });
    btn.dispatchEvent(ev);
    expect(hits).toEqual(['stop']);
    q('#c2').appendChild(btn);
    btn.dispatchEvent(ev);
    expect(hits).toEqual(['stop', 'c2']);
  });

  it('the same target on an unchanged path re-resolves after a morph recycled it', () => {
    const { confirming, dispose } = confirmFooter();
    const hits: string[] = [];
    delegate(root, 'click', '[data-action="request"]', (e) => {
      hits.push('request');
      confirming.value = true;
      e.stopPropagation();
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

  it('a stopped nested dispatch of a different event leaves the outer snapshot intact', () => {
    const confirming = signal(false);
    const dispose = mount(root, () => (
      <div>
        {confirming.value ? (
          <button data-action="cancel">Cancel</button>
        ) : (
          <button data-action="request">Delete</button>
        )}
        <i class="inner">
          <b>x</b>
        </i>
      </div>
    ));
    const hits: string[] = [];
    delegate(q('.inner'), 'click', 'b', (e) => {
      hits.push('inner');
      e.stopPropagation();
    });
    delegate(root, 'click', 'b', () => hits.push('never'));
    delegate(root, 'click', '[data-action="request"]', () => {
      hits.push('request');
      confirming.value = true;
      q('b').click();
    });
    delegate(root, 'click', '[data-action="cancel"]', () =>
      hits.push('cancel'),
    );
    q('[data-action="request"]').click();
    expect(hits).toEqual(['request', 'inner']);
    expect(confirming.value).toBe(true);
    dispose();
  });

  it('re-dispatching the same event object from inside its own handler throws and keeps the snapshot', () => {
    root.innerHTML = '<button class="b">b</button>';
    const hits: string[] = [];
    let err: unknown;
    delegate(root, 'click', '.b', (e) => {
      hits.push('first');
      try {
        q('.b').dispatchEvent(e);
      } catch (x) {
        err = x;
      }
    });
    delegate(root, 'click', '.b', () => hits.push('second'));
    q('.b').click();
    expect((err as DOMException).name).toBe('InvalidStateError');
    expect(hits).toEqual(['first', 'second']);
  });
});
