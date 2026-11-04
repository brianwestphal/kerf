/**
 * KF-AJ4KG6: opt-in selector fan-out warning (`selectorFanout` /
 * `KERF_DEV_WARN_SELECTOR_FANOUT=1`).
 *
 * The shape under test is N rows each holding
 * `computed(() => i === sel.value ? 'danger' : '')`: one write re-evaluates
 * all N computeds and only two change. A broad legitimate update (every
 * computed's value changes) must stay silent, and so must anything the
 * warning cannot attribute to one signal.
 *
 * Both halves are creation-time decisions — `signal()` picks `DevSignal`
 * and `computed()` picks the counting wrapper when it is created — so every
 * test switches the warning on BEFORE building its graph, except the one
 * asserting that boundary.
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from 'vitest';

import { devHooks, enableWarnings } from '../../src/dev.js';
import { _resetSelectorFanoutForTests } from '../../src/dev-selector-fanout-warn.js';
import { _resetWarningOptionsForTests } from '../../src/dev-warn-config.js';
import {
  batch,
  computed,
  effect,
  type ReadonlySignal,
  signal,
} from '../../src/reactive.js';
import {
  enterProductionShape,
  restoreDevelopmentShape,
} from '../helpers/dev-shape.js';

const ROWS = 1000;

let warnSpy: MockInstance<typeof console.warn>;
let disposers: (() => void)[];

/** Let the window's closing microtask (and anything queued after it) run. */
function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Subscribe every computed through its own effect, as fine-grained bindings do. */
function subscribeAll(computeds: readonly ReadonlySignal<unknown>[]): void {
  for (const c of computeds) {
    disposers.push(
      effect(() => {
        void c.value;
      }),
    );
  }
}

function equalityRows(sel: ReadonlySignal<number>): ReadonlySignal<string>[] {
  const rows = Array.from({ length: ROWS }, (_, i) =>
    computed(() => (i === sel.value ? 'danger' : '')),
  );
  subscribeAll(rows);
  return rows;
}

function fanoutMessages(): string[] {
  return warnSpy.mock.calls
    .map((call) => String(call[0]))
    .filter((msg) => msg.includes('selector()'));
}

beforeEach(() => {
  _resetWarningOptionsForTests();
  _resetSelectorFanoutForTests();
  disposers = [];
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  for (const dispose of disposers) dispose();
  _resetWarningOptionsForTests();
  _resetSelectorFanoutForTests();
  warnSpy.mockRestore();
});

