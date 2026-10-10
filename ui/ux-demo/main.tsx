import '@kerfjs/ui/surface-scaffold/register';
import '@kerfjs/ui/document.css';
import '@kerfjs/ui/help-tags/register';
import '@kerfjs/ui/popup-menu/register';
import '@kerfjs/ui/select/register';
import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/catalog.css';
import '@kerfjs/ui/webawesome.css';
import './style.css';

import {
  openAnchoredSurface,
  openAnchoredSurfaceAt,
} from '@kerfjs/ui/anchored-surface';
import {
  Catalog,
  type CatalogBackgroundStyle,
  CatalogExample,
  CatalogExampleStack,
  type CatalogRelated,
  type CatalogSection as KuiCatalogSection,
} from '@kerfjs/ui/catalog';
import { catalogResources } from '@kerfjs/ui/catalog-resources';
import { LoadingSpinner } from '@kerfjs/ui/loading-spinner';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { openPopupMenuAt, type PopupMenuElement } from '@kerfjs/ui/popup-menu';
import { Text } from '@kerfjs/ui/text';
import { readTokenSearchField } from '@kerfjs/ui/token-search-field';
import {
  ToolbarActionLink,
  ToolbarControlGroup,
} from '@kerfjs/ui/toolbar-control-group';
import { revealCatalogEntry, wireCatalog } from '@kerfjs/ui/wire-catalog';
import {
  isContentItemActivation,
  wireContentItems,
} from '@kerfjs/ui/wire-content-items';
import { wireNavStack } from '@kerfjs/ui/wire-nav-stack';
import { wireResizableRegions } from '@kerfjs/ui/wire-resizable-regions';
import { wireSidebar } from '@kerfjs/ui/wire-sidebar';
import { reorderTabs, wireTabBars } from '@kerfjs/ui/wire-tab-bars';
import { wireTabNavigator } from '@kerfjs/ui/wire-tab-navigator';
import { wireTokenSearchFields } from '@kerfjs/ui/wire-token-search-fields';
import { wireToolbarVisibility } from '@kerfjs/ui/wire-toolbar-visibility';
import { wireWorkbench } from '@kerfjs/ui/wire-workbench';
import {
  batch,
  delegate,
  delegateCapture,
  effect,
  mount,
  signal,
} from 'kerfjs';
import { delegateActions } from 'kerfjs/actions';
import { Scan, StickyNote } from 'lucide';

import {
  catalog,
  catalogEntriesUsing,
  type CatalogEntry,
  type CatalogId,
  catalogRepositoryHref,
  catalogSections,
  findCatalogEntry,
  isCatalogId,
  isDiscouragedWebAwesome,
  type KerfCatalogId,
  type WebAwesomeCatalogId,
  webAwesomeCatalogSections,
} from './catalog.js';
import {
  applyDemoTheme,
  type DemoTheme,
  oppositeDemoTheme,
  preferredDemoTheme,
} from './demo-theme.js';
import {
  RELOCATION_RAIL_ACTION,
  RELOCATION_RAIL_ID,
  relocationRailCollapsed,
  resetCollapsiblePanelDemo,
  RESTORE_DRAWER_ACTION,
  RESTORE_DRAWER_ID,
  restoreDrawerCollapsed,
} from './demos/collapsible-panel.js';
import {
  popConfiguredNavStackDemo,
  popNavStackDemo,
  pushConfiguredNavStackDemo,
  pushNavStackDemo,
  resetNavStackDemo,
} from './demos/nav-stack.js';
import { demos } from './demos/registry.js';
import {
  clearSplitViewSelection,
  resetSplitViewDemo,
  RESIZABLE_SPLIT_VIEW_LIST_ID,
  resizeSplitViewList,
  selectRoomySplitViewMessage,
  selectSplitViewMessage,
  TOGGLE_SPLIT_VIEW_LIST_ACTION,
  toggleSplitViewList,
} from './demos/split-view.js';
import {
  ADOPTION_SUGGESTIONS,
  adoptionOpen,
  adoptionQuery,
  adoptionReadout,
  adoptionTokens,
  bannerTone,
  collapsibleSearchOpen,
  contentCardChoice,
  contentCardSelected,
  contentCardSelections,
  customDisclosureOpen,
  disclosureOpen,
  displayDensity,
  floatingToolbarOpen,
  grammarSearchModel,
  gridTileSelections,
  inspectorSection,
  itemTypes,
  menuActionCurrent,
  menuActionPressed,
  menuToolsOpen,
  popupSortChoice,
  regionSize,
  selectedChoice,
  selectViewTitle,
  sizedDisclosureOpen,
  tabBarActive,
  tabBarTabs,
  ticketLabelFilter,
  ticketLabels,
  tokenSearchQuery,
  tokenSearchTokens,
  toolbarAvatarChoice,
  toolbarChoice,
  toolbarFindOpen,
  toolbarFindQuery,
  toolbarGroupBusy,
  toolbarGroupSearchOpen,
  toolbarGroupShape,
  toolbarSort,
  toolbarStackSearchOpen,
} from './demos/state.js';
import {
  popNestedTabNavigatorDemo,
  pushNestedTabNavigatorDemo,
  resetTabNavigatorDemo,
  selectNestedTabNavigatorDemo,
  selectTabNavigatorDemo,
} from './demos/tab-navigator.js';
import {
  COLLAPSED_WORKBENCH_ID,
  NAVIGATION_STACK_ID,
  NAVIGATION_WORKBENCH_ID,
  openWorkbenchTicket,
  popWorkbenchTicket,
  resetWorkbenchDemo,
  RESIZABLE_WORKBENCH_ID,
  RESPONSIVE_DRAWER_WORKBENCH_ID,
  selectWorkbenchTicketSection,
  toggleWorkbenchCollapsedNavigator,
  toggleWorkbenchConsole,
  toggleWorkbenchInspector,
  toggleWorkbenchNavigator,
  toggleWorkbenchOutput,
  toggleWorkbenchTicketRail,
  workbenchCollapsedNavigator,
  workbenchConsoleCollapsed,
  workbenchConsoleSize,
  workbenchInspectorCollapsed,
  workbenchInspectorSize,
  workbenchNavigatorCollapsed,
  workbenchNavigatorSize,
  workbenchOutputCollapsed,
  workbenchTicketRailCollapsed,
} from './demos/workbench.js';
import {
  readDemoDisplayPreferences,
  writeDemoDisplayPreferences,
} from './display-preferences.js';
import { isRecipeId, type RecipeId, recipeLoaders } from './recipes/loaders.js';
import type { RecipeController, RecipePresentation } from './recipes/types.js';
import { uxReviewCaptureUrl } from './ux-review.js';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Missing #app');
// `?no-inline` keeps the logo an emitted file URL instead of a `data:image/svg+xml`
// URI: kerf's URL screening drops script-capable SVG data URIs from `src`, which
// would blank the mark once the asset is small enough for Vite to inline it.
const kerfLogoUrl = new URL('../../assets/logo.svg?no-inline', import.meta.url)
  .href;

// Set the brand favicon from an emitted file URL (like the logo). A static
// `../../assets/favicon.svg` link in index.html only resolves in the built
// output — Vite rewrites it there but leaves it unresolved on the dev server,
// where the browser normalizes `../../` to a path outside the demo root. This
// URL import resolves identically in dev and build. `?no-inline` keeps it a file.
const faviconLink = document.createElement('link');
faviconLink.rel = 'icon';
faviconLink.type = 'image/svg+xml';
faviconLink.href = new URL(
  '../../assets/favicon.svg?no-inline',
  import.meta.url,
).href;
document.head.append(faviconLink);

