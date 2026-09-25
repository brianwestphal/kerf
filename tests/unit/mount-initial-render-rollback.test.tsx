/**
 * `mount()`'s first render is transactional. The first run of the render
 * effect is synchronous, so a throw from it — the user's render function, the
 * each() row contract, a fine-grained binding whose first write throws — means
 * `mount()` returns no disposer. Everything acquired before the throw must be
 * released on the way out:
 *
 *   - the mounted marker (otherwise a retry is refused as "already mounted"),
 *   - the opt-in listener-rebuild MutationObserver installed by `kerfjs/dev`,
 *   - global and per-row binding effects already wired (otherwise they keep
 *     subscribing to signals and writing into discarded DOM),
 *   - the render-scoped module contexts in each.ts / bindings.ts,
 *
 * and the element is restored to the child nodes it held before `mount()`.
 * The original error propagates unchanged.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DEV_HOOKS, installDevHooks } from '../../src/dev.js';
import { computed, each, Fragment, mount, signal } from '../../src/index.js';
import { restoreDevelopmentShape } from '../helpers/dev-shape.js';

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.appendChild(root);
});

afterEach(() => {
  restoreDevelopmentShape();
  document.body.innerHTML = '';
});

/** Run `fn`, expecting it to throw; return what it threw. */
function caught(fn: () => unknown): unknown {
  try {
    fn();
  } catch (err) {
    return err;
  }
  throw new Error('expected a throw');
}

