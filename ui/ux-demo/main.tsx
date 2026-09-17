import '@kerfjs/ui/select/register';
import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/catalog.css';
import '@kerfjs/ui/webawesome.css';
import './style.css';

import { AppTab } from '@kerfjs/ui/app-tab';
import { Catalog, CatalogExample, type CatalogRelated, type CatalogResource, type CatalogSection as KuiCatalogSection } from '@kerfjs/ui/catalog';
import { DisclosureArrow } from '@kerfjs/ui/disclosure-arrow';
import { EmptyState } from '@kerfjs/ui/empty-state';
import { ListActionRow } from '@kerfjs/ui/list-action-row';
import { ListHeader } from '@kerfjs/ui/list-header';
import { ListItem } from '@kerfjs/ui/list-item';
import { LoadingSpinner } from '@kerfjs/ui/loading-spinner';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { PanelHeader } from '@kerfjs/ui/panel-header';
import { ResizableRegion } from '@kerfjs/ui/resizable-region';
import { SegmentedControl } from '@kerfjs/ui/segmented-control';
import { Select } from '@kerfjs/ui/select';
import { Skeleton } from '@kerfjs/ui/skeleton';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { TabBar } from '@kerfjs/ui/tab-bar';
import { readTokenSearchField, TokenSearchField, type TokenSearchToken } from '@kerfjs/ui/token-search-field';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { ValueTable, ValueTableRow } from '@kerfjs/ui/value-table';
import { wireCatalog } from '@kerfjs/ui/wire-catalog';
import { wireNavStack } from '@kerfjs/ui/wire-nav-stack';
import { wireResizableRegions } from '@kerfjs/ui/wire-resizable-regions';
import { reorderTabs, wireTabBars } from '@kerfjs/ui/wire-tab-bars';
import { wireTokenSearchFields } from '@kerfjs/ui/wire-token-search-fields';
import { batch, delegate, delegateCapture, effect, mount, signal } from 'kerfjs';
import { delegateActions } from 'kerfjs/actions';
import { ArrowDownAZ, ArrowRight, Bell, Check, ChevronLeft, ChevronRight, CircleHelp, Columns3, Contrast, Folder, GitCompare, GripVertical, Inbox, List, MoreHorizontal, PanelLeft, PanelLeftOpen, Pin, Plus, Search, Settings, SlidersHorizontal, Star, StickyNote, Wrench, X, ZapOff } from 'lucide';

import { catalog, catalogEntriesUsing, type CatalogEntry, type CatalogId, catalogRepositoryHref, catalogSections, findCatalogEntry, isCatalogId, type KerfCatalogId, type WebAwesomeCatalogId, webAwesomeCatalogSections } from './catalog.js';
import { createComponentOverlay } from './component-overlay.js';
import { applyDemoTheme, type DemoTheme, oppositeDemoTheme, preferredDemoTheme } from './demo-theme.js';
import { isRecipeId, type RecipeId, recipeLoaders } from './recipes/loaders.js';
import type { RecipeController } from './recipes/types.js';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Missing #app');
// `?no-inline` keeps the logo an emitted file URL instead of a `data:image/svg+xml`
// URI: kerf's URL screening drops script-capable SVG data URIs from `src`, which
// would blank the mark once the asset is small enough for Vite to inline it.
const kerfLogoUrl = new URL('../../assets/logo.svg?no-inline', import.meta.url).href;

// Set the brand favicon from an emitted file URL (like the logo). A static
// `../../assets/favicon.svg` link in index.html only resolves in the built
// output — Vite rewrites it there but leaves it unresolved on the dev server,
// where the browser normalizes `../../` to a path outside the demo root. This
// URL import resolves identically in dev and build. `?no-inline` keeps it a file.
const faviconLink = document.createElement('link');
faviconLink.rel = 'icon';
faviconLink.type = 'image/svg+xml';
faviconLink.href = new URL('../../assets/favicon.svg?no-inline', import.meta.url).href;
document.head.append(faviconLink);

const requested = new URLSearchParams(location.search).get('component');
const initialDemo = isCatalogId(requested) ? requested : catalog[0].id;
const selectedDemo = signal<CatalogId>(initialDemo);
const webAwesomeExpanded = signal(findCatalogEntry(initialDemo)?.source === 'webawesome');
const sidebarCollapsed = signal(false);
const recipeNotesVisible = signal(false);
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
let nextDemoTabNumber = tabBarTabs.value.length + 1;
const selectedChoice = signal('balanced');
const disclosureOpen = signal(false);
const customDisclosureOpen = signal(false);
const menuToolsOpen = signal(true);
const tokenSearchQuery = signal('NOT  AND parser');
const tokenSearchTokens = signal<TokenSearchToken[]>([
  { value: 'tag:client', label: 'tag:client', offset: 4, accessibleLabel: 'client tag' },
  { value: 'is:active', label: 'is:active', offset: 4 },
]);
const bannerTone = signal<'neutral' | 'info' | 'success' | 'warning' | 'danger'>('info');
const toolbarChoice = signal<'list' | 'columns' | 'settings'>('list');
const toolbarFindQuery = signal('');
const toolbarFindOpen = signal(false);
const collapsibleSearchOpen = signal(false);
const toolbarGroupSearchOpen = signal(false);
const adoptionOpen = signal(true);
const adoptionQuery = signal('');
const adoptionTokens = signal<TokenSearchToken[]>([]);
const adoptionReadout = signal('No edits yet');
const ADOPTION_SUGGESTIONS: readonly TokenSearchToken[] = [
  { value: 'status:open', label: 'status:open' },
  { value: 'owner:me', label: 'owner:me' },
  { value: 'due:today', label: 'due:today' },
];
const menuActionCurrent = signal('src/main.ts');
const menuActionPressed = signal(false);
const inspectorSection = signal<'summary' | 'activity' | 'files'>('summary');
const displayDensity = signal<'compact' | 'comfortable' | 'roomy'>('comfortable');
const actionLog = signal('Catalog ready');
const systemDarkTheme = window.matchMedia('(prefers-color-scheme: dark)');
const effectiveTheme = signal<DemoTheme>(preferredDemoTheme(systemDarkTheme.matches));
let explicitTheme: DemoTheme | undefined;
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
  // Both render the same glyph — LucideIcon's two modes differ in semantics, not
  // appearance — so the labels/notes carry the distinction.
  return <div class="kui-catalog-example-stack" data-demo="lucide-icon">
    <CatalogExample label="Decorative" note={<>No name — hidden from assistive technology (<code>aria-hidden</code>).</>} align="glyph">
      {icon(Bell, 'bell')}
    </CatalogExample>
    <CatalogExample label="Meaningful" note={<>Named with a label — announced when the icon carries meaning.</>} align="glyph">
      <LucideIcon icon={Bell} name="notification" label="Notifications ready" />
    </CatalogExample>
  </div>;
}