const requested = new URLSearchParams(location.search).get('component');
const initialDemo = isCatalogId(requested) ? requested : catalog[0].id;
const selectedDemo = signal<CatalogId>(initialDemo);
const webAwesomeExpanded = signal(
  findCatalogEntry(initialDemo)?.source === 'webawesome',
);
const sidebarCollapsed = signal(false);
const recipeNotesVisible = signal(false);
let nextDemoTabNumber = tabBarTabs.value.length + 1;
/** How long a newly added application tab stays pending in the demo. */
const DEMO_TAB_LOAD_MS = 1200;
const actionLog = signal('Catalog ready');
const uxReviewProject = signal<string | null>(null);
void window
  .fetch(new URL('./__ux-review/project.json', location.href))
  .then(async (response) => {
    if (!response.ok) return;
    const data: unknown = await response.json();
    if (
      typeof data === 'object' &&
      data !== null &&
      'projectDirectory' in data &&
      typeof data.projectDirectory === 'string' &&
      data.projectDirectory.startsWith('/')
    )
      uxReviewProject.value = data.projectDirectory;
  })
  .catch(() => {
    // Static hosting has no local project directory to give UX Review.
  });
let displayStorage: Storage | null = null;
try {
  displayStorage = window.localStorage;
} catch {
  // The demo remains usable when browser storage is unavailable.
}
const savedDisplay = readDemoDisplayPreferences(displayStorage);
const systemDarkTheme = window.matchMedia('(prefers-color-scheme: dark)');
const effectiveTheme = signal<DemoTheme>(
  savedDisplay.theme ?? preferredDemoTheme(systemDarkTheme.matches),
);
let explicitTheme = savedDisplay.theme;
const increasedContrast = signal(savedDisplay.increasedContrast ?? false);
const reducedMotion = signal(savedDisplay.reducedMotion ?? false);
const backgroundStyle = signal<CatalogBackgroundStyle>(
  savedDisplay.backgroundStyle ?? 'checkerboard',
);
if (explicitTheme) applyDemoTheme(document.documentElement, explicitTheme);
document.documentElement.classList.toggle(
  'demo-contrast',
  increasedContrast.value,
);
document.documentElement.classList.toggle(
  'demo-reduced-motion',
  reducedMotion.value,
);
const saveDisplay = () =>
  writeDemoDisplayPreferences(displayStorage, {
    theme: explicitTheme,
    backgroundStyle: backgroundStyle.peek(),
    increasedContrast: increasedContrast.peek(),
    reducedMotion: reducedMotion.peek(),
  });
const webAwesomeReady = signal(false);
let webAwesomeDemos:
  | Record<WebAwesomeCatalogId, () => ReturnType<typeof ToolbarControlGroup>>
  | undefined;
let webAwesomeLoad: Promise<void> | undefined;
const recipeControllers = new Map<RecipeId, RecipeController>();
const recipePresentations = new Map<RecipeId, RecipePresentation>();
const recipeLoads = new Map<RecipeId, Promise<void>>();
const recipeRevision = signal(0);

type AnimationElement = HTMLElement & {
  cancel(): void;
  finish(): void;
  duration: number;
  easing: string;
  name: string;
  play: boolean;
  playbackRate: number;
};

function animationDemoFrom(
  element: Element,
): { animation: AnimationElement; output: HTMLOutputElement } | undefined {
  const demo = element.closest('[data-animation-demo]');
  const animation = demo?.querySelector<AnimationElement>('wa-animation');
  const output = demo?.querySelector<HTMLOutputElement>(
    '[data-animation-output]',
  );
  return animation && output ? { animation, output } : undefined;
}

function ensureWebAwesomeDemos(): Promise<void> {
  webAwesomeLoad ??= import('./webawesome-demos.js').then(
    ({ webAwesomeComponentDemos }) => {
      webAwesomeDemos = webAwesomeComponentDemos;
      webAwesomeReady.value = true;
    },
  );
  return webAwesomeLoad;
}

function ensureRecipe(id: RecipeId): Promise<void> {
  const pending = recipeLoads.get(id);
  if (pending) return pending;
  const load = recipeLoaders[id]().then(({ createRecipe, presentation }) => {
    recipePresentations.set(id, presentation);
    recipeControllers.set(
      id,
      createRecipe((message) => {
        actionLog.value = message;
      }),
    );
    recipeRevision.value += 1;
  });
  recipeLoads.set(id, load);
  return load;
}

function needsWebAwesome(entry: CatalogEntry): boolean {
  return (
    entry.source === 'webawesome' ||
    (entry.uses?.some((id) => id.startsWith('wa-')) ?? false)
  );
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
    // The catalog frames every recipe in its declared specimen viewport and
    // shows its ownership note on request; the recipe renders only app UI. A
    // full-width recipe (a whole application arrangement) spans the canvas
    // measure; narrower recipes sit in the same centered example column as
    // focused component demos.
    const presentation = recipePresentations.get(selected.id)!;
    const example = (
      <CatalogExample
        note={recipeNotesVisible.value ? presentation.note : undefined}
        viewport={presentation.viewport}
      >
        {controller.render()}
      </CatalogExample>
    );
    return presentation.viewport?.width === 'full' ? (
      example
    ) : (
      <CatalogExampleStack>{example}</CatalogExampleStack>
    );
  }
  if (needsWebAwesome(selected) && !webAwesomeReady.value) {
    void ensureWebAwesomeDemos();
    return <LoadingSpinner label={`Loading ${selected.name} preview`} />;
  }
  if (selected.source === 'webawesome')
    return webAwesomeDemos![selected.id as WebAwesomeCatalogId]();
  return demos[selectedDemo.value as Exclude<KerfCatalogId, RecipeId>]();
}

// Project the ux-demo's rich catalog entries onto the shipped Catalog's shapes so
// the reusable shell renders the sidebar, resources footer, and related selector.
function toCatalogResources(entry: CatalogEntry) {
  return catalogResources({
    demoSource: {
      href: catalogRepositoryHref(entry.demoSource),
      detail: entry.demoSource,
    },
    ...(entry.componentSource
      ? {
          componentSource: {
            href: catalogRepositoryHref(entry.componentSource),
            detail: entry.componentSource,
          },
        }
      : {}),
    ...(entry.designTemplate
      ? {
          designTemplate: {
            href: catalogRepositoryHref(entry.designTemplate),
            detail: entry.designTemplate,
          },
        }
      : {}),
    guidance: {
      href: catalogRepositoryHref(entry.documentation),
      detail: entry.documentation,
    },
    guidanceKind:
      entry.source === 'webawesome' ? 'integrationGuidance' : 'guidance',
  });
}
function toCatalogRelated(entry: CatalogEntry): CatalogRelated[] {
  const uses = (entry.uses ?? [])
    .map(findCatalogEntry)
    .filter((related): related is CatalogEntry => Boolean(related))
    .map((related) => ({ id: related.id, name: related.name, group: 'Uses' }));
  const usedBy = catalogEntriesUsing(entry.id).map((related) => ({
    id: related.id,
    name: related.name,
    group: 'Used by',
  }));
  return [...uses, ...usedBy];
}
function toKuiSections(
  sections: readonly { category: string; entries: readonly CatalogEntry[] }[],
): KuiCatalogSection[] {
  return sections.map((section) => ({
    category: section.category,
    entries: section.entries.map((entry) => {
      const tags = [
        ...(entry.kind === 'composition' ? ['Composition'] : []),
        ...(isDiscouragedWebAwesome(entry) ? ['Discouraged'] : []),
      ];
      return {
        id: entry.id,
        name: entry.name,
        description: entry.description,
        tags: tags.length > 0 ? tags : undefined,
        resources: toCatalogResources(entry),
        related: toCatalogRelated(entry),
      };
    }),
  }));
}
const kuiCatalogSections = toKuiSections(catalogSections);
const kuiWebAwesomeSections = toKuiSections(webAwesomeCatalogSections);

function selectDemo(id: string): void {
  if (!isCatalogId(id)) return;
  const selected = findCatalogEntry(id)!;
  if (needsWebAwesome(selected)) void ensureWebAwesomeDemos();
  if (isRecipeId(selected.id)) void ensureRecipe(selected.id);
  selectedDemo.value = id;
  recipeNotesVisible.value = false;
  if (selected.source === 'webawesome') webAwesomeExpanded.value = true;
  const url = new URL(location.href);
  url.searchParams.set('component', id);
  history.replaceState(null, '', url);
  actionLog.value = `Showing ${id}`;
}

