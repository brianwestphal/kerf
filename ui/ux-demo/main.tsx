import '@kerfjs/ui/select/register';
import '@kerfjs/ui/styles.css';
import './style.css';

import {
  AppTab,
  DialogHeader,
  EmptyState,
  LoadingSpinner,
  LucideIcon,
  MenuHeader,
  MenuItem,
  PageHeader,
  ResizableRegion,
  Select,
  StateBanner,
  Toolbar,
  ToolbarControlGroup,
  ToolbarText,
  ValueTable,
  wireResizableRegions,
} from '@kerfjs/ui';
import { delegate, mount, signal } from 'kerfjs';
import { delegateActions } from 'kerfjs/actions';
import { Bell, Check, ChevronDown, CircleHelp, Folder, Inbox, PanelLeft, Plus, Search, Settings, SlidersHorizontal, Wrench } from 'lucide';

import { catalog, type CatalogId,isCatalogId } from './catalog.js';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Missing #app');

const requested = new URLSearchParams(location.search).get('component');
const selectedDemo = signal<CatalogId | 'overview'>(isCatalogId(requested) ? requested : 'overview');
const regionSize = signal(276);
const activeTab = signal('library');
const selectedChoice = signal('balanced');
const bannerTone = signal<'info' | 'success' | 'warning' | 'danger'>('info');
const actionLog = signal('Catalog ready');

const icon = (node: Parameters<typeof LucideIcon>[0]['icon'], name: string) => <LucideIcon icon={node} name={name} />;
const button = (label: string, action: string) => <button type="button" class="demo-button" data-action={action}>{label}</button>;

function ToolbarDemo() {
  return <div class="demo-frame" data-demo="toolbar">
    <Toolbar
      label="Document controls"
      leading={<ToolbarText text="Component library" size="large" />}
      center={<span class="demo-center-copy">Saved just now</span>}
      trailing={<ToolbarControlGroup label="View controls" buttonAppearance="push"><button type="button" aria-label="Toggle inspector" aria-pressed="true">{icon(SlidersHorizontal, 'sliders-horizontal')}</button><button type="button" aria-label="Settings">{icon(Settings, 'settings')}</button></ToolbarControlGroup>}
    />
    <Toolbar label="Compact toolbar" divider={false} leading={<ToolbarText text="Borderless" size="small" />} trailing={<ToolbarControlGroup appearance="borderless" single>{button('Add', 'log-add')}</ToolbarControlGroup>} />
  </div>;
}

function MenuDemo() {
  return <div class="demo-menu" data-demo="menu">
    <MenuHeader label="Workspace" action="log-add" actionLabel="Add workspace" actionIcon={icon(Plus, 'plus')} />
    <MenuItem action="log-inbox" itemId="inbox" label="Inbox" icon={icon(Inbox, 'inbox')} trailing={<span>12</span>} selected />
    <MenuItem action="log-projects" itemId="projects" label="Projects" icon={icon(Folder, 'folder')} />
    <MenuHeader label="Tools" toggle expanded action="log-tools" actionIcon={icon(ChevronDown, 'chevron-down')} />
    <MenuItem action="log-settings" label="A multiline item demonstrates content that wraps without clipping" icon={icon(Wrench, 'wrench')} multiline />
    <MenuItem action="disabled" label="Unavailable" icon={icon(CircleHelp, 'circle-help')} disabled />
  </div>;
}

function TabsDemo() {
  return <div class="demo-tabs" data-demo="tabs" role="tablist" aria-label="Open documents">
    {(['library', 'guidelines', 'catalog'] as const).map((id) => <AppTab id={id} name={id[0]!.toUpperCase() + id.slice(1)} selected={activeTab.value === id} closable={id !== 'library'} leading={id === 'library' ? icon(PanelLeft, 'panel-left') : undefined} />)}
  </div>;
}

