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
  <div class="kerf-stack" style="max-width: 24rem;">
    <div style="display: grid; grid-template-columns: 8rem 1fr; gap: 0.5rem 1rem; align-items: center;">
      <label for="kerf-bill">Bill</label>
      <input id="kerf-bill" type="number" data-input="bill" value={String(bill.value)} step="0.01" />
      <label for="kerf-tip">Tip %</label>
      <input id="kerf-tip" type="number" data-input="tipPct" value={String(tipPct.value)} step="1" />
      <label for="kerf-party">Party size</label>
      <input id="kerf-party" type="number" data-input="partySize" value={String(partySize.value)} step="1" min="1" />
    </div>
    <div class="kerf-output">
      <div style="display: grid; grid-template-columns: 1fr auto; row-gap: 0.25rem; column-gap: 1.5rem;">
        <span>Tip</span>          <strong class="kerf-mono">{fmt(tip.value)}</strong>
        <span>Total</span>        <strong class="kerf-mono">{fmt(total.value)}</strong>
        <span>Per person</span>   <strong class="kerf-mono">{fmt(perPerson.value)}</strong>
      </div>
    </div>
  </div>
));

delegate(root, 'input', 'input[data-input]', (_, el) => {
  const key = (el as HTMLElement).dataset.input as keyof typeof inputs;
  const v = Number((el as HTMLInputElement).value);
  if (Number.isFinite(v)) inputs[key].value = v;
});