mount(app, () => {
  const selected = findCatalogEntry(selectedDemo.value)!;
  const isRecipe = selected.kind === 'recipe';
  const statusLabel = ((): string => {
    if (selected.source === 'webawesome')
      return 'Web Awesome component · Kerf theme';
    switch (selected.kind) {
      case 'component':
        return 'Kerf first-class component · production CSS';
      case 'composition':
        return 'Kerf composition · production CSS';
      case 'recipe':
        return 'Kerf recipe · production CSS';
    }
  })();
  return (
    <Catalog
      className="demo-catalog"
      brand={{ title: 'Kerf', logoUrl: kerfLogoUrl }}
      sections={kuiCatalogSections}
      secondarySections={{
        label: 'Web Awesome',
        collapsible: true,
        expanded: webAwesomeExpanded.value,
        sections: kuiWebAwesomeSections,
      }}
      active={selectedDemo.value}
      collapsed={sidebarCollapsed.value}
      theme={effectiveTheme.value === 'dark' ? 'dark' : 'light'}
      increasedContrast={increasedContrast.value}
      reducedMotion={reducedMotion.value}
      backgroundControl
      selectAction="select-demo"
      toggleSidebarAction="toggle-catalog-sidebar"
      toggleThemeAction="toggle-theme"
      toggleContrastAction="toggle-contrast"
      toggleMotionAction="toggle-motion"
      selectBackgroundAction="set-catalog-background"
      toggleSecondaryAction="toggle-webawesome-catalog"
      headerActions={
        <>
          {isRecipe ? (
            <ToolbarControlGroup
              appearance="borderless"
              single
              buttonAppearance="push"
            >
              <button
                type="button"
                data-action="toggle-recipe-notes"
                aria-label={
                  recipeNotesVisible.value
                    ? 'Hide recipe notes'
                    : 'Show recipe notes'
                }
                aria-pressed={String(recipeNotesVisible.value)}
              >
                <LucideIcon icon={StickyNote} name="sticky-note" />
              </button>
            </ToolbarControlGroup>
          ) : null}
          {uxReviewProject.value ? (
            <ToolbarControlGroup
              appearance="borderless"
              single
              size="compact"
              content="mixed"
              buttonAppearance="push"
            >
              <ToolbarActionLink
                href={uxReviewCaptureUrl(
                  uxReviewProject.value,
                  selected,
                  location.href,
                )}
                label="Capture region"
                ariaLabel={`Capture ${selected.name} in UX Review`}
                icon={<LucideIcon icon={Scan} name="scan" />}
              />
            </ToolbarControlGroup>
          ) : null}
        </>
      }
      status={
        <>
          <Text variant="span" size="compact" tone="quiet">
            <output class="catalog-log" aria-live="polite">
              {actionLog.value}
            </output>
          </Text>
          {selected.id === 'resize' ? (
            <Text variant="span" size="compact" tone="quiet">
              Committed width{' '}
              <strong data-region-size>{regionSize.value}px</strong>
            </Text>
          ) : null}
          <Text variant="span" size="compact" tone="quiet">
            {statusLabel}
          </Text>
        </>
      }
      backgroundStyle={backgroundStyle.value}
      stageRootAttributes={{
        'data-demo-stage-inner': '',
        'data-demo-mode':
          selected.kind === 'component' ? 'component' : 'composition',
        'data-recipe-notes-visible': String(
          isRecipe && recipeNotesVisible.value,
        ),
      }}
      content={<Stage />}
    />
  );
});

if (findCatalogEntry(initialDemo)?.source === 'webawesome')
  revealCatalogEntry(app, initialDemo, { block: 'center' });