function HeadersDemo() {
  return <div class="demo-frame" data-demo="headers">
    <PageHeader title="UI foundations" action={button('New pattern', 'log-add')} />
    <div class="demo-dialog">
      <DialogHeader title="Package details" titleId="package-title" summary="Production-backed primitives with explicit contracts." summaryId="package-summary" icon={icon(Wrench, 'wrench')} actions={button('Done', 'log-done')} />
      <div class="demo-dialog__body"><ValueTable label="Package metadata"><div><dt>Package</dt><dd>@kerfjs/ui</dd></div><div><dt>Rendering</dt><dd>Kerf SafeHtml</dd></div><div><dt>Styles</dt><dd>Explicit CSS subpaths</dd></div></ValueTable></div>
    </div>
  </div>;
}

function ResizeDemo() {
  return <div class="demo-resize-shell" data-demo="resize">
    <ResizableRegion id="catalog-panel" label="Catalog panel" size={regionSize.value} min={180} max={420}><div class="demo-resize-panel"><strong>Resizable panel</strong><span>Use the handle with a pointer, arrow keys, Home, or End.</span></div></ResizableRegion>
    <div class="demo-resize-content"><span>Committed width</span><strong data-region-size>{regionSize.value}px</strong></div>
  </div>;
}

function SelectDemo() {
  return <div class="demo-control-stack" data-demo="select">
    <label>Rendering balance</label>
    <Select name="rendering-balance" value={selectedChoice.value} ariaLabel="Rendering balance" choices={[
      { value: 'quiet', label: 'Quiet', icon: Bell, iconName: 'bell', group: 'Attention' },
      { value: 'balanced', label: 'Balanced', icon: SlidersHorizontal, iconName: 'sliders-horizontal', group: 'Attention' },
      { value: 'explicit', label: 'Explicit', icon: Check, iconName: 'check', group: 'Control', separatorBefore: true },
    ]} />
    <p>Live value: <strong data-select-value>{selectedChoice.value}</strong></p>
  </div>;
}

function FeedbackDemo() {
  const tone = bannerTone.value;
  return <div class="demo-feedback" data-demo="feedback">
    <StateBanner tone={tone} urgency={tone === 'danger' ? 'alert' : 'status'} title={tone === 'danger' ? 'Action required' : 'Everything is connected'} detail="State is expressed with text and color." icon={tone === 'danger' ? icon(CircleHelp, 'circle-help') : icon(Check, 'check')} action={button('Cycle tone', 'cycle-tone')} />
    <EmptyState title="Nothing here yet" detail="Create the first item when you are ready." icon={icon(Search, 'search')} action={button('Create item', 'log-add')} />
    <div class="demo-spinner-row"><LoadingSpinner label="Loading preview" /><span>Meaningfully labeled progress</span><LoadingSpinner /><span>Decorative progress</span></div>
  </div>;
}

const demos: Record<CatalogId, () => ReturnType<typeof ToolbarDemo>> = {
  toolbar: ToolbarDemo,
  menu: MenuDemo,
  tabs: TabsDemo,
  headers: HeadersDemo,
  resize: ResizeDemo,
  select: SelectDemo,
  feedback: FeedbackDemo,
};

function Stage() {
  if (selectedDemo.value !== 'overview') return demos[selectedDemo.value]();
  return <div class="demo-overview">{catalog.map((entry) => <article class="demo-card" data-catalog-card={entry.id}><header><span>{entry.category}</span><h2>{entry.name}</h2><p>{entry.description}</p></header>{demos[entry.id]()}</article>)}</div>;
}

mount(app, () => <div class="catalog-shell">
  <aside class="catalog-sidebar">
    <div class="catalog-brand"><span class="catalog-mark">K</span><div><strong>Kerf UI</strong><span>Production catalog</span></div></div>
    <nav aria-label="Component catalog">
      <button type="button" data-action="select-demo" data-demo-id="overview" aria-current={selectedDemo.value === 'overview' ? 'page' : undefined}>Overview</button>
      {catalog.map((entry) => <button type="button" data-action="select-demo" data-demo-id={entry.id} aria-current={selectedDemo.value === entry.id ? 'page' : undefined}><span>{entry.name}</span><small>{entry.category}</small></button>)}
    </nav>
  </aside>
  <main class="catalog-main">
    <header class="catalog-header"><div><span class="catalog-eyebrow">@kerfjs/ui</span><h1>{selectedDemo.value === 'overview' ? 'Component overview' : catalog.find((entry) => entry.id === selectedDemo.value)?.name}</h1><p>Real package components, real package CSS, deterministic states.</p></div><div class="catalog-settings"><button type="button" data-action="toggle-theme">Theme</button><button type="button" data-action="toggle-contrast">Contrast</button><button type="button" data-action="toggle-motion">Motion</button></div></header>
    <section class="catalog-stage" aria-label="Component preview"><Stage /></section>
    <output class="catalog-log" aria-live="polite">{actionLog.value}</output>
  </main>
</div>);

