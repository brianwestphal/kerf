import '@kerfjs/ui/select/register';
import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/sidebar.css';
import '@kerfjs/ui/webawesome.css';
import './style.css';

import { AppTab } from '@kerfjs/ui/app-tab';
import { DialogHeader } from '@kerfjs/ui/dialog-header';
import { EmptyState } from '@kerfjs/ui/empty-state';
import { LoadingSpinner } from '@kerfjs/ui/loading-spinner';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { MenuHeader } from '@kerfjs/ui/menu-header';
import { MenuItem } from '@kerfjs/ui/menu-item';
import { PageHeader } from '@kerfjs/ui/page-header';
import { ResizableRegion } from '@kerfjs/ui/resizable-region';
import { SegmentedControl } from '@kerfjs/ui/segmented-control';
import { Select } from '@kerfjs/ui/select';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { TabBar } from '@kerfjs/ui/tab-bar';
import { readTokenSearchField, TokenSearchField, type TokenSearchToken } from '@kerfjs/ui/token-search-field';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { ValueTable } from '@kerfjs/ui/value-table';
import { wireResizableRegions } from '@kerfjs/ui/wire-resizable-regions';
import { reorderTabs, wireTabBars } from '@kerfjs/ui/wire-tab-bars';
import { batch, delegate, delegateCapture, mount, signal } from 'kerfjs';
import { delegateActions } from 'kerfjs/actions';
import { ArrowDownAZ, Bell, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Columns3, Contrast, Folder, GitCompare, Inbox, List, Moon, MoreHorizontal, PanelLeft, PanelLeftOpen, Pin, Plus, Search, Settings, SlidersHorizontal, Star, Wrench, ZapOff } from 'lucide';

import { catalog, catalogEntriesUsing, type CatalogEntry, type CatalogId, catalogSections, findCatalogEntry, isCatalogId, type KerfCatalogId, webAwesomeCatalog, type WebAwesomeCatalogId, webAwesomeCatalogSections } from './catalog.js';
import { isRecipeId, type RecipeId, recipeLoaders } from './recipes/loaders.js';
import type { RecipeController } from './recipes/types.js';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Missing #app');

const requested = new URLSearchParams(location.search).get('component');
const initialDemo = isCatalogId(requested) ? requested : catalog[0].id;
const selectedDemo = signal<CatalogId>(initialDemo);
const webAwesomeExpanded = signal(findCatalogEntry(initialDemo)?.source === 'webawesome');
const regionSize = signal(276);
const activeTab = signal('library');
const tabBarActive = signal('components');
const tabBarTabs = signal([
  { id: 'components', name: 'Components' },
  { id: 'design-guidance', name: 'Design guidance' },
  { id: 'accessibility', name: 'Accessibility contracts' },
  { id: 'integration', name: 'Integration patterns' },
  { id: 'release-notes', name: 'Release notes' },
  { id: 'migration', name: 'Hot Sheet migration' },
  { id: 'examples', name: 'Consumer examples' },
]);
const selectedChoice = signal('balanced');
const tokenSearchQuery = signal('NOT  AND parser');
const tokenSearchTokens = signal<TokenSearchToken[]>([
  { value: 'tag:client', label: 'tag:client', offset: 4, accessibleLabel: 'client tag' },
  { value: 'is:active', label: 'is:active', offset: 4 },
]);
const bannerTone = signal<'neutral' | 'info' | 'success' | 'warning' | 'danger'>('info');
const toolbarChoice = signal<'list' | 'columns' | 'settings'>('list');
const inspectorSection = signal<'summary' | 'activity' | 'files'>('summary');
const displayDensity = signal<'compact' | 'comfortable' | 'roomy'>('comfortable');
const actionLog = signal('Catalog ready');
const darkTheme = signal(false);
const increasedContrast = signal(false);
const reducedMotion = signal(false);
const webAwesomeReady = signal(false);
let webAwesomeDemos: Record<WebAwesomeCatalogId, () => ReturnType<typeof ToolbarDemo>> | undefined;
let webAwesomeLoad: Promise<void> | undefined;
const recipeControllers = new Map<RecipeId, RecipeController>();
const recipeLoads = new Map<RecipeId, Promise<void>>();
const recipeRevision = signal(0);

const icon = (node: Parameters<typeof LucideIcon>[0]['icon'], name: string) => <LucideIcon icon={node} name={name} />;
const button = (label: string, action: string) => <button type="button" class="demo-button" data-action={action}>{label}</button>;
type AnimationElement = HTMLElement & { cancel(): void; finish(): void; duration: number; easing: string; name: string; play: boolean; playbackRate: number };

function animationDemoFrom(element: Element): { animation: AnimationElement; output: HTMLOutputElement } | undefined {
  const demo = element.closest('[data-animation-demo]');
  const animation = demo?.querySelector<AnimationElement>('wa-animation');
  const output = demo?.querySelector<HTMLOutputElement>('[data-animation-output]');
  return animation && output ? { animation, output } : undefined;
}

function LucideIconDemo() {
  return <div class="demo-icon-grid" data-demo="lucide-icon">
    <article><span class="demo-icon-grid__sample">{icon(Wrench, 'wrench')}</span><strong>Decorative</strong><span>Hidden from assistive technology</span></article>
    <article><span class="demo-icon-grid__sample"><LucideIcon icon={Bell} name="notification" label="Notifications ready" /></span><strong>Meaningful</strong><span>Named when the icon carries meaning</span></article>
  </div>;
}

