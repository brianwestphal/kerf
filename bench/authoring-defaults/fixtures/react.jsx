import { memo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { count, expose } from './shared';

function Row({ id, label, selected }) {
  count('row');
  return (
    <li data-key={id} className={selected ? 'chosen' : ''}>
      <span>{label}</span>
      <input aria-label={'Edit ' + id} />
    </li>
  );
}
const Item = TUNED ? memo(Row) : Row;
expose((host, initial) => {
  const root = createRoot(host);
  let api;
  function View() {
    count('view');
    const [label, setLabel] = useState('Idle');
    const [selected, select] = useState(501);
    const [records, setRows] = useState(initial);
    api = { label: setLabel, select, rows: setRows };
    return (
      <section>
        <output>{label}</output>
        <ul>
          {records.map((r) => (
            <Item
              key={r.id}
              id={r.id}
              label={r.label}
              selected={r.id === selected}
            />
          ))}
        </ul>
      </section>
    );
  }
  flushSync(() => root.render(<View />));
  return { ...api, dispose: () => root.unmount() };
});
