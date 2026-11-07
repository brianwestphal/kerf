import { signal, mount, delegate, delegateCapture, attr } from 'kerfjs';

const fields = signal(['Name', 'Email']);
const focused = signal<string | null>(null);

const ACTIONS = {
  add: attr('data-action', 'add'),
} as const;

const root = document.getElementById('app')!;

mount(root, () => (
  <form class="kerf-stack" style="max-width: 24rem;">
    <div style="display: grid; grid-template-columns: 8rem 1fr; gap: 0.5rem 1rem; align-items: center;">
      {fields.value.map((label, i) => (
        <>
          <label data-key={`l-${label}-${i}`} for={`field-${i}`}>
            {label}
          </label>
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
      <button type="button" {...ACTIONS.add.attrs}>
        Add field
      </button>
    </div>
    <div
      class="kerf-output kerf-mono"
      style="display: flex; justify-content: space-between;"
    >
      <span>Focused</span>
      <strong>{focused.value ?? '(none)'}</strong>
    </div>
  </form>
));

// The demo root lives as long as the page, so each delegate() is
// page-lifetime and its disposer is deliberately discarded with `void`.
void delegateCapture(root, 'focus', 'input', (_e, input) => {
  focused.value = (input as HTMLInputElement).dataset.field ?? null;
});
void delegateCapture(root, 'blur', 'input', () => {
  focused.value = null;
});

void delegate(root, 'submit', 'form', (event) => {
  event.preventDefault();
});

void delegate(root, 'click', ACTIONS.add.selector, () => {
  fields.value = [...fields.value, `Field ${fields.value.length + 1}`];
});