const stopActions = delegateActions(app, 'click', {
  'width-refresh': () => {
    actionLog.value = 'Workspace refreshed';
  },
  'width-filter': () => {
    actionLog.value = 'Workspace filter requested';
  },
  'toggle-disclosure': () => {
    disclosureOpen.value = !disclosureOpen.value;
    actionLog.value = disclosureOpen.value
      ? 'Disclosure opened'
      : 'Disclosure closed';
  },
  'toggle-menu-tools': () => {
    menuToolsOpen.value = !menuToolsOpen.value;
    actionLog.value = menuToolsOpen.value ? 'Tools opened' : 'Tools closed';
  },
  'toggle-custom-disclosure': () => {
    customDisclosureOpen.value = !customDisclosureOpen.value;
    actionLog.value = customDisclosureOpen.value
      ? 'Custom disclosure opened'
      : 'Custom disclosure closed';
  },
  'toggle-sized-disclosure': () => {
    sizedDisclosureOpen.value = !sizedDisclosureOpen.value;
    actionLog.value = sizedDisclosureOpen.value
      ? 'Sized disclosure opened'
      : 'Sized disclosure closed';
  },
  'recipe-action': (_event, element) => {
    const id = selectedDemo.value;
    if (!isRecipeId(id)) return;
    const target = element as HTMLElement;
    recipeControllers
      .get(id)
      ?.action(target.dataset.recipeCommand ?? '', target);
  },
  'toggle-recipe-notes': () => {
    recipeNotesVisible.value = !recipeNotesVisible.value;
    actionLog.value = recipeNotesVisible.value
      ? 'Recipe notes shown'
      : 'Recipe notes hidden';
  },
  'show-wa-dialog': (_event, target) => {
    actionLog.value = 'Dialog opened';
    const dialog = document.querySelector<HTMLElement & { open: boolean }>(
      `#${target.getAttribute('data-dialog-id') ?? 'catalog-wa-dialog'}`,
    );
    if (dialog) dialog.open = true;
  },
  'hide-wa-dialog': (_event, target) => {
    actionLog.value = 'Dialog closed';
    const dialog = document.querySelector<HTMLElement & { open: boolean }>(
      `#${target.getAttribute('data-dialog-id') ?? 'catalog-wa-dialog'}`,
    );
    if (dialog) dialog.open = false;
  },
  'show-wa-drawer': () => {
    actionLog.value = 'Drawer opened';
    const drawer = document.querySelector<HTMLElement & { open: boolean }>(
      '#catalog-wa-drawer',
    );
    if (drawer) drawer.open = true;
  },
  'hide-wa-drawer': () => {
    actionLog.value = 'Drawer closed';
    const drawer = document.querySelector<HTMLElement & { open: boolean }>(
      '#catalog-wa-drawer',
    );
    if (drawer) drawer.open = false;
  },
  'show-wa-toast': async () => {
    const toast = document.querySelector<
      HTMLElement & {
        create(
          message: string,
          options?: { duration?: number; icon?: string; variant?: string },
        ): Promise<HTMLElement>;
      }
    >('#catalog-wa-toast');
    if (!toast) return;
    await toast.create('The component catalog is ready.', {
      duration: 4000,
      icon: 'circle-check',
      variant: 'success',
    });
  },
  'randomize-wa-content': () => {
    actionLog.value = 'Random content changed';
    document
      .querySelector<HTMLElement & { randomize(): Element[] }>(
        'wa-random-content',
      )
      ?.randomize();
  },
  'play-wa-animation': (_event, element) => {
    const demo = animationDemoFrom(element);
    if (!demo) return;
    if (
      document.documentElement.classList.contains('demo-reduced-motion') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      demo.output.textContent =
        'Playback suppressed by reduced-motion preference';
      return;
    }
    demo.animation.cancel();
    window.requestAnimationFrame(() => {
      demo.animation.play = true;
    });
  },
  'pause-wa-animation': (_event, element) => {
    const demo = animationDemoFrom(element);
    if (demo) {
      demo.animation.play = false;
      demo.output.textContent = 'Paused';
    }
  },
  'finish-wa-animation': (_event, element) => {
    animationDemoFrom(element)?.animation.finish();
  },
  'cancel-wa-animation': (_event, element) => {
    animationDemoFrom(element)?.animation.cancel();
  },
  'toggle-wa-intersection': (_event, element) => {
    const demo = element.closest<HTMLElement>(
      '[data-observer-demo="intersection"]',
    );
    const target = demo?.querySelector<HTMLElement>('[data-observer-target]');
    if (!demo || !target) return;
    const revealed = demo.dataset.revealed === 'true';
    demo.dataset.revealed = String(!revealed);
    target.hidden = revealed;
    element.textContent = revealed ? 'Reveal target' : 'Hide target';
  },
  'mutate-wa-target': (_event, element) => {
    const target = element
      .closest('[data-observer-demo="mutation"]')
      ?.querySelector<HTMLElement>('[data-observer-target]');
    if (!target) return;
    const revision = Number(target.dataset.revision ?? 0) + 1;
    target.dataset.revision = String(revision);
    target
      .querySelector('[data-observer-copy]')
      ?.replaceChildren(
        `Mutation ${revision}: attribute and child content changed.`,
      );
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
  'select-tab': (_event, element) => {
    actionLog.value = `Selected ${element.getAttribute('data-tab-id') ?? 'tab'}`;
  },
  'select-reorder-tab': (_event, element) => {
    tabBarActive.value = element.getAttribute('data-tab-id') ?? 'components';
    actionLog.value = `Selected ${tabBarActive.value}`;
  },
  'close-tab': (_event, element) => {
    actionLog.value = `Close requested for ${element.getAttribute('data-tab-id')}`;
  },
  'close-reorder-tab': (_event, element) => {
    const id = element.getAttribute('data-tab-id');
    if (!id) return;
    const index = tabBarTabs.value.findIndex((tab) => tab.id === id);
    tabBarTabs.value = tabBarTabs.value.filter((tab) => tab.id !== id);
    if (tabBarActive.value === id)
      tabBarActive.value =
        tabBarTabs.value[Math.min(index, tabBarTabs.value.length - 1)]?.id ??
        '';
    actionLog.value = `Closed ${id}`;
  },
  'add-demo-tab': () => {
    const tabNumber = nextDemoTabNumber++;
    const id = `new-${tabNumber}`;
    // A new tab opens pending: selectable, with placeholder panel content,
    // until its simulated load completes.
    tabBarTabs.value = [
      ...tabBarTabs.value,
      { id, name: `New tab ${tabNumber}`, pending: true },
    ];
    tabBarActive.value = id;
    actionLog.value = `Opening ${id}`;
    window.setTimeout(() => {
      if (!tabBarTabs.value.some((tab) => tab.id === id && tab.pending)) return;
      tabBarTabs.value = tabBarTabs.value.map((tab) =>
        tab.id === id ? { ...tab, pending: false } : tab,
      );
      actionLog.value = `Loaded ${id}`;
    }, DEMO_TAB_LOAD_MS);
  },
  'select-segment-demo': (_event, element) => {
    const value = element.getAttribute('data-segment-value');
    const id = element
      .closest('[data-segmented-control-id]')
      ?.getAttribute('data-segmented-control-id');
    if (
      (id === 'toolbar-view' || id === 'standalone-toolbar-view') &&
      (value === 'list' || value === 'columns' || value === 'settings')
    )
      toolbarChoice.value = value;
    if (
      id === 'inspector-section' &&
      (value === 'summary' || value === 'activity' || value === 'files')
    )
      inspectorSection.value = value;
    if (
      id === 'display-density' &&
      (value === 'compact' || value === 'comfortable' || value === 'roomy')
    )
      displayDensity.value = value;
    if (
      id === 'toolbar-group-shape' &&
      (value === 'pill' || value === 'rounded')
    )
      toolbarGroupShape.value = value;
    if (value) actionLog.value = `Selected ${value}`;
  },
  'select-avatar-demo': (_event, element) => {
    const value = element.getAttribute('data-avatar-value');
    if (value !== 'primary' && value !== 'secondary') return;
    toolbarAvatarChoice.value = value;
    actionLog.value = `Selected ${value} profile`;
  },
  'commit-grammar-release': () => {
    const current = grammarSearchModel.state.value;
    if (current.tokens.some((token) => token.value === 'tag:release')) return;
    grammarSearchModel.commit('release');
    if (grammarSearchModel.state.value.tokens.length > current.tokens.length)
      return;
    const separator = current.query && !/\s$/.test(current.query) ? ' ' : '';
    grammarSearchModel.replace({
      query: `${current.query}${separator}tag:`,
      tokens: current.tokens,
    });
    grammarSearchModel.commit('release');
  },
  'replace-grammar-search': () => {
    grammarSearchModel.replace({ query: 'roadmap', tokens: [] });
  },
  'show-token-search-help': () => {
    actionLog.value = 'Search help requested';
  },
  'edit-search-token': (_event, element) => {
    const value = element.getAttribute('data-token-value');
    const token = tokenSearchTokens.value.find(
      (candidate) => candidate.value === value,
    );
    if (!token) return;
    const offset = token.offset ?? tokenSearchQuery.value.length;
    batch(() => {
      tokenSearchTokens.value = tokenSearchTokens.value.filter(
        (candidate) => candidate.value !== value,
      );
      tokenSearchQuery.value = `${tokenSearchQuery.value.slice(0, offset)}${token.value} ${tokenSearchQuery.value.slice(offset)}`;
    });
    actionLog.value = `Editing ${token.label}`;
  },
  'remove-search-token': (_event, element) => {
    const value = element.getAttribute('data-token-value');
    tokenSearchTokens.value = tokenSearchTokens.value.filter(
      (token) => token.value !== value,
    );
    actionLog.value = `Removed ${value}`;
  },
  'add-adoption-token': (_event, element) => {
    // Clicking a suggestion in the data-token-search-keep-open surface must not
    // collapse the empty field — the wire helper's keep-open exception guards it.
    const value = element.getAttribute('data-token-value');
    const suggestion = ADOPTION_SUGGESTIONS.find(
      (candidate) => candidate.value === value,
    );
    if (
      !suggestion ||
      adoptionTokens.value.some((token) => token.value === value)
    )
      return;
    adoptionTokens.value = [
      ...adoptionTokens.value,
      { ...suggestion, offset: adoptionQuery.value.length },
    ];
    adoptionReadout.value = `Added ${suggestion.value} · ${adoptionTokens.value.length} filters`;
    window.requestAnimationFrame(() =>
      document
        .querySelector<HTMLElement>('[data-demo-adoption-search="true"]')
        ?.focus(),
    );
  },
  'clear-adoption-search': (_event, element) => {
    const editor = element
      .closest('[data-component="token-search-field"]')
      ?.querySelector<HTMLElement>('[data-token-search-editor]');
    if (editor) editor.textContent = '';
    batch(() => {
      adoptionQuery.value = '';
      adoptionTokens.value = [];
      adoptionReadout.value = 'Search cleared';
    });
  },
  'clear-token-search': (_event, element) => {
    const editor = element
      .closest('[data-component="token-search-field"]')
      ?.querySelector<HTMLElement>('[data-token-search-editor]');
    if (editor) editor.textContent = '';
    batch(() => {
      tokenSearchQuery.value = '';
      tokenSearchTokens.value = [];
    });
    actionLog.value = 'Search cleared';
  },
  'clear-toolbar-find': (_event, element) => {
    const editor = element
      .closest('[data-component="token-search-field"]')
      ?.querySelector<HTMLElement>('[data-token-search-editor]');
    if (editor) editor.textContent = '';
    batch(() => {
      toolbarFindOpen.value = true;
      toolbarFindQuery.value = '';
    });
    window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>('[data-demo-toolbar-find="true"]')
        ?.focus();
    });
    actionLog.value = 'Find cleared';
  },
  'cycle-tone': () => {
    const tones = [
      'neutral',
      'info',
      'pop',
      'success',
      'warning',
      'danger',
    ] as const;
    bannerTone.value =
      tones[(tones.indexOf(bannerTone.value) + 1) % tones.length]!;
    actionLog.value = `Banner tone: ${bannerTone.value}`;
  },
  'log-add': () => {
    actionLog.value = 'Add action requested';
  },
  'edit-toolbar-title': () => {
    actionLog.value = 'Edit toolbar title requested';
  },
  'log-inbox': () => {
    actionLog.value = 'Inbox selected';
  },
  'log-projects': () => {
    actionLog.value = 'Projects selected';
  },
  'log-drafts': () => {
    actionLog.value = 'Drafts selected';
  },
  'log-settings': () => {
    actionLog.value = 'Settings selected';
  },
  'select-list-action-row': (_event, element) => {
    const itemId = (element as HTMLElement).dataset.itemId ?? '';
    menuActionCurrent.value = itemId;
    actionLog.value = `${itemId} selected`;
  },
  'toggle-list-action-row': (_event, element) => {
    const itemId = (element as HTMLElement).dataset.itemId ?? '';
    menuActionPressed.value = !menuActionPressed.value;
    actionLog.value = `${itemId} ${menuActionPressed.value ? 'pressed' : 'not pressed'}`;
  },
  'open-list-action-row-actions': (_event, element) => {
    actionLog.value = `Actions requested for ${(element as HTMLElement).dataset.itemId ?? 'row'}`;
  },
  'log-done': () => {
    actionLog.value = 'Done';
  },
  'toggle-floating-toolbar': () => {
    floatingToolbarOpen.value = !floatingToolbarOpen.value;
    actionLog.value = `Floating toolbar ${floatingToolbarOpen.value ? 'shown' : 'hidden'}`;
  },
  'log-restore-drawer': () => {
    actionLog.value = 'Terminal drawer restored';
  },
  'sort-recent': () => {
    popupSortChoice.value = 'recent';
    actionLog.value = 'Sorted by recently updated';
  },
  'sort-priority': () => {
    popupSortChoice.value = 'priority';
    actionLog.value = 'Sorted by priority';
  },
  'log-favorite': () => {
    actionLog.value = 'Favorite requested';
  },
  'log-more': () => {
    actionLog.value = 'More actions requested';
  },
  'log-card-primary': () => {
    actionLog.value = 'Quotation opened';
  },
  'log-decision': (_event, element) => {
    actionLog.value = `Decision: ${(element as HTMLElement).dataset.decision ?? ''}`;
  },
  'log-chip-remove': (_event, element) => {
    actionLog.value = `Remove tag: ${(element as HTMLElement).closest('[data-component="chip"]')?.getAttribute('data-item-id') ?? ''}`;
  },
  'log-context-open': () => {
    actionLog.value = 'Context demand opened';
  },
  'open-demand-actions': (_event, element) => {
    const menu = app.querySelector<PopupMenuElement>(
      '[data-popup-context-menu]',
    );
    if (!menu) return;
    const anchor = element.getBoundingClientRect();
    openPopupMenuAt(menu, anchor.left, anchor.bottom);
  },
  'log-pin': () => {
    actionLog.value = 'Pin requested';
  },
  'toggle-toolbar-group-busy': () => {
    toolbarGroupBusy.value = !toolbarGroupBusy.value;
  },
  'log-pricing-check': () => {
    actionLog.value = 'Pricing check requested';
  },
  'toggle-content-card': (_event, element) => {
    contentCardSelected.value = !contentCardSelected.value;
    actionLog.value = `Card ${element.getAttribute('data-item-id')} ${contentCardSelected.value ? 'selected' : 'cleared'}`;
  },
  'choose-content-card': (_event, element) => {
    contentCardChoice.value = element.getAttribute('data-item-id') ?? '';
    actionLog.value = `Card ${contentCardChoice.value} selected`;
  },
  'select-rich-card': (event, element) => {
    if (!isContentItemActivation(event, element as HTMLElement)) return;
    const id = element.getAttribute('data-item-id') ?? '';
    contentCardSelections.value = contentCardSelections.value.includes(id)
      ? contentCardSelections.value.filter((selected) => selected !== id)
      : [...contentCardSelections.value, id];
    actionLog.value = `Selected ${contentCardSelections.value.length} demand lines`;
  },
  'select-grid-tile': (event, element) => {
    if (!isContentItemActivation(event, element as HTMLElement)) return;
    const id = element.getAttribute('data-item-id') ?? '';
    gridTileSelections.value = gridTileSelections.value.includes(id)
      ? gridTileSelections.value.filter((selected) => selected !== id)
      : [...gridTileSelections.value, id];
    actionLog.value = `Selected ${gridTileSelections.value.length} document tiles`;
  },
  'log-sidebar': () => {
    actionLog.value = 'Sidebar requested';
  },
  'log-resting': () => {
    actionLog.value = 'Resting push button activated';
  },
  'log-pressed': () => {
    actionLog.value = 'Pressed push button activated';
  },
  'log-previous': () => {
    actionLog.value = 'Previous requested';
  },
  'log-next': () => {
    actionLog.value = 'Next requested';
  },
  'open-nav-stack-project': (_event, element) => {
    const projectId = (element as HTMLElement).dataset.itemId ?? '';
    pushNavStackDemo(projectId);
    actionLog.value = `Opened ${projectId}`;
  },
  'open-configured-nav-stack-project': (_event, element) => {
    const projectId = (element as HTMLElement).dataset.itemId ?? '';
    pushConfiguredNavStackDemo(projectId);
    actionLog.value = `Opened ${projectId}`;
  },
  'open-tab-scaffold-project': () => {
    pushNestedTabNavigatorDemo();
    actionLog.value = 'Opened Project Atlas';
  },
  'open-split-view-message': (_event, element) => {
    const messageId = (element as HTMLElement).dataset.itemId ?? '';
    selectSplitViewMessage(messageId);
    actionLog.value = `Opened ${messageId}`;
  },
  [TOGGLE_SPLIT_VIEW_LIST_ACTION]: () => {
    actionLog.value = toggleSplitViewList()
      ? 'Threads hidden'
      : 'Threads shown';
  },
  'nav-stack-demo-command': (_event, element) => {
    actionLog.value = `${(element as HTMLElement).getAttribute('aria-label') ?? 'Command'} requested`;
  },
  'split-view-demo-command': (_event, element) => {
    actionLog.value = `${(element as HTMLElement).getAttribute('aria-label') ?? 'Command'} requested`;
  },
  'toggle-workbench-navigator': () => {
    actionLog.value = toggleWorkbenchNavigator()
      ? 'Navigator hidden'
      : 'Navigator shown';
  },
  'toggle-workbench-collapsed-navigator': () => {
    actionLog.value = toggleWorkbenchCollapsedNavigator()
      ? 'Navigator hidden'
      : 'Navigator shown';
  },
  'workbench-demo-command': (_event, element) => {
    actionLog.value = `${(element as HTMLElement).getAttribute('aria-label') ?? 'Command'} requested`;
  },
  'open-workbench-ticket': (_event, element) => {
    const id = (element as HTMLElement).dataset.itemId ?? '';
    openWorkbenchTicket(id);
    actionLog.value = `Opened ${id}`;
  },
  'select-workbench-ticket-section': (_event, element) => {
    selectWorkbenchTicketSection(
      (element as HTMLElement).dataset.segmentValue ?? '',
    );
  },
  'toggle-workbench-ticket-rail': () => {
    actionLog.value = toggleWorkbenchTicketRail()
      ? 'Tickets hidden'
      : 'Tickets shown';
  },
  'collapsible-panel-demo-command': (_event, element) => {
    actionLog.value = `${(element as HTMLElement).getAttribute('aria-label') ?? 'Command'} requested`;
  },
  'toggle-workbench-console': () => {
    actionLog.value = toggleWorkbenchConsole()
      ? 'Console hidden'
      : 'Console shown';
  },
  'toggle-workbench-output': () => {
    actionLog.value = toggleWorkbenchOutput()
      ? 'Output hidden'
      : 'Output shown';
  },
  'toggle-workbench-inspector': () => {
    actionLog.value = toggleWorkbenchInspector()
      ? 'Inspector hidden'
      : 'Inspector shown';
  },
  'select-roomy-split-view-message': (_event, element) => {
    const messageId = (element as HTMLElement).dataset.itemId ?? '';
    selectRoomySplitViewMessage(messageId);
    actionLog.value = `Selected ${messageId}`;
  },
  'log-neutral': () => {
    actionLog.value = 'Neutral banner action';
  },
  'log-info': () => {
    actionLog.value = 'Info banner action';
  },
  'log-success': () => {
    actionLog.value = 'Success banner action';
  },
  'log-warning': () => {
    actionLog.value = 'Warning banner action';
  },
  'log-danger': () => {
    actionLog.value = 'Danger banner action';
  },
});