function DisclosureArrowDemo() {
  return <div class="kui-catalog-example-stack" data-demo="disclosure-arrow">
    <CatalogExample label="Default" note={<>Closed points right, open points down. Toggle to animate.</>} align="glyph">
      <button type="button" class="demo-disclosure-toggle" data-action="toggle-disclosure" aria-expanded={String(disclosureOpen.value)}>
        <DisclosureArrow open={disclosureOpen.value} />
        <span>Details</span>
      </button>
    </CatalogExample>
    <CatalogExample label="Replacement icon" note={<>A replacement glyph, closed left and open up.</>} align="glyph">
      <button type="button" class="demo-disclosure-toggle" data-action="toggle-custom-disclosure" aria-expanded={String(customDisclosureOpen.value)}>
        <DisclosureArrow open={customDisclosureOpen.value} openDirection="up" closedDirection="left" icon={icon(ArrowRight, 'arrow-right')} />
        <span>Preview</span>
      </button>
    </CatalogExample>
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
  const findExpanded = toolbarFindOpen.value || toolbarFindQuery.value.length > 0;
  return <div class="demo-frame" data-demo="toolbar">
    <Toolbar
      label="Document controls"
      className="demo-toolbar-find-row"
      leading={<ToolbarControlGroup appearance="borderless" single><ToolbarText text="Component library" size="large" /></ToolbarControlGroup>}
      center={<ToolbarControlGroup className="demo-toolbar-find" expanded={findExpanded} single={!findExpanded}><TokenSearchField id="toolbar-find" label="Find in workspace" query={toolbarFindQuery.value} collapsible expanded={toolbarFindOpen.value} placeholder="Find in workspace" className="demo-toolbar-find-field" expandLabel="Open find" clearAction="clear-toolbar-find" editorAttributes={{ 'data-demo-toolbar-find': 'true' }} trailing={icon(CircleHelp, 'circle-help')} /></ToolbarControlGroup>}
      trailing={<ToolbarControlGroup label="View controls" buttonAppearance="push"><button type="button" aria-label="Toggle inspector" aria-pressed="true">{icon(SlidersHorizontal, 'sliders-horizontal')}</button><button type="button" aria-label="Settings">{icon(Settings, 'settings')}</button></ToolbarControlGroup>}
    />
    <Toolbar label="Compact toolbar" divider={false} leading={<ToolbarControlGroup appearance="borderless" single><ToolbarText text="Borderless" size="small" /></ToolbarControlGroup>} trailing={<ToolbarControlGroup appearance="borderless" single>{button('Add', 'log-add')}</ToolbarControlGroup>} />
  </div>;
}

function ToolbarControlGroupDemo() {
  return <section class="toolbar-control-group-demo kui-catalog-example-stack" data-demo="toolbar-control-group" aria-label="ToolbarControlGroup demo">
    <CatalogExample label="Segmented choices" align="inline-control"><ToolbarControlGroup><SegmentedControl id="toolbar-view" label="View mode" value={toolbarChoice.value} action="select-segment-demo" appearance="toolbar" shape="pill" size="small" choices={[
      { value: 'list', label: 'List view', content: icon(List, 'list') },
      { value: 'columns', label: 'Columns view', content: icon(Columns3, 'columns-3') },
      { value: 'settings', label: 'Settings view', content: icon(Settings, 'settings') },
    ]} /></ToolbarControlGroup></CatalogExample>
    <CatalogExample label="Popup menu" align="inline-control"><ToolbarControlGroup single>
      <wa-dropdown placement="bottom-start" data-morph-skip-children><wa-button slot="trigger" appearance="plain" with-caret aria-label="Sort tickets">{icon(ArrowDownAZ, 'arrow-down-a-z')}</wa-button><wa-dropdown-item data-action="sort-recent">Recently updated</wa-dropdown-item><wa-dropdown-item data-action="sort-priority">Priority</wa-dropdown-item></wa-dropdown>
    </ToolbarControlGroup></CatalogExample>
    <CatalogExample label="Button group" align="inline-control"><ToolbarControlGroup label="View actions">
      <wa-button appearance="plain" aria-label="Favorite view" data-action="log-favorite">{icon(Star, 'star')}</wa-button>
      <wa-button appearance="plain" aria-label="More actions" data-action="log-more">{icon(MoreHorizontal, 'ellipsis')}</wa-button>
    </ToolbarControlGroup></CatalogExample>
    <CatalogExample label="Single button" align="inline-control"><ToolbarControlGroup single><wa-button appearance="plain" aria-label="Pin view" data-action="log-pin">{icon(Pin, 'pin')}</wa-button></ToolbarControlGroup></CatalogExample>
    <CatalogExample label="Borderless group" align="inline-control"><ToolbarControlGroup appearance="borderless" single><button type="button" aria-label="Show sidebar" data-action="log-sidebar">{icon(PanelLeftOpen, 'panel-left-open')}</button></ToolbarControlGroup></CatalogExample>
    <CatalogExample label="Push button, resting" align="inline-control"><ToolbarControlGroup buttonAppearance="push" single><button type="button" aria-label="Resting comparison" aria-pressed="false" data-action="log-resting">{icon(GitCompare, 'git-compare')}</button></ToolbarControlGroup></CatalogExample>
    <CatalogExample label="Push button, pressed" align="inline-control"><ToolbarControlGroup buttonAppearance="push" single><button type="button" aria-label="Pressed comparison" aria-pressed="true" data-action="log-pressed">{icon(GitCompare, 'git-compare')}</button></ToolbarControlGroup></CatalogExample>
    <CatalogExample label="Dark group" align="inline-control"><ToolbarControlGroup label="Dark navigation" tone="dark"><button type="button" aria-label="Previous" data-action="log-previous">{icon(ChevronLeft, 'chevron-left')}</button><button type="button" aria-label="Next" data-action="log-next">{icon(ChevronRight, 'chevron-right')}</button></ToolbarControlGroup></CatalogExample>
    <CatalogExample label="Collapsible search" note={<>An empty, unfocused search collapses to one iconic control in the group; activating it expands the group to reveal the editor, and it re-collapses when focus leaves while empty. <code>wireTokenSearchFields</code> manages the expand/collapse/focus.</>} align="inline-control"><div class="demo-toolbar-group-search-wrap"><ToolbarControlGroup className="demo-toolbar-group-search" expanded={toolbarGroupSearchOpen.value} single={!toolbarGroupSearchOpen.value}><TokenSearchField id="toolbar-group-search" label="Search views" collapsible expanded={toolbarGroupSearchOpen.value} placeholder="Search views" expandLabel="Open search" /></ToolbarControlGroup></div></CatalogExample>
  </section>;
}

function SegmentedControlDemo() {
  return <section class="segmented-control-demo kui-catalog-example-stack" data-demo="segmented-control" aria-label="SegmentedControl variants">
    <CatalogExample label="Toolbar" note={<>Pill controls share a toolbar group’s chrome.</>} align="inline-control">
      <ToolbarControlGroup><SegmentedControl id="standalone-toolbar-view" label="Toolbar view mode" value={toolbarChoice.value} action="select-segment-demo" appearance="toolbar" shape="pill" size="small" choices={[
        { value: 'list', label: 'List view', content: icon(List, 'list') },
        { value: 'columns', label: 'Columns view', content: icon(Columns3, 'columns-3') },
        { value: 'settings', label: 'Settings view', content: icon(Settings, 'settings') },
      ]} /></ToolbarControlGroup>
    </CatalogExample>
    <CatalogExample label="Rounded rectangle" note={<>An equal-width inspector switcher with labels.</>} align="inline-control">
      <SegmentedControl id="inspector-section" label="Inspector section" value={inspectorSection.value} action="select-segment-demo" shape="rounded" layout="equal" choices={[
        { value: 'summary', label: 'Summary', content: <>{icon(List, 'list')}<span>Summary</span></> },
        { value: 'activity', label: 'Activity', content: <>{icon(Bell, 'bell')}<span>Activity</span></> },
        { value: 'files', label: 'Files', content: <>{icon(Folder, 'folder')}<span>Files</span></> },
      ]} />
    </CatalogExample>
    <CatalogExample label="Pill" note={<>A compact standalone choice with a disabled option.</>} align="inline-control">
      <SegmentedControl id="display-density" label="Display density" value={displayDensity.value} action="select-segment-demo" appearance="outlined" shape="pill" size="small" choices={[
        { value: 'compact', label: 'Compact' },
        { value: 'comfortable', label: 'Comfortable' },
        { value: 'roomy', label: 'Roomy', disabled: true, title: 'Roomy density is unavailable' },
      ]} />
    </CatalogExample>
    <CatalogExample label="Placeholder" note={<>A loading switcher renders inert pill chrome with skeleton labels.</>} align="inline-control">
      <SegmentedControl id="segmented-placeholder" label="Loading view mode" value="" choices={[
        { value: 'list', label: 'List view' },
        { value: 'columns', label: 'Columns view' },
        { value: 'settings', label: 'Settings view' },
      ]} placeholder />
    </CatalogExample>
  </section>;
}

