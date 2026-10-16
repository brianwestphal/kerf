import '@kerfjs/ui/surface-scaffold/register';
import '@kerfjs/ui/document.css';
import '@kerfjs/ui/overlay-sheet.css';
import '@kerfjs/ui/overlay-toast.css';
import '@kerfjs/ui/overlay-tooltip.css';
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
import {
  openPopupMenu,
  openPopupMenuAt,
  type PopupMenuElement,
} from '@kerfjs/ui/popup-menu';
import { readSearchField } from '@kerfjs/ui/search-field';
import { applySelection, selectionGesture } from '@kerfjs/ui/selection';
import { closeDialog, openDialog } from '@kerfjs/ui/surface-scaffold';
import { Text } from '@kerfjs/ui/text';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { revealCatalogEntry, wireCatalog } from '@kerfjs/ui/wire-catalog';
import { wireCheckboxes } from '@kerfjs/ui/wire-checkboxes';
import { readChoiceChips, wireChoiceChips } from '@kerfjs/ui/wire-choice-chips';
import { wireColorFields } from '@kerfjs/ui/wire-color-fields';
import { wireColorPickers } from '@kerfjs/ui/wire-color-pickers';
import { wireComboboxes } from '@kerfjs/ui/wire-comboboxes';
import {
  isContentItemActivation,
  wireContentItems,
} from '@kerfjs/ui/wire-content-items';
import { wireFilePickers } from '@kerfjs/ui/wire-file-pickers';
import { wireListFocusScroll } from '@kerfjs/ui/wire-list-focus-scroll';
import {
  reorderListItems,
  wireListReorder,
} from '@kerfjs/ui/wire-list-reorder';
import { wireMessageComposers } from '@kerfjs/ui/wire-message-composers';
import { wireNavStack } from '@kerfjs/ui/wire-nav-stack';
import { wireOverlaySheets } from '@kerfjs/ui/wire-overlay-sheets';
import { wirePaneChrome } from '@kerfjs/ui/wire-pane-chrome';
import { wireResizableRegions } from '@kerfjs/ui/wire-resizable-regions';
import { wireSearchFields } from '@kerfjs/ui/wire-search-fields';
import { wireSidebar } from '@kerfjs/ui/wire-sidebar';
import { wireSliders } from '@kerfjs/ui/wire-sliders';
import { reorderTabs, wireTabBars } from '@kerfjs/ui/wire-tab-bars';
import { wireTabNavigator } from '@kerfjs/ui/wire-tab-navigator';
import { wireTagFields } from '@kerfjs/ui/wire-tag-fields';
import { wireTextFields } from '@kerfjs/ui/wire-text-fields';
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
import type { OverlayHandle } from 'kerfjs/overlay';
import { StickyNote } from 'lucide';

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
import { applyBadgeSetting } from './demos/badge.js';
import { checkboxTaskChoices } from './demos/checkbox.js';
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
  COLOR_FIELD_DEMO_PRESETS,
  resetColorFieldDemo,
  setColorFieldDemo,
} from './demos/color-field.js';
import {
  ADD_COLOR_SAMPLE_DEMO_ACTION,
  addColorSampleDemo,
  resetColorPickerDemo,
  setColorPickerDemo,
} from './demos/color-picker.js';
import {
  PICK_SWATCH_DEMO_ACTION,
  pickSwatchDemo,
  resetColorSwatchesDemo,
} from './demos/color-swatches.js';
import {
  popListDetailDialogDemo,
  resetListDetailDialogDemo,
  SELECT_LIST_DETAIL_PROJECT_ACTION,
  selectListDetailDialogProject,
} from './demos/list-detail-dialog.js';
import { SEND_COMPOSER_DEMO_ACTION } from './demos/message-composer.js';
import {
  compactFiltersOpen,
  popConfiguredNavStackDemo,
  popNavStackDemo,
  popOverlayNavStackDemo,
  pushConfiguredNavStackDemo,
  pushNavStackDemo,
  pushOverlayNavStackDemo,
  resetNavStackDemo,
  TOGGLE_COMPACT_CHROME_DEMO_ACTION,
  toggleCompactChromeDemo,
} from './demos/nav-stack.js';
import {
  resetProgressDemo,
  STEP_PROGRESS_DEMO_ACTION,
  stepProgressDemo,
} from './demos/progress-bar.js';
import { demos, demoSettings } from './demos/registry.js';
import {
  SearchFieldHelp,
  TOKEN_SEARCH_HELP_SURFACE_ID,
} from './demos/search-field.js';
import {
  resetSliderDemo,
  SET_SLIDER_DEMO_ACTION,
  setSliderDemoValue,
} from './demos/slider.js';
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
  buttonToggleConversationOpen,
  checkboxTasks,
  choiceChipsColor,
  choiceChipsDialogColor,
  choiceChipsIcon,
  choiceChipsIntents,
  choiceChipsLabels,
  choiceChipsView,
  choiceChipsWorkspaces,
  collapsibleSearchOpen,
  comboboxTags,
  contentCardChoice,
  contentCardSelected,
  contentCardSelections,
  contentSwapFaded,
  contentSwapStep,
  conversationSelections,
  customDisclosureOpen,
  disclosureOpen,
  displayDensity,
  edgeActivityBusy,
  edgeActivityMessage,
  filePickerFiles,
  floatingToolbarOpen,
  grammarSearchModel,
  gridTileSelections,
  iconTileCurrent,
  inspectorSection,
  itemTypes,
  menuActionCurrent,
  menuActionPressed,
  menuToolsOpen,
  popupContextAnchor,
  popupSortChoice,
  radioDensity,
  regionSize,
  reorderCommands,
  reorderFiles,
  reorderSelection,
  searchFieldHelpOpen,
  searchFieldQuery,
  searchFieldTokens,
  selectedChoice,
  selectViewTitle,
  sizedDisclosureOpen,
  splitButtonOptionsOpen,
  splitButtonRunning,
  summaryRowSelected,
  switchLiveUpdates,
  tabBarActive,
  tabBarTabs,
  ticketLabelFilter,
  ticketLabels,
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
  CHAT_DIALOG_ID,
  discardDraftSheet,
  openUpNextSheet,
  resetSurfaceScaffoldDemo,
  SEND_CHAT_DIALOG_MESSAGE_ACTION,
  sendSurfaceScaffoldChatMessage,
} from './demos/surface-scaffold.js';
import {
  popNestedTabNavigatorDemo,
  pushNestedTabNavigatorDemo,
  resetTabNavigatorDemo,
  selectNestedTabNavigatorDemo,
  selectOverlayTabNavigatorDemo,
  selectTabNavigatorDemo,
} from './demos/tab-navigator.js';
import {
  rejectTagFieldDemoValue,
  resetTagFieldDemo,
  setTagFieldDemoTags,
} from './demos/tag-field.js';
import { SHOW_TOAST_DEMO_ACTION, showToastDemo } from './demos/toast.js';
import { wireTooltipDemo } from './demos/tooltip.js';
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
  resetWorkbenchDialogDemo,
  SELECT_WORKBENCH_DIALOG_LAYER_ACTION,
  selectWorkbenchDialogLayer,
  TOGGLE_WORKBENCH_DIALOG_INSPECTOR_ACTION,
  TOGGLE_WORKBENCH_DIALOG_LAYERS_ACTION,
  toggleWorkbenchDialogInspector,
  toggleWorkbenchDialogLayers,
  WORKBENCH_DIALOG_DEMO_ID,
  workbenchDialogInspectorCollapsed,
  workbenchDialogLayersCollapsed,
} from './demos/workbench-dialog.js';
import {
  readDemoDisplayPreferences,
  writeDemoDisplayPreferences,
} from './display-preferences.js';
import { isRecipeId, type RecipeId, recipeLoaders } from './recipes/loaders.js';
import type { RecipeController, RecipePresentation } from './recipes/types.js';

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
// Discouraged Web Awesome entries stay out of the sidebar until the viewer
// asks for them; a direct ?component= route still lists its own entry.
const showDiscouragedWebAwesome = signal(false);
const sidebarCollapsed = signal(false);
const settingsCollapsed = signal(false);
const recipeNotesVisible = signal(false);
let nextDemoTabNumber = tabBarTabs.value.length + 1;
/** How long a newly added application tab stays pending in the demo. */
const DEMO_TAB_LOAD_MS = 1200;
const actionLog = signal('Catalog ready');
let searchFieldHelp: OverlayHandle | undefined;
const uxReviewProject = signal<string | null>(null);
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
      return <LoadingSpinner label={`Loading ${selected.name} recipe…`} />;
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
    return <LoadingSpinner label={`Loading ${selected.name} preview…`} />;
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
    group: 'Used By',
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
      return 'Web Awesome integration · optional · Kerf theme';
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
        label: 'Web Awesome Integration',
        collapsible: true,
        expanded: webAwesomeExpanded.value,
        sections: kuiWebAwesomeSections,
        tagFilter: {
          tag: 'Discouraged',
          label: 'Show Discouraged',
          show: showDiscouragedWebAwesome.value,
        },
      }}
      active={selectedDemo.value}
      collapsed={sidebarCollapsed.value}
      settings={
        isRecipeId(selected.id) || selected.source === 'webawesome'
          ? undefined
          : demoSettings[selected.id as keyof typeof demoSettings]?.()
      }
      settingsCollapsed={settingsCollapsed.value}
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
      uxReview={
        uxReviewProject.value
          ? { projectDirectory: uxReviewProject.value, name: 'Kerf UI' }
          : undefined
      }
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
                    ? 'Hide Recipe Notes'
                    : 'Show Recipe Notes'
                }
                aria-pressed={String(recipeNotesVisible.value)}
              >
                <LucideIcon icon={StickyNote} name="sticky-note" />
              </button>
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

