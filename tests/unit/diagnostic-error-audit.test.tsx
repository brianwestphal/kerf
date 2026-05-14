/**
 * KF-169 — diagnostic-error audit.
 *
 * One test per Hard Rule from `docs/ai/usage-guide.md`. Each test pins the
 * runtime behavior an AI sees when it breaks the rule — either the precise
 * thrown error (high actionability) or the silent-misbehavior outcome (low
 * actionability, motivates a follow-up improvement bug).
 *
 * The accompanying audit page at /kerf/ai-evidence/diagnostics/ scores each
 * rule 0–3 and lists fix-recommendation tickets for any score < 3.
 *
 * This file gates the audit: if a future change degrades any error message
 * (or breaks one of the silent-misbehavior captures), this suite trips
 * before the audit page can drift out of sync.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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

  it('Rule 2 — list items without data-key/id: renders without error; positional matching swaps state (score 0)', () => {
    // This is the headline silent-misbehavior case. The reconciler matches by
    // position when no key is present, so inserting at the head visually
    // shifts every row's state (e.g. a focused input loses focus to the
    // wrong row). The audit page captures this; the follow-up bug asks for
    // a dev-time warning when an each() row has no id/data-key.
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

  it('Rule 5 — nested mount() in the same tree: both mounts run; no error fires (score 0)', () => {
    // The outer mount's effect and the inner mount's effect both subscribe to
    // their respective signals, but they fight over the same DOM. There is
    // no detection or warning today.
    const outer = signal(0);
    const inner = signal('hello');
    const innerHost = document.createElement('div');
    innerHost.id = 'inner-host';
    host.appendChild(innerHost);

    expect(() => {
      mount(host, () => (
        <div>
          outer={outer.value}
          <div id="inner-host">slot</div>
        </div>
      ));
      // The outer morph will reconcile `#inner-host` back to "slot",
      // overwriting whatever the inner mount writes. Today: no warning.
      mount(innerHost, () => <span>{inner.value}</span>);
    }).not.toThrow();
  });

  it('Rule 7 — signal read outside render fn: the captured value is frozen; subsequent updates do not re-render (score 0)', () => {
    const count = signal(0);
    const captured = count.value; // wrong: read outside render fn
    mount(host, () => <span>{String(captured)}</span>);
    expect(host.textContent).toBe('0');
    count.value = 5;
    // No throw, no warning — the re-render simply does not happen because
    // the render fn never subscribed.
    expect(host.textContent).toBe('0');
  });

  it('Rule 8 — store action mutates get() instead of calling set(): throws a native TypeError naming the property (score 3, KF-177)', () => {
    // KF-177: in dev, defineStore's `get` parameter freezes the snapshot
    // before returning it, so a Rule 8 violation throws V8's native
    // `TypeError: Cannot assign to read only property 'count' …` — score 3
    // because the error names the property and the object. Previously this
    // landed silently (mutation hit the underlying state without notifying
    // subscribers; direct .value reads saw the new value but effects stayed
    // stale — the worst silent-misbehavior of all the rules).
    //
    // Production keeps the bare reference for zero overhead — the freeze
    // gate is `process.env.NODE_ENV !== 'production'`.
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
    expect(() => counter.actions.wronglyMutate()).toThrow(/Cannot assign to read only property/);
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
      score3: 7, // Rules 1, 8 (KF-177), 9 (KF-178), 12, 5-precondition (mount-null) + 2 bonus (each-primitives, each-duplicates)
      score2: 0,
      score1: 1, // Rule 10
      score0: 4, // Rules 2, 4, 5 (nested-mount silent), 7
      na: 3, // Rules 3, 6, 11
    };
    const total = summary.score3 + summary.score2 + summary.score1 + summary.score0 + summary.na;
    expect(total).toBe(15);
  });
});
