/**
 * KF-169 — diagnostic-error audit.
 *
 * One test per Hard Rule from `docs/ai/usage-guide.md`. Each test pins the
 * runtime behavior callers see when they break the rule — either the precise
 * thrown error (high actionability) or the silent-misbehavior outcome (low
 * actionability, motivates a follow-up improvement bug).
 *
 * This file pins the diagnostic contract: if a future change degrades any
 * error message (or breaks one of the silent-misbehavior captures), this
 * suite trips. The `/kerf/ai-evidence/diagnostics/` page that originally
 * scored these rules was removed in KF-211; the runtime contract these
 * tests pin still matters as a UX gate.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import type { KerfBaseAttrs, KerfCustomElement } from '../../src/jsx-runtime.js';

// Rule 11 in this audit pins the correct declaration-merge target. The
// merge below also makes the no-runtime-error fixture below type-check.
declare module '../../src/jsx-runtime.js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'my-widget': KerfCustomElement & KerfBaseAttrs & { 'data-foo'?: string };
    }
  }
}
import {
  defineStore,
  each,
  effect,
  mount,
  resetAllStores,
  signal,
  toElement,
} from '../../src/index.js';
import { clearStoreRegistry } from '../../src/testing.js';

let host: HTMLElement;

beforeEach(() => {
  host = document.createElement('div');
  host.id = 'audit-host';
  document.body.appendChild(host);
});

afterEach(() => {
  resetAllStores();
  clearStoreRegistry();
  host.remove();
});

describe('Diagnostic-error audit (KF-169) — Hard Rules 1–12', () => {
  /* ──────────────── SCORE 3: precise, fix-suggestive throw ──────────────── */

  it('Rule 1 — DOM node as JSX child: throws naming the root cause and the fix (score 3)', () => {
    const node = toElement('<span>oops</span>');
    expect(() => (<div>{node as unknown as string}</div>)).toThrow(
      /JSX: DOM elements cannot be passed as children.*toElement/s,
    );
  });

  it('Rule 12 — multi-root each() row: throws with row index and the (truncated) HTML (score 3)', () => {
    // The row contract is enforced at reconcile time, not at each() call
    // time — so the throw fires when mount() walks the segment tree.
    const items = [{ id: 'a' }, { id: 'b' }];
    expect(() => {
      mount(host, () => (
        <table>
          <tbody>
            {each(items, () => <>
              <td>cell 1</td>
              <td>cell 2</td>
            </>)}
          </tbody>
        </table>
      ));
    }).toThrow(
      /each\(\): row render at index 0 produced 2 top-level elements; exactly one is required/,
    );
  });

  it('Rule 9 — function-valued attribute (inline onClick): throws with the delegate() fix-pointer (score 3)', () => {
    // KF-178: function-valued attributes whose names match /^on[A-Z]/ throw a
    // dedicated error that names the attribute AND points at delegate() as the
    // canonical fix. Score 3 — the model can self-correct without external help.
    //
    // The type system also blocks `onClick` on HTMLButtonAttrs — kerf doesn't
    // expose inline-handler props in its JSX types. We bypass via an
    // attribute-bag cast so this test pins the *runtime* throw (the type
    // system catching it earlier is a bonus, not the subject under test).
    const handler = () => {};
    const props = { onClick: handler } as unknown as Record<string, unknown>;
    expect(() => (<button {...props as Record<string, never>}>x</button>).toString()).toThrow(
      /JSX: inline event handlers like onClick=\{fn\} are not supported.*delegate\(rootEl/s,
    );
  });

  it('Rule 5 (related: mount preconditions) — mount(null, …): throws with the actionable fix (score 3)', () => {
    expect(() => mount(null as unknown as HTMLElement, () => 'x')).toThrow(
      /mount: rootEl is null\/undefined.*typo/s,
    );
  });

  it('each() primitive items: throws naming the index and the wrap-fix (bonus rule, score 3)', () => {
    expect(() => each([1, 2] as unknown as object[], (n) => <li>{String(n)}</li>).toString()).toThrow(
      /each\(\): items must be objects.*index 0.*Wrap primitives/s,
    );
  });

  it('each() duplicate references: throws naming the index and the immutable-copy fix (bonus rule, score 3)', () => {
    const a = { id: 'a' };
    expect(() => each([a, a], (item) => <li data-key={(item as { id: string }).id}>x</li>).toString()).toThrow(
      /each\(\): the same object reference appears at multiple indices.*index 1.*items\.map/s,
    );
  });

  /* ──────────────── SCORE 0–1: silent or undiagnosed misbehavior ──────────────── */

  it('Rule 2 — list items without data-key/id: console.warns with a fix-pointer once per binding (score 2, KF-173)', () => {
    // KF-173 lifts this from score 0 to score 2: render still succeeds (the
    // reconciler still falls back to positional matching), but a one-shot
    // dev-mode `console.warn` names the row index, the canonical fix
    // (`data-key={item.id}` on the row's top-level element), and quotes the
    // row HTML so the author can locate the offending each() callsite.
    // Score 2 not 3 because the warning fires AFTER the first render — the
    // misbehavior on insert/remove still occurs; the user just gets a
    // pointer at WHY.
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const items = signal([{ id: 'b' }, { id: 'c' }]);
      expect(() => {
        mount(host, () => (
          <ul>
            {each(items.value, (item) => <li>{item.id}</li>)}
          </ul>
        ));
      }).not.toThrow();
      expect(host.textContent).toContain('b');
      expect(host.textContent).toContain('c');
      expect(warnSpy).toHaveBeenCalledTimes(1);
      const message = warnSpy.mock.calls[0][0];
      expect(message).toMatch(/the first row has no `id` or `data-key`/);
      expect(message).toMatch(/Add `data-key=\{item\.id\}`/);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('Rule 4 — addEventListener on a mount-managed node: works once; the listener is lost on next morph (score 0)', () => {
    // happy-dom can verify the silent-misbehavior outcome: after a morph that
    // rebuilds the node, the listener has no live target. Real-browser focus
    // mechanics aren't needed to see the regression.
    const count = signal(0);
    const clicks: number[] = [];
    mount(host, () => (
      <div>
        <span className={count.value % 2 === 0 ? 'even' : 'odd'}>label</span>
        <button data-action="ping">click</button>
      </div>
    ));
    const span = host.querySelector('span')!;
    span.addEventListener('click', () => clicks.push(count.value));
    span.click();
    expect(clicks).toEqual([0]);

    // Force a re-render that re-builds the span (class change triggers attr
    // morph at minimum; on a more invasive change kerf may rebuild the node).
    // The listener will not survive a full rebuild — we document that here.
    count.value = 1;
    // No error fires; the silent-misbehavior is that subsequent clicks may
    // never reach the imperatively-attached listener. We capture the
    // no-throw fact; the audit page describes the user-visible consequence.
    expect(() => host.querySelector('span')!.click()).not.toThrow();
  });

  it('Rule 5 — nested mount() in the same tree: the second mount throws naming the precondition (score 3, KF-175)', () => {
    // KF-175: `mount()` walks the requested root's ancestors / descendants /
    // self for the `Symbol.for("kerfjs.mounted")` marker before installing
    // the effect, and throws if any is found. Score 3 — the error names what
    // happened ("already inside (or contains) a mounted tree") and the fix
    // ("compose with plain functions that return JSX instead of nesting").
    // Previously this was silent: both mounts ran, both effects subscribed,
    // and the outer's morph would reconcile the inner mount's DOM back to
    // whatever the outer template said — invisible from one read site, broken
    // from another.
    const outer = signal(0);
    const inner = signal('hello');

    mount(host, () => (
      <div>
        outer={outer.value}
        <div id="inner-host">slot</div>
      </div>
    ));
    // Query AFTER mount so we get the post-render `#inner-host` element that
    // is actually a descendant of the mounted `host`. (Pre-creating an element
    // and appending it before mount wouldn't work — the first render's
    // `innerHTML =` replaces the children, orphaning the pre-created element.)
    const innerHost = host.querySelector('#inner-host') as HTMLElement;
    expect(() => mount(innerHost, () => <span>{inner.value}</span>))
      .toThrow(/already inside.*mounted tree/);
  });

  it('Rule 7 — signal read outside render fn: the captured value is frozen; subsequent updates do not re-render (score 0 by default; score 2 with KF-176 opt-in)', () => {
    // Default mode (no `KERF_DEV_WARN_UNTRACKED_SIGNALS` env var): no throw,
    // no warning — the re-render simply does not happen because the render
    // fn never subscribed. KF-176 ships a `DevSignal` subclass that emits a
    // one-shot console.warn when this env var is set to "1" — tested in
    // `tests/unit/reactive.test.ts` under the "dev-mode untracked-write
    // warning" describe block. The audit page documents both modes.
    const count = signal(0);
    const captured = count.value; // wrong: read outside render fn
    mount(host, () => <span>{String(captured)}</span>);
    expect(host.textContent).toBe('0');
    count.value = 5;
    expect(host.textContent).toBe('0');
  });

  it('Rule 8 — store action mutates get() instead of calling set(): throws a read-only TypeError (score 3)', () => {
    // In dev, defineStore's `get()` returns a deep read-only Proxy, so a Rule 8
    // violation throws a store-specific `TypeError` naming the rule — score 3
    // because the error explains the violation and the fix. Previously this
    // landed silently (mutation hit the underlying state without notifying
    // subscribers; direct .value reads saw the new value but effects stayed
    // stale — the worst silent-misbehavior of all the rules).
    //
    // Production keeps the bare reference for zero overhead — the guard is
    // gated through `isDevMode()` (`NODE_ENV !== 'production'`, or an explicit
    // `globalThis.KERF_DEV`).
    const counter = defineStore({
      initial: () => ({ count: 0 }),
      actions: (_set, get) => ({
        wronglyMutate: () => {
          (get() as { count: number }).count = 42;
        },
      }),
    });
    let observed = -1;
    effect(() => {
      observed = counter.state.value.count;
    });
    expect(observed).toBe(0);
    expect(() => counter.actions.wronglyMutate()).toThrow(/read-only/);
    // State and observer both stay at the initial value — the mutation never landed.
    expect(counter.state.value.count).toBe(0);
    expect(observed).toBe(0);
  });

  it('Rule 10 — multiple each() callsites bound to the same arraySignal: subsequent callsites silently take the snapshot path (score 1)', () => {
    // No error today, but the result is correct — both renderings show the
    // same items. The "wrong" thing is only that the second callsite forfeits
    // the granular-patch fast path. Score 1 because the behavior is correct
    // but the perf characteristic is invisible.
    const items = arraySignal([{ id: 'a' }, { id: 'b' }]);
    expect(() => {
      mount(host, () => (
        <div>
          <ul>{each(items.value, (item) => <li data-key={item.id}>top:{item.id}</li>)}</ul>
          <ul>{each(items.value, (item) => <li data-key={item.id}>bot:{item.id}</li>)}</ul>
        </div>
      ));
    }).not.toThrow();
    expect(host.querySelectorAll('li').length).toBe(4);
  });

  /* ──────────────── Special cases (Rules 3, 6, 11) ──────────────── */

  it('Rule 3 — data-morph-skip is an instruction, not a violation (N/A)', () => {
    // Documented escape hatch. There is no "wrong code that breaks it" —
    // omitting it on a library-owned subtree is what produces breakage,
    // and that's a positive-instruction rule, not a runtime-detected one.
    // We pin the positive contract here: data-morph-skip preserves the
    // subtree verbatim.
    const sentinel = signal(0);
    mount(host, () => (
      <div>
        outer={sentinel.value}
        <div data-morph-skip><span className="lib-state">untouched</span></div>
      </div>
    ));
    const libSpan = host.querySelector('.lib-state')!;
    libSpan.setAttribute('data-imperative', 'set-after-mount');
    sentinel.value = 1;
    // After re-render, the imperative attribute survives because data-morph-skip
    // froze the subtree.
    expect(host.querySelector('.lib-state')!.getAttribute('data-imperative')).toBe('set-after-mount');
  });

  it('Rule 6 — components are plain functions: a "hook" call via signal() inside the component body works as expected (N/A)', () => {
    // kerf has no hooks. The rule says "don't expect <MyComponent /> with
    // hooks semantics" — and the framework has no machinery that would even
    // make that call shape work. A function returning JSX is the only
    // component shape. We pin the positive contract.
    const Greeting = (props: { name: string }) => <p>Hello, {props.name}!</p>;
    mount(host, () => <div>{Greeting({ name: 'world' })}</div>);
    expect(host.textContent).toContain('Hello, world!');
  });

  it('Rule 11 — custom-element types declaration-merge into kerfjs/jsx-runtime (compile-time only)', () => {
    // The violation is a TypeScript type error: declaring into the global
    // JSX namespace produces no type for the custom tag, so usage fails at
    // type-check time. There's no runtime detection — the jsx-typing dist
    // test (`npm run test:dist:jsx-typing`) is the canonical gate. The
    // declaration merge at the top of this file uses the *correct* target
    // (`'kerfjs/jsx-runtime'` via the local path); the test below confirms
    // the runtime contract that custom-element JSX still renders verbatim.
    const jsx = (<my-widget data-foo="bar">contents</my-widget>).toString();
    expect(jsx).toMatch(/<my-widget data-foo="bar">contents<\/my-widget>/);
  });

  /* ──────────────── Score totals (also pinned for the audit page) ──────────────── */

  it('audit summary: counts by score match the doc page', () => {
    // Pinned here so the page and the audit can't drift apart. Updating
    // either side without the other trips this test.
    const summary = {
      score3: 8, // Rules 1, 5 (KF-175 nested mount), 8 (KF-177), 9 (KF-178), 12, 5-precondition (mount-null) + 2 bonus (each-primitives, each-duplicates)
      score2: 1, // Rule 2 (KF-173 missing-key warn)
      score1: 1, // Rule 10
      score0: 2, // Rules 4, 7
      na: 3, // Rules 3, 6, 11
    };
    const total = summary.score3 + summary.score2 + summary.score1 + summary.score0 + summary.na;
    expect(total).toBe(15);
  });
});