// Multi-select List and Grid cards use the shared desktop selection model:
// a click (or Enter/Space) selects one card, Cmd/Ctrl toggles one, and Shift
// extends a range from the anchor kept per selection group.
const selectionAnchors = new WeakMap<Element, string>();
function selectCard(
  event: Event,
  card: HTMLElement,
  selected: readonly string[],
): string[] {
  const group = card.closest('[aria-multiselectable="true"]')!;
  const items = Array.from(
    group.querySelectorAll<HTMLElement>(
      '[data-selection-mode="multiple"][data-item-id]:not([data-disabled="true"])',
    ),
  )
    .filter((item) => item.closest('[aria-multiselectable="true"]') === group)
    .map((item) => item.dataset.itemId!);
  const result = applySelection({
    items,
    selected,
    anchor: selectionAnchors.get(group),
    target: card.dataset.itemId!,
    gesture: selectionGesture(event as MouseEvent),
  });
  selectionAnchors.set(group, result.anchor);
  return result.selected;
}
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
  'open-up-next-sheet': () => {
    void openUpNextSheet().then((song) => {
      actionLog.value =
        song === undefined ? 'Up Next closed' : `Playing ${song}`;
    });
  },
  'open-overlay-sheet': () => {
    void discardDraftSheet().then((discard) => {
      actionLog.value = discard ? 'Draft discarded' : 'Kept editing';
    });
  },
  'show-wa-dialog': (_event, target) => {
    actionLog.value = 'Dialog opened';
    const dialog = document.querySelector<HTMLElement & { open: boolean }>(
      `#${target.getAttribute('data-dialog-id') ?? 'catalog-wa-dialog'}`,
    );
    if (dialog) dialog.open = true;
  },
  'show-dialog': (_event, target) => {
    actionLog.value = 'Dialog opened';
    const dialog = document.getElementById(
      target.getAttribute('data-dialog-id') ?? '',
    );
    if (dialog instanceof HTMLDialogElement) openDialog(dialog);
  },
  'save-choice-chips-dialog': () => {
    const form = document.querySelector<HTMLFormElement>(
      '#choice-chips-dialog-form',
    );
    const color = form ? new FormData(form).get('color') : null;
    actionLog.value = `Saved color: ${typeof color === 'string' ? color : 'none'}`;
    const dialog = document.getElementById('choice-chips-dialog');
    if (dialog instanceof HTMLDialogElement) closeDialog(dialog);
  },
  [SEND_CHAT_DIALOG_MESSAGE_ACTION]: (_event, target) => {
    // The chat and floating title bar examples share this action.
    const dialog =
      target.closest('dialog') ?? document.getElementById(CHAT_DIALOG_ID);
    const field = dialog?.querySelector<HTMLTextAreaElement>(
      '.kui-dialog-surface__footer textarea',
    );
    if (!field || !sendSurfaceScaffoldChatMessage(field.value, dialog?.id))
      return;
    field.value = '';
    actionLog.value = 'Message sent';
    // The transcript owns its scrolling; show the newest message.
    window.requestAnimationFrame(() => {
      const transcript = dialog?.querySelector('[data-demo-chat-transcript]');
      transcript?.scrollTo({ top: transcript.scrollHeight });
    });
  },
  [SELECT_LIST_DETAIL_PROJECT_ACTION]: (_event, target) => {
    const id = target.getAttribute('data-item-id');
    if (!id) return;
    selectListDetailDialogProject(id);
    actionLog.value = `Selected ${id}`;
  },
  [TOGGLE_COMPACT_CHROME_DEMO_ACTION]: () => {
    actionLog.value = toggleCompactChromeDemo()
      ? 'Filters shown'
      : 'Filters hidden';
  },
  [SELECT_WORKBENCH_DIALOG_LAYER_ACTION]: (_event, target) => {
    const id = target.getAttribute('data-item-id');
    if (!id) return;
    selectWorkbenchDialogLayer(id);
    actionLog.value = `Selected ${id}`;
  },
  [TOGGLE_WORKBENCH_DIALOG_LAYERS_ACTION]: () => {
    actionLog.value = toggleWorkbenchDialogLayers()
      ? 'Layers hidden'
      : 'Layers shown';
  },
  [TOGGLE_WORKBENCH_DIALOG_INSPECTOR_ACTION]: () => {
    actionLog.value = toggleWorkbenchDialogInspector()
      ? 'Inspector hidden'
      : 'Inspector shown';
  },
  [SHOW_TOAST_DEMO_ACTION]: (_event, target) => {
    const kind = target.getAttribute('data-toast') ?? 'plain';
    showToastDemo(kind);
    actionLog.value = `Toast shown: ${kind}`;
  },
  [STEP_PROGRESS_DEMO_ACTION]: () => {
    actionLog.value = `Uploaded ${stepProgressDemo()} of 12 files`;
  },
  [ADD_COLOR_SAMPLE_DEMO_ACTION]: () => {
    addColorSampleDemo();
    actionLog.value = 'Added to User Colors';
  },
  [SEND_COMPOSER_DEMO_ACTION]: (_event, target) => {
    const id = target.getAttribute('data-message-composer-id') ?? '';
    const field = document.getElementById(id);
    if (!(field instanceof HTMLTextAreaElement)) return;
    const text = field.value.trim();
    actionLog.value = text ? `Sent: ${text}` : 'Nothing to send';
    if (text) field.value = '';
    field.focus();
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
      { id, name: `New Tab ${tabNumber}`, pending: true },
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
  'toggle-split-button-demo': () => {
    splitButtonRunning.value = !splitButtonRunning.value;
    actionLog.value = splitButtonRunning.value
      ? 'Drive started'
      : 'Drive stopped';
  },
  'toggle-split-button-options-demo': () => {
    splitButtonOptionsOpen.value = !splitButtonOptionsOpen.value;
    actionLog.value = splitButtonOptionsOpen.value
      ? 'Drive options opened'
      : 'Drive options closed';
  },
  'select-summary-row-demo': (_event, element) => {
    const id = element.getAttribute('data-item-id');
    if (id) summaryRowSelected.value = id;
  },
  'clear-file-picker-demo': () => {
    filePickerFiles.value = [];
  },
  'content-swap-next': () => {
    contentSwapStep.value = 'b';
  },
  'content-swap-back': () => {
    contentSwapStep.value = 'a';
  },
  'content-swap-fade': () => {
    contentSwapFaded.value = contentSwapFaded.value === 'a' ? 'b' : 'a';
  },
  'toggle-edge-activity-demo': () => {
    edgeActivityBusy.value = !edgeActivityBusy.value;
    actionLog.value = edgeActivityBusy.value ? 'Server busy' : 'Server idle';
  },
  'toggle-edge-activity-message-demo': () => {
    edgeActivityMessage.value = !edgeActivityMessage.value;
  },
  'toggle-button-demo': () => {
    buttonToggleConversationOpen.value = !buttonToggleConversationOpen.value;
    actionLog.value = buttonToggleConversationOpen.value
      ? 'Conversation shown'
      : 'Conversation hidden';
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
  'toggle-search-field-help': (_event, element) => {
    if (searchFieldHelp) {
      searchFieldHelp.close();
      return;
    }
    const handle = openAnchoredSurface(element, () => <SearchFieldHelp />, {
      label: 'Search Syntax',
      align: 'end',
      initialFocus: false,
    });
    handle.el.id = TOKEN_SEARCH_HELP_SURFACE_ID;
    searchFieldHelp = handle;
    searchFieldHelpOpen.value = true;
    actionLog.value = 'Search help opened';
    void handle.result.then(() => {
      if (searchFieldHelp === handle) searchFieldHelp = undefined;
      searchFieldHelpOpen.value = false;
    });
  },
  'edit-search-token': (_event, element) => {
    const value = element.getAttribute('data-token-value');
    const token = searchFieldTokens.value.find(
      (candidate) => candidate.value === value,
    );
    if (!token) return;
    const offset = token.offset ?? searchFieldQuery.value.length;
    batch(() => {
      searchFieldTokens.value = searchFieldTokens.value.filter(
        (candidate) => candidate.value !== value,
      );
      searchFieldQuery.value = `${searchFieldQuery.value.slice(0, offset)}${token.value} ${searchFieldQuery.value.slice(offset)}`;
    });
    actionLog.value = `Editing ${token.label}`;
  },
  'remove-search-token': (_event, element) => {
    const value = element.getAttribute('data-token-value');
    searchFieldTokens.value = searchFieldTokens.value.filter(
      (token) => token.value !== value,
    );
    actionLog.value = `Removed ${value}`;
  },
  'add-adoption-token': (_event, element) => {
    // Clicking a suggestion in the data-search-field-keep-open surface must not
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
      .closest('[data-component="search-field"]')
      ?.querySelector<HTMLElement>('[data-search-field-editor]');
    if (editor) editor.textContent = '';
    batch(() => {
      adoptionQuery.value = '';
      adoptionTokens.value = [];
      adoptionReadout.value = 'Search cleared';
    });
  },
  'clear-search-field': (_event, element) => {
    const editor = element
      .closest('[data-component="search-field"]')
      ?.querySelector<HTMLElement>('[data-search-field-editor]');
    if (editor) editor.textContent = '';
    batch(() => {
      searchFieldQuery.value = '';
      searchFieldTokens.value = [];
    });
    actionLog.value = 'Search cleared';
  },
  'clear-toolbar-find': (_event, element) => {
    const editor = element
      .closest('[data-component="search-field"]')
      ?.querySelector<HTMLElement>('[data-search-field-editor]');
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
  'log-backdrop-track': () => {
    actionLog.value = 'Track selected';
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
  'log-tab-scaffold-message': (_event, element) => {
    const itemId = (element as HTMLElement).dataset.itemId ?? '';
    actionLog.value = `${itemId} opened`;
  },
  'log-result-picker': (_event, element) => {
    const itemId = (element as HTMLElement).dataset.itemId ?? '';
    actionLog.value = `Duplicate candidate ${itemId} selected`;
  },
  'select-icon-tile-row': (_event, element) => {
    const itemId = (element as HTMLElement).dataset.itemId ?? '';
    iconTileCurrent.value = itemId;
    actionLog.value = `${itemId} selected`;
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
  'edit-list-action-row': (_event, element) => {
    actionLog.value = `Edit ${element.closest<HTMLElement>('[data-component="list-action-row"]')?.dataset.itemId ?? 'row'}`;
  },
  'delete-list-action-row': (_event, element) => {
    actionLog.value = `Delete ${element.closest<HTMLElement>('[data-component="list-action-row"]')?.dataset.itemId ?? 'row'}`;
  },
  'toggle-reorder-row': (_event, element) => {
    const itemId = (element as HTMLElement).dataset.itemId ?? '';
    const pressed = reorderSelection.value.includes(itemId);
    reorderSelection.value = pressed
      ? reorderSelection.value.filter((id) => id !== itemId)
      : [...reorderSelection.value, itemId];
    actionLog.value = `${itemId} ${pressed ? 'not pressed' : 'pressed'}`;
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
  'log-chip-insert': (_event, element) => {
    actionLog.value = `Insert filter: ${(element as HTMLElement).dataset.itemId ?? ''}`;
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
    // The menu renders its anchor, so a re-render keeps the point.
    popupContextAnchor.value = { x: anchor.left, y: anchor.bottom };
    openPopupMenu(menu);
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
    contentCardSelections.value = selectCard(
      event,
      element as HTMLElement,
      contentCardSelections.value,
    );
    actionLog.value = `Selected ${contentCardSelections.value.length} demand lines`;
  },
  'select-conversation-message': (event, element) => {
    if (!isContentItemActivation(event, element as HTMLElement)) return;
    conversationSelections.value = selectCard(
      event,
      element as HTMLElement,
      conversationSelections.value,
    );
    actionLog.value = `Selected ${conversationSelections.value.length} messages`;
  },
  'select-grid-tile': (event, element) => {
    if (!isContentItemActivation(event, element as HTMLElement)) return;
    gridTileSelections.value = selectCard(
      event,
      element as HTMLElement,
      gridTileSelections.value,
    );
    actionLog.value = `Selected ${gridTileSelections.value.length} document tiles`;
  },
  'attach-composer-demo': () => {
    actionLog.value = 'Attach requested';
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
  'log-share': () => {
    actionLog.value = 'Share requested';
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
  'open-overlay-nav-stack-message': (_event, element) => {
    const messageId = (element as HTMLElement).dataset.itemId ?? '';
    pushOverlayNavStackDemo(messageId);
    actionLog.value = `Opened ${messageId}`;
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
  onUxReviewProject: (projectDirectory) => {
    uxReviewProject.value = projectDirectory;
  },
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
        'vertical-stripes': 'Vertical Stripes',
        'layout-guide': 'Layout Guide',
        surface: 'Surface',
        sunken: 'Sunken',
      }[style]
    }`;
  },
  onToggleSecondaryFilter: (show) => {
    showDiscouragedWebAwesome.value = show;
    actionLog.value = show
      ? 'Discouraged Web Awesome entries shown'
      : 'Discouraged Web Awesome entries hidden';
  },
  onToggleSecondary: () => {
    webAwesomeExpanded.value = !webAwesomeExpanded.value;
    actionLog.value = webAwesomeExpanded.value
      ? 'Web Awesome integration expanded'
      : 'Web Awesome integration collapsed';
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
  settingsCollapsed,
  onToggleSettings: () => {
    actionLog.value = settingsCollapsed.value
      ? 'Settings collapsed'
      : 'Settings expanded';
  },
});
const stopOverlaySheets = wireOverlaySheets();
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
const stopSelect = delegate(app, 'change', 'kui-select', (_event, element) => {
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
  if (
    typeof value === 'string' &&
    applyBadgeSetting(element.getAttribute('name'), value)
  ) {
    actionLog.value = `Badge ${element.getAttribute('name')!.slice('badge-playground-'.length)}: ${value}`;
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
        ['#catalog-nav-stack-overlay', popOverlayNavStackDemo],
      ];
      const stops = stacks.map(([selector, onBack]) => {
        const stack = canvas.querySelector(selector);
        return stack ? wireNavStack(stack, { onBack }) : () => {};
      });
      const compact = canvas.querySelector<HTMLElement>(
        '#catalog-nav-stack-compact-chrome',
      );
      if (compact)
        stops.push(wirePaneChrome(compact, { header: compactFiltersOpen }));
      return () => stops.forEach((stop) => stop());
    },
  },
  'progress-bar': {
    reset: resetProgressDemo,
    target: 'canvas',
    wire: () => () => {},
  },
  'progress-ring': {
    reset: resetProgressDemo,
    target: 'canvas',
    wire: () => () => {},
  },
  slider: { reset: resetSliderDemo, target: 'canvas', wire: () => () => {} },
  'color-field': {
    reset: resetColorFieldDemo,
    target: 'canvas',
    wire: () => () => {},
  },
  'color-picker': {
    reset: resetColorPickerDemo,
    target: 'canvas',
    wire: () => () => {},
  },
  'color-swatches': {
    reset: resetColorSwatchesDemo,
    target: 'canvas',
    wire: () => () => {},
  },
  'tag-field': {
    reset: resetTagFieldDemo,
    target: 'canvas',
    wire: () => () => {},
  },
  tooltip: {
    target: 'canvas',
    wire: (canvas) => wireTooltipDemo(canvas),
  },
  'workbench-dialog': {
    reset: resetWorkbenchDialogDemo,
    target: 'canvas',
    wire: (canvas) =>
      wireWorkbench(canvas, {
        id: `${WORKBENCH_DIALOG_DEMO_ID}-workbench`,
        panels: {
          leftRail: { collapsed: workbenchDialogLayersCollapsed },
          rightRail: { collapsed: workbenchDialogInspectorCollapsed },
        },
      }),
  },
  'list-detail-dialog': {
    reset: resetListDetailDialogDemo,
    target: 'canvas',
    wire: (canvas) => wireNavStack(canvas, { onBack: popListDetailDialogDemo }),
  },
  'surface-scaffold': {
    reset: resetSurfaceScaffoldDemo,
    target: 'canvas',
    wire: () => () => {},
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
      const overlay = canvas.querySelector('#catalog-tab-scaffold-overlay');
      const stack = canvas.querySelector('#catalog-tab-scaffold-project-stack');
      const stops = [
        first
          ? wireTabNavigator(first, { onSelect: selectTabNavigatorDemo })
          : () => {},
        nested
          ? wireTabNavigator(nested, { onSelect: selectNestedTabNavigatorDemo })
          : () => {},
        overlay
          ? wireTabNavigator(overlay, {
              onSelect: selectOverlayTabNavigatorDemo,
            })
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
  '[data-recipe] kui-select, [data-recipe] .kui-text-field__input',
  dispatchRecipeChange,
);
const stopRecipeInputs = delegate(
  app,
  'input',
  '[data-recipe] .kui-text-field__input',
  dispatchRecipeChange,
);
const stopRecipeDialogs = delegateCapture(
  app,
  'close',
  '[data-recipe] dialog.kui-dialog-surface',
  (_event, element) => {
    if (isRecipeId(selectedDemo.value))
      recipeControllers
        .get(selectedDemo.value)
        ?.afterHide?.(element as HTMLElement);
  },
);
const stopSearchField = delegate(
  app,
  'input',
  '[data-demo-search-field="true"]',
  (_event, element) => {
    const value = readSearchField(
      element as HTMLElement,
      searchFieldTokens.value,
    );
    searchFieldQuery.value = value.query;
    searchFieldTokens.value = value.tokens;
  },
);
const stopToolbarFind = delegate(
  app,
  'input',
  '[data-demo-toolbar-find="true"]',
  (_event, element) => {
    toolbarFindQuery.value = readSearchField(element as HTMLElement).query;
  },
);
// The collapsible fields' expand/collapse/focus is managed by the wire helper (on by
// default). The app only adopts each field's open signal so the render reflects it;
// the standalone collapsible field tracks no query — the helper reads live DOM.
const stopSearchFieldSubmits = wireSearchFields(app, {
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
const stopComboboxes = wireComboboxes(app, {
  onCommit: ({ value, created, input }) => {
    const tag = value.trim().replaceAll(/\s+/g, '-');
    if (!comboboxTags.value.includes(tag))
      comboboxTags.value = [...comboboxTags.value, tag];
    input.value = '';
    actionLog.value = `${created ? 'Created' : 'Added'} tag ${tag}`;
  },
});
const stopMessageComposers = wireMessageComposers(app);
const stopTextFields = wireTextFields(app);
const stopCheckboxes = wireCheckboxes(app);
const stopSliders = wireSliders(app);
const stopColorFields = wireColorFields(app, {
  onChange: ({ id, value, mode }) => {
    setColorFieldDemo(id, value, mode);
    actionLog.value = `${id}: ${value}`;
  },
  pickers: {
    'color-field-demo-fill': { presets: COLOR_FIELD_DEMO_PRESETS },
    'color-field-demo-border': { presets: COLOR_FIELD_DEMO_PRESETS },
  },
});
const stopColorPickers = wireColorPickers(app, {
  onChange: ({ id, value, mode }) => {
    if (id === 'color-picker-demo') setColorPickerDemo(value, mode);
    actionLog.value = `${id}: ${value}`;
  },
});
const stopSwatchDemo = delegate(
  app,
  'change',
  `[data-action="${PICK_SWATCH_DEMO_ACTION}"]`,
  (_event, element) => {
    const input = element as HTMLInputElement;
    pickSwatchDemo(input.name, input.value);
    actionLog.value = `${input.name}: ${input.getAttribute('aria-label') ?? input.value}`;
  },
);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const stopTagFields = wireTagFields(app, {
  onChange: ({ id, tags }) => {
    setTagFieldDemoTags(id, tags);
    actionLog.value = `${tags.length} tags`;
  },
  onReject: ({ id, value, reason }) =>
    rejectTagFieldDemoValue(id, value, reason),
  normalize: (value, id) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (id === 'tag-field-demo-recipients' && !EMAIL.test(trimmed))
      return undefined;
    return trimmed;
  },
});
const stopSliderDemo = delegate(
  app,
  'change',
  `[data-action="${SET_SLIDER_DEMO_ACTION}"]`,
  (_event, element) => {
    const input = element as HTMLInputElement;
    setSliderDemoValue(
      input.id.replace('slider-demo-', ''),
      Number(input.value),
    );
    actionLog.value = `${input.id.replace('slider-demo-', '')}: ${input.value}`;
  },
);
const stopChoiceChips = wireChoiceChips(app);
const stopFilePickers = wireFilePickers(app, {
  onFiles: ({ files, via }) => {
    filePickerFiles.value = [
      ...filePickerFiles.value,
      ...files.map((file) => file.name),
    ];
    actionLog.value = `${via === 'drop' ? 'Dropped' : 'Chose'} ${files.length} file${files.length === 1 ? '' : 's'}`;
  },
});
// The opt-in chip keyboard + onEdit are demonstrated ONLY on the adoption-knobs
// field, so wire a second helper scoped to that field's container (the app-wide
// helper above stays keyboard-free, leaving the other search-field demos on their
// browser-removal + caret-restore path). Collapse stays owned by the app-wide
// helper; this scoped one only adds the keyboard + onEdit hooks.
// The floating toolbar is a manual on/off toggle that auto-hides when the viewer
// leaves this component demo (it makes no sense floating over another demo).
const stopFloatingToolbarReset = effect(() => {
  if (selectedDemo.value !== 'floating-toolbar')
    floatingToolbarOpen.value = false;
});
// The edge activity strip pins to the whole page, so it stops when the viewer
// leaves its demo.
const stopEdgeActivityReset = effect(() => {
  if (selectedDemo.value !== 'edge-activity-indicator')
    edgeActivityBusy.value = false;
});
let stopAdoptionKeyboard: (() => void) | null = null;
const stopAdoptionKeyboardEffect = effect(() => {
  const id = selectedDemo.value;
  window.requestAnimationFrame(() => {
    stopAdoptionKeyboard?.();
    stopAdoptionKeyboard = null;
    if (id !== 'search-field') return;
    const container = app
      .querySelector<HTMLElement>('[data-demo-adoption-search]')
      ?.closest<HTMLElement>('[data-catalog-example]');
    if (!container) return;
    stopAdoptionKeyboard = wireSearchFields(container, {
      collapsible: false,
      onEdit: ({ editor, event }) => {
        const value = readSearchField(editor, adoptionTokens.value);
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
    // The status was set imperatively, so reset it the same way: a re-render
    // only reconciles elements whose markup changed, and this row's did not.
    (element as HTMLElement).dataset.demoDropStatus = 'ready';
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
    // A row with a trailing menu opens that menu at the pointer.
    const menu = element.parentElement?.querySelector<PopupMenuElement>(
      ':scope > [data-component="popup-menu"]',
    );
    if (menu) {
      const { clientX, clientY } = event as MouseEvent;
      openPopupMenuAt(menu, clientX, clientY);
      return;
    }
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
    if (!menu) return;
    popupContextAnchor.value = {
      x: (event as MouseEvent).clientX,
      y: (event as MouseEvent).clientY,
    };
    openPopupMenu(menu);
  },
);
const stopAnchoredSurfaceDemo = delegate(
  app,
  'click',
  '[data-anchored-surface-trigger]',
  (event, element) => {
    const trigger = element as HTMLElement;
    if (trigger.dataset.anchoredSurfaceTrigger === 'media') {
      // The volume popup and its slider load on first use, not with the shell.
      void import('./demos/anchored-surface-media.js').then((media) =>
        media.openMediaVolumeSurface(trigger),
      );
      return;
    }
    const point = trigger.dataset.anchoredSurfaceTrigger === 'pointer';
    const content = () => (
      <div>
        <Text>Choose how to use this field in your workspace.</Text>
        <button type="button" data-anchored-surface-action>
          Got It
        </button>
      </div>
    );
    const options = { label: 'Field Help' };
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
      { label: 'Pointer Help', initialFocus: false },
    );
    void handle.result;
  },
);
const stopAnchoredSurfaceOpenModal = delegate(
  app,
  'click',
  '[data-anchored-surface-open-modal]',
  () => {
    const dialog = app.querySelector<HTMLDialogElement>(
      'dialog[data-anchored-surface-modal]',
    );
    if (dialog) openDialog(dialog);
  },
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
const stopChoiceChipsDemo = delegateActions(app, 'change', {
  'checkbox-demo': (_event, element) => {
    const input = element as HTMLInputElement;
    if (input.name === 'tasks-all')
      checkboxTasks.value = input.checked
        ? checkboxTaskChoices.map((task) => task.value)
        : [];
    else if (input.name === 'tasks')
      checkboxTasks.value = checkboxTaskChoices
        .map((task) => task.value)
        .filter((value) =>
          value === input.value
            ? input.checked
            : checkboxTasks.value.includes(value),
        );
    const label = input.closest('label')?.textContent ?? '';
    actionLog.value = `${label}: ${input.checked ? 'checked' : 'unchecked'}`;
  },
  'radio-group-demo': (_event, element) => {
    const input = element as HTMLInputElement;
    if (input.name === 'layout-density')
      radioDensity.value = input.value as typeof radioDensity.value;
    actionLog.value = `Choice: ${input.value}`;
  },
  'switch-demo': (_event, element) => {
    const input = element as HTMLInputElement;
    const label = input.closest('label')?.textContent ?? '';
    if (label === 'Live updates') switchLiveUpdates.value = input.checked;
    actionLog.value = `${label}: ${input.checked ? 'on' : 'off'}`;
  },
  'choice-chips-demo': (_event, element) => {
    if (element.getAttribute('role') === 'listbox') {
      // A multi-select listbox fires change on the group itself.
      const selected = readChoiceChips(element);
      if (element.id === 'choice-chips-workspaces')
        choiceChipsWorkspaces.value = selected;
      actionLog.value = `Selected: ${selected.join(', ') || 'none'}`;
      return;
    }
    const input = element as HTMLInputElement;
    const group = input.closest('[data-component="choice-chips"]')?.id;
    if (group === 'choice-chips-color') choiceChipsColor.value = input.value;
    if (group === 'choice-chips-dialog-color')
      choiceChipsDialogColor.value = input.value;
    if (group === 'choice-chips-view') choiceChipsView.value = input.value;
    if (group === 'choice-chips-icon') choiceChipsIcon.value = input.value;
    if (input.type === 'checkbox') {
      // A multiple group's value is its checked set, in choice order.
      const checked = [
        ...(input
          .closest('[data-component="choice-chips"]')
          ?.querySelectorAll<HTMLInputElement>('input:checked') ?? []),
      ].map((box) => box.value);
      if (group === 'choice-chips-labels') choiceChipsLabels.value = checked;
      if (group === 'choice-chips-intents') choiceChipsIntents.value = checked;
      actionLog.value = `Checked: ${checked.join(', ') || 'none'}`;
      return;
    }
    actionLog.value = `Choice: ${input.value}`;
  },
});
const stopAnimationSelects = delegate(
  app,
  'change',
  'kui-select[name^="animation-"]',
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
const stopListFocusScroll = wireListFocusScroll(app);
const stopListReorder = wireListReorder(app, {
  onReorder: ({ listId, sourceIds, target, source }) => {
    const rows =
      listId === 'demo-reorder-commands'
        ? reorderCommands
        : listId === 'demo-reorder-files'
          ? reorderFiles
          : undefined;
    if (!rows) return;
    rows.value = reorderListItems(
      rows.value,
      (row) => row.id,
      sourceIds,
      target,
    );
    actionLog.value = `${source === 'pointer' ? 'Dragged' : 'Moved'} ${sourceIds.join(', ')} ${target.position} ${target.id}`;
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
    stopOverlaySheets();
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
    stopSearchField();
    stopToolbarFind();
    stopSearchFieldSubmits();
    stopToolbarWidthVisibility();
    stopAdoptionKeyboard?.();
    stopAdoptionKeyboardEffect();
    stopFloatingToolbarReset();
    stopEdgeActivityReset();
    stopMessageComposers();
    stopFilePickers();
    stopTextFields();
    stopCheckboxes();
    stopSliders();
    stopColorFields();
    stopColorPickers();
    stopSwatchDemo();
    stopTagFields();
    stopSliderDemo();
    stopChoiceChips();
    stopComboboxes();
    stopListItemDragOver();
    stopListItemDrop();
    stopListActionRowDoubleClick();
    stopListActionRowContextMenu();
    stopPopupMenuContextDemo();
    stopAnchoredSurfaceDemo();
    stopAnchoredSurfaceContextDemo();
    stopAnchoredSurfaceOpenModal();
    stopChoiceChipsDemo();
    stopAnimationSelects();
    stopAnimationRanges();
    stopAnimationEvents.forEach((dispose) => dispose());
    stopIntersectionObserver();
    stopMutationObserver();
    stopResizeObserver();
    stopTabBars();
    stopListReorder();
    stopListFocusScroll();
    stopContentItems();
    systemDarkTheme.removeEventListener('change', syncSystemTheme);
  },
  { once: true },
);