function WebAwesomeThemeDemo() {
  return <div class="webawesome-theme-demo" data-demo="webawesome-theme">
    <section>
      <header><p>Actions</p><span>Buttons, groups, menus, and copy feedback</span></header>
      <div class="webawesome-theme-demo__row">
        <wa-button variant="brand" appearance="accent">Primary</wa-button>
        <wa-button appearance="outlined">Secondary</wa-button>
        <wa-button variant="danger" appearance="filled">Destructive</wa-button>
        <wa-button-group label="View density"><wa-button appearance="outlined">Comfortable</wa-button><wa-button appearance="outlined">Compact</wa-button></wa-button-group>
        <wa-dropdown><wa-button slot="trigger" appearance="plain" with-caret>Popup menu</wa-button><wa-dropdown-item>Rename</wa-dropdown-item><wa-dropdown-item>Duplicate</wa-dropdown-item></wa-dropdown>
        <wa-copy-button value="npm i @kerfjs/ui" copy-label="Copy install command"></wa-copy-button>
      </div>
    </section>

    <section>
      <header><p>Forms</p><span>Shared form geometry, focus, and semantic states</span></header>
      <div class="webawesome-theme-demo__forms">
        <wa-input label="Project name" value="Component library" hint="Visible to collaborators"></wa-input>
        <wa-number-input label="Review limit" value="12" min="1" max="50"></wa-number-input>
        <wa-select label="Priority" value="high"><wa-option value="normal">Normal</wa-option><wa-option value="high">High</wa-option></wa-select>
        <wa-textarea label="Release note" rows="3" value="Theme every free component through shared semantic tokens."></wa-textarea>
        <wa-checkbox-group label="Notifications"><wa-checkbox checked>Email summaries</wa-checkbox><wa-checkbox>Desktop alerts</wa-checkbox></wa-checkbox-group>
        <wa-radio-group label="Layout" value="balanced"><wa-radio value="compact">Compact</wa-radio><wa-radio value="balanced">Balanced</wa-radio></wa-radio-group>
        <wa-slider label="Completion" value="68" with-markers with-tooltip></wa-slider>
        <div class="webawesome-theme-demo__compact-controls"><wa-switch checked>Live updates</wa-switch><wa-rating label="Quality" value="4"></wa-rating><wa-color-picker label="Accent" value="#0088ff"></wa-color-picker></div>
      </div>
    </section>

    <section>
      <header><p>Structure and navigation</p><span>Panels and navigation use the same borders and surfaces</span></header>
      <div class="webawesome-theme-demo__columns">
        <div class="webawesome-theme-demo__stack">
          <wa-card with-header><strong slot="header">Release readiness</strong><p>Production components, contracts, and browser checks stay together.</p><wa-button slot="footer" appearance="plain">View checklist</wa-button></wa-card>
          <wa-accordion><wa-accordion-item label="Theme contract" expanded>Override semantic <code>--wa-*</code> values after the Kerf theme import.</wa-accordion-item><wa-accordion-item label="Component loading">Import only the Web Awesome component modules the app renders.</wa-accordion-item></wa-accordion>
          <wa-details summary="Compatibility notes">The theme targets Web Awesome 3.12 and remains an optional package entry.</wa-details>
        </div>
        <div class="webawesome-theme-demo__stack">
          <wa-breadcrumb label="Location"><wa-breadcrumb-item href="#">Workspace</wa-breadcrumb-item><wa-breadcrumb-item href="#">Components</wa-breadcrumb-item><wa-breadcrumb-item>Theme</wa-breadcrumb-item></wa-breadcrumb>
          <wa-tab-group active="tokens"><wa-tab panel="tokens">Tokens</wa-tab><wa-tab panel="coverage">Coverage</wa-tab><wa-tab-panel name="tokens">Semantic values style Kerf and Web Awesome together.</wa-tab-panel><wa-tab-panel name="coverage">Visual controls inherit the complete theme.</wa-tab-panel></wa-tab-group>
          <wa-tree selection="single"><wa-tree-item expanded>Components<wa-tree-item selected>Controls</wa-tree-item><wa-tree-item>Feedback</wa-tree-item></wa-tree-item><wa-tree-item>Foundations</wa-tree-item></wa-tree>
          <wa-scroller class="webawesome-theme-demo__scroller"><span>Scrollable item 1</span><span>Scrollable item 2</span><span>Scrollable item 3</span><span>Scrollable item 4</span></wa-scroller>
        </div>
      </div>
    </section>

    <section>
      <header><p>Feedback and data</p><span>Brand and status variants stay meaningful in both appearances</span></header>
      <div class="webawesome-theme-demo__stack">
        <div class="webawesome-theme-demo__row"><wa-badge variant="neutral" pill="pill">Draft</wa-badge><wa-badge variant="brand" pill="pill">In review</wa-badge><wa-badge variant="success" pill="pill">Ready</wa-badge><wa-badge variant="warning" pill="pill">Needs attention</wa-badge><wa-badge variant="danger" pill="pill">Blocked</wa-badge></div>
        <div class="webawesome-theme-demo__callouts"><wa-callout variant="brand">Changes are ready for review.</wa-callout><wa-callout variant="success">All checks passed.</wa-callout><wa-callout variant="warning">One dependency is behind.</wa-callout><wa-callout variant="danger">Publishing is blocked.</wa-callout></div>
        <div class="webawesome-theme-demo__progress"><wa-progress-bar value="72" label="Build progress"></wa-progress-bar><wa-progress-ring value="72" label="Build progress">72%</wa-progress-ring><wa-spinner aria-label="Loading"></wa-spinner><wa-skeleton effect="sheen"></wa-skeleton></div>
        <div class="webawesome-theme-demo__row"><wa-tag variant="brand">design-system</wa-tag><wa-tag variant="success">stable</wa-tag><wa-button id="theme-tooltip-target" appearance="plain">Hover for details</wa-button><wa-tooltip for="theme-tooltip-target">Uses the shared tooltip palette</wa-tooltip></div>
      </div>
    </section>

    <section>
      <header><p>Media and formatting</p><span>Non-control components inherit type and foreground semantics</span></header>
      <div class="webawesome-theme-demo__media"><wa-avatar initials="KW" label="Kerf workspace"></wa-avatar><wa-qr-code value="https://kerfjs.dev" label="Kerf website" size="96"></wa-qr-code><dl><div><dt>Storage</dt><dd><wa-format-bytes value="10485760"></wa-format-bytes></dd></div><div><dt>Count</dt><dd><wa-format-number value="1284"></wa-format-number></dd></div><div><dt>Date</dt><dd><wa-format-date date="2026-09-11T12:00:00Z" month="short" day="numeric" year="numeric" time-zone="UTC"></wa-format-date></dd></div><div><dt>Updated</dt><dd><wa-relative-time date="2026-09-10T12:00:00Z" format="long"></wa-relative-time></dd></div></dl></div>
    </section>
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
  return <section class="toolbar-control-group-demo" data-demo="toolbar-control-group" aria-label="ToolbarControlGroup demo">
    <div><h3>Segmented choices</h3><ToolbarControlGroup><SegmentedControl id="toolbar-view" label="View mode" value={toolbarChoice.value} action="select-segment-demo" appearance="toolbar" shape="pill" size="small" choices={[
      { value: 'list', label: 'List view', content: icon(List, 'list') },
      { value: 'columns', label: 'Columns view', content: icon(Columns3, 'columns-3') },
      { value: 'settings', label: 'Settings view', content: icon(Settings, 'settings') },
    ]} /></ToolbarControlGroup></div>
    <div><h3>Popup menu</h3><ToolbarControlGroup single>
      <wa-dropdown placement="bottom-start"><wa-button slot="trigger" appearance="plain" with-caret aria-label="Sort tickets">{icon(ArrowDownAZ, 'arrow-down-a-z')}</wa-button><wa-dropdown-item data-action="sort-recent">Recently updated</wa-dropdown-item><wa-dropdown-item data-action="sort-priority">Priority</wa-dropdown-item></wa-dropdown>
    </ToolbarControlGroup></div>
    <div><h3>Button group</h3><ToolbarControlGroup label="View actions">
      <wa-button appearance="plain" aria-label="Favorite view" data-action="log-favorite">{icon(Star, 'star')}</wa-button>
      <wa-button appearance="plain" aria-label="More actions" data-action="log-more">{icon(MoreHorizontal, 'ellipsis')}</wa-button>
    </ToolbarControlGroup></div>
    <div><h3>Single button</h3><ToolbarControlGroup single><wa-button appearance="plain" aria-label="Pin view" data-action="log-pin">{icon(Pin, 'pin')}</wa-button></ToolbarControlGroup></div>
    <div><h3>Borderless group</h3><ToolbarControlGroup appearance="borderless" single><button type="button" aria-label="Show sidebar" data-action="log-sidebar">{icon(PanelLeftOpen, 'panel-left-open')}</button></ToolbarControlGroup></div>
    <div><h3>Push button, resting</h3><ToolbarControlGroup buttonAppearance="push" single><button type="button" aria-label="Resting comparison" aria-pressed="false" data-action="log-resting">{icon(GitCompare, 'git-compare')}</button></ToolbarControlGroup></div>
    <div><h3>Push button, pressed</h3><ToolbarControlGroup buttonAppearance="push" single><button type="button" aria-label="Pressed comparison" aria-pressed="true" data-action="log-pressed">{icon(GitCompare, 'git-compare')}</button></ToolbarControlGroup></div>
    <div class="demo-dark-swatch"><h3>Dark group</h3><ToolbarControlGroup label="Dark navigation" tone="dark"><button type="button" aria-label="Previous" data-action="log-previous">{icon(ChevronLeft, 'chevron-left')}</button><button type="button" aria-label="Next" data-action="log-next">{icon(ChevronRight, 'chevron-right')}</button></ToolbarControlGroup></div>
  </section>;
}