const stopCatalog = wireCatalog(app, {
  onSelect: (id) => selectDemo(id),
  onToggleSidebar: () => {
    sidebarCollapsed.value = !sidebarCollapsed.value;
    actionLog.value = sidebarCollapsed.value
      ? 'Component catalog collapsed'
      : 'Component catalog expanded';
  },
  onToggleTheme: () => {
    explicitTheme = oppositeDemoTheme(effectiveTheme.value);
    applyDemoTheme(document.documentElement, explicitTheme);
    effectiveTheme.value = explicitTheme;
    saveDisplay();
    actionLog.value = `${explicitTheme === 'dark' ? 'Dark' : 'Light'} theme on`;
  },
  onToggleContrast: () => {
    increasedContrast.value = !increasedContrast.value;
    document.documentElement.classList.toggle(
      'demo-contrast',
      increasedContrast.value,
    );
    saveDisplay();
    actionLog.value = increasedContrast.value
      ? 'Increased contrast on'
      : 'Increased contrast off';
  },
  onToggleMotion: () => {
    reducedMotion.value = !reducedMotion.value;
    document.documentElement.classList.toggle(
      'demo-reduced-motion',
      reducedMotion.value,
    );
    saveDisplay();
    actionLog.value = reducedMotion.value
      ? 'Reduced motion on'
      : 'Reduced motion off';
  },
  onSelectBackground: (style) => {
    backgroundStyle.value = style;
    saveDisplay();
    actionLog.value = `Background: ${
      {
        checkerboard: 'Checkerboard',
        'vertical-stripes': 'Vertical stripes',
        'layout-guide': 'Layout guide',
        surface: 'Surface',
        sunken: 'Sunken',
      }[style]
    }`;
  },
  onToggleSecondary: () => {
    webAwesomeExpanded.value = !webAwesomeExpanded.value;
    actionLog.value = webAwesomeExpanded.value
      ? 'Web Awesome catalog expanded'
      : 'Web Awesome catalog collapsed';
  },
  selectAction: 'select-demo',
  toggleSidebarAction: 'toggle-catalog-sidebar',
  toggleThemeAction: 'toggle-theme',
  toggleContrastAction: 'toggle-contrast',
  toggleMotionAction: 'toggle-motion',
  selectBackgroundAction: 'set-catalog-background',
  toggleSecondaryAction: 'toggle-webawesome-catalog',
  revealSelection: true,
  collapsed: sidebarCollapsed,
});
const stopResize = wireResizableRegions(app, {
  onCommit: ({ id, size }) => {
    // Recipes own their resizable regions through their own wiring.
    if (id.startsWith('recipe-')) return;
    if (id === RESIZABLE_SPLIT_VIEW_LIST_ID) {
      resizeSplitViewList(size);
      actionLog.value = `Threads resized to ${size}px`;
      return;
    }
    regionSize.value = size;
    actionLog.value = `Panel resized to ${size}px`;
  },
});
const stopSelect = delegate(app, 'change', 'wa-select', (_event, element) => {
  const value = (element as HTMLElement & { value?: string | string[] }).value;
  if (Array.isArray(value)) {
    const name = element.getAttribute('name');
    if (name === 'ticket-labels') ticketLabels.value = value;
    if (name === 'item-types') itemTypes.value = value;
    if (
      name === 'ticket-label-filter' ||
      name === 'toolbar-ticket-label-filter'
    )
      ticketLabelFilter.value = value;
    return;
  }
  if (value === 'quiet' || value === 'balanced' || value === 'explicit')
    selectedChoice.value = value;
  if (
    element.getAttribute('name') === 'view-title-demo' &&
    (value === 'queue' || value === 'active' || value === 'archive')
  )
    selectViewTitle.value = value;
  if (value === 'recent' || value === 'priority' || value === 'title')
    toolbarSort.value = value;
});
// Wire the active recipe's NavStack (slide animation + back control). The
// nav-stack element persists across pushes/pops, so we only re-wire when the
// selected recipe (or its freshly-loaded controller) changes.
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
      stopRecipeNav = wireNavStack(canvas, {
        onBack: () => controller.action('nav-back', canvas),
      });
    }
  });
});
/**
 * How a focused route wires its specimen with the public helpers consumers
 * use. `reset` returns the controlled specimen to its documented state each
 * time the route becomes active. A `canvas` wire attaches after the route's
 * canvas renders (on the next frame); an `app` wire attaches to the app root
 * as soon as the route is active, before the example first paints.
 */