describe('selector fan-out warning (KF-AJ4KG6, opt-in)', () => {
  it('warns after three consecutive equality fan-out writes, naming the fix and the write site', async () => {
    enableWarnings({ selectorFanout: true });
    const sel = signal(-1);
    equalityRows(sel);

    sel.value = 1;
    await settle();
    sel.value = 2;
    await settle();
    expect(fanoutMessages()).toHaveLength(0);

    sel.value = 3;
    await settle();
    const messages = fanoutMessages();
    expect(messages).toHaveLength(1);
    const msg = messages[0];
    expect(msg).toMatch(/re-evaluated 1000 computed\(\)s but only 2/);
    expect(msg).toMatch(/equality or membership test/);
    expect(msg).toMatch(/setSelector\(\)/);
    // The write site is the captured stack — this test file is on it.
    expect(msg).toMatch(/dev-selector-fanout-warn\.internal\.test/);
    // Family message-shape rule: every warning ends by naming its off switch.
    expect(msg).toMatch(
      /enableWarnings\(\{ selectorFanout: false \}\).*KERF_DEV_WARN_SELECTOR_FANOUT=0/,
    );
  });

  it('a broad update whose computeds all change stays silent', async () => {
    enableWarnings({ selectorFanout: true });
    const theme = signal('light');
    subscribeAll(
      Array.from({ length: ROWS }, (_, i) =>
        computed(() => `${theme.value}-${i}`),
      ),
    );
    for (const next of ['dark', 'light', 'dark', 'light', 'dark']) {
      theme.value = next;
      await settle();
    }
    expect(fanoutMessages()).toHaveLength(0);
  });

  it('a write fanning out to fewer than 200 computeds stays silent', async () => {
    enableWarnings({ selectorFanout: true });
    const sel = signal(-1);
    subscribeAll(
      Array.from({ length: 150 }, (_, i) =>
        computed(() => (i === sel.value ? 'danger' : '')),
      ),
    );
    for (let k = 0; k < 5; k++) {
      sel.value = k;
      await settle();
    }
    expect(fanoutMessages()).toHaveLength(0);
  });

  it('attributes a write made inside batch() to its signal', async () => {
    enableWarnings({ selectorFanout: true });
    const sel = signal(-1);
    equalityRows(sel);
    for (let k = 0; k < 3; k++) {
      batch(() => {
        sel.value = k;
      });
      await settle();
    }
    expect(fanoutMessages()).toHaveLength(1);
  });

  it('two writes to the SAME signal in one tick still count as one window', async () => {
    enableWarnings({ selectorFanout: true });
    const sel = signal(-1);
    equalityRows(sel);
    for (let k = 0; k < 3; k++) {
      sel.value = 100 + k;
      sel.value = k;
      await settle();
    }
    expect(fanoutMessages()).toHaveLength(1);
  });

  it('skips a window in which two tracked signals were written', async () => {
    enableWarnings({ selectorFanout: true });
    const sel = signal(-1);
    const other = signal(0);
    equalityRows(sel);
    for (let k = 0; k < 5; k++) {
      sel.value = k;
      other.value = k + 1;
      await settle();
    }
    for (let k = 10; k < 15; k++) {
      batch(() => {
        sel.value = k;
        other.value = k;
      });
      await settle();
    }
    expect(fanoutMessages()).toHaveLength(0);
  });

  it('a skipped window neither advances nor resets the streak', async () => {
    enableWarnings({ selectorFanout: true });
    const sel = signal(-1);
    const other = signal(0);
    equalityRows(sel);
    sel.value = 1;
    await settle();
    sel.value = 2;
    await settle();
    sel.value = 3;
    other.value = 1;
    await settle();
    expect(fanoutMessages()).toHaveLength(0);
    sel.value = 4;
    await settle();
    expect(fanoutMessages()).toHaveLength(1);
  });

  it('a broad window for the same signal resets its streak', async () => {
    enableWarnings({ selectorFanout: true });
    const sel = signal(-1);
    // Below 5000 each row is an equality test; at 5000+ every row changes.
    subscribeAll(
      Array.from({ length: ROWS }, (_, i) =>
        computed(() =>
          i === sel.value
            ? 'danger'
            : sel.value >= 5000
              ? String(sel.value)
              : '',
        ),
      ),
    );
    for (const next of [1, 2, 5000, 3, 4, 6]) {
      sel.value = next;
      await settle();
    }
    // 1 and 2 built a streak of two; 5000 was broad and reset it, and 3 (back
    // from 5000) changed every row too. 4 and 6 rebuild it to two.
    expect(fanoutMessages()).toHaveLength(0);
    sel.value = 7;
    await settle();
    expect(fanoutMessages()).toHaveLength(1);
  });

  it('is one-shot per signal, and a second signal warns on its own', async () => {
    enableWarnings({ selectorFanout: true });
    const sel = signal(-1);
    const sel2 = signal(-1);
    equalityRows(sel);
    equalityRows(sel2);
    for (let k = 0; k < 8; k++) {
      sel.value = k;
      await settle();
    }
    expect(fanoutMessages()).toHaveLength(1);
    for (let k = 0; k < 3; k++) {
      sel2.value = k;
      await settle();
    }
    expect(fanoutMessages()).toHaveLength(2);
  });

  it('a write that leaves the value unchanged opens no window', async () => {
    enableWarnings({ selectorFanout: true });
    const sel = signal(-1);
    equalityRows(sel);
    sel.value = 1;
    await settle();
    sel.value = 2;
    await settle();
    sel.value = 2;
    await settle();
    expect(fanoutMessages()).toHaveLength(0);
  });

  it('a test reset while a window is open drops it quietly', async () => {
    enableWarnings({ selectorFanout: true });
    const sel = signal(-1);
    equalityRows(sel);
    sel.value = 1;
    _resetSelectorFanoutForTests();
    await settle();
    expect(fanoutMessages()).toHaveLength(0);
  });

  it('switched off: computeds are not wrapped and nothing warns', async () => {
    const fn = (): number => 1;
    expect(devHooks.wrapComputed?.(fn)).toBe(fn);
    const sel = signal(-1);
    equalityRows(sel);
    for (let k = 0; k < 5; k++) {
      sel.value = k;
      await settle();
    }
    expect(fanoutMessages()).toHaveLength(0);
  });

  it('the env var is an equivalent switch', () => {
    const env = (
      globalThis as { process: { env: Record<string, string | undefined> } }
    ).process.env;
    env.KERF_DEV_WARN_SELECTOR_FANOUT = '1';
    try {
      const fn = (): number => 1;
      expect(devHooks.wrapComputed?.(fn)).not.toBe(fn);
    } finally {
      delete env.KERF_DEV_WARN_SELECTOR_FANOUT;
    }
  });

  it('computeds created before the switch is on are never counted', async () => {
    // Built while off; they read whichever signal `ref` holds when evaluated.
    const ref: { sig?: ReadonlySignal<number> } = {};
    const rows = Array.from({ length: ROWS }, (_, i) =>
      computed(() =>
        i === (ref.sig as ReadonlySignal<number>).value ? 'x' : '',
      ),
    );
    enableWarnings({ selectorFanout: true });
    const sel = signal(-1); // tracked: created after the switch
    ref.sig = sel;
    subscribeAll(rows);
    for (let k = 0; k < 5; k++) {
      sel.value = k;
      await settle();
    }
    expect(fanoutMessages()).toHaveLength(0);
  });

  it('a signal created before the switch is on opens no window', async () => {
    const early = signal(-1); // plain: created while off
    enableWarnings({ selectorFanout: true });
    equalityRows(early); // wrapped computeds, but nothing attributes the writes
    for (let k = 0; k < 5; k++) {
      early.value = k;
      await settle();
    }
    expect(fanoutMessages()).toHaveLength(0);
  });

  it('a fan-out-only DevSignal does not raise the untracked-signal warning', () => {
    enableWarnings({ selectorFanout: true });
    const lonely = signal(0);
    lonely.value = 1;
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('with both switches on, one DevSignal serves both warnings', () => {
    enableWarnings({ selectorFanout: true, untrackedSignals: true });
    warnSpy.mockClear(); // drop the untracked coverage-boundary notice
    const lonely = signal(0);
    lonely.value = 1;
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toMatch(/has no subscribers/);
  });

  it('the counting wrapper keeps the computed semantics, including `this`', () => {
    enableWarnings({ selectorFanout: true });
    const s = signal(1);
    const seen: unknown[] = [];
    const c = computed(function (this: unknown) {
      seen.push(this);
      return s.value * 2;
    });
    expect(c.value).toBe(2);
    expect(seen[0]).toBe(c);
    s.value = 3;
    expect(c.value).toBe(6);
  });
});

describe('computed() wrapper in reactive.ts', () => {
  it('forwards watched / unwatched options to signals-core', () => {
    const watched = vi.fn();
    const unwatched = vi.fn();
    const c = computed(() => 1, { watched, unwatched });
    const dispose = effect(() => {
      void c.value;
    });
    expect(watched).toHaveBeenCalledTimes(1);
    dispose();
    expect(unwatched).toHaveBeenCalledTimes(1);
  });

  it('in production shape the body runs unwrapped', () => {
    enterProductionShape();
    try {
      const s = signal(2);
      const c = computed(() => s.value + 1);
      expect(c.value).toBe(3);
    } finally {
      restoreDevelopmentShape();
    }
  });
});
