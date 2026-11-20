import { computed, each, mount, selector, signal } from 'kerfjs';
import { count, expose } from './shared';

expose((root, initial) => {
  const label = signal('Idle');
  const selected = signal(501);
  const records = signal(initial);
  const isSelected = TUNED && selector(selected);
  function row(item) {
    count('row');
    const cls = TUNED
      ? computed(() => {
          count('classExpression');
          return isSelected(item.id).value ? 'chosen' : '';
        })
      : selected.value === item.id
        ? 'chosen'
        : '';
    return (
      <li data-key={item.id} class={cls}>
        <span>{item.label}</span>
        <input aria-label={'Edit ' + item.id} />
      </li>
    );
  }
  const stop = mount(root, () => {
    count('view');
    return (
      <section>
        <output>{TUNED ? label : label.value}</output>
        <ul>{TUNED ? each(records.value, row) : records.value.map(row)}</ul>
      </section>
    );
  });
  return {
    label: (value) => {
      label.value = value;
    },
    select: (id) => {
      selected.value = id;
    },
    rows: (next) => {
      // each memoizes by object identity. Preserve unchanged data on a refetch.
      if (TUNED) {
        const old = new Map(records.peek().map((r) => [r.id, r]));
        next = next.map((r) =>
          old.get(r.id)?.label === r.label ? old.get(r.id) : r,
        );
      }
      records.value = next;
    },
    dispose: () => {
      stop();
      root.replaceChildren();
    },
  };
});