function SegmentedControlDemo() {
  return <section class="segmented-control-demo" data-demo="segmented-control" aria-label="SegmentedControl variants">
    <article>
      <header><h3>Toolbar</h3><p>Pill controls share a toolbar group’s chrome.</p></header>
      <ToolbarControlGroup><SegmentedControl id="standalone-toolbar-view" label="Toolbar view mode" value={toolbarChoice.value} action="select-segment-demo" appearance="toolbar" shape="pill" size="small" choices={[
        { value: 'list', label: 'List view', content: icon(List, 'list') },
        { value: 'columns', label: 'Columns view', content: icon(Columns3, 'columns-3') },
        { value: 'settings', label: 'Settings view', content: icon(Settings, 'settings') },
      ]} /></ToolbarControlGroup>
    </article>
    <article>
      <header><h3>Rounded rectangle</h3><p>An equal-width inspector switcher with labels.</p></header>
      <SegmentedControl id="inspector-section" label="Inspector section" value={inspectorSection.value} action="select-segment-demo" shape="rounded" layout="equal" choices={[
        { value: 'summary', label: 'Summary', content: <>{icon(List, 'list')}<span>Summary</span></> },
        { value: 'activity', label: 'Activity', content: <>{icon(Bell, 'bell')}<span>Activity</span></> },
        { value: 'files', label: 'Files', content: <>{icon(Folder, 'folder')}<span>Files</span></> },
      ]} />
    </article>
    <article>
      <header><h3>Pill</h3><p>A compact standalone choice with a disabled option.</p></header>
      <SegmentedControl id="display-density" label="Display density" value={displayDensity.value} action="select-segment-demo" appearance="outlined" shape="pill" size="small" choices={[
        { value: 'compact', label: 'Compact' },
        { value: 'comfortable', label: 'Comfortable' },
        { value: 'roomy', label: 'Roomy', disabled: true, title: 'Roomy density is unavailable' },
      ]} />
    </article>
  </section>;
}

function TokenSearchFieldDemo() {
  return <section class="token-search-demo" data-demo="token-search-field" aria-label="TokenSearchField states">
    <article>
      <header><h3>Structured ticket search</h3><p>Text and atomic filters remain in one keyboard-focusable editor.</p></header>
      <TokenSearchField id="catalog-search" label="Search tickets" query={tokenSearchQuery.value} tokens={tokenSearchTokens.value} autofocus editorAttributes={{ 'data-demo-token-search': 'true' }} />
      <output aria-live="polite">{tokenSearchTokens.value.length} filters · {tokenSearchQuery.value || 'No free text'}</output>
    </article>
    <article>
      <header><h3>Disabled</h3><p>Controlled read-only state preserves the complete expression.</p></header>
      <TokenSearchField id="disabled-search" label="Saved search" query="release" tokens={[{ value: 'tag:design-system', label: 'tag:design-system', offset: 7 }]} disabled />
    </article>
  </section>;
}