const stopActions = delegateActions(app, 'click', {
  'select-demo': (_event, element) => {
    const id = element.getAttribute('data-demo-id');
    selectedDemo.value = isCatalogId(id) ? id : 'overview';
    const url = new URL(location.href);
    if (selectedDemo.value === 'overview') url.searchParams.delete('component');
    else url.searchParams.set('component', selectedDemo.value);
    history.replaceState(null, '', url);
    actionLog.value = `Showing ${selectedDemo.value}`;
  },
  'select-tab': (_event, element) => { activeTab.value = element.getAttribute('data-tab-id') ?? 'library'; actionLog.value = `Selected ${activeTab.value}`; },
  'close-tab': (_event, element) => { actionLog.value = `Close requested for ${element.getAttribute('data-tab-id')}`; },
  'cycle-tone': () => { const tones = ['info', 'success', 'warning', 'danger'] as const; bannerTone.value = tones[(tones.indexOf(bannerTone.value) + 1) % tones.length]!; actionLog.value = `Banner tone: ${bannerTone.value}`; },
  'toggle-theme': () => { document.documentElement.classList.toggle('demo-dark'); actionLog.value = 'Theme changed'; },
  'toggle-contrast': () => { document.documentElement.classList.toggle('demo-contrast'); actionLog.value = 'Contrast changed'; },
  'toggle-motion': () => { document.documentElement.classList.toggle('demo-reduced-motion'); actionLog.value = 'Motion preference changed'; },
  'log-add': () => { actionLog.value = 'Add action requested'; },
  'log-inbox': () => { actionLog.value = 'Inbox selected'; },
  'log-projects': () => { actionLog.value = 'Projects selected'; },
  'log-tools': () => { actionLog.value = 'Tools toggled'; },
  'log-settings': () => { actionLog.value = 'Settings selected'; },
  'log-done': () => { actionLog.value = 'Done'; },
});

const stopResize = wireResizableRegions(app, { onCommit: ({ size }) => { regionSize.value = size; actionLog.value = `Panel resized to ${size}px`; } });
const stopSelect = delegate(app, 'change', 'wa-select', (_event, element) => {
  const value = (element as HTMLElement & { value?: string }).value;
  if (value === 'quiet' || value === 'balanced' || value === 'explicit') selectedChoice.value = value;
});
const stopTabs = delegate<HTMLButtonElement>(app, 'keydown', '[role="tab"]', (event, element) => {
  const keyboardEvent = event as KeyboardEvent;
  if (keyboardEvent.key === 'Delete' || keyboardEvent.key === 'Backspace') {
    element.closest('[data-component="app-tab"]')?.querySelector<HTMLButtonElement>('[data-action="close-tab"]')?.click();
    keyboardEvent.preventDefault();
    return;
  }
  const tabs = [...(element.closest('[role="tablist"]')?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [])];
  const current = tabs.indexOf(element);
  if (current < 0 || tabs.length === 0) return;
  let next: number;
  if (keyboardEvent.key === 'ArrowRight') next = (current + 1) % tabs.length;
  else if (keyboardEvent.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
  else if (keyboardEvent.key === 'Home') next = 0;
  else if (keyboardEvent.key === 'End') next = tabs.length - 1;
  else return;
  keyboardEvent.preventDefault();
  tabs[next]?.focus();
  tabs[next]?.click();
});

window.addEventListener('pagehide', () => { stopActions(); stopResize(); stopSelect(); stopTabs(); }, { once: true });