function TokenSearchFieldDemo() {
  return <section class="token-search-demo kui-catalog-example-stack" data-demo="token-search-field" aria-label="TokenSearchField states">
    <CatalogExample label="Structured ticket search" note={<>Text and atomic filters remain in one keyboard-focusable editor.</>} align="inline-control">
      <TokenSearchField id="catalog-search" label="Search tickets" query={tokenSearchQuery.value} tokens={tokenSearchTokens.value} autofocus editorAttributes={{ 'data-demo-token-search': 'true' }} />
      <output aria-live="polite" class="kui-catalog-example__note">{tokenSearchTokens.value.length} filters · {tokenSearchQuery.value || 'No free text'}</output>
    </CatalogExample>
    <CatalogExample label="Collapsible" note={<>Empty and unfocused, it collapses to one iconic action; activating it reveals the editor and focuses it, and it re-collapses when focus leaves while empty. <code>wireTokenSearchFields</code> manages the expand/collapse/focus.</>} align="inline-control">
      <div class="token-search-demo__collapsible"><TokenSearchField id="collapsible-search" label="Find records" collapsible expanded={collapsibleSearchOpen.value} placeholder="Find records" expandLabel="Open find" /></div>
    </CatalogExample>
    <CatalogExample label="Disabled" note={<>Controlled read-only state preserves the complete expression.</>} align="inline-control">
      <TokenSearchField id="disabled-search" label="Saved search" query="release" tokens={[{ value: 'tag:design-system', label: 'tag:design-system', offset: 7 }]} disabled />
    </CatalogExample>
    <CatalogExample label="Adoption knobs" note={<>The <code>wireTokenSearchFields</code> hooks a real app reaches for: opt-in chip keyboard (Backspace/Delete remove the adjacent chip, ArrowRight moves the caret past it), a <code>data-token-search-keep-open</code> suggestions surface that does not collapse the empty field, and an <code>onEdit</code> readout.</>} align="inline-control">
      <div class="token-search-adoption">
        <TokenSearchField id="adoption-search" label="Filter records" collapsible expanded={adoptionOpen.value} query={adoptionQuery.value} tokens={adoptionTokens.value} placeholder="Filter records" tokenPlaceholder="Add a filter…" expandLabel="Open filter" editorAttributes={{ 'data-demo-adoption-search': 'true' }} />
        <ul class="token-search-adoption__suggestions" data-token-search-keep-open aria-label="Filter suggestions">
          {ADOPTION_SUGGESTIONS.map((suggestion) => <li><button type="button" class="token-search-adoption__suggestion" data-action="add-adoption-token" data-token-value={suggestion.value}>{suggestion.label}</button></li>)}
        </ul>
        <output aria-live="polite" class="kui-catalog-example__note" data-demo-adoption-readout>{adoptionReadout.value}</output>
      </div>
    </CatalogExample>
  </section>;
}

function ToolbarTextDemo() {
  return <div class="kui-catalog-example-stack" data-demo="toolbar-text">
    <CatalogExample label="Extra large" align="inline-control"><ToolbarText text="Workspace settings" size="xlarge" /></CatalogExample>
    <CatalogExample label="Large" align="inline-control"><ToolbarText text="Component library" size="large" /></CatalogExample>
    <CatalogExample label="Default" align="inline-control"><ToolbarText text="Saved just now" /></CatalogExample>
    <CatalogExample label="Small" align="inline-control"><ToolbarText text="read-only" size="small" /></CatalogExample>
    <CatalogExample label="Placeholder" note={<>A loading label skeletons its text while keeping its type slot.</>} align="inline-control"><ToolbarText text="" size="large" placeholder /></CatalogExample>
  </div>;
}

function ListDemo() {
  return <div class="demo-list kui-pane" data-demo="list">
    <div class="kui-pane__toolbar"><Toolbar label="Sidebar toolbar" divider={false} leading={<ToolbarControlGroup appearance="borderless" single><ToolbarText text="Workspace" size="small" /></ToolbarControlGroup>} trailing={<ToolbarControlGroup appearance="borderless" single><button type="button" aria-label="Add workspace" data-action="log-add">{icon(Plus, 'plus')}</button></ToolbarControlGroup>} /></div>
    <div class="demo-list__content kui-pane__content kui-content" data-content-stack>
      <section>
        <ListHeader label="Workspace" count={3} countLabel="3 workspaces" action="log-add" actionLabel="Add workspace" actionIcon={icon(Plus, 'plus')} />
        <ListItem action="log-inbox" itemId="inbox" label="Inbox" icon={icon(Inbox, 'inbox')} trailing={<span>12</span>} selected />
        <ListItem action="log-projects" itemId="projects" label="Projects" icon={icon(Folder, 'folder')} />
        <ListItem action="log-drafts" itemId="drafts" label="Drafts without a visible icon" />
      </section>
      <section>
        <ListHeader label="Tools" toggle expanded={menuToolsOpen.value} action="toggle-menu-tools" triggerAttributes={{ 'aria-controls': 'menu-tools-content' }} />
        <div id="menu-tools-content" hidden={!menuToolsOpen.value}>
          <ListItem action="log-settings" label="A multiline item demonstrates content that wraps without clipping" icon={icon(Wrench, 'wrench')} multiline />
          <ListItem action="disabled" label="Unavailable" icon={icon(CircleHelp, 'circle-help')} disabled />
          <div class="kui-content-item" data-content-item><strong>Shared item geometry</strong><p>The child owns its margin, border, and padding.</p></div>
        </div>
      </section>
    </div>
    <div class="kui-pane__footer"><Toolbar label="Sidebar footer" divider={false} leading={<ToolbarControlGroup appearance="borderless" single><ToolbarText text="Ready" size="small" /></ToolbarControlGroup>} trailing={<ToolbarControlGroup appearance="borderless" single><button type="button" aria-label="Sidebar settings" data-action="log-settings">{icon(Settings, 'settings')}</button></ToolbarControlGroup>} /></div>
  </div>;
}

