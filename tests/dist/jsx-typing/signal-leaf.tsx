import { mount, signal } from 'kerfjs';

export function renderLabel(root: HTMLElement) {
  const label = signal('first');
  let renders = 0;
  const dispose = mount(root, () => {
    renders++;
    return (
      <div>
        <span title={label.value}>{label.value}</span>
      </div>
    );
  });
  return { label, renders: () => renders, dispose };
}
