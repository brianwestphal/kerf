import { signal, computed, mount, delegate } from 'kerfjs';

const bill = signal(48);
const tipPct = signal(18);
const partySize = signal(3);

const tip = computed(() => bill.value * tipPct.value / 100);
const total = computed(() => bill.value + tip.value);
const perPerson = computed(() => total.value / Math.max(1, partySize.value));

const fmt = (n: number) => `$${n.toFixed(2)}`;

const inputs = { bill, tipPct, partySize } as const;

const root = document.getElementById('app')!;

mount(root, () => (
  <div>
    <div style="display: grid; grid-template-columns: 8rem 1fr; gap: 0.4rem 1rem; max-width: 22rem; margin-bottom: 0.75rem;">
      <label>Bill</label>
      <input type="number" data-input="bill" value={String(bill.value)} step="0.01" />
      <label>Tip %</label>
      <input type="number" data-input="tipPct" value={String(tipPct.value)} step="1" />
      <label>Party size</label>
      <input type="number" data-input="partySize" value={String(partySize.value)} step="1" min="1" />
    </div>
    <p style="margin: 0;">Tip: <strong>{fmt(tip.value)}</strong></p>
    <p style="margin: 0;">Total: <strong>{fmt(total.value)}</strong></p>
    <p style="margin: 0 0 0.75rem;">Per person: <strong>{fmt(perPerson.value)}</strong></p>
  </div>
));

delegate(root, 'input', 'input[data-input]', (_, el) => {
  const key = (el as HTMLElement).dataset.input as keyof typeof inputs;
  const v = Number((el as HTMLInputElement).value);
  if (Number.isFinite(v)) inputs[key].value = v;
});
