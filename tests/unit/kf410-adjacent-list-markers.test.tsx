/**
 * A kerf marker comment pairs only with the identical marker.
 *
 * The morph's positional fallback used to pair two comments whenever they were
 * the same *kind* of marker. But a marker anchors live state — a list's rows, a
 * bound hole's inserted text node — looked up by its EXACT data, so it is the
 * comment equivalent of a keyed element. Pairing two different markers made
 * `morphNode` overwrite the live one's data (`from.data = to.data`), re-pointing
 * one anchor at another's id.
 *
 * The shape that surfaced it (KF-410): an EMPTY keyed conditional list and a
 * sibling list, where showing the conditional list in the same batch as an
 * insert into the sibling put two `kf-list:` markers adjacent. The template's
 * reappearing marker was paired with the sibling's live marker and overwrote
 * its id — so the sibling's binding could no longer find its own marker, and its
 * whole row region emptied on the next reconcile.
 *
 * Found by the first `npm run fuzz:soak` run, in the 20k-case range no single
 * process could reach; the invariant checks (KERF_DEV_INVARIANTS) caught it at
 * the render that corrupted the binding.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { batch, each, mount, signal } from '../../src/index.js';

let root: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.appendChild(root);
});

const bRows = (): (string | null)[] =>
  Array.from(root.querySelectorAll('[data-b]')).map((el) => el.textContent);

describe('KF-410: adjacent list markers do not cross-pair', () => {
  it('showing an empty conditional list while inserting into a sibling keeps the sibling', () => {
    const cond = signal(true);
    const a = arraySignal<{ id: string }>([]); // empty, keyed, inside the conditional
    const b = arraySignal([{ id: 's0i0' }]);   // sibling
    const dispose = mount(root, () => (
      <div>
        {cond.value ? each(a, (r) => <li data-a={r.id}>{r.id}</li>, { key: 'L0' }) : ''}
        {each(b, (r) => <li data-b={r.id}>{r.id}</li>)}
      </div>
    ));
    // Drive cond to false (three toggles from true), so the batch below turns
    // it back ON — the direction that reintroduces list A's marker next to B's.
    cond.value = false;
    cond.value = true;
    cond.value = false;
    expect(bRows()).toEqual(['s0i0']);

    batch(() => {
      b.insert(1, { id: 's0n2976' });
      b.insert(0, { id: 's0n9162' });
      cond.value = true;
    });
    expect(bRows()).toEqual(['s0n9162', 's0i0', 's0n2976']);
    dispose();
  });

  it('holds for a single insert too, in both toggle directions', () => {
    const cond = signal(false);
    const a = arraySignal<{ id: string }>([]);
    const b = arraySignal([{ id: 'one' }]);
    const dispose = mount(root, () => (
      <div>
        {cond.value ? each(a, (r) => <li data-a={r.id}>{r.id}</li>, { key: 'L0' }) : ''}
        {each(b, (r) => <li data-b={r.id}>{r.id}</li>)}
      </div>
    ));
    batch(() => { b.insert(0, { id: 'two' }); cond.value = true; });   // A appears
    expect(bRows()).toEqual(['two', 'one']);
    batch(() => { b.insert(0, { id: 'three' }); cond.value = false; }); // A disappears
    expect(bRows()).toEqual(['three', 'two', 'one']);
    dispose();
  });

  it('the reappearing empty list itself binds correctly and can then take rows', () => {
    const cond = signal(false);
    const a = arraySignal<{ id: string }>([]);
    const b = arraySignal([{ id: 'b1' }]);
    const dispose = mount(root, () => (
      <div>
        {cond.value ? each(a, (r) => <li data-a={r.id}>{r.id}</li>, { key: 'L0' }) : ''}
        {each(b, (r) => <li data-b={r.id}>{r.id}</li>)}
      </div>
    ));
    batch(() => { b.insert(0, { id: 'b0' }); cond.value = true; });
    // A is now shown and empty; push to it and confirm it — and B — are correct.
    a.push({ id: 'a1' });
    expect(Array.from(root.querySelectorAll('[data-a]')).map((el) => el.textContent)).toEqual(['a1']);
    expect(bRows()).toEqual(['b0', 'b1']);
    dispose();
  });

  it('an ordinary consumer comment is unaffected — its data still morphs', () => {
    // The tightening is scoped to kerf markers; a plain comment carries no
    // state and must keep pairing positionally so its text updates in place.
    const label = signal('first');
    const dispose = mount(root, () => (
      <div>{`before`}<span>{label.value}</span></div>
    ));
    // Inject a raw comment the way a consumer might, then re-render.
    const span = root.querySelector('span') as Element;
    span.before(document.createComment('note'));
    label.value = 'second';
    expect(root.querySelector('span')?.textContent).toBe('second');
    dispose();
  });
});
