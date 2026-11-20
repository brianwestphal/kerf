import { createSelector, createSignal, For } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import { render } from 'solid-js/web';
import { count, expose } from './shared';

expose((host, initial) => {
  const [label, setLabel] = createSignal('Idle');
  const [selected, select] = createSignal(501);
  const isSelected = TUNED
    ? createSelector(selected)
    : (id) => selected() === id;
  const [records, setRows] = createStore(initial);
  const stop = render(() => {
    count('view');
    return (
      <section>
        <output>{label()}</output>
        <ul>
          <For each={records}>
            {(r) => {
              count('row');
              const cls = () => {
                count('classExpression');
                return isSelected(r.id) ? 'chosen' : '';
              };
              return (
                <li data-key={r.id} class={cls()}>
                  <span>{r.label}</span>
                  <input aria-label={'Edit ' + r.id} />
                </li>
              );
            }}
          </For>
        </ul>
      </section>
    );
  }, host);
  return {
    label: setLabel,
    select,
    rows: (data) => setRows(reconcile(data, { key: 'id' })),
    dispose: stop,
  };
});