interface RouteWire {
  reset?: () => void;
  target: 'app' | 'canvas';
  wire: (root: HTMLElement) => () => void;
}

const routeWires: Partial<Record<string, RouteWire>> = {
  // The restore example's drawer: wireSidebar owns its toggle (the drawer's
  // own hide control and its floating restore control) and the focus hand-off.
  'collapsible-panel': {
    reset: resetCollapsiblePanelDemo,
    target: 'canvas',
    wire: (canvas) =>
      wireSidebar(canvas, {
        panels: [
          {
            id: RESTORE_DRAWER_ID,
            collapsed: restoreDrawerCollapsed,
            toggleAction: RESTORE_DRAWER_ACTION,
          },
          {
            id: RELOCATION_RAIL_ID,
            collapsed: relocationRailCollapsed,
            toggleAction: RELOCATION_RAIL_ACTION,
          },
        ],
      }),
  },
  'nav-stack': {
    reset: resetNavStackDemo,
    target: 'canvas',
    // wireNavStack wires one stack, so each example's stack is wired on its own.
    wire: (canvas) => {
      const stacks: [string, () => void][] = [
        ['#catalog-nav-stack', popNavStackDemo],
        ['#catalog-nav-stack-configured', popConfiguredNavStackDemo],
      ];
      const stops = stacks.map(([selector, onBack]) => {
        const stack = canvas.querySelector(selector);
        return stack ? wireNavStack(stack, { onBack }) : () => {};
      });
      return () => stops.forEach((stop) => stop());
    },
  },
  'split-view': {
    reset: resetSplitViewDemo,
    target: 'canvas',
    wire: (canvas) => wireNavStack(canvas, { onBack: clearSplitViewSelection }),
  },
  'tab-navigator': {
    reset: resetTabNavigatorDemo,
    target: 'canvas',
    wire: (canvas) => {
      const first = canvas.querySelector('#catalog-tab-scaffold');
      const nested = canvas.querySelector('#catalog-tab-scaffold-nested');
      const stack = canvas.querySelector('#catalog-tab-scaffold-project-stack');
      const stops = [
        first
          ? wireTabNavigator(first, { onSelect: selectTabNavigatorDemo })
          : () => {},
        nested
          ? wireTabNavigator(nested, { onSelect: selectNestedTabNavigatorDemo })
          : () => {},
        stack
          ? wireNavStack(stack, { onBack: popNestedTabNavigatorDemo })
          : () => {},
      ];
      return () => stops.forEach((stop) => stop());
    },
  },
  // The resizable example has real persistence (its sizes survive a reload),
  // so it wires on the app root right away: a remembered size is in place
  // before the example first paints.
  // The responsive drawer example's wiring keeps its overlay transient.
  workbench: {
    reset: resetWorkbenchDemo,
    target: 'app',
    wire: (root) => {
      const stopResizable = wireWorkbench(root, {
        id: RESIZABLE_WORKBENCH_ID,
        panels: {
          leftRail: {
            size: workbenchNavigatorSize,
            storageKey: 'kerf-ui-demo.workbench.navigator',
            collapsed: workbenchNavigatorCollapsed,
            // A detached menu or dialog launched from this rail can keep it
            // open by placing its root at this app-owned portal anchor.
            keepOpenOn: (target) =>
              target instanceof Element &&
              target.id === 'catalog-workbench-portal',
          },
          rightRail: {
            size: workbenchInspectorSize,
            storageKey: 'kerf-ui-demo.workbench.inspector',
            collapsed: workbenchInspectorCollapsed,
          },
          bottomDrawer: {
            size: workbenchConsoleSize,
            storageKey: 'kerf-ui-demo.workbench.console',
          },
        },
        onResize: ({ panel, size }) => {
          const name = {
            leftRail: 'Navigator',
            rightRail: 'Inspector',
            bottomDrawer: 'Console',
          }[panel];
          actionLog.value = `${name} resized to ${size}px`;
        },
      });
      const stopResponsiveDrawer = wireWorkbench(root, {
        id: RESPONSIVE_DRAWER_WORKBENCH_ID,
        panels: { bottomDrawer: { collapsed: workbenchOutputCollapsed } },
      });
      const stopCollapsed = wireWorkbench(root, {
        id: COLLAPSED_WORKBENCH_ID,
        panels: {
          leftRail: { collapsed: workbenchCollapsedNavigator },
          bottomDrawer: { collapsed: workbenchConsoleCollapsed },
        },
      });
      const stopNavigation = wireWorkbench(root, {
        id: NAVIGATION_WORKBENCH_ID,
        panels: { rightRail: { collapsed: workbenchTicketRailCollapsed } },
      });
      const ticketStack = root.querySelector<HTMLElement>(
        `#${NAVIGATION_STACK_ID}`,
      );
      const stopTicketStack = ticketStack
        ? wireNavStack(ticketStack, { onBack: popWorkbenchTicket })
        : () => {};
      return () => {
        stopTicketStack();
        stopNavigation();
        stopCollapsed();
        stopResponsiveDrawer();
        stopResizable();
      };
    },
  },
};

