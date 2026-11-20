import './table.css';

export const rows = () =>
  Array.from({ length: 1000 }, (_, index) => ({
    id: index + 1,
    label: 'Record ' + (index + 1),
  }));

export function count(kind) {
  if (COUNT_WORK) window.work[kind] = (window.work[kind] ?? 0) + 1;
}

export function expose(create) {
  let app;
  let items;
  window.work = {};
  window.step = (operation) => {
    switch (operation) {
      case 'mount':
        items = rows();
        app = create(document.querySelector('main'), items);
        break;
      case 'label':
        app.label('Ready');
        break;
      case 'select':
        app.select(502);
        break;
      case 'update':
        items = items.map((row) =>
          row.id === 502 ? { ...row, label: 'Edited' } : row,
        );
        app.rows(items);
        break;
      case 'swap':
        items = [...items];
        [items[1], items[998]] = [items[998], items[1]];
        app.rows(items);
        break;
      case 'refetch':
        items = items.map((row) => ({ ...row }));
        app.rows(items);
        break;
      case 'remove':
        items = items.filter((row) => row.id !== 499);
        app.rows(items);
        break;
      case 'dispose':
        app.dispose();
        app = items = undefined;
        break;
      default:
        throw new Error('Unknown operation ' + operation);
    }
  };
}