describe('mount(): a throwing first render rolls back', () => {
  it('rethrows the original error object unchanged', () => {
    const boom = new TypeError('boom');
    const err = caught(() =>
      mount(root, () => {
        throw boom;
      }),
    );
    expect(err).toBe(boom);
  });

  it('a retry on the same element succeeds and is reactive', () => {
    expect(() =>
      mount(root, () => {
        throw new Error('first attempt');
      }),
    ).toThrow('first attempt');

    const count = signal(1);
    const dispose = mount(root, () => <p>{count.value}</p>);
    expect(root.innerHTML).toBe('<p>1</p>');
    count.value = 2;
    expect(root.innerHTML).toBe('<p>2</p>');
    dispose();
  });

  it('restores the pre-mount child nodes (same identities) when the failure comes after the DOM write', () => {
    root.innerHTML = '<span id="ssr">server markup</span>text';
    const before = Array.from(root.childNodes);
    // The row contract (one top-level element per row) is checked after the
    // first render's innerHTML write, so the DOM was already replaced.
    expect(() =>
      mount(root, () => (
        <ul>
          {each([{ id: 1 }], (r) => (
            <>
              <li>{r.id}</li>
              <li>extra</li>
            </>
          ))}
        </ul>
      )),
    ).toThrow(/index 0 produced 2 top-level elements/);
    expect(Array.from(root.childNodes)).toEqual(before);
    expect(root.firstChild).toBe(before[0]);
  });

  it('leaves an empty element empty when the render itself throws', () => {
    expect(() =>
      mount(root, () => {
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect(root.childNodes.length).toBe(0);
  });

  it('disposes global signal-hole bindings wired before a later hole threw', () => {
    const label = signal('a');
    let labelReads = 0;
    const tracked = computed(() => {
      labelReads++;
      return label.value;
    });
    const broken = computed((): string => {
      throw new Error('hole failed');
    });

    expect(() =>
      mount(root, () => (
        <div>
          <p>{tracked}</p>
          <p>{broken}</p>
        </div>
      )),
    ).toThrow('hole failed');

    // The first hole's effect was wired and then disposed: a write no longer
    // re-evaluates the computed it subscribed to.
    const readsAfterFailure = labelReads;
    label.value = 'b';
    expect(labelReads).toBe(readsAfterFailure);
    expect(root.childNodes.length).toBe(0);

    // The retry wires fresh bindings that do track.
    const dispose = mount(root, () => <p>{tracked}</p>);
    expect(root.textContent).toBe('b');
    label.value = 'c';
    expect(root.textContent).toBe('c');
    dispose();
  });

  it('disposes row bindings of an each() list when a later row binding throws', () => {
    const tick = signal(0);
    let rowReads = 0;
    const rows = [{ id: 'ok' }, { id: 'bad' }];
    expect(() =>
      mount(root, () => (
        <ul>
          {each(rows, (r) => (
            <li data-key={r.id}>
              {r.id === 'bad'
                ? computed((): string => {
                    throw new Error('row hole failed');
                  })
                : computed(() => {
                    rowReads++;
                    return `${r.id}:${tick.value}`;
                  })}
            </li>
          ))}
        </ul>
      )),
    ).toThrow('row hole failed');

    const readsAfterFailure = rowReads;
    tick.value = 1;
    expect(rowReads).toBe(readsAfterFailure);
    expect(root.childNodes.length).toBe(0);
  });

  it('disposes the holes of the same row wired before one of its holes threw', () => {
    const tick = signal(0);
    let reads = 0;
    expect(() =>
      mount(root, () => (
        <ul>
          {each([{ id: 'r' }], (r) => (
            <li
              data-key={r.id}
              class={computed(() => {
                reads++;
                return `c${tick.value}`;
              })}
            >
              {computed((): string => {
                throw new Error('second hole failed');
              })}
              {computed(() => `${tick.value}`)}
            </li>
          ))}
        </ul>
      )),
    ).toThrow('second hole failed');
    const readsAfterFailure = reads;
    tick.value = 1;
    expect(reads).toBe(readsAfterFailure);
  });

  it('disposes a fully wired earlier list when a later list violates the row contract', () => {
    const tick = signal(0);
    let reads = 0;
    const a = [{ id: 'a1' }];
    const b = [{ id: 'b1' }];
    expect(() =>
      mount(root, () => (
        <div>
          <ul>
            {each(a, (r) => (
              <li data-key={r.id}>
                {computed(() => {
                  reads++;
                  return `${r.id}:${tick.value}`;
                })}
              </li>
            ))}
          </ul>
          <ol>
            {each(b, (r) => (
              <Fragment>
                <li data-key={r.id}>{r.id}</li>
                <li>second root</li>
              </Fragment>
            ))}
          </ol>
        </div>
      )),
    ).toThrow(/index 0 produced 2 top-level elements/);

    const readsAfterFailure = reads;
    tick.value = 1;
    expect(reads).toBe(readsAfterFailure);

    // Retry with a valid shape: both lists bind and stay reactive.
    const dispose = mount(root, () => (
      <div>
        <ul>
          {each(a, (r) => (
            <li data-key={r.id}>{computed(() => `${r.id}:${tick.value}`)}</li>
          ))}
        </ul>
      </div>
    ));
    expect(root.querySelector('li')!.textContent).toBe('a1:1');
    tick.value = 2;
    expect(root.querySelector('li')!.textContent).toBe('a1:2');
    dispose();
  });

  describe('with the kerfjs/dev listener-rebuild observer opted in', () => {
    const env = (
      globalThis as { process: { env: Record<string, string | undefined> } }
    ).process.env;
    let disconnected: MutationObserver[];
    let installed: MutationObserver[];

    beforeEach(() => {
      env.KERF_DEV_WARN_REBUILT_LISTENERS = '1';
      disconnected = [];
      installed = [];
      // Wrap the real hook so the observer it installs can be watched.
      installDevHooks({
        listenerRebuild: (el) => {
          const observer = DEV_HOOKS.listenerRebuild!(el)!;
          installed.push(observer);
          const original = observer.disconnect.bind(observer);
          observer.disconnect = () => {
            disconnected.push(observer);
            original();
          };
          return observer;
        },
      });
    });

    afterEach(() => {
      delete env.KERF_DEV_WARN_REBUILT_LISTENERS;
    });

    it('disconnects it when the render function throws', () => {
      expect(() =>
        mount(root, () => {
          throw new Error('boom');
        }),
      ).toThrow('boom');
      expect(installed).toHaveLength(1);
      expect(disconnected).toEqual(installed);
    });

    it('disconnects it before the DOM restore when the failure follows the DOM write', () => {
      root.innerHTML = '<b>before</b>';
      expect(() =>
        mount(root, () => (
          <ul>
            {each([{ id: 1 }], () => (
              <>
                <li>one</li>
                <li>two</li>
              </>
            ))}
          </ul>
        )),
      ).toThrow(/index 0 produced 2 top-level elements/);
      expect(disconnected).toEqual(installed);
      // Disconnected first, so the restore itself is never observed.
      expect(installed[0].takeRecords()).toEqual([]);
      expect(root.innerHTML).toBe('<b>before</b>');
    });
  });

  it('does not leave render-scoped module state behind for unrelated mounts', () => {
    const other = document.createElement('section');
    document.body.appendChild(other);

    // Fail from inside an each() row render and from inside a signal hole, the
    // two places the module-level render contexts are live.
    expect(() =>
      mount(root, () => (
        <ul>
          {each([{ id: 1 }], () => {
            throw new Error('row render failed');
          })}
        </ul>
      )),
    ).toThrow('row render failed');

    const items = signal([{ id: 'x' }, { id: 'y' }]);
    const sel = signal('x');
    const dispose = mount(other, () => (
      <ul>
        {each(items.value, (r) => (
          <li
            data-key={r.id}
            class={computed(() => (sel.value === r.id ? 'on' : ''))}
          >
            {r.id}
          </li>
        ))}
      </ul>
    ));
    const lis = () => Array.from(other.querySelectorAll('li'));
    expect(lis().map((li) => li.textContent)).toEqual(['x', 'y']);
    expect(lis()[0].className).toBe('on');
    sel.value = 'y';
    expect(lis()[1].className).toBe('on');
    items.value = [{ id: 'y' }];
    expect(lis().map((li) => li.textContent)).toEqual(['y']);
    // The failed mount left nothing behind, so its element mounts cleanly too.
    const disposeRoot = mount(root, () => <em>ok</em>);
    expect(root.innerHTML).toBe('<em>ok</em>');
    disposeRoot();
    dispose();
  });
});