function ListHeaderDemo() {
  return <div class="demo-list-demo kui-catalog-example-stack" data-demo="list-header">
    <CatalogExample align="none"><ListHeader label="Attachments" count={12} countLabel="12 attachments" action="log-add" actionLabel="Add attachment" actionIcon={icon(Plus, 'plus')} triggerAttributes={{ popoverTarget: 'list-header-attachments-popover', popoverTargetAction: 'toggle', 'aria-controls': 'list-header-attachments-popover', 'aria-haspopup': 'dialog' }} /></CatalogExample>
    <CatalogExample align="none"><ListHeader label="Notes" count={0} countLabel="0 notes" /></CatalogExample>
    <CatalogExample align="none"><ListHeader label="Duplicates" count={2} countLabel="2 duplicates" /></CatalogExample>
    <CatalogExample align="none"><ListHeader label="Preview" badge={<span>New</span>} /></CatalogExample>
    <CatalogExample align="none"><ListHeader label="Unavailable" action="log-add" actionLabel="Unavailable action" actionIcon={icon(Plus, 'plus')} actionDisabled /></CatalogExample>
    <CatalogExample align="none"><ListHeader label="Attachments" count={0} countLabel="Loading attachments" placeholder /></CatalogExample>
    <div id="list-header-attachments-popover" class="demo-list-popover" popover="auto" role="dialog" aria-label="Attachment action details">Application-owned popover content.</div>
  </div>;
}

function ListActionRowDemo() {
  return <div class="demo-list-demo kui-catalog-example-stack" data-demo="list-action-row">
    <CatalogExample align="none">
      <ListActionRow
        label="src/main.ts"
        icon={icon(Folder, 'folder')}
        action="select-list-action-row"
        itemId="src/main.ts"
        selected={menuActionCurrent.value === 'src/main.ts'}
        accessibleLabel="Select src/main.ts"
        trailingAction="open-list-action-row-actions"
        trailingActionLabel="Actions for src/main.ts"
        trailingActionIcon={icon(MoreHorizontal, 'more-horizontal')}
        rootAttributes={{ 'data-demo-action-row': 'selected' }}
        trailingActionAttributes={{ popoverTarget: 'list-action-row-popover', popoverTargetAction: 'toggle', 'aria-controls': 'list-action-row-popover', 'aria-haspopup': 'dialog', 'data-demo-trailing-action': 'selected' }}
      />
    </CatalogExample>
    <CatalogExample align="none">
      <ListActionRow
        label="packages/application/src/components/a-long-file-name-that-wraps-at-narrow-width.tsx"
        icon={icon(Folder, 'folder')}
        action="toggle-list-action-row"
        itemId="long-file"
        pressed={menuActionPressed.value}
        accessibleLabel="Select long file"
        multiline
        trailingAction="open-list-action-row-actions"
        trailingActionLabel="Actions for long file"
        trailingActionIcon={icon(MoreHorizontal, 'more-horizontal')}
        rootAttributes={{ 'data-demo-action-row': 'multiline' }}
      />
    </CatalogExample>
    <CatalogExample align="none">
      <ListActionRow label="Unavailable primary" action="select-list-action-row" itemId="disabled-primary" selected={menuActionCurrent.value === 'disabled-primary'} disabled trailingAction="open-list-action-row-actions" trailingActionLabel="Actions for unavailable primary" trailingActionIcon={icon(MoreHorizontal, 'more-horizontal')} rootAttributes={{ 'data-demo-action-row': 'disabled-primary' }} />
    </CatalogExample>
    <CatalogExample align="none">
      <ListActionRow label="Unavailable trailing action" action="select-list-action-row" itemId="disabled-trailing" selected={menuActionCurrent.value === 'disabled-trailing'} trailingAction="open-list-action-row-actions" trailingActionLabel="Unavailable actions" trailingActionIcon={icon(MoreHorizontal, 'more-horizontal')} trailingActionDisabled trailingActionTitle="Actions unavailable" rootAttributes={{ 'data-demo-action-row': 'disabled-trailing' }} />
    </CatalogExample>
    <CatalogExample align="none">
      <ListActionRow label="Loading file" icon={icon(Folder, 'folder')} action="select-list-action-row" itemId="placeholder" placeholder trailingAction="open-list-action-row-actions" trailingActionLabel="Actions" trailingActionIcon={icon(MoreHorizontal, 'more-horizontal')} rootAttributes={{ 'data-demo-action-row': 'placeholder' }} />
    </CatalogExample>
    <div id="list-action-row-popover" class="demo-list-popover" popover="auto" role="dialog" aria-label="File actions"><button type="button" data-action="log-more">Open details</button></div>
  </div>;
}

function ListItemDemo() {
  return <div class="demo-list-demo kui-catalog-example-stack" data-demo="list-item">
    <CatalogExample align="none"><ListItem action="log-inbox" itemId="selected" label="Selected item" icon={icon(Inbox, 'inbox')} trailing={<span>12</span>} selected rootAttributes={{ 'data-demo-drop-status': 'ready' }} /></CatalogExample>
    <CatalogExample align="none"><ListItem action="log-projects" itemId="default" label="Default item" icon={icon(Folder, 'folder')} /></CatalogExample>
    <CatalogExample align="none"><ListItem action="log-settings" itemId="multiline" label="A multiline item demonstrates content that wraps without clipping" icon={icon(Wrench, 'wrench')} multiline /></CatalogExample>
    <CatalogExample align="none"><ListItem action="disabled" itemId="disabled" label="Unavailable item" icon={icon(CircleHelp, 'circle-help')} disabled /></CatalogExample>
    <CatalogExample align="none"><ListItem action="log-projects" itemId="placeholder" label="Loading item" icon={icon(Folder, 'folder')} trailing={<span>0</span>} placeholder /></CatalogExample>
  </div>;
}

function TabsDemo() {
  const extensionAttributes = {
    'data-demo-tab-source': 'workspace',
    'data-Action': 'unsafe-root-action',
    'data-Tab-Id': 'unsafe-tab-id',
    'data-Tab-Dragging': 'true',
    'data-Tab-Drop-Position': 'before',
    role: 'menuitem',
  };
  return <div class="demo-tabs kui-catalog-example-stack" data-demo="tabs">
    <CatalogExample align="none"><TabBar id="focused-app-tabs" label="Open documents">
      {(['library', 'guidelines', 'catalog'] as const).map((id) => <AppTab id={id} name={id[0]!.toUpperCase() + id.slice(1)} selected={activeTab.value === id} closable={id !== 'library'} leading={id === 'library' ? icon(PanelLeft, 'panel-left') : undefined} closeIcon={id === 'guidelines' ? icon(X, 'custom-tab-close') : undefined} rootAttributes={id === 'guidelines' ? extensionAttributes : undefined} />)}
    </TabBar></CatalogExample>
    <CatalogExample align="none"><TabBar id="placeholder-app-tabs" label="Loading documents">
      {(['first', 'second', 'third'] as const).map((id) => <AppTab id={id} name="" closable={id !== 'first'} placeholder />)}
    </TabBar></CatalogExample>
  </div>;
}

