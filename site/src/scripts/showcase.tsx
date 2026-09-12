import { SegmentedControl, StateBanner, ValueTable } from '@kerfjs/ui';
import { delegate, mount, signal } from 'kerfjs';

type ShowcaseMode = 'reactive' | 'search' | 'navigation';

const mode = signal<ShowcaseMode>('reactive');
let disposeShowcase: (() => void) | undefined;

const details: Record<ShowcaseMode, { title: string; detail: string; values: readonly [string, string][] }> = {
  reactive: {
    title: 'One signal, one precise update',
    detail: 'This panel is mounted by kerf; choosing a mode morphs this live DOM in place.',
    values: [['Runtime', 'kerfjs'], ['Surface', 'SegmentedControl'], ['Update', 'DOM morph']],
  },
  search: {
    title: 'Search waits until you need it',
    detail: 'The Pagefind index is generated at build time and fetched only after your first query.',
    values: [['Index', 'Pagefind'], ['Load', 'On demand'], ['Results', '@kerfjs/ui']],
  },
  navigation: {
    title: 'The next page feels instant',
    detail: 'Kerf renders every route to static HTML, then its postcard router handles in-app navigation.',
    values: [['First visit', 'Static HTML'], ['Next route', 'SPA swap'], ['URLs', 'Preserved']],
  },
};

export function renderShowcase() {
  const current = details[mode.value];
  return <div class="kerf-showcase">
    <SegmentedControl
      id="site-architecture"
      label="Explore this site architecture"
      value={mode.value}
      action="showcase-mode"
      appearance="outlined"
      shape="pill"
      layout="equal"
      choices={[
        { value: 'reactive', label: 'Reactive UI' },
        { value: 'search', label: 'Lazy search' },
        { value: 'navigation', label: 'SPA routing' },
      ]}
    />
    <StateBanner title={current.title} detail={current.detail} tone="success" />
    {ValueTable({
      label: `${current.title} implementation details`,
      children: current.values.map(([label, value]) => <div><dt>{label}</dt><dd>{value}</dd></div>),
    })}
  </div>;
}

export function hydrateShowcase(): void {
  const host = document.querySelector<HTMLElement>('.kerf-showcase-host');
  if (!host) {
    disposeShowcase?.();
    disposeShowcase = undefined;
    return;
  }
  if (host.dataset.hydrated === 'true') return;
  host.dataset.hydrated = 'true';
  disposeShowcase?.();
  const disposeMount = mount(host, renderShowcase);
  const disposeDelegate = delegate<HTMLButtonElement>(host, 'click', '[data-action="showcase-mode"]', (_event, button) => {
    const next = button.dataset.segmentValue;
    if (next === 'reactive' || next === 'search' || next === 'navigation') mode.value = next;
  });
  disposeShowcase = () => {
    disposeDelegate();
    disposeMount();
  };
}
