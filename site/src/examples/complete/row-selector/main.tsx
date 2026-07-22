// Master-detail row selector — the "select-row, no re-render" win of kerf's
// fine-grained signal bindings.
//
// The list renders ONCE. Each row's `class` is a `computed()` handed straight
// into the JSX hole (not its `.value`), and every detail-pane field is a bound
// text hole. Clicking a row flips `selectedId`; kerf updates only the two
// affected row classes + the detail pane through their bound effects — the
// mount() render function never re-runs (watch the "list renders" counter stay
// at 1) and the keyed list is never reconciled.
//
// The key discipline: `selectedId` is never read in a render body — it only
// reaches the bound holes (via `selected` and the per-row `computed`), so the
// coarse mount() effect never subscribes to it. The render's one dependency is
// `hosts`, so only `Regenerate` (which replaces `hosts`) forces an actual
// re-render, and the counter ticks then.

import { attr, computed, delegate, mount, signal, type AttrSpec } from 'kerfjs';

interface Host {
  id: string;
  name: string;
  region: string;
  ip: string;
  cpu: number;
  status: 'healthy' | 'degraded' | 'down';
}

const KINDS = ['web', 'api', 'db', 'cache', 'worker'];
const REGIONS = ['us-east', 'us-west', 'eu-central', 'ap-south'];
const STATUSES: Host['status'][] = ['healthy', 'healthy', 'healthy', 'degraded', 'down'];

// Deterministic PRNG so the demo, its capture, and the browser smoke test are
// stable across runs (no Math.random).
let seed = 1;
function rand(n: number): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed % n;
}

function genHosts(count: number): Host[] {
  const out: Host[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      id: `h${i}`,
      name: `${KINDS[rand(KINDS.length)]}-${String(i).padStart(2, '0')}`,
      region: REGIONS[rand(REGIONS.length)],
      ip: `10.${rand(255)}.${rand(255)}.${rand(255)}`,
      cpu: rand(100),
      status: STATUSES[rand(STATUSES.length)],
    });
  }
  return out;
}

const ACTIONS = {
  regenerate: attr('data-action', 'regenerate'),
} as const satisfies Record<string, AttrSpec<'data-action'>>;
const SELECT = attr('data-select');

const hosts = signal<Host[]>(genHosts(120));
const selectedId = signal<string | null>(null);
const selected = computed<Host | null>(() => hosts.value.find((h) => h.id === selectedId.value) ?? null);

// Detail-pane fields, created once and bound into text holes — they update
// fine-grained when the selection changes, without a render re-run.
const dName = computed(() => selected.value?.name ?? 'Select a host');
const dRegion = computed(() => selected.value?.region ?? '—');
const dIp = computed(() => selected.value?.ip ?? '—');
const dCpu = computed(() => (selected.value ? `${selected.value.cpu}%` : '—'));
const dStatus = computed(() => selected.value?.status ?? '—');

// Plain counter (not a signal) incremented inside the render — its value is a
// snapshot of "how many times render() ran". It stays put on selection; it
// only ticks when Regenerate forces a real re-render.
let listRenders = 0;

const root = document.getElementById('app')!;
mount(root, () => {
  // The only render dependency is `hosts` — selecting a row writes `selectedId`
  // (never read here), so selection never re-renders. Regenerate replaces
  // `hosts`, which is the one thing that does.
  listRenders += 1;
  const rows = hosts.value;
  return (
    <div class="rs">
      <div class="rs-main">
        <div class="rs-listhead">
          <span>{rows.length} hosts</span>
          <span class="rs-renders">list renders: <b data-renders>{listRenders}</b></span>
          <button {...ACTIONS.regenerate.attrs}>Regenerate</button>
        </div>
        <ul class="rs-list" data-list>
          {rows.map((h) => (
            <li
              {...SELECT(h.id)}
              class={computed(() => (h.id === selectedId.value ? 'rs-row rs-row-on' : 'rs-row'))}
            >
              <span class={`rs-dot rs-${h.status}`}></span>
              <span class="rs-name">{h.name}</span>
              <span class="rs-region">{h.region}</span>
              <span class="rs-cpu">{h.cpu}%</span>
            </li>
          ))}
        </ul>
      </div>
      <aside class="rs-detail" data-detail>
        <h2 data-d-name>{dName}</h2>
        <dl>
          <dt>Region</dt><dd data-d-region>{dRegion}</dd>
          <dt>IP</dt><dd data-d-ip>{dIp}</dd>
          <dt>CPU</dt><dd data-d-cpu>{dCpu}</dd>
          <dt>Status</dt><dd data-d-status>{dStatus}</dd>
        </dl>
      </aside>
    </div>
  );
});

// Page-lifetime delegation (root never torn down) — `void` is the explicit
// discard sigil for kerfjs/require-delegate-disposer.
void delegate(root, 'click', '[data-select]', (_e, el) => {
  selectedId.value = (el as HTMLElement).dataset.select ?? null;
});
void delegate(root, 'click', ACTIONS.regenerate.selector, () => {
  selectedId.value = null;      // clears the selection (fine-grained; not a re-render)
  hosts.value = genHosts(120);  // the one write that re-renders the list
});