function TabBarDemo() {
  return <div class="demo-tab-bar-frame kui-catalog-example-stack" data-demo="tab-bar">
    <CatalogExample align="none"><TabBar id="catalog-tabs" label="Open catalog pages" leading={<ToolbarControlGroup appearance="borderless" single><button type="button" aria-label="Show navigation" data-action="log-sidebar">{icon(PanelLeft, 'panel-left')}</button></ToolbarControlGroup>} trailing={<ToolbarControlGroup appearance="borderless" single><button type="button" aria-label="Add tab" data-action="add-demo-tab">{icon(Plus, 'plus')}</button></ToolbarControlGroup>}>
      {tabBarTabs.value.map((tab) => <AppTab id={tab.id} name={tab.name} selected={tabBarActive.value === tab.id} draggable selectAction="select-reorder-tab" closeAction="close-reorder-tab" rootAttributes={{ 'data-demo-tab-id': tab.id }} />)}
    </TabBar>
    <p class="kui-catalog-example__note">Order: <strong data-tab-order>{tabBarTabs.value.map((tab) => tab.name).join(' · ')}</strong></p></CatalogExample>
  </div>;
}

function HeadersDemo() {
  // One PanelHeader as a page title (no icon), one as a panel/dialog heading
  // (icon + subtitle), each owning its own row — no extra card chrome.
  return <div class="demo-frame" data-demo="headers">
    <PanelHeader title="UI foundations" titleId="headers-page-title" actions={button('New pattern', 'log-add')} />
    <PanelHeader title="Package details" titleId="headers-panel-title" summary="Production-backed primitives with explicit contracts." summaryId="headers-panel-summary" icon={icon(Wrench, 'wrench')} actions={button('Done', 'log-done')} />
    <div class="kui-content"><ValueTable label="Package metadata"><ValueTableRow label="Package" value="@kerfjs/ui" /><ValueTableRow label="Rendering" value="Kerf SafeHtml" /><ValueTableRow label="Styles" value="Explicit CSS subpaths" /></ValueTable></div>
  </div>;
}

function PanelHeaderDemo() {
  return <div class="kui-catalog-example-stack" data-demo="panel-header">
    <CatalogExample label="Page title (h1 heading)" note={<>Pass <code>headingLevel</code> for a page/view title so it is a real heading landmark (<code>role="heading"</code> + <code>aria-level</code>).</>} align="none"><PanelHeader title="UI foundations" titleId="panel-page-title" headingLevel={1} actions={button('New pattern', 'log-add')} /></CatalogExample>
    <CatalogExample label="Panel heading with icon and subtitle" note={<>A dialog/panel title omits <code>headingLevel</code> and is instead referenced by <code>aria-labelledby</code> pointing at its <code>titleId</code>.</>} align="none"><PanelHeader title="Package details" titleId="panel-standalone-title" summary="Production-backed primitives with explicit contracts." summaryId="panel-standalone-summary" icon={icon(Wrench, 'wrench')} actions={button('Done', 'log-done')} /></CatalogExample>
    <CatalogExample label="Placeholder" note={<>While a record loads, the header keeps its chrome and skeletons the title and subtitle.</>} align="none"><PanelHeader title="Package details" titleId="panel-placeholder-title" summary="Production-backed primitives with explicit contracts." summaryId="panel-placeholder-summary" icon={icon(Wrench, 'wrench')} placeholder /></CatalogExample>
  </div>;
}

function ValueTableDemo() {
  return <div class="demo-value-table kui-catalog-example-stack" data-demo="value-table">
    <CatalogExample label="Populated" align="none"><ValueTable label="Package metadata"><ValueTableRow label="Package" value="@kerfjs/ui" /><ValueTableRow label="Rendering" value="Kerf SafeHtml" icon={icon(Wrench, 'wrench')} /><ValueTableRow label="Styles" value="Explicit CSS subpaths" /></ValueTable></CatalogExample>
    <CatalogExample label="Placeholder" note={<>Rows accept <code>placeholder</code> to skeleton their values while a record loads.</>} align="none"><ValueTable label="Loading metadata"><ValueTableRow label="Package" value="" placeholder /><ValueTableRow label="Rendering" value="" icon={icon(Wrench, 'wrench')} placeholder /><ValueTableRow label="Styles" value="" placeholder /></ValueTable></CatalogExample>
  </div>;
}

function ResizeDemo() {
  return <div class="demo-resize-shell" data-demo="resize" data-demo-overlay-skip>
    <ResizableRegion id="catalog-panel" label="Catalog panel" size={regionSize.value} min={180} max={420} handleIcon={icon(GripVertical, 'custom-resize-handle')}><div class="demo-resize-panel kui-pane"><div class="demo-resize-panel__copy kui-content-item"><strong>Resizable panel</strong><span>Use the handle with a pointer, arrow keys, Home, or End.</span></div></div></ResizableRegion>
  </div>;
}

function SelectDemo() {
  return <div class="demo-control-stack kui-catalog-example-stack" data-demo="select">
    <CatalogExample label="Rendering balance" align="inline-control">
      <Select name="rendering-balance" value={selectedChoice.value} ariaLabel="Rendering balance" choices={[
        { value: 'quiet', label: 'Quiet', icon: Bell, iconName: 'bell', group: 'Attention' },
        { value: 'balanced', label: 'Balanced', icon: SlidersHorizontal, iconName: 'sliders-horizontal', group: 'Attention' },
        { value: 'explicit', label: 'Explicit', icon: Wrench, iconName: 'wrench', group: 'Control', separatorBefore: true },
      ]} renderSelected={(choice) => <span class="demo-select-selected">{choice.icon ? <LucideIcon icon={choice.icon} name={choice.iconName ?? choice.label.toLowerCase().replaceAll(' ', '-')} /> : null}<span>{choice.label}</span></span>} />
      <p class="kui-catalog-example__note">Live value: <strong data-select-value>{selectedChoice.value}</strong></p>
    </CatalogExample>
    <CatalogExample label="Placeholder" note={<>Loading renders a static, inert box in place of the interactive control.</>} align="inline-control">
      <Select name="select-placeholder" value="" label="Rendering balance" ariaLabel="Rendering balance" choices={[]} placeholder />
    </CatalogExample>
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
  return <div class="demo-state-banner-grid kui-catalog-example-stack" data-demo="state-banner">
    {specimens.map(({ tone, title }) => <CatalogExample label={tone} align="none"><StateBanner tone={tone} urgency={tone === 'danger' ? 'alert' : 'status'} title={title} detail="Semantic defaults remain overridable." icon={tone === 'danger' ? icon(CircleHelp, 'circle-help') : icon(Check, 'check')} action={button('Act', `log-${tone}`)} /></CatalogExample>)}
    <CatalogExample label="Scoped override" align="none"><StateBanner className="demo-state-banner--override" tone="info" title="Consumer palette" detail="Only this instance uses the override." icon={icon(Check, 'check')} /></CatalogExample>
    <CatalogExample label="Placeholder" align="none"><StateBanner tone="neutral" title="" detail="" placeholder /></CatalogExample>
  </div>;
}

function EmptyStateDemo() {
  return <div class="kui-catalog-example-stack" data-demo="empty-state">
    <CatalogExample label="Actionable" note={<>An empty state that offers a recovery action.</>} align="none"><EmptyState title="Nothing here yet" detail="Create the first item when you are ready." icon={icon(Search, 'search')} action={button('Create item', 'log-add')} /></CatalogExample>
    <CatalogExample label="Busy" note={<>A busy state; the current view stays stable while loading.</>} align="none"><EmptyState title="Loading items" detail="The current view will remain stable." busy /></CatalogExample>
  </div>;
}

function LoadingSpinnerDemo() {
  return <div class="kui-catalog-example-stack" data-demo="loading-spinner">
    <CatalogExample label="Meaningful" note={<>Exposes its supplied label to assistive technology.</>} align="glyph"><LoadingSpinner label="Loading preview" /></CatalogExample>
    <CatalogExample label="Decorative" note={<>No label — hidden from assistive technology.</>} align="glyph"><LoadingSpinner /></CatalogExample>
  </div>;
}