// One wiring per target: switching routes disposes the previous route's wire
// (an app wire at once, a canvas wire on the next frame) before the new one.
const stopRouteWire: Record<RouteWire['target'], (() => void) | null> = {
  app: null,
  canvas: null,
};
const stopRouteWireEffect = effect(() => {
  const route = routeWires[selectedDemo.value];
  stopRouteWire.app?.();
  stopRouteWire.app = null;
  route?.reset?.();
  if (route?.target === 'app') stopRouteWire.app = route.wire(app);
  window.requestAnimationFrame(() => {
    stopRouteWire.canvas?.();
    stopRouteWire.canvas = null;
    const canvas = document.querySelector<HTMLElement>('.kui-catalog__canvas');
    if (route?.target === 'canvas' && canvas)
      stopRouteWire.canvas = route.wire(canvas);
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
  if (isRecipeId(selectedDemo.value))
    recipeControllers.get(selectedDemo.value)?.change?.(element as HTMLElement);
};
const stopRecipeChanges = delegate(
  app,
  'change',
  '[data-recipe] wa-select, [data-recipe] wa-input, [data-recipe] wa-textarea',
  dispatchRecipeChange,
);
const stopRecipeInputs = delegate(
  app,
  'input',
  '[data-recipe] wa-input, [data-recipe] wa-textarea',
  dispatchRecipeChange,
);
const stopRecipeDialogs = delegate(
  app,
  'wa-after-hide',
  '[data-recipe] wa-dialog',
  (_event, element) => {
    if (isRecipeId(selectedDemo.value))
      recipeControllers
        .get(selectedDemo.value)
        ?.afterHide?.(element as HTMLElement);
  },
);
const stopTokenSearch = delegate(
  app,
  'input',
  '[data-demo-token-search="true"]',
  (_event, element) => {
    const value = readTokenSearchField(
      element as HTMLElement,
      tokenSearchTokens.value,
    );
    tokenSearchQuery.value = value.query;
    tokenSearchTokens.value = value.tokens;
  },
);
const stopToolbarFind = delegate(
  app,
  'input',
  '[data-demo-toolbar-find="true"]',
  (_event, element) => {
    toolbarFindQuery.value = readTokenSearchField(element as HTMLElement).query;
  },
);
// The collapsible fields' expand/collapse/focus is managed by the wire helper (on by
// default). The app only adopts each field's open signal so the render reflects it;
// the standalone collapsible field tracks no query — the helper reads live DOM.
const stopTokenSearchSubmits = wireTokenSearchFields(app, {
  models: { 'grammar-search': grammarSearchModel },
  onSubmit: ({ id }) => {
    actionLog.value =
      id === 'toolbar-find' ? 'Find submitted' : 'Search submitted';
  },
  collapsible: {
    signals: {
      'toolbar-find': toolbarFindOpen,
      'collapsible-search': collapsibleSearchOpen,
      'toolbar-group-search': toolbarGroupSearchOpen,
      'toolbar-stack-search': toolbarStackSearchOpen,
      'adoption-search': adoptionOpen,
    },
  },
});
const stopToolbarWidthVisibility = wireToolbarVisibility(app);
// The opt-in chip keyboard + onEdit are demonstrated ONLY on the adoption-knobs
// field, so wire a second helper scoped to that field's container (the app-wide
// helper above stays keyboard-free, leaving the other token-search demos on their
// browser-removal + caret-restore path). Collapse stays owned by the app-wide
// helper; this scoped one only adds the keyboard + onEdit hooks.
// The floating toolbar is a manual on/off toggle that auto-hides when the viewer
// leaves this component demo (it makes no sense floating over another demo).
const stopFloatingToolbarReset = effect(() => {
  if (selectedDemo.value !== 'floating-toolbar')
    floatingToolbarOpen.value = false;
});
let stopAdoptionKeyboard: (() => void) | null = null;
const stopAdoptionKeyboardEffect = effect(() => {
  const id = selectedDemo.value;
  window.requestAnimationFrame(() => {
    stopAdoptionKeyboard?.();
    stopAdoptionKeyboard = null;
    if (id !== 'token-search-field') return;
    const container = app
      .querySelector<HTMLElement>('[data-demo-adoption-search]')
      ?.closest<HTMLElement>('[data-catalog-example]');
    if (!container) return;
    stopAdoptionKeyboard = wireTokenSearchFields(container, {
      collapsible: false,
      onEdit: ({ editor, event }) => {
        const value = readTokenSearchField(editor, adoptionTokens.value);
        batch(() => {
          adoptionQuery.value = value.query;
          adoptionTokens.value = value.tokens;
        });
        // The originating InputEvent lets the app gate on how the edit happened
        // (typed vs. pasted, whitespace-terminated, …) without a second listener.
        adoptionReadout.value = `Editing: ${value.query ? `"${value.query}"` : 'empty'} · ${adoptionTokens.value.length} filters · ${event.inputType}`;
      },
      keyboard: {
        onRemoveToken: ({ value, direction }) => {
          adoptionTokens.value = adoptionTokens.value.filter(
            (token) => token.value !== value,
          );
          adoptionReadout.value = `Removed ${value} · ${adoptionTokens.value.length} filters`;
          actionLog.value = `Removed ${value} (${direction === 'backward' ? 'Backspace' : 'Delete'})`;
        },
      },
    });
  });
});
const stopListItemDragOver = delegate(
  app,
  'dragover',
  '[data-demo-drop-status="ready"]',
  (event, element) => {
    event.preventDefault();
    (element as HTMLElement).dataset.demoDropStatus = 'over';
    app
      .querySelector<HTMLOutputElement>('.catalog-log')
      ?.replaceChildren('Drop target ready');
  },
);
const stopListItemDrop = delegate(
  app,
  'drop',
  '[data-demo-drop-status="over"]',
  (event, element) => {
    event.preventDefault();
    actionLog.value = `Dropped on ${(element as HTMLElement).dataset.itemId ?? 'menu item'}`;
  },
);
const stopListActionRowDoubleClick = delegate(
  app,
  'dblclick',
  '[data-component="list-action-row"] > [data-action="select-list-action-row"]',
  (_event, element) => {
    actionLog.value = `Double-clicked ${(element as HTMLElement).dataset.itemId ?? 'row'} primary`;
  },
);
const stopListActionRowContextMenu = delegate(
  app,
  'contextmenu',
  '[data-component="list-action-row"] > [data-action="select-list-action-row"]',
  (event, element) => {
    event.preventDefault();
    actionLog.value = `Context menu for ${(element as HTMLElement).dataset.itemId ?? 'row'} primary`;
  },
);
const stopPopupMenuContextDemo = delegate(
  app,
  'contextmenu',
  '[data-popup-menu-context-target]',
  (event) => {
    event.preventDefault();
    const menu = app.querySelector<PopupMenuElement>(
      '[data-popup-context-menu]',
    );
    if (menu)
      openPopupMenuAt(
        menu,
        (event as MouseEvent).clientX,
        (event as MouseEvent).clientY,
      );
  },
);
const stopAnchoredSurfaceDemo = delegate(
  app,
  'click',
  '[data-anchored-surface-trigger]',
  (event, element) => {
    const trigger = element as HTMLElement;
    const point = trigger.dataset.anchoredSurfaceTrigger === 'pointer';
    const content = () => (
      <div>
        <Text>Choose how to use this field in your workspace.</Text>
        <button type="button" data-anchored-surface-action>
          Got it
        </button>
      </div>
    );
    const options = { label: 'Field help' };
    const handle = point
      ? openAnchoredSurfaceAt(
          {
            x: (event as MouseEvent).clientX,
            y: (event as MouseEvent).clientY,
            context: trigger,
          },
          content,
          options,
        )
      : openAnchoredSurface(trigger, content, options);
    handle.el
      .querySelector('[data-anchored-surface-action]')
      ?.addEventListener('click', () => handle.close());
  },
);
const stopAnchoredSurfaceContextDemo = delegate(
  app,
  'contextmenu',
  '[data-anchored-surface-trigger="pointer"]',
  (event, element) => {
    event.preventDefault();
    const mouse = event as MouseEvent;
    const handle = openAnchoredSurfaceAt(
      { x: mouse.clientX, y: mouse.clientY, context: element },
      () => <Text>Right-click help at this location.</Text>,
      { label: 'Pointer help', initialFocus: false },
    );
    void handle.result;
  },
);
const stopAnchoredSurfaceOpenModal = delegate(
  app,
  'click',
  '[data-anchored-surface-open-modal]',
  () =>
    app
      .querySelector<HTMLDialogElement>('[data-anchored-surface-modal]')
      ?.showModal(),
);
const stopAnchoredSurfaceCloseModal = delegate(
  app,
  'click',
  '[data-anchored-surface-close-modal]',
  () =>
    app
      .querySelector<HTMLDialogElement>('[data-anchored-surface-modal]')
      ?.close(),
);
const updateAnimationSetting = (element: Element): void => {
  const demo = animationDemoFrom(element);
  if (!demo) return;
  const control = element as HTMLElement & { value?: string };
  const value = control.value ?? '';
  if (control.getAttribute('name') === 'animation-preset')
    demo.animation.name = value;
  if (control.getAttribute('name') === 'animation-easing')
    demo.animation.easing = value;
  if (control.getAttribute('name') === 'animation-duration') {
    demo.animation.duration = Number(value);
    element
      .closest('[data-animation-demo]')
      ?.querySelector<HTMLOutputElement>('[data-animation-duration]')
      ?.replaceChildren(`${value} ms`);
  }
  if (control.getAttribute('name') === 'animation-rate') {
    demo.animation.playbackRate = Number(value);
    element
      .closest('[data-animation-demo]')
      ?.querySelector<HTMLOutputElement>('[data-animation-rate]')
      ?.replaceChildren(`${value}×`);
  }
  demo.output.textContent = 'Settings updated';
};
const stopAnimationSelects = delegate(
  app,
  'change',
  'wa-select[name^="animation-"]',
  (_event, element) => {
    updateAnimationSetting(element);
  },
);
const stopAnimationRanges = delegate(
  app,
  'input',
  'input[name^="animation-"]',
  (_event, element) => {
    updateAnimationSetting(element);
  },
);
const stopAnimationEvents = [
  delegate(app, 'wa-start', 'wa-animation', (_event, element) => {
    const demo = animationDemoFrom(element);
    if (demo) demo.output.textContent = `Playing ${demo.animation.name}`;
  }),
  delegate(app, 'wa-finish', 'wa-animation', (_event, element) => {
    const demo = animationDemoFrom(element);
    if (demo) demo.output.textContent = 'Finished';
  }),
  delegate(app, 'wa-cancel', 'wa-animation', (_event, element) => {
    const demo = animationDemoFrom(element);
    if (demo) demo.output.textContent = 'Canceled';
  }),
];
const stopIntersectionObserver = delegateCapture(
  app,
  'wa-intersect',
  'wa-intersection-observer',
  (event, element) => {
    const entry = (event as CustomEvent<{ entry?: IntersectionObserverEntry }>)
      .detail?.entry;
    const output = element
      .closest('[data-observer-demo]')
      ?.querySelector<HTMLOutputElement>('[data-observer-output]');
    if (!entry || !output) return;
    output.textContent = entry.isIntersecting
      ? `Target visible · ${Math.round(entry.intersectionRatio * 100)}%`
      : 'Target outside the observer root';
  },
);
const stopMutationObserver = delegate(
  app,
  'wa-mutation',
  'wa-mutation-observer',
  (event, element) => {
    const mutations =
      (event as CustomEvent<{ mutationList?: MutationRecord[] }>).detail
        ?.mutationList ?? [];
    const output = element
      .closest('[data-observer-demo]')
      ?.querySelector<HTMLOutputElement>('[data-observer-output]');
    if (!output) return;
    output.textContent = `Observed ${mutations.length} mutation${mutations.length === 1 ? '' : 's'}`;
  },
);
const stopResizeObserver = delegate(
  app,
  'wa-resize',
  'wa-resize-observer',
  (event, element) => {
    const entry = (event as CustomEvent<{ entries?: ResizeObserverEntry[] }>)
      .detail?.entries?.[0];
    const output = element
      .closest('[data-observer-demo]')
      ?.querySelector<HTMLOutputElement>('[data-observer-output]');
    if (!entry || !output) return;
    output.textContent = `Observed width · ${Math.round(entry.contentRect.width)}px`;
  },
);
const stopContentItems = wireContentItems(app);
const stopTabBars = wireTabBars(app, {
  onReorder: ({ barId, sourceId, targetId, position, source }) => {
    tabBarTabs.value = reorderTabs(
      tabBarTabs.value,
      (tab) => tab.id,
      sourceId,
      targetId,
      position,
    );
    actionLog.value = `${source === 'pointer' ? 'Dragged' : 'Moved'} ${sourceId} ${position} ${targetId} in ${barId}`;
  },
});
const syncSystemTheme = (event: MediaQueryListEvent): void => {
  if (!explicitTheme) effectiveTheme.value = preferredDemoTheme(event.matches);
};
systemDarkTheme.addEventListener('change', syncSystemTheme);

window.addEventListener(
  'pagehide',
  () => {
    stopActions();
    stopCatalog();
    stopResize();
    stopSelect();
    stopRecipeNav?.();
    stopRecipeNavEffect();
    stopRouteWire.app?.();
    stopRouteWire.canvas?.();
    stopRouteWireEffect();
    stopRecipeWire?.();
    stopRecipeWireEffect();
    stopRecipeChanges();
    stopRecipeInputs();
    stopRecipeDialogs();
    stopTokenSearch();
    stopToolbarFind();
    stopTokenSearchSubmits();
    stopToolbarWidthVisibility();
    stopAdoptionKeyboard?.();
    stopAdoptionKeyboardEffect();
    stopFloatingToolbarReset();
    stopListItemDragOver();
    stopListItemDrop();
    stopListActionRowDoubleClick();
    stopListActionRowContextMenu();
    stopPopupMenuContextDemo();
    stopAnchoredSurfaceDemo();
    stopAnchoredSurfaceContextDemo();
    stopAnchoredSurfaceOpenModal();
    stopAnchoredSurfaceCloseModal();
    stopAnimationSelects();
    stopAnimationRanges();
    stopAnimationEvents.forEach((dispose) => dispose());
    stopIntersectionObserver();
    stopMutationObserver();
    stopResizeObserver();
    stopTabBars();
    stopContentItems();
    systemDarkTheme.removeEventListener('change', syncSystemTheme);
  },
  { once: true },
);