function ToolbarTextDemo() {
  return <div class="demo-text-variants" data-demo="toolbar-text">
    <div><span>Large</span><ToolbarText text="Component library" size="large" /></div>
    <div><span>Default</span><ToolbarText text="Saved just now" /></div>
    <div><span>Small</span><ToolbarText text="read-only" size="small" /></div>
  </div>;
}

function MenuDemo() {
  return <div class="demo-menu kui-sidebar" data-demo="menu">
    <MenuHeader label="Workspace" action="log-add" actionLabel="Add workspace" actionIcon={icon(Plus, 'plus')} />
    <MenuItem action="log-inbox" itemId="inbox" label="Inbox" icon={icon(Inbox, 'inbox')} trailing={<span>12</span>} selected />
    <MenuItem action="log-projects" itemId="projects" label="Projects" icon={icon(Folder, 'folder')} trailing={icon(ChevronRight, 'chevron-right')} />
    <MenuItem action="log-drafts" itemId="drafts" label="Drafts without a visible icon" />
    <MenuHeader label="Tools" toggle expanded action="log-tools" actionIcon={icon(ChevronDown, 'chevron-down')} />
    <MenuItem action="log-settings" label="A multiline item demonstrates content that wraps without clipping" icon={icon(Wrench, 'wrench')} multiline />
    <MenuItem action="disabled" label="Unavailable" icon={icon(CircleHelp, 'circle-help')} disabled />
    <section class="kui-sidebar-section">
      <MenuHeader label="Details" />
      <div class="kui-sidebar-surface" data-sidebar-surface><strong>Shared label column</strong><p>The border stays on the gutter.</p></div>
    </section>
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

function TabBarDemo() {
  return <div class="demo-tab-bar-frame" data-demo="tab-bar">
    <TabBar id="catalog-tabs" label="Open catalog pages" leading={<ToolbarControlGroup appearance="borderless" single><button type="button" aria-label="Show navigation" data-action="log-sidebar">{icon(PanelLeft, 'panel-left')}</button></ToolbarControlGroup>} trailing={<ToolbarControlGroup appearance="borderless" single><button type="button" aria-label="Add tab" data-action="add-demo-tab">{icon(Plus, 'plus')}</button></ToolbarControlGroup>}>
      {tabBarTabs.value.map((tab) => <AppTab id={tab.id} name={tab.name} selected={tabBarActive.value === tab.id} draggable selectAction="select-reorder-tab" closeAction="close-reorder-tab" rootAttributes={{ 'data-demo-tab-id': tab.id }} />)}
    </TabBar>
    <p>Order: <strong data-tab-order>{tabBarTabs.value.map((tab) => tab.name).join(' · ')}</strong></p>
  </div>;
}

function HeadersDemo() {
  return <div class="demo-frame" data-demo="headers">
    <PageHeader title="UI foundations" action={button('New pattern', 'log-add')} />
    <div class="demo-dialog">
      <DialogHeader title="Package details" titleId="package-title" summary="Production-backed primitives with explicit contracts." summaryId="package-summary" icon={icon(Wrench, 'wrench')} actions={button('Done', 'log-done')} />
      <div class="demo-dialog__body kui-dialog-body"><ValueTable label="Package metadata"><div><dt>Package</dt><dd>@kerfjs/ui</dd></div><div><dt>Rendering</dt><dd>Kerf SafeHtml</dd></div><div><dt>Styles</dt><dd>Explicit CSS subpaths</dd></div></ValueTable></div>
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
    <ResizableRegion id="catalog-panel" label="Catalog panel" size={regionSize.value} min={180} max={420}><div class="demo-resize-panel kui-pane-body"><strong>Resizable panel</strong><span>Use the handle with a pointer, arrow keys, Home, or End.</span></div></ResizableRegion>
    <div class="demo-resize-content kui-pane-body"><span>Committed width</span><strong data-region-size>{regionSize.value}px</strong></div>
  </div>;
}

function SelectDemo() {
  return <div class="demo-control-stack" data-demo="select">
    <label>Rendering balance</label>
    <Select name="rendering-balance" value={selectedChoice.value} ariaLabel="Rendering balance" choices={[
      { value: 'quiet', label: 'Quiet', icon: Bell, iconName: 'bell', group: 'Attention' },
      { value: 'balanced', label: 'Balanced', icon: SlidersHorizontal, iconName: 'sliders-horizontal', group: 'Attention' },
      { value: 'explicit', label: 'Explicit', icon: Wrench, iconName: 'wrench', group: 'Control', separatorBefore: true },
    ]} renderSelected={(choice) => <span class="demo-select-selected">{choice.icon ? <LucideIcon icon={choice.icon} name={choice.iconName ?? choice.label.toLowerCase().replaceAll(' ', '-')} /> : null}<span>{choice.label}</span></span>} />
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
  const specimens = [
    { tone: 'neutral', title: 'Standing by' },
    { tone: 'info', title: 'Connecting to server' },
    { tone: 'success', title: 'Everything is connected' },
    { tone: 'warning', title: 'Connection interrupted' },
    { tone: 'danger', title: 'Authentication required' },
  ] as const;
  return <div class="demo-state-banner-grid" data-demo="state-banner">
    {specimens.map(({ tone, title }) => <article><h3>{tone}</h3><StateBanner tone={tone} urgency={tone === 'danger' ? 'alert' : 'status'} title={title} detail="Semantic defaults remain overridable." icon={tone === 'danger' ? icon(CircleHelp, 'circle-help') : icon(Check, 'check')} action={button('Act', `log-${tone}`)} /></article>)}
    <article><h3>Scoped override</h3><StateBanner className="demo-state-banner--override" tone="info" title="Consumer palette" detail="Only this instance uses the override." icon={icon(Check, 'check')} /></article>
  </div>;
}

function EmptyStateDemo() {
  return <div class="demo-empty-grid" data-demo="empty-state"><article><span>Actionable</span><EmptyState title="Nothing here yet" detail="Create the first item when you are ready." icon={icon(Search, 'search')} action={button('Create item', 'log-add')} /></article><article><span>Busy</span><EmptyState title="Loading items" detail="The current view will remain stable." busy /></article></div>;
}

function LoadingSpinnerDemo() {
  return <div class="demo-spinner-grid" data-demo="loading-spinner"><article><LoadingSpinner label="Loading preview" /><strong>Meaningful</strong><span>Exposes its supplied label</span></article><article><LoadingSpinner /><strong>Decorative</strong><span>Hidden from assistive technology</span></article></div>;
}

function LayoutDemo() {
  return <div class="demo-layout kui-page-gutter" data-demo="layout">
    <section class="kui-section-stack">
      <PageHeader title="Semantic layout" action={button('New item', 'log-add')} />
      <div class="demo-layout__surface kui-surface-body kui-section-stack">
        <div><strong>One owner per boundary</strong><p>Page, surface, section, controls, metadata, and scrolling each have a named role.</p></div>
        <div class="kui-control-cluster">{button('Primary action', 'log-add')}{button('Secondary action', 'log-more')}</div>
        <div class="kui-inline-metadata"><span>Responsive density</span><span>·</span><span>Shared spacing scale</span></div>
      </div>
    </section>
  </div>;
}

const demos: Record<Exclude<KerfCatalogId, RecipeId>, () => ReturnType<typeof ToolbarDemo>> = {
  'lucide-icon': LucideIconDemo,
  'webawesome-theme': WebAwesomeThemeDemo,
  layout: LayoutDemo,
  toolbar: ToolbarDemo,
  'toolbar-control-group': ToolbarControlGroupDemo,
  'segmented-control': SegmentedControlDemo,
  'token-search-field': TokenSearchFieldDemo,
  'toolbar-text': ToolbarTextDemo,
  menu: MenuDemo,
  'menu-header': MenuHeaderDemo,
  'menu-item': MenuItemDemo,
  tabs: TabsDemo,
  'tab-bar': TabBarDemo,
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

function ensureWebAwesomeDemos(): Promise<void> {
  webAwesomeLoad ??= import('./webawesome-demos.js').then(({ webAwesomeComponentDemos }) => {
    webAwesomeDemos = webAwesomeComponentDemos;
    webAwesomeReady.value = true;
  });
  return webAwesomeLoad;
}

function ensureRecipe(id: RecipeId): Promise<void> {
  const pending = recipeLoads.get(id);
  if (pending) return pending;
  const load = recipeLoaders[id]().then(({ createRecipe }) => {
    recipeControllers.set(id, createRecipe((message) => { actionLog.value = message; }));
    recipeRevision.value += 1;
  });
  recipeLoads.set(id, load);
  return load;
}

function Stage() {
  const selected = findCatalogEntry(selectedDemo.value)!;
  if (isRecipeId(selected.id)) {
    void recipeRevision.value;
    const controller = recipeControllers.get(selected.id);
    if (!controller) {
      void ensureRecipe(selected.id);
      return <LoadingSpinner label={`Loading ${selected.name} recipe`} />;
    }
    return controller.render();
  }
  const needsWebAwesome = selected.source === 'webawesome' || selected.id === 'webawesome-theme';
  if (needsWebAwesome && !webAwesomeReady.value) {
    void ensureWebAwesomeDemos();
    return <LoadingSpinner label={`Loading ${selected.name} preview`} />;
  }
  if (selected.source === 'webawesome') return webAwesomeDemos![selected.id as WebAwesomeCatalogId]();
  return demos[selectedDemo.value as Exclude<KerfCatalogId, RecipeId>]();
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
  if (choices.length === 0) return null;
  return <footer class="catalog-relationships" data-relationships-for={entry.id}><Select className="catalog-relationships__select" name="related-component" value="" label="Related components" placeholder="Choose a related component" choices={choices} /></footer>;
}

function selectDemo(id: string): void {
  if (!isCatalogId(id)) return;
  const selected = findCatalogEntry(id)!;
  if (selected.source === 'webawesome' || selected.id === 'webawesome-theme') void ensureWebAwesomeDemos();
  if (isRecipeId(selected.id)) void ensureRecipe(selected.id);
  selectedDemo.value = id;
  if (selected.source === 'webawesome') webAwesomeExpanded.value = true;
  const url = new URL(location.href);
  url.searchParams.set('component', id);
  history.replaceState(null, '', url);
  actionLog.value = `Showing ${id}`;
  revealSelectedSidebarItem(id);
}

function revealSelectedSidebarItem(id: CatalogId, block: ScrollLogicalPosition = 'nearest'): void {
  if (!window.matchMedia('(min-width: 52.01rem)').matches) return;
  window.requestAnimationFrame(() => document.querySelector(`[data-item-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block }));
}

mount(app, () => {
  const selected = findCatalogEntry(selectedDemo.value)!;
  return <main class="catalog-shell kui-layout">
    <aside class="catalog-sidebar kui-scroll-owner" aria-label="Component catalog">
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
        <section class="catalog-group catalog-group--ecosystem">
          <MenuHeader label={`Web Awesome (${webAwesomeCatalog.length})`} toggle action="toggle-webawesome-catalog" expanded={webAwesomeExpanded.value} actionIcon={icon(ChevronDown, 'chevron-down')} />
          {webAwesomeExpanded.value && <div class="catalog-ecosystem" data-webawesome-catalog>
            {webAwesomeCatalogSections.map((section) => <section class="catalog-ecosystem__group">
              <h3>{section.category}</h3>
              <div class="catalog-group__items">
                {section.entries.map((entry) => <MenuItem action="select-demo" itemId={entry.id} label={entry.name} selected={selectedDemo.value === entry.id} title={entry.description} />)}
              </div>
            </section>)}
          </div>}
        </section>
      </nav>
    </aside>
    <article class="catalog-detail kui-page-gutter">
      <header class="catalog-header">
        <div><p class="catalog-eyebrow">{selected.source === 'webawesome' ? `Web Awesome · ${selected.category}` : selected.category}</p><h2>{selected.name}</h2><p>{selected.description}</p></div>
        <div class="catalog-settings" role="group" aria-label="Catalog display settings">
          <button type="button" data-action="toggle-theme" aria-pressed={String(darkTheme.value)}>{icon(Moon, 'moon')}<span>Dark</span></button>
          <button type="button" data-action="toggle-contrast" aria-pressed={String(increasedContrast.value)}>{icon(Contrast, 'contrast')}<span>Contrast</span></button>
          <button type="button" data-action="toggle-motion" aria-pressed={String(reducedMotion.value)}>{icon(ZapOff, 'zap-off')}<span>Reduce motion</span></button>
        </div>
      </header>
      <section class="catalog-stage kui-surface-body" aria-label={`${selected.name} preview`}>
        <div class="catalog-canvas kui-pane-body"><Stage /></div>
        <footer class="catalog-stage__footer"><output class="catalog-log" aria-live="polite">{actionLog.value}</output><span>{selected.source === 'webawesome' ? 'Web Awesome component · Kerf theme' : selected.kind === 'component' ? 'Kerf first-class component · production CSS' : 'Kerf composition · production CSS'}</span></footer>
      </section>
      <DemoRelationships entry={selected} />
    </article>
  </main>;
});

if (findCatalogEntry(initialDemo)?.source === 'webawesome') revealSelectedSidebarItem(initialDemo, 'center');

const stopActions = delegateActions(app, 'click', {
  'select-demo': (_event, element) => {
    const id = element.getAttribute('data-item-id');
    if (id) selectDemo(id);
  },
  'recipe-action': (_event, element) => {
    const id = selectedDemo.value;
    if (!isRecipeId(id)) return;
    const target = element as HTMLElement;
    recipeControllers.get(id)?.action(target.dataset.recipeCommand ?? '', target);
  },
  'toggle-webawesome-catalog': () => { webAwesomeExpanded.value = !webAwesomeExpanded.value; actionLog.value = webAwesomeExpanded.value ? 'Web Awesome catalog expanded' : 'Web Awesome catalog collapsed'; },
  'show-wa-dialog': () => { actionLog.value = 'Dialog opened'; const dialog = document.querySelector<HTMLElement & { open: boolean }>('#catalog-wa-dialog'); if (dialog) dialog.open = true; },
  'hide-wa-dialog': () => { actionLog.value = 'Dialog closed'; const dialog = document.querySelector<HTMLElement & { open: boolean }>('#catalog-wa-dialog'); if (dialog) dialog.open = false; },
  'show-wa-drawer': () => { actionLog.value = 'Drawer opened'; const drawer = document.querySelector<HTMLElement & { open: boolean }>('#catalog-wa-drawer'); if (drawer) drawer.open = true; },
  'hide-wa-drawer': () => { actionLog.value = 'Drawer closed'; const drawer = document.querySelector<HTMLElement & { open: boolean }>('#catalog-wa-drawer'); if (drawer) drawer.open = false; },
  'show-wa-toast': async () => {
    const toast = document.querySelector<HTMLElement & { create(message: string, options?: { duration?: number; icon?: string; variant?: string }): Promise<HTMLElement> }>('#catalog-wa-toast');
    if (!toast) return;
    await toast.create('The component catalog is ready.', { duration: 4000, icon: 'circle-check', variant: 'success' });
  },
  'randomize-wa-content': () => { actionLog.value = 'Random content changed'; document.querySelector<HTMLElement & { randomize(): Element[] }>('wa-random-content')?.randomize(); },
  'play-wa-animation': (_event, element) => {
    const demo = animationDemoFrom(element);
    if (!demo) return;
    if (document.documentElement.classList.contains('demo-reduced-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      demo.output.textContent = 'Playback suppressed by reduced-motion preference';
      return;
    }
    demo.animation.cancel();
    window.requestAnimationFrame(() => { demo.animation.play = true; });
  },
  'pause-wa-animation': (_event, element) => { const demo = animationDemoFrom(element); if (demo) { demo.animation.play = false; demo.output.textContent = 'Paused'; } },
  'finish-wa-animation': (_event, element) => { animationDemoFrom(element)?.animation.finish(); },
  'cancel-wa-animation': (_event, element) => { animationDemoFrom(element)?.animation.cancel(); },
  'toggle-wa-intersection': (_event, element) => {
    const demo = element.closest<HTMLElement>('[data-observer-demo="intersection"]');
    const viewport = demo?.querySelector<HTMLElement>('.wa-demo-observer__viewport');
    const target = demo?.querySelector<HTMLElement>('[data-observer-target]');
    if (!demo || !viewport || !target) return;
    const revealed = demo.dataset.revealed === 'true';
    demo.dataset.revealed = String(!revealed);
    viewport.scrollTop = revealed ? 0 : target.offsetTop - viewport.offsetTop - 16;
    element.textContent = revealed ? 'Reveal target' : 'Hide target';
  },
  'mutate-wa-target': (_event, element) => {
    const target = element.closest('[data-observer-demo="mutation"]')?.querySelector<HTMLElement>('[data-observer-target]');
    if (!target) return;
    const revision = Number(target.dataset.revision ?? 0) + 1;
    target.dataset.revision = String(revision);
    target.querySelector('[data-observer-copy]')?.replaceChildren(`Mutation ${revision}: attribute and child content changed.`);
  },
  'resize-wa-target': (_event, element) => {
    const demo = element.closest<HTMLElement>('[data-observer-demo="resize"]');
    const target = demo?.querySelector<HTMLElement>('[data-observer-target]');
    if (!demo || !target) return;
    const expanded = demo.dataset.expanded === 'true';
    demo.dataset.expanded = String(!expanded);
    target.style.width = expanded ? '16rem' : '24rem';
    element.textContent = expanded ? 'Resize target' : 'Restore size';
  },
  'select-tab': (_event, element) => { activeTab.value = element.getAttribute('data-tab-id') ?? 'library'; actionLog.value = `Selected ${activeTab.value}`; },
  'select-reorder-tab': (_event, element) => { tabBarActive.value = element.getAttribute('data-tab-id') ?? 'components'; actionLog.value = `Selected ${tabBarActive.value}`; },
  'close-tab': (_event, element) => { actionLog.value = `Close requested for ${element.getAttribute('data-tab-id')}`; },
  'close-reorder-tab': (_event, element) => { const id = element.getAttribute('data-tab-id'); if (!id) return; const index = tabBarTabs.value.findIndex((tab) => tab.id === id); tabBarTabs.value = tabBarTabs.value.filter((tab) => tab.id !== id); if (tabBarActive.value === id) tabBarActive.value = tabBarTabs.value[Math.min(index, tabBarTabs.value.length - 1)]?.id ?? ''; actionLog.value = `Closed ${id}`; },
  'add-demo-tab': () => { const id = `new-${tabBarTabs.value.length + 1}`; tabBarTabs.value = [...tabBarTabs.value, { id, name: `New tab ${tabBarTabs.value.length + 1}` }]; tabBarActive.value = id; actionLog.value = `Added ${id}`; },
  'select-segment-demo': (_event, element) => {
    const value = element.getAttribute('data-segment-value');
    const id = element.closest('[data-segmented-control-id]')?.getAttribute('data-segmented-control-id');
    if ((id === 'toolbar-view' || id === 'standalone-toolbar-view') && (value === 'list' || value === 'columns' || value === 'settings')) toolbarChoice.value = value;
    if (id === 'inspector-section' && (value === 'summary' || value === 'activity' || value === 'files')) inspectorSection.value = value;
    if (id === 'display-density' && (value === 'compact' || value === 'comfortable' || value === 'roomy')) displayDensity.value = value;
    if (value) actionLog.value = `Selected ${value}`;
  },
  'edit-search-token': (_event, element) => {
    const value = element.getAttribute('data-token-value');
    const token = tokenSearchTokens.value.find((candidate) => candidate.value === value);
    if (!token) return;
    const offset = token.offset ?? tokenSearchQuery.value.length;
    batch(() => {
      tokenSearchTokens.value = tokenSearchTokens.value.filter((candidate) => candidate.value !== value);
      tokenSearchQuery.value = `${tokenSearchQuery.value.slice(0, offset)}${token.value} ${tokenSearchQuery.value.slice(offset)}`;
    });
    actionLog.value = `Editing ${token.label}`;
  },
  'remove-search-token': (_event, element) => {
    const value = element.getAttribute('data-token-value');
    tokenSearchTokens.value = tokenSearchTokens.value.filter((token) => token.value !== value);
    actionLog.value = `Removed ${value}`;
  },
  'clear-token-search': (_event, element) => {
    const editor = element.closest('[data-component="token-search-field"]')?.querySelector<HTMLElement>('[data-token-search-editor]');
    if (editor) editor.textContent = '';
    batch(() => {
      tokenSearchQuery.value = '';
      tokenSearchTokens.value = [];
    });
    actionLog.value = 'Search cleared';
  },
  'cycle-tone': () => { const tones = ['neutral', 'info', 'success', 'warning', 'danger'] as const; bannerTone.value = tones[(tones.indexOf(bannerTone.value) + 1) % tones.length]!; actionLog.value = `Banner tone: ${bannerTone.value}`; },
  'toggle-theme': () => { darkTheme.value = !darkTheme.value; document.documentElement.classList.toggle('demo-dark', darkTheme.value); actionLog.value = darkTheme.value ? 'Dark theme on' : 'Dark theme off'; },
  'toggle-contrast': () => { increasedContrast.value = !increasedContrast.value; document.documentElement.classList.toggle('demo-contrast', increasedContrast.value); actionLog.value = increasedContrast.value ? 'Increased contrast on' : 'Increased contrast off'; },
  'toggle-motion': () => { reducedMotion.value = !reducedMotion.value; document.documentElement.classList.toggle('demo-reduced-motion', reducedMotion.value); actionLog.value = reducedMotion.value ? 'Reduced motion on' : 'Reduced motion off'; },
  'log-add': () => { actionLog.value = 'Add action requested'; },
  'log-inbox': () => { actionLog.value = 'Inbox selected'; },
  'log-projects': () => { actionLog.value = 'Projects selected'; },
  'log-drafts': () => { actionLog.value = 'Drafts selected'; },
  'log-tools': () => { actionLog.value = 'Tools toggled'; },
  'log-settings': () => { actionLog.value = 'Settings selected'; },
  'log-done': () => { actionLog.value = 'Done'; },
  'sort-recent': () => { actionLog.value = 'Sorted by recently updated'; },
  'sort-priority': () => { actionLog.value = 'Sorted by priority'; },
  'log-favorite': () => { actionLog.value = 'Favorite requested'; },
  'log-more': () => { actionLog.value = 'More actions requested'; },
  'log-pin': () => { actionLog.value = 'Pin requested'; },
  'log-sidebar': () => { actionLog.value = 'Sidebar requested'; },
  'log-resting': () => { actionLog.value = 'Resting push button activated'; },
  'log-pressed': () => { actionLog.value = 'Pressed push button activated'; },
  'log-previous': () => { actionLog.value = 'Previous requested'; },
  'log-next': () => { actionLog.value = 'Next requested'; },
  'log-neutral': () => { actionLog.value = 'Neutral banner action'; },
  'log-info': () => { actionLog.value = 'Info banner action'; },
  'log-success': () => { actionLog.value = 'Success banner action'; },
  'log-warning': () => { actionLog.value = 'Warning banner action'; },
  'log-danger': () => { actionLog.value = 'Danger banner action'; },
});

const stopResize = wireResizableRegions(app, { onCommit: ({ id, size }) => {
  if (id.startsWith('recipe-') && isRecipeId(selectedDemo.value)) recipeControllers.get(selectedDemo.value)?.resize?.(id, size);
  else { regionSize.value = size; actionLog.value = `Panel resized to ${size}px`; }
} });
const stopSelect = delegate(app, 'change', 'wa-select', (_event, element) => {
  const value = (element as HTMLElement & { value?: string }).value;
  if (value === 'quiet' || value === 'balanced' || value === 'explicit') selectedChoice.value = value;
});
const dispatchRecipeChange = (_event: Event, element: Element) => {
  if (isRecipeId(selectedDemo.value)) recipeControllers.get(selectedDemo.value)?.change?.(element as HTMLElement);
};
const stopRecipeChanges = delegate(app, 'change', '[data-recipe] wa-select, [data-recipe] wa-input, [data-recipe] wa-textarea', dispatchRecipeChange);
const stopRecipeInputs = delegate(app, 'input', '[data-recipe] wa-input, [data-recipe] wa-textarea', dispatchRecipeChange);
const stopRecipeDialogs = delegate(app, 'wa-after-hide', '[data-recipe] wa-dialog', (_event, element) => {
  if (isRecipeId(selectedDemo.value)) recipeControllers.get(selectedDemo.value)?.afterHide?.(element as HTMLElement);
});
const stopTokenSearch = delegate(app, 'input', '[data-demo-token-search="true"]', (_event, element) => {
  const value = readTokenSearchField(element as HTMLElement, tokenSearchTokens.value);
  tokenSearchQuery.value = value.query;
  tokenSearchTokens.value = value.tokens;
});
const stopRelationships = delegate(app, 'change', '[name="related-component"]', (_event, element) => {
  const value = (element as HTMLElement & { value?: string }).value;
  if (value) selectDemo(value);
});
const updateAnimationSetting = (element: Element): void => {
  const demo = animationDemoFrom(element);
  if (!demo) return;
  const control = element as HTMLElement & { value?: string };
  const value = control.value ?? '';
  if (control.getAttribute('name') === 'animation-preset') demo.animation.name = value;
  if (control.getAttribute('name') === 'animation-easing') demo.animation.easing = value;
  if (control.getAttribute('name') === 'animation-duration') {
    demo.animation.duration = Number(value);
    element.closest('[data-animation-demo]')?.querySelector<HTMLOutputElement>('[data-animation-duration]')?.replaceChildren(`${value} ms`);
  }
  if (control.getAttribute('name') === 'animation-rate') {
    demo.animation.playbackRate = Number(value);
    element.closest('[data-animation-demo]')?.querySelector<HTMLOutputElement>('[data-animation-rate]')?.replaceChildren(`${value}×`);
  }
  demo.output.textContent = 'Settings updated';
};
const stopAnimationSelects = delegate(app, 'change', 'wa-select[name^="animation-"]', (_event, element) => { updateAnimationSetting(element); });
const stopAnimationRanges = delegate(app, 'input', 'input[name^="animation-"]', (_event, element) => { updateAnimationSetting(element); });
const stopAnimationEvents = [
  delegate(app, 'wa-start', 'wa-animation', (_event, element) => { const demo = animationDemoFrom(element); if (demo) demo.output.textContent = `Playing ${demo.animation.name}`; }),
  delegate(app, 'wa-finish', 'wa-animation', (_event, element) => { const demo = animationDemoFrom(element); if (demo) demo.output.textContent = 'Finished'; }),
  delegate(app, 'wa-cancel', 'wa-animation', (_event, element) => { const demo = animationDemoFrom(element); if (demo) demo.output.textContent = 'Canceled'; }),
];
const stopIntersectionObserver = delegateCapture(app, 'wa-intersect', 'wa-intersection-observer', (event, element) => {
  const entry = (event as CustomEvent<{ entry?: IntersectionObserverEntry }>).detail?.entry;
  const output = element.closest('[data-observer-demo]')?.querySelector<HTMLOutputElement>('[data-observer-output]');
  if (!entry || !output) return;
  output.textContent = entry.isIntersecting ? `Target visible · ${Math.round(entry.intersectionRatio * 100)}%` : 'Target outside the observer root';
});
const stopMutationObserver = delegate(app, 'wa-mutation', 'wa-mutation-observer', (event, element) => {
  const mutations = (event as CustomEvent<{ mutationList?: MutationRecord[] }>).detail?.mutationList ?? [];
  const output = element.closest('[data-observer-demo]')?.querySelector<HTMLOutputElement>('[data-observer-output]');
  if (!output) return;
  output.textContent = `Observed ${mutations.length} mutation${mutations.length === 1 ? '' : 's'}`;
});
const stopResizeObserver = delegate(app, 'wa-resize', 'wa-resize-observer', (event, element) => {
  const entry = (event as CustomEvent<{ entries?: ResizeObserverEntry[] }>).detail?.entries?.[0];
  const output = element.closest('[data-observer-demo]')?.querySelector<HTMLOutputElement>('[data-observer-output]');
  if (!entry || !output) return;
  output.textContent = `Observed width · ${Math.round(entry.contentRect.width)}px`;
});
const stopTabs = delegate<HTMLButtonElement>(app, 'keydown', '[data-demo="tabs"] [role="tab"]', (event, element) => {
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
const stopTabBars = wireTabBars(app, { onReorder: ({ barId, sourceId, targetId, position, source }) => { tabBarTabs.value = reorderTabs(tabBarTabs.value, (tab) => tab.id, sourceId, targetId, position); actionLog.value = `${source === 'pointer' ? 'Dragged' : 'Moved'} ${sourceId} ${position} ${targetId} in ${barId}`; } });

window.addEventListener('pagehide', () => { stopActions(); stopResize(); stopSelect(); stopRecipeChanges(); stopRecipeInputs(); stopRecipeDialogs(); stopTokenSearch(); stopRelationships(); stopAnimationSelects(); stopAnimationRanges(); stopAnimationEvents.forEach((dispose) => dispose()); stopIntersectionObserver(); stopMutationObserver(); stopResizeObserver(); stopTabs(); stopTabBars(); }, { once: true });