function LayoutDemo() {
  return <div class="demo-layout kui-pane" data-demo="layout">
    <PanelHeader title="Semantic layout" titleId="layout-title" actions={button('New item', 'log-add')} />
    <section class="kui-pane__content kui-content">
      <div class="demo-layout__surface kui-content-item"><strong>One owner per item</strong><p>Each content child owns its margin, border, background, padding, and radius.</p></div>
      <div class="demo-layout__actions kui-control-cluster">{button('Primary action', 'log-add')}{button('Secondary action', 'log-more')}</div>
      <div class="kui-inline-metadata kui-content-item"><span>24px major rhythm</span><span>·</span><span>8px internal rhythm</span></div>
    </section>
  </div>;
}

function SkeletonDemo() {
  return <div class="kui-catalog-example-stack" data-demo="skeleton">
    <CatalogExample label="Primitive" note={<>Subtle, unanimated blocks that hold a value's space. Decorative unless labeled.</>} align="glyph">
      <div class="demo-skeleton-blocks">
        <Skeleton width="12em" />
        <Skeleton width="8em" height="1.5em" />
        <Skeleton lines={3} />
        <Skeleton width="6em" label="Loading value" />
      </div>
    </CatalogExample>
    <section class="kui-catalog-example" data-align="none" data-demo-overlay-skip><ListHeader label="In composition" /><p class="kui-catalog-example__note">Value-bearing components accept a <code>placeholder</code> prop that renders their real chrome with skeleton value slots. See the <strong>Loading inspector</strong> recipe for a full composition.</p>
      <ValueTable label="Placeholder rows"><ValueTableRow label="Status" value="" placeholder /><ValueTableRow label="Owner" value="" placeholder /></ValueTable>
    </section>
  </div>;
}

const demos: Record<Exclude<KerfCatalogId, RecipeId>, () => ReturnType<typeof ToolbarDemo>> = {
  'lucide-icon': LucideIconDemo,
  'disclosure-arrow': DisclosureArrowDemo,
  'webawesome-theme': WebAwesomeThemeDemo,
  layout: LayoutDemo,
  toolbar: ToolbarDemo,
  'toolbar-control-group': ToolbarControlGroupDemo,
  'segmented-control': SegmentedControlDemo,
  'token-search-field': TokenSearchFieldDemo,
  'toolbar-text': ToolbarTextDemo,
  list: ListDemo,
  'list-header': ListHeaderDemo,
  'list-action-row': ListActionRowDemo,
  'list-item': ListItemDemo,
  tabs: TabsDemo,
  'tab-bar': TabBarDemo,
  headers: HeadersDemo,
  'panel-header': PanelHeaderDemo,
  'value-table': ValueTableDemo,
  resize: ResizeDemo,
  select: SelectDemo,
  feedback: FeedbackDemo,
  'state-banner': StateBannerDemo,
  'empty-state': EmptyStateDemo,
  'loading-spinner': LoadingSpinnerDemo,
  skeleton: SkeletonDemo,
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
  const needsWebAwesome = selected.source === 'webawesome' || selected.id === 'webawesome-theme' || selected.id === 'toolbar-control-group';
  if (needsWebAwesome && !webAwesomeReady.value) {
    void ensureWebAwesomeDemos();
    return <LoadingSpinner label={`Loading ${selected.name} preview`} />;
  }
  if (selected.source === 'webawesome') return webAwesomeDemos![selected.id as WebAwesomeCatalogId]();
  return demos[selectedDemo.value as Exclude<KerfCatalogId, RecipeId>]();
}

// Project the ux-demo's rich catalog entries onto the shipped Catalog's shapes so
// the reusable shell renders the sidebar, resources footer, and related selector.
function toCatalogResources(entry: CatalogEntry): CatalogResource[] {
  const resources: CatalogResource[] = [{ label: 'Demo source', href: catalogRepositoryHref(entry.demoSource), detail: entry.demoSource }];
  if (entry.componentSource) resources.push({ label: 'Component source', href: catalogRepositoryHref(entry.componentSource), detail: entry.componentSource });
  resources.push({ label: entry.source === 'webawesome' ? 'Integration guidance' : 'Guidance', href: catalogRepositoryHref(entry.documentation), detail: entry.documentation });
  return resources;
}
function toCatalogRelated(entry: CatalogEntry): CatalogRelated[] {
  const uses = (entry.uses ?? []).map(findCatalogEntry).filter((related): related is CatalogEntry => Boolean(related)).map((related) => ({ id: related.id, name: related.name, group: 'Uses' }));
  const usedBy = catalogEntriesUsing(entry.id).map((related) => ({ id: related.id, name: related.name, group: 'Used by' }));
  return [...uses, ...usedBy];
}
function toKuiSections(sections: readonly { category: string; entries: readonly CatalogEntry[] }[]): KuiCatalogSection[] {
  return sections.map((section) => ({
    category: section.category,
    entries: section.entries.map((entry) => ({ id: entry.id, name: entry.name, description: entry.description, resources: toCatalogResources(entry), related: toCatalogRelated(entry) })),
  }));
}
const kuiCatalogSections = toKuiSections(catalogSections);
const kuiWebAwesomeSections = toKuiSections(webAwesomeCatalogSections);

function selectDemo(id: string): void {
  if (!isCatalogId(id)) return;
  const selected = findCatalogEntry(id)!;
  if (selected.source === 'webawesome' || selected.id === 'webawesome-theme') void ensureWebAwesomeDemos();
  if (isRecipeId(selected.id)) void ensureRecipe(selected.id);
  selectedDemo.value = id;
  recipeNotesVisible.value = false;
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
  const isRecipe = selected.kind === 'recipe';
  const statusLabel = selected.source === 'webawesome' ? 'Web Awesome component · Kerf theme' : selected.kind === 'component' ? 'Kerf first-class component · production CSS' : 'Kerf composition · production CSS';
  return <Catalog
    className="demo-catalog"
    brand={{ title: 'Kerf', subtitle: 'UI components', logoUrl: kerfLogoUrl }}
    sections={kuiCatalogSections}
    secondarySections={{ label: 'Web Awesome', collapsible: true, expanded: webAwesomeExpanded.value, sections: kuiWebAwesomeSections }}
    active={selectedDemo.value}
    collapsed={sidebarCollapsed.value}
    theme={effectiveTheme.value === 'dark' ? 'dark' : 'light'}
    selectAction="select-demo"
    toggleSidebarAction="toggle-catalog-sidebar"
    toggleThemeAction="toggle-theme"
    toggleSecondaryAction="toggle-webawesome-catalog"
    headerActions={<>{isRecipe ? <ToolbarControlGroup appearance="borderless" single buttonAppearance="push"><button type="button" data-action="toggle-recipe-notes" aria-label={recipeNotesVisible.value ? 'Hide recipe notes' : 'Show recipe notes'} aria-pressed={String(recipeNotesVisible.value)}>{icon(StickyNote, 'sticky-note')}</button></ToolbarControlGroup> : <></>}<ToolbarControlGroup className="catalog-settings" label="Catalog display settings"><button type="button" data-action="toggle-contrast" aria-pressed={String(increasedContrast.value)}>{icon(Contrast, 'contrast')}<span>Contrast</span></button><button type="button" data-action="toggle-motion" aria-pressed={String(reducedMotion.value)}>{icon(ZapOff, 'zap-off')}<span>Reduce motion</span></button></ToolbarControlGroup></>}
    status={<><output class="catalog-log" aria-live="polite">{actionLog.value}</output>{selected.id === 'resize' ? <span class="catalog-footer__metric"><span>Committed width</span><strong data-region-size>{regionSize.value}px</strong></span> : <></>}<span>{statusLabel}</span></>}
    content={<div class="demo-stage-inner" data-demo-mode={selected.source === 'kerf' && selected.kind === 'component' ? 'component' : 'composition'} data-recipe-notes-visible={String(isRecipe && recipeNotesVisible.value)}><Stage /><div class="demo-overlay" data-demo-overlay data-morph-skip-children aria-hidden="true" /></div>}
  />;
});

