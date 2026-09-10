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
import { Bell, Check, ChevronDown, CircleHelp, Contrast, Folder, Inbox, Moon, PanelLeft, Plus, Search, Settings, SlidersHorizontal, Wrench, ZapOff } from 'lucide';

import { catalog, catalogEntriesUsing, type CatalogEntry, type CatalogId, catalogSections, findCatalogEntry, isCatalogId } from './catalog.js';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Missing #app');

const requested = new URLSearchParams(location.search).get('component');
const selectedDemo = signal<CatalogId>(isCatalogId(requested) ? requested : catalog[0].id);
const regionSize = signal(276);
const activeTab = signal('library');
const selectedChoice = signal('balanced');
const bannerTone = signal<'info' | 'success' | 'warning' | 'danger'>('info');
const actionLog = signal('Catalog ready');
const darkTheme = signal(false);
const increasedContrast = signal(false);
const reducedMotion = signal(false);

const icon = (node: Parameters<typeof LucideIcon>[0]['icon'], name: string) => <LucideIcon icon={node} name={name} />;
const button = (label: string, action: string) => <button type="button" class="demo-button" data-action={action}>{label}</button>;

function LucideIconDemo() {
  return <div class="demo-icon-grid" data-demo="lucide-icon">
    <article><span class="demo-icon-grid__sample">{icon(Wrench, 'wrench')}</span><strong>Decorative</strong><span>Hidden from assistive technology</span></article>
    <article><span class="demo-icon-grid__sample"><LucideIcon icon={Bell} name="notification" label="Notifications ready" /></span><strong>Meaningful</strong><span>Named when the icon carries meaning</span></article>
  </div>;
}

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

function ToolbarControlGroupDemo() {
  return <div class="demo-variant-stack" data-demo="toolbar-control-group">
    <div><span>Contained push controls</span><ToolbarControlGroup label="View controls" buttonAppearance="push"><button type="button" aria-label="Filters" aria-pressed="true">{icon(SlidersHorizontal, 'sliders-horizontal')}</button><button type="button" aria-label="Settings" aria-pressed="false">{icon(Settings, 'settings')}</button></ToolbarControlGroup></div>
    <div><span>Borderless single action</span><ToolbarControlGroup label="Add item" appearance="borderless" single>{button('Add', 'log-add')}</ToolbarControlGroup></div>
    <div class="demo-dark-swatch"><span>Dark tone</span><ToolbarControlGroup label="Dark controls" tone="dark"><button type="button" aria-label="Notifications">{icon(Bell, 'bell')}</button><button type="button" aria-label="Settings">{icon(Settings, 'settings')}</button></ToolbarControlGroup></div>
  </div>;
}

