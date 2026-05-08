import { signal, mount, delegate, delegateCapture } from 'kerfjs';

const fields = signal(['Name', 'Email']);
const focused = signal<string | null>(null);

const root = document.getElementById('app')!;

mount(root, () => (
  <form>
    <button type="button" data-action="add" style="margin-bottom: 0.75rem;">Add field</button>
    {fields.value.map((label, i) => (
      <label data-key={`${label}-${i}`} style="display: block; margin-bottom: 0.5rem;">
        {label}: <input data-field={label} placeholder={label} />
      </label>
    ))}
    <p style="font-family: ui-monospace, monospace; font-size: 0.9rem;">
      Focused: {focused.value ?? '(none)'}
    </p>
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