if (findCatalogEntry(initialDemo)?.source === 'webawesome') revealSelectedSidebarItem(initialDemo, 'center');

const stopActions = delegateActions(app, 'click', {
  'toggle-disclosure': () => { disclosureOpen.value = !disclosureOpen.value; actionLog.value = disclosureOpen.value ? 'Disclosure opened' : 'Disclosure closed'; },
  'toggle-menu-tools': () => { menuToolsOpen.value = !menuToolsOpen.value; actionLog.value = menuToolsOpen.value ? 'Tools opened' : 'Tools closed'; },
  'toggle-custom-disclosure': () => { customDisclosureOpen.value = !customDisclosureOpen.value; actionLog.value = customDisclosureOpen.value ? 'Custom disclosure opened' : 'Custom disclosure closed'; },
  'recipe-action': (_event, element) => {
    const id = selectedDemo.value;
    if (!isRecipeId(id)) return;
    const target = element as HTMLElement;
    recipeControllers.get(id)?.action(target.dataset.recipeCommand ?? '', target);
  },
  'toggle-recipe-notes': () => { recipeNotesVisible.value = !recipeNotesVisible.value; actionLog.value = recipeNotesVisible.value ? 'Recipe notes shown' : 'Recipe notes hidden'; },
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
  'add-demo-tab': () => { const tabNumber = nextDemoTabNumber++; const id = `new-${tabNumber}`; tabBarTabs.value = [...tabBarTabs.value, { id, name: `New tab ${tabNumber}` }]; tabBarActive.value = id; actionLog.value = `Added ${id}`; },
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
  'add-adoption-token': (_event, element) => {
    // Clicking a suggestion in the data-token-search-keep-open surface must not
    // collapse the empty field — the wire helper's keep-open exception guards it.
    const value = element.getAttribute('data-token-value');
    const suggestion = ADOPTION_SUGGESTIONS.find((candidate) => candidate.value === value);
    if (!suggestion || adoptionTokens.value.some((token) => token.value === value)) return;
    adoptionTokens.value = [...adoptionTokens.value, { ...suggestion, offset: adoptionQuery.value.length }];
    adoptionReadout.value = `Added ${suggestion.value} · ${adoptionTokens.value.length} filters`;
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-demo-adoption-search="true"]')?.focus());
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
  'clear-toolbar-find': (_event, element) => {
    const editor = element.closest('[data-component="token-search-field"]')?.querySelector<HTMLElement>('[data-token-search-editor]');
    if (editor) editor.textContent = '';
    batch(() => {
      toolbarFindOpen.value = true;
      toolbarFindQuery.value = '';
    });
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('[data-demo-toolbar-find="true"]')?.focus();
    });
    actionLog.value = 'Find cleared';
  },
  'cycle-tone': () => { const tones = ['neutral', 'info', 'success', 'warning', 'danger'] as const; bannerTone.value = tones[(tones.indexOf(bannerTone.value) + 1) % tones.length]!; actionLog.value = `Banner tone: ${bannerTone.value}`; },
  'toggle-contrast': () => { increasedContrast.value = !increasedContrast.value; document.documentElement.classList.toggle('demo-contrast', increasedContrast.value); actionLog.value = increasedContrast.value ? 'Increased contrast on' : 'Increased contrast off'; },
  'toggle-motion': () => { reducedMotion.value = !reducedMotion.value; document.documentElement.classList.toggle('demo-reduced-motion', reducedMotion.value); actionLog.value = reducedMotion.value ? 'Reduced motion on' : 'Reduced motion off'; },
  'log-add': () => { actionLog.value = 'Add action requested'; },
  'log-inbox': () => { actionLog.value = 'Inbox selected'; },
  'log-projects': () => { actionLog.value = 'Projects selected'; },
  'log-drafts': () => { actionLog.value = 'Drafts selected'; },
  'log-settings': () => { actionLog.value = 'Settings selected'; },
  'select-list-action-row': (_event, element) => { const itemId = (element as HTMLElement).dataset.itemId ?? ''; menuActionCurrent.value = itemId; actionLog.value = `${itemId} selected`; },
  'toggle-list-action-row': (_event, element) => { const itemId = (element as HTMLElement).dataset.itemId ?? ''; menuActionPressed.value = !menuActionPressed.value; actionLog.value = `${itemId} ${menuActionPressed.value ? 'pressed' : 'not pressed'}`; },
  'open-list-action-row-actions': (_event, element) => { actionLog.value = `Actions requested for ${(element as HTMLElement).dataset.itemId ?? 'row'}`; },
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

