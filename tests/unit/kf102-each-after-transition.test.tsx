/**
 * KF-102 regression tests — `each()` introduced via mount() re-render after a
 * parent shape change correctly renders all items, including when the list
 * has trailing non-list siblings inside the same parent.
 *
 * The bug: `bindListsFromMarkers` was walking `marker.nextElementSibling` for
 * `listSeg.items.length` siblings and binding them as list rows, on the
 * assumption that flatten() had inlined the items right after the marker.
 * That assumption only held for the very first render. On subsequent renders
 * that newly introduce a list, `flattenWithoutListItems` emits only the
 * marker — so the walk wrongly bound a trailing `<button>Skip</button>` as
 * the first list item, the next reconcile classified it as stable, and only
 * the second row got inserted (after the misbound first).
 *
 * Fix: bindListsFromMarkers takes an `inlinedItems` flag; when false (re-
 * render), it skips the sibling walk and uses `marker.nextElementSibling` as
 * the binding's `tailAnchor`. The list reconciler uses `tailAnchor` as the
 * "insert at end of list" anchor, so rows land in the right position even
 * when `liveParent` has trailing siblings.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { each, mount, signal, toElement } from '../../src/index.js';

interface Q { phase: 'question'; opts: { text: string }[] }
type S = { phase: 'loading' } | Q | null;

describe('KF-102: each() introduced via re-render with trailing siblings', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('null → loading → question renders every option in the right order', () => {
    const state = signal<S>(null);
    const host = toElement(<div />) as HTMLElement;
    document.body.appendChild(host);
    mount(host, () => {
      const s = state.value;
      if (s == null) return '';
      if (s.phase === 'loading') return <div>loading</div>;
      return (
        <div>
          {each(s.opts, (opt, i) => (
            <button data-key={String(i)}>{opt.text}</button>
          ), (_o, i) => String(i))}
          <button className="skip">Skip</button>
        </div>
      );
    });
    state.value = { phase: 'loading' };
    state.value = { phase: 'question', opts: [{ text: 'Hello' }, { text: 'Goodbye' }] };
    const buttons = Array.from(host.querySelectorAll('button[data-key]'));
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent).toBe('Hello');
    expect(buttons[1].textContent).toBe('Goodbye');
    // Items must come BEFORE the skip button, matching JSX order.
    const all = Array.from(host.querySelectorAll('button'));
    expect(all.map((b) => b.className || b.textContent)).toEqual(['Hello', 'Goodbye', 'skip']);
  });

  it('null → question (skipping loading) renders every option in the right order', () => {
    const state = signal<S>(null);
    const host = toElement(<div />) as HTMLElement;
    document.body.appendChild(host);
    mount(host, () => {
      const s = state.value;
      if (s == null) return '';
      if (s.phase === 'loading') return <div>loading</div>;
      return (
        <div>
          {each(s.opts, (opt, i) => (
            <button data-key={String(i)}>{opt.text}</button>
          ), (_o, i) => String(i))}
          <button className="skip">Skip</button>
        </div>
      );
    });
    state.value = { phase: 'question', opts: [{ text: 'Hello' }, { text: 'Goodbye' }] };
    const buttons = Array.from(host.querySelectorAll('button[data-key]'));
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent).toBe('Hello');
    expect(buttons[1].textContent).toBe('Goodbye');
  });

  it('control: each() present from the first paint also keeps right order', () => {
    const state = signal<S>({ phase: 'question', opts: [{ text: 'Hello' }, { text: 'Goodbye' }] });
    const host = toElement(<div />) as HTMLElement;
    document.body.appendChild(host);
    mount(host, () => {
      const s = state.value;
      if (s == null) return '';
      if (s.phase === 'loading') return <div>loading</div>;
      return (
        <div>
          {each(s.opts, (opt, i) => (
            <button data-key={String(i)}>{opt.text}</button>
          ), (_o, i) => String(i))}
          <button className="skip">Skip</button>
        </div>
      );
    });
    const all = Array.from(host.querySelectorAll('button'));
    expect(all.map((b) => b.className || b.textContent)).toEqual(['Hello', 'Goodbye', 'skip']);
  });

  it('non-list sibling around the each() reconciles correctly across renders', () => {
    // KF-102 round 2: the list-parent's non-list siblings must still be
    // diffed when the surrounds change. Previously `liveParent` was put
    // into a `listParents` set that made the diff skip its entire children
    // subtree — so a sibling button's text/class would freeze after the
    // first render.
    interface State { phase: 'question'; opts: { text: string }[]; skipLabel: string }
    const state = signal<State>({
      phase: 'question',
      opts: [{ text: 'A' }, { text: 'B' }],
      skipLabel: 'Skip',
    });
    const host = toElement(<div />) as HTMLElement;
    document.body.appendChild(host);
    mount(host, () => (
      <div>
        {each(state.value.opts, (opt, i) => (
          <button data-key={String(i)}>{opt.text}</button>
        ), (_o, i) => String(i))}
        <button className="skip">{state.value.skipLabel}</button>
      </div>
    ));
    expect(host.querySelector('.skip')!.textContent).toBe('Skip');
    state.value = {
      phase: 'question',
      opts: [{ text: 'A' }, { text: 'B' }],
      skipLabel: 'Cancel',
    };
    // Sibling text update must propagate. Before the fix, the diff skipped
    // liveParent's children entirely and the sibling stayed at 'Skip'.
    expect(host.querySelector('.skip')!.textContent).toBe('Cancel');
    // List items unchanged: identity preserved.
    const items = host.querySelectorAll('button[data-key]');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toBe('A');
    expect(items[1].textContent).toBe('B');
  });

  it('a new sibling appearing around the each() lands at the right JSX position', () => {
    interface State { showHeader: boolean; opts: { text: string }[] }
    const state = signal<State>({ showHeader: false, opts: [{ text: 'A' }, { text: 'B' }] });
    const host = toElement(<div />) as HTMLElement;
    document.body.appendChild(host);
    mount(host, () => (
      <div>
        {state.value.showHeader ? <h1>Header</h1> : null}
        {each(state.value.opts, (opt, i) => (
          <button data-key={String(i)}>{opt.text}</button>
        ), (_o, i) => String(i))}
        <footer>tail</footer>
      </div>
    ));
    expect(host.querySelector('h1')).toBe(null);
    state.value = { showHeader: true, opts: [{ text: 'A' }, { text: 'B' }] };
    const wrapper = host.firstElementChild!;
    const childTags = Array.from(wrapper.children).map((c) => c.tagName.toLowerCase() + (c.textContent ?? ''));
    expect(childTags).toEqual(['h1Header', 'buttonA', 'buttonB', 'footertail']);
  });

  it('the list disappearing from the segment removes its items + binding', () => {
    interface State { showList: boolean }
    const state = signal<State>({ showList: true });
    const host = toElement(<div />) as HTMLElement;
    document.body.appendChild(host);
    const opts = [{ text: 'A' }, { text: 'B' }];
    mount(host, () => (
      <div>
        {state.value.showList
          ? each(opts, (opt, i) => (
              <button data-key={String(i)}>{opt.text}</button>
            ), (_o, i) => String(i))
          : <span>no list</span>}
      </div>
    ));
    expect(host.querySelectorAll('button[data-key]').length).toBe(2);
    state.value = { showList: false };
    expect(host.querySelectorAll('button[data-key]').length).toBe(0);
    expect(host.querySelector('span')!.textContent).toBe('no list');
    state.value = { showList: true };
    expect(host.querySelectorAll('button[data-key]').length).toBe(2);
  });

  it('subsequent mutations to the list still land in the right position', () => {
    const state = signal<S>(null);
    const host = toElement(<div />) as HTMLElement;
    document.body.appendChild(host);
    mount(host, () => {
      const s = state.value;
      if (s == null) return '';
      if (s.phase === 'loading') return <div>loading</div>;
      return (
        <div>
          {each(s.opts, (opt, i) => (
            <button data-key={String(i)}>{opt.text}</button>
          ), (_o, i) => String(i))}
          <button className="skip">Skip</button>
        </div>
      );
    });
    state.value = { phase: 'question', opts: [{ text: 'A' }, { text: 'B' }] };
    state.value = { phase: 'question', opts: [{ text: 'A' }, { text: 'B' }, { text: 'C' }] };
    const all = Array.from(host.querySelectorAll('button'));
    expect(all.map((b) => b.className || b.textContent)).toEqual(['A', 'B', 'C', 'skip']);
  });
});