function ToolbarTextDemo() {
  return <div class="demo-text-variants" data-demo="toolbar-text">
    <div><span>Large</span><ToolbarText text="Component library" size="large" /></div>
    <div><span>Default</span><ToolbarText text="Saved just now" /></div>
    <div><span>Small</span><ToolbarText text="read-only" size="small" /></div>
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

function MenuHeaderDemo() {
  return <div class="demo-menu demo-variant-stack" data-demo="menu-header">
    <div><MenuHeader label="Workspace" action="log-add" actionLabel="Add workspace" actionIcon={icon(Plus, 'plus')} /></div>
    <div><MenuHeader label="Expanded tools" toggle expanded action="log-tools" actionIcon={icon(ChevronDown, 'chevron-down')} /></div>
    <div><MenuHeader label="Collapsed tools" toggle action="log-tools" actionIcon={icon(ChevronDown, 'chevron-down')} /></div>
  </div>;
}

function MenuItemDemo() {
  return <div class="demo-menu" data-demo="menu-item">
    <MenuItem action="log-inbox" itemId="selected" label="Selected item" icon={icon(Inbox, 'inbox')} trailing={<span>12</span>} selected />
    <MenuItem action="log-projects" itemId="default" label="Default item" icon={icon(Folder, 'folder')} />
    <MenuItem action="log-settings" itemId="multiline" label="A multiline item demonstrates content that wraps without clipping" icon={icon(Wrench, 'wrench')} multiline />
    <MenuItem action="disabled" itemId="disabled" label="Unavailable item" icon={icon(CircleHelp, 'circle-help')} disabled />
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

function PageHeaderDemo() {
  return <div class="demo-frame" data-demo="page-header"><PageHeader title="UI foundations" action={button('New pattern', 'log-add')} /></div>;
}

function DialogHeaderDemo() {
  return <div class="demo-dialog demo-dialog--standalone" data-demo="dialog-header"><DialogHeader title="Package details" titleId="standalone-package-title" summary="Production-backed primitives with explicit contracts." summaryId="standalone-package-summary" icon={icon(Wrench, 'wrench')} actions={button('Done', 'log-done')} /></div>;
}

function ValueTableDemo() {
  return <div class="demo-value-table" data-demo="value-table"><ValueTable label="Package metadata"><div><dt>Package</dt><dd>@kerfjs/ui</dd></div><div><dt>Rendering</dt><dd>Kerf SafeHtml</dd></div><div><dt>Styles</dt><dd>Explicit CSS subpaths</dd></div></ValueTable></div>;
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

function StateBannerDemo() {
  const tone = bannerTone.value;
  return <div class="demo-feedback" data-demo="state-banner"><StateBanner tone={tone} urgency={tone === 'danger' ? 'alert' : 'status'} title={tone === 'danger' ? 'Action required' : 'Everything is connected'} detail="State is expressed with text and color." icon={tone === 'danger' ? icon(CircleHelp, 'circle-help') : icon(Check, 'check')} action={button('Cycle tone', 'cycle-tone')} /></div>;
}

function EmptyStateDemo() {
  return <div class="demo-empty-grid" data-demo="empty-state"><article><span>Actionable</span><EmptyState title="Nothing here yet" detail="Create the first item when you are ready." icon={icon(Search, 'search')} action={button('Create item', 'log-add')} /></article><article><span>Busy</span><EmptyState title="Loading items" detail="The current view will remain stable." busy /></article></div>;
}

function LoadingSpinnerDemo() {
  return <div class="demo-spinner-grid" data-demo="loading-spinner"><article><LoadingSpinner label="Loading preview" /><strong>Meaningful</strong><span>Exposes its supplied label</span></article><article><LoadingSpinner /><strong>Decorative</strong><span>Hidden from assistive technology</span></article></div>;
}

const demos: Record<CatalogId, () => ReturnType<typeof ToolbarDemo>> = {
  'lucide-icon': LucideIconDemo,
  toolbar: ToolbarDemo,
  'toolbar-control-group': ToolbarControlGroupDemo,
  'toolbar-text': ToolbarTextDemo,
  menu: MenuDemo,
  'menu-header': MenuHeaderDemo,
  'menu-item': MenuItemDemo,
  tabs: TabsDemo,
  headers: HeadersDemo,
  'page-header': PageHeaderDemo,
  'dialog-header': DialogHeaderDemo,
  'value-table': ValueTableDemo,
  resize: ResizeDemo,
  select: SelectDemo,
  feedback: FeedbackDemo,
  'state-banner': StateBannerDemo,
  'empty-state': EmptyStateDemo,
  'loading-spinner': LoadingSpinnerDemo,
};

function Stage() {
  return demos[selectedDemo.value]();
}

function DemoRelationships({ entry }: { entry: CatalogEntry }) {
  const uses = (entry.uses ?? [])
    .map(findCatalogEntry)
    .filter((related): related is CatalogEntry => Boolean(related));
  const usedBy = catalogEntriesUsing(entry.id);
  const choices = [
    ...uses.map((related) => ({ value: related.id, label: related.name, group: 'Uses' })),
    ...usedBy.map((related) => ({ value: related.id, label: related.name, group: 'Used by' })),
  ];
  return <footer class="catalog-relationships" data-relationships-for={entry.id}>
    <div><p class="catalog-eyebrow">Composition graph</p><h3>Related components</h3><p>{uses.length} uses · {usedBy.length} used by</p></div>
    {choices.length > 0
      ? <Select className="catalog-relationships__select" name="related-component" value="" label="Related components" placeholder="Choose a related component" choices={choices} />
      : <p class="catalog-relationships__empty">No component relationships</p>}
  </footer>;
}

function selectDemo(id: string): void {
  if (!isCatalogId(id)) return;
  selectedDemo.value = id;
  const url = new URL(location.href);
  url.searchParams.set('component', id);
  history.replaceState(null, '', url);
  actionLog.value = `Showing ${id}`;
}

mount(app, () => {
  const selected = findCatalogEntry(selectedDemo.value)!;
  return <main class="catalog-shell">
    <aside class="catalog-sidebar" aria-label="Component catalog">
      <header class="catalog-brand">
        <span class="catalog-mark" aria-hidden="true">K</span>
        <div><p class="catalog-eyebrow">Kerf</p><h1>UI components</h1><p>Production catalog</p></div>
      </header>
      <nav>
        {catalogSections.map((section) => <section class="catalog-group">
          <MenuHeader label={section.category} />
          <div class="catalog-group__items">
            {section.entries.map((entry) => <MenuItem action="select-demo" itemId={entry.id} label={entry.name} selected={selectedDemo.value === entry.id} title={entry.description} />)}
          </div>
        </section>)}
      </nav>
    </aside>
    <article class="catalog-detail">
      <header class="catalog-header">
        <div><p class="catalog-eyebrow">{selected.category}</p><h2>{selected.name}</h2><p>{selected.description}</p></div>
        <div class="catalog-settings" role="group" aria-label="Catalog display settings">
          <button type="button" data-action="toggle-theme" aria-pressed={String(darkTheme.value)}>{icon(Moon, 'moon')}<span>Dark</span></button>
          <button type="button" data-action="toggle-contrast" aria-pressed={String(increasedContrast.value)}>{icon(Contrast, 'contrast')}<span>Contrast</span></button>
          <button type="button" data-action="toggle-motion" aria-pressed={String(reducedMotion.value)}>{icon(ZapOff, 'zap-off')}<span>Reduce motion</span></button>
        </div>
      </header>
      <section class="catalog-stage" aria-label={`${selected.name} preview`}>
        <div class="catalog-canvas"><Stage /></div>
        <footer class="catalog-stage__footer"><output class="catalog-log" aria-live="polite">{actionLog.value}</output><span>Public component · production CSS</span></footer>
      </section>
      <DemoRelationships entry={selected} />
    </article>
  </main>;
});

const stopActions = delegateActions(app, 'click', {
  'select-demo': (_event, element) => {
    const id = element.getAttribute('data-item-id');
    if (id) selectDemo(id);
  },
  'select-tab': (_event, element) => { activeTab.value = element.getAttribute('data-tab-id') ?? 'library'; actionLog.value = `Selected ${activeTab.value}`; },
  'close-tab': (_event, element) => { actionLog.value = `Close requested for ${element.getAttribute('data-tab-id')}`; },
  'cycle-tone': () => { const tones = ['info', 'success', 'warning', 'danger'] as const; bannerTone.value = tones[(tones.indexOf(bannerTone.value) + 1) % tones.length]!; actionLog.value = `Banner tone: ${bannerTone.value}`; },
  'toggle-theme': () => { darkTheme.value = !darkTheme.value; document.documentElement.classList.toggle('demo-dark', darkTheme.value); actionLog.value = darkTheme.value ? 'Dark theme on' : 'Dark theme off'; },
  'toggle-contrast': () => { increasedContrast.value = !increasedContrast.value; document.documentElement.classList.toggle('demo-contrast', increasedContrast.value); actionLog.value = increasedContrast.value ? 'Increased contrast on' : 'Increased contrast off'; },
  'toggle-motion': () => { reducedMotion.value = !reducedMotion.value; document.documentElement.classList.toggle('demo-reduced-motion', reducedMotion.value); actionLog.value = reducedMotion.value ? 'Reduced motion on' : 'Reduced motion off'; },
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
const stopRelationships = delegate(app, 'change', '[name="related-component"]', (_event, element) => {
  const value = (element as HTMLElement & { value?: string }).value;
  if (value) selectDemo(value);
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

window.addEventListener('pagehide', () => { stopActions(); stopResize(); stopSelect(); stopRelationships(); stopTabs(); }, { once: true });