const stopCatalog = wireCatalog(app, {
  onSelect: (id) => selectDemo(id),
  onToggleSidebar: () => {
    sidebarCollapsed.value = !sidebarCollapsed.value;
    actionLog.value = sidebarCollapsed.value ? 'Component catalog collapsed' : 'Component catalog expanded';
    window.requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[aria-label="${sidebarCollapsed.value ? 'Expand' : 'Collapse'} Kerf catalog"]`)?.focus());
  },
  onToggleTheme: () => {
    explicitTheme = oppositeDemoTheme(effectiveTheme.value);
    applyDemoTheme(document.documentElement, explicitTheme);
    effectiveTheme.value = explicitTheme;
    actionLog.value = `${explicitTheme === 'dark' ? 'Dark' : 'Light'} theme on`;
  },
  onToggleSecondary: () => { webAwesomeExpanded.value = !webAwesomeExpanded.value; actionLog.value = webAwesomeExpanded.value ? 'Web Awesome catalog expanded' : 'Web Awesome catalog collapsed'; },
  selectAction: 'select-demo',
  toggleSidebarAction: 'toggle-catalog-sidebar',
  toggleThemeAction: 'toggle-theme',
  toggleSecondaryAction: 'toggle-webawesome-catalog',
});
const stopResize = wireResizableRegions(app, { onCommit: ({ id, size }) => {
  if (id.startsWith('recipe-') && isRecipeId(selectedDemo.value)) recipeControllers.get(selectedDemo.value)?.resize?.(id, size);
  else { regionSize.value = size; actionLog.value = `Panel resized to ${size}px`; }
} });
const stopSelect = delegate(app, 'change', 'wa-select', (_event, element) => {
  const value = (element as HTMLElement & { value?: string }).value;
  if (value === 'quiet' || value === 'balanced' || value === 'explicit') selectedChoice.value = value;
});
// Wire the active recipe's NavStack (slide animation + back control). The
// nav-stack element persists across pushes/pops, so we only re-wire when the
// selected recipe (or its freshly-loaded controller) changes.
const overlayCanvas = app.querySelector<HTMLElement>('.kui-catalog__canvas');
const overlayLayer = app.querySelector<HTMLElement>('[data-demo-overlay]');
const componentOverlay = overlayCanvas && overlayLayer ? createComponentOverlay(overlayCanvas, overlayLayer) : null;
const stopOverlayEffect = effect(() => {
  void recipeRevision.value;
  void effectiveTheme.value;
  const id = selectedDemo.value;
  window.requestAnimationFrame(() => {
    const entry = findCatalogEntry(id);
    componentOverlay?.update(entry?.source === 'kerf' && entry.kind === 'component');
  });
});
let stopRecipeNav: (() => void) | null = null;
const stopRecipeNavEffect = effect(() => {
  void recipeRevision.value;
  const id = selectedDemo.value;
  window.requestAnimationFrame(() => {
    stopRecipeNav?.();
    stopRecipeNav = null;
    if (!isRecipeId(id)) return;
    const controller = recipeControllers.get(id);
    const canvas = document.querySelector<HTMLElement>('.kui-catalog__canvas');
    if (controller && canvas?.querySelector('[data-component="nav-stack"]')) {
      stopRecipeNav = wireNavStack(canvas, { onBack: () => controller.action('nav-back', canvas) });
    }
  });
});
// Wire the active recipe's own imperative helpers (e.g. `wireSidebar` for the
// collapsible-sidebar recipe: toggle, focus, compact overlay, persistence). Like
// the nav-stack wiring, the recipe root persists across the recipe's own state
// changes, so we only re-wire when the selected recipe (or its freshly-loaded
// controller) changes.
let stopRecipeWire: (() => void) | null = null;
const stopRecipeWireEffect = effect(() => {
  void recipeRevision.value;
  const id = selectedDemo.value;
  window.requestAnimationFrame(() => {
    stopRecipeWire?.();
    stopRecipeWire = null;
    if (!isRecipeId(id)) return;
    const controller = recipeControllers.get(id);
    const canvas = document.querySelector<HTMLElement>('.kui-catalog__canvas');
    if (controller?.wire && canvas) stopRecipeWire = controller.wire(canvas);
  });
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
const stopToolbarFind = delegate(app, 'input', '[data-demo-toolbar-find="true"]', (_event, element) => {
  toolbarFindQuery.value = readTokenSearchField(element as HTMLElement).query;
});
// The collapsible fields' expand/collapse/focus is managed by the wire helper (on by
// default). The app only adopts each field's open signal so the render reflects it;
// the standalone collapsible field tracks no query — the helper reads live DOM.
const stopTokenSearchSubmits = wireTokenSearchFields(app, {
  onSubmit: ({ id }) => {
    actionLog.value = id === 'toolbar-find' ? 'Find submitted' : 'Search submitted';
  },
  collapsible: { signals: { 'toolbar-find': toolbarFindOpen, 'collapsible-search': collapsibleSearchOpen, 'toolbar-group-search': toolbarGroupSearchOpen, 'adoption-search': adoptionOpen } },
});
// The opt-in chip keyboard + onEdit are demonstrated ONLY on the adoption-knobs
// field, so wire a second helper scoped to that field's container (the app-wide
// helper above stays keyboard-free, leaving the other token-search demos on their
// browser-removal + caret-restore path). Collapse stays owned by the app-wide
// helper; this scoped one only adds the keyboard + onEdit hooks.
let stopAdoptionKeyboard: (() => void) | null = null;
const stopAdoptionKeyboardEffect = effect(() => {
  const id = selectedDemo.value;
  window.requestAnimationFrame(() => {
    stopAdoptionKeyboard?.();
    stopAdoptionKeyboard = null;
    if (id !== 'token-search-field') return;
    const container = app.querySelector<HTMLElement>('.token-search-adoption');
    if (!container) return;
    stopAdoptionKeyboard = wireTokenSearchFields(container, {
      collapsible: false,
      onEdit: ({ editor }) => {
        const value = readTokenSearchField(editor, adoptionTokens.value);
        adoptionQuery.value = value.query;
        adoptionReadout.value = `Editing: ${value.query ? `"${value.query}"` : 'empty'} · ${adoptionTokens.value.length} filters`;
      },
      keyboard: {
        onRemoveToken: ({ value, direction }) => {
          adoptionTokens.value = adoptionTokens.value.filter((token) => token.value !== value);
          adoptionReadout.value = `Removed ${value} · ${adoptionTokens.value.length} filters`;
          actionLog.value = `Removed ${value} (${direction === 'backward' ? 'Backspace' : 'Delete'})`;
        },
      },
    });
  });
});
const stopListItemDragOver = delegate(app, 'dragover', '[data-demo-drop-status="ready"]', (event, element) => {
  event.preventDefault();
  (element as HTMLElement).dataset.demoDropStatus = 'over';
  app.querySelector<HTMLOutputElement>('.catalog-log')?.replaceChildren('Drop target ready');
});
const stopListItemDrop = delegate(app, 'drop', '[data-demo-drop-status="over"]', (event, element) => {
  event.preventDefault();
  actionLog.value = `Dropped on ${(element as HTMLElement).dataset.itemId ?? 'menu item'}`;
});
const stopListActionRowDoubleClick = delegate(app, 'dblclick', '[data-component="list-action-row"] > [data-action="select-list-action-row"]', (_event, element) => {
  actionLog.value = `Double-clicked ${(element as HTMLElement).dataset.itemId ?? 'row'} primary`;
});
const stopListActionRowContextMenu = delegate(app, 'contextmenu', '[data-component="list-action-row"] > [data-action="select-list-action-row"]', (event, element) => {
  event.preventDefault();
  actionLog.value = `Context menu for ${(element as HTMLElement).dataset.itemId ?? 'row'} primary`;
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
const stopTabBars = wireTabBars(app, { onReorder: ({ barId, sourceId, targetId, position, source }) => { tabBarTabs.value = reorderTabs(tabBarTabs.value, (tab) => tab.id, sourceId, targetId, position); actionLog.value = `${source === 'pointer' ? 'Dragged' : 'Moved'} ${sourceId} ${position} ${targetId} in ${barId}`; } });
const syncSystemTheme = (event: MediaQueryListEvent): void => {
  if (!explicitTheme) effectiveTheme.value = preferredDemoTheme(event.matches);
};
systemDarkTheme.addEventListener('change', syncSystemTheme);

window.addEventListener('pagehide', () => { stopActions(); stopCatalog(); stopResize(); stopSelect(); componentOverlay?.dispose(); stopOverlayEffect(); stopRecipeNav?.(); stopRecipeNavEffect(); stopRecipeWire?.(); stopRecipeWireEffect(); stopRecipeChanges(); stopRecipeInputs(); stopRecipeDialogs(); stopTokenSearch(); stopToolbarFind(); stopTokenSearchSubmits(); stopAdoptionKeyboard?.(); stopAdoptionKeyboardEffect(); stopListItemDragOver(); stopListItemDrop(); stopListActionRowDoubleClick(); stopListActionRowContextMenu(); stopAnimationSelects(); stopAnimationRanges(); stopAnimationEvents.forEach((dispose) => dispose()); stopIntersectionObserver(); stopMutationObserver(); stopResizeObserver(); stopTabBars(); systemDarkTheme.removeEventListener('change', syncSystemTheme); }, { once: true });
