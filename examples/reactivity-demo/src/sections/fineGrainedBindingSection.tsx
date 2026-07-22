/**
 * §9 — Fine-grained signal bindings (the select-row win).
 *
 * Each row's `class` is a signal (`computed`) handed straight into the JSX hole
 * — not its `.value`. Clicking a row flips `selectedId`, and kerf updates only
 * the two affected rows' `class` attributes through their bound effects: the
 * render function does NOT re-run (the counter stays put) and the keyed list is
 * NOT reconciled. `selectedId` is deliberately never read in the render body —
 * it only reaches the bound holes, so the coarse mount() effect never
 * subscribes to it.
 */

import { attr, computed, delegate, mount, signal, type AttrSpec } from 'kerfjs';

const ACTIONS = {
  rerender: attr('data-action', 'rerender'),
} as const satisfies Record<string, AttrSpec<'data-action'>>;
const SELECT = attr('data-select');

interface Row { id: string; label: string }
const ROWS: Row[] = [
  { id: 'r1', label: 'Reconcile' },
  { id: 'r2', label: 'Morph' },
  { id: 'r3', label: 'Signal' },
  { id: 'r4', label: 'Delegate' },
  { id: 'r5', label: 'Mount' },
];

export function mountFineGrainedBinding(root: HTMLElement): void {
  const selectedId = signal<string | null>(null);
  // Created once, bound to a text hole — updates fine-grained on selection.
  const selectedLabel = computed(() => ROWS.find((r) => r.id === selectedId.value)?.label ?? '(none)');
  const renderTicks = signal(0);
  let renderCount = 0;

  mount(root, () => {
    void renderTicks.value; // only "force re-render" bumps this; selecting a row never does
    renderCount += 1;
    return (
      <div className="demo-card">
        <h2>9. Fine-grained bindings <span className="demo-tag">signal in a hole • select-row, no re-render</span></h2>

        <ul className="demo-keyed-list">
          {ROWS.map((row) => (
            <li
              {...SELECT(row.id)}
              className={computed(() =>
                row.id === selectedId.value
                  ? 'demo-keyed-row demo-select-row demo-select-row-on'
                  : 'demo-keyed-row demo-select-row',
              )}
            >
              <span className="demo-keyed-label">{row.label}</span>
              <span className="demo-select-hint">click to select</span>
            </li>
          ))}
        </ul>

        <p className="demo-row demo-binding-status">
          <span className="demo-note">Selected: <strong>{selectedLabel}</strong></span>
          <span className="demo-note">
            <code>render()</code> calls: <output className="demo-render-count">{renderCount}</output> — stays put when you select
          </span>
          <button type="button" {...ACTIONS.rerender.attrs} className="demo-btn demo-btn-ghost">force re-render</button>
        </p>

        <p className="demo-note">
          Each row's <code>class</code> is a <code>computed()</code> handed straight into the JSX hole
          (not <code>.value</code>). Clicking a row flips <code>selectedId</code>; kerf updates only the two
          affected rows' <code>class</code> attributes through their bound effects — the render function never
          re-runs and the list is never reconciled. Hit <em>force re-render</em> to watch the counter tick when
          render actually does run.
        </p>
      </div>
    );
  });

  delegate(root, 'click', '[data-select]', (_e, el) => {
    selectedId.value = (el as HTMLElement).dataset.select ?? null;
  });
  delegate(root, 'click', ACTIONS.rerender.selector, () => {
    renderTicks.value += 1;
  });
}
