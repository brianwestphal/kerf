import { signal, mount, delegate, delegateCapture } from 'kerfjs';

const fields = signal(['Name', 'Email']);
const focused = signal<string | null>(null);

const root = document.getElementById('app')!;

mount(root, () => (
  <form class="kerf-stack" style="max-width: 24rem;" onsubmit="return false">
    <div style="display: grid; grid-template-columns: 8rem 1fr; gap: 0.5rem 1rem; align-items: center;">
      {fields.value.map((label, i) => (
        <>
          <label data-key={`l-${label}-${i}`} for={`field-${i}`}>{label}</label>
          <input
            data-key={`i-${label}-${i}`}
            id={`field-${i}`}
            data-field={label}
            placeholder={label}
          />
        </>
      ))}
    </div>
    <div class="kerf-toolbar">
      <button type="button" data-action="add">Add field</button>
    </div>
    <div class="kerf-output kerf-mono" style="display: flex; justify-content: space-between;">
      <span>Focused</span>
      <strong>{focused.value ?? '(none)'}</strong>
    </div>
  </form>
));

delegateCapture(root, 'focus', 'input', (_e, input) => {
  focused.value = (input as HTMLInputElement).dataset.field ?? null;
});
delegateCapture(root, 'blur', 'input', () => {
  focused.value = null;
});

delegate(root, 'click', '[data-action="add"]', () => {
  fields.value = [...fields.value, `Field ${fields.value.length + 1}`];
});
