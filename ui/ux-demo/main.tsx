import '@kerfjs/ui/select/register';
import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/catalog.css';
import '@kerfjs/ui/webawesome.css';
import './style.css';

import {
  Catalog,
  type CatalogRelated,
  type CatalogSection as KuiCatalogSection,
} from '@kerfjs/ui/catalog';
import { catalogResources } from '@kerfjs/ui/catalog-resources';
import { LoadingSpinner } from '@kerfjs/ui/loading-spinner';
import { readTokenSearchField } from '@kerfjs/ui/token-search-field';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import {
  revealCatalogEntry,
  wireCatalog,
  wireCatalogGeometryOverlay,
} from '@kerfjs/ui/wire-catalog';
import { wireNavStack } from '@kerfjs/ui/wire-nav-stack';
import { wireResizableRegions } from '@kerfjs/ui/wire-resizable-regions';
import { reorderTabs, wireTabBars } from '@kerfjs/ui/wire-tab-bars';
import { wireTokenSearchFields } from '@kerfjs/ui/wire-token-search-fields';
import {
  batch,
  delegate,
  delegateCapture,
  effect,
  mount,
  signal,
} from 'kerfjs';
import { delegateActions } from 'kerfjs/actions';
import { Contrast, StickyNote, ZapOff } from 'lucide';

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
import { demos } from './demos/registry.js';
import {
  activeTab,
  ADOPTION_SUGGESTIONS,
  adoptionOpen,
  adoptionQuery,
  adoptionReadout,
  adoptionTokens,
  bannerTone,
  collapsibleSearchOpen,
  customDisclosureOpen,
  disclosureOpen,
  displayDensity,
  floatingToolbarOpen,
  icon,
  inspectorSection,
  menuActionCurrent,
  menuActionPressed,
  menuToolsOpen,
  regionSize,
  selectedChoice,
  tabBarActive,
  tabBarTabs,
  tokenSearchQuery,
  tokenSearchTokens,
  toolbarChoice,
  toolbarFindOpen,
  toolbarFindQuery,
  toolbarGroupSearchOpen,
  toolbarGroupShape,
} from './demos/state.js';
import { isRecipeId, type RecipeId, recipeLoaders } from './recipes/loaders.js';
import type { RecipeController } from './recipes/types.js';

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
const actionLog = signal('Catalog ready');
const systemDarkTheme = window.matchMedia('(prefers-color-scheme: dark)');
const effectiveTheme = signal<DemoTheme>(
  preferredDemoTheme(systemDarkTheme.matches),
);
let explicitTheme: DemoTheme | undefined;
const increasedContrast = signal(false);
const reducedMotion = signal(false);
const webAwesomeReady = signal(false);
let webAwesomeDemos:
  | Record<WebAwesomeCatalogId, () => ReturnType<typeof ToolbarControlGroup>>
  | undefined;
let webAwesomeLoad: Promise<void> | undefined;
const recipeControllers = new Map<RecipeId, RecipeController>();
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
  const load = recipeLoaders[id]().then(({ createRecipe }) => {
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
  const needsWebAwesome =
    selected.source === 'webawesome' ||
    selected.id === 'webawesome-theme' ||
    selected.id === 'toolbar-control-group';
  if (needsWebAwesome && !webAwesomeReady.value) {
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
    entries: section.entries.map((entry) => ({
      id: entry.id,
      name: entry.name,
      description: entry.description,
      tags: isDiscouragedWebAwesome(entry) ? ['Discouraged'] : undefined,
      resources: toCatalogResources(entry),
      related: toCatalogRelated(entry),
    })),
  }));
}
const kuiCatalogSections = toKuiSections(catalogSections);
const kuiWebAwesomeSections = toKuiSections(webAwesomeCatalogSections);

function selectDemo(id: string): void {
  if (!isCatalogId(id)) return;
  const selected = findCatalogEntry(id)!;
  if (selected.source === 'webawesome' || selected.id === 'webawesome-theme')
    void ensureWebAwesomeDemos();
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
  const statusLabel =
    selected.source === 'webawesome'
      ? 'Web Awesome component · Kerf theme'
      : selected.kind === 'component'
        ? 'Kerf first-class component · production CSS'
        : 'Kerf composition · production CSS';
  return (
    <Catalog
      className="demo-catalog"
      brand={{ title: 'Kerf', subtitle: 'UI components', logoUrl: kerfLogoUrl }}
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
      selectAction="select-demo"
      toggleSidebarAction="toggle-catalog-sidebar"
      toggleThemeAction="toggle-theme"
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
                {icon(StickyNote, 'sticky-note')}
              </button>
            </ToolbarControlGroup>
          ) : (
            <></>
          )}
          <ToolbarControlGroup
            className="catalog-settings"
            label="Catalog display settings"
          >
            <button
              type="button"
              data-action="toggle-contrast"
              aria-pressed={String(increasedContrast.value)}
            >
              {icon(Contrast, 'contrast')}
              <span>Contrast</span>
            </button>
            <button
              type="button"
              data-action="toggle-motion"
              aria-pressed={String(reducedMotion.value)}
            >
              {icon(ZapOff, 'zap-off')}
              <span>Reduce motion</span>
            </button>
          </ToolbarControlGroup>
        </>
      }
      status={
        <>
          <output class="catalog-log" aria-live="polite">
            {actionLog.value}
          </output>
          {selected.id === 'resize' ? (
            <span class="catalog-footer__metric">
              <span>Committed width</span>
              <strong data-region-size>{regionSize.value}px</strong>
            </span>
          ) : (
            <></>
          )}
          <span>{statusLabel}</span>
        </>
      }
      geometryOverlay={
        selected.source === 'kerf' && selected.kind === 'component'
      }
      content={
        <div
          class="demo-stage-inner"
          data-demo-mode={
            selected.source === 'kerf' && selected.kind === 'component'
              ? 'component'
              : 'composition'
          }
          data-recipe-notes-visible={String(
            isRecipe && recipeNotesVisible.value,
          )}
        >
          <Stage />
        </div>
      }
    />
  );
});

if (findCatalogEntry(initialDemo)?.source === 'webawesome')
  revealCatalogEntry(app, initialDemo, { block: 'center' });

const stopActions = delegateActions(app, 'click', {
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
  'show-wa-dialog': () => {
    actionLog.value = 'Dialog opened';
    const dialog = document.querySelector<HTMLElement & { open: boolean }>(
      '#catalog-wa-dialog',
    );
    if (dialog) dialog.open = true;
  },
  'hide-wa-dialog': () => {
    actionLog.value = 'Dialog closed';
    const dialog = document.querySelector<HTMLElement & { open: boolean }>(
      '#catalog-wa-dialog',
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
    const viewport = demo?.querySelector<HTMLElement>(
      '.wa-demo-observer__viewport',
    );
    const target = demo?.querySelector<HTMLElement>('[data-observer-target]');
    if (!demo || !viewport || !target) return;
    const revealed = demo.dataset.revealed === 'true';
    demo.dataset.revealed = String(!revealed);
    viewport.scrollTop = revealed
      ? 0
      : target.offsetTop - viewport.offsetTop - 16;
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
    activeTab.value = element.getAttribute('data-tab-id') ?? 'library';
    actionLog.value = `Selected ${activeTab.value}`;
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
    tabBarTabs.value = [
      ...tabBarTabs.value,
      { id, name: `New tab ${tabNumber}` },
    ];
    tabBarActive.value = id;
    actionLog.value = `Added ${id}`;
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
    const tones = ['neutral', 'info', 'success', 'warning', 'danger'] as const;
    bannerTone.value =
      tones[(tones.indexOf(bannerTone.value) + 1) % tones.length]!;
    actionLog.value = `Banner tone: ${bannerTone.value}`;
  },
  'toggle-contrast': () => {
    increasedContrast.value = !increasedContrast.value;
    document.documentElement.classList.toggle(
      'demo-contrast',
      increasedContrast.value,
    );
    actionLog.value = increasedContrast.value
      ? 'Increased contrast on'
      : 'Increased contrast off';
  },
  'toggle-motion': () => {
    reducedMotion.value = !reducedMotion.value;
    document.documentElement.classList.toggle(
      'demo-reduced-motion',
      reducedMotion.value,
    );
    actionLog.value = reducedMotion.value
      ? 'Reduced motion on'
      : 'Reduced motion off';
  },
  'log-add': () => {
    actionLog.value = 'Add action requested';
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
    actionLog.value = 'Sorted by recently updated';
  },
  'sort-priority': () => {
    actionLog.value = 'Sorted by priority';
  },
  'log-favorite': () => {
    actionLog.value = 'Favorite requested';
  },
  'log-more': () => {
    actionLog.value = 'More actions requested';
  },
  'log-pin': () => {
    actionLog.value = 'Pin requested';
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
    window.requestAnimationFrame(() =>
      document
        .querySelector<HTMLButtonElement>(
          `[aria-label="${sidebarCollapsed.value ? 'Expand' : 'Collapse'} Kerf catalog"]`,
        )
        ?.focus(),
    );
  },
  onToggleTheme: () => {
    explicitTheme = oppositeDemoTheme(effectiveTheme.value);
    applyDemoTheme(document.documentElement, explicitTheme);
    effectiveTheme.value = explicitTheme;
    actionLog.value = `${explicitTheme === 'dark' ? 'Dark' : 'Light'} theme on`;
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
  toggleSecondaryAction: 'toggle-webawesome-catalog',
  revealSelection: true,
});
const stopGeometryOverlay = wireCatalogGeometryOverlay(app);
const stopResize = wireResizableRegions(app, {
  onCommit: ({ id, size }) => {
    if (id.startsWith('recipe-') && isRecipeId(selectedDemo.value))
      recipeControllers.get(selectedDemo.value)?.resize?.(id, size);
    else {
      regionSize.value = size;
      actionLog.value = `Panel resized to ${size}px`;
    }
  },
});
const stopSelect = delegate(app, 'change', 'wa-select', (_event, element) => {
  const value = (element as HTMLElement & { value?: string }).value;
  if (value === 'quiet' || value === 'balanced' || value === 'explicit')
    selectedChoice.value = value;
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
  onSubmit: ({ id }) => {
    actionLog.value =
      id === 'toolbar-find' ? 'Find submitted' : 'Search submitted';
  },
  collapsible: {
    signals: {
      'toolbar-find': toolbarFindOpen,
      'collapsible-search': collapsibleSearchOpen,
      'toolbar-group-search': toolbarGroupSearchOpen,
      'adoption-search': adoptionOpen,
    },
  },
});
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
    const container = app.querySelector<HTMLElement>('.token-search-adoption');
    if (!container) return;
    stopAdoptionKeyboard = wireTokenSearchFields(container, {
      collapsible: false,
      onEdit: ({ editor, event }) => {
        const value = readTokenSearchField(editor, adoptionTokens.value);
        adoptionQuery.value = value.query;
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
    stopGeometryOverlay();
    stopResize();
    stopSelect();
    stopRecipeNav?.();
    stopRecipeNavEffect();
    stopRecipeWire?.();
    stopRecipeWireEffect();
    stopRecipeChanges();
    stopRecipeInputs();
    stopRecipeDialogs();
    stopTokenSearch();
    stopToolbarFind();
    stopTokenSearchSubmits();
    stopAdoptionKeyboard?.();
    stopAdoptionKeyboardEffect();
    stopFloatingToolbarReset();
    stopListItemDragOver();
    stopListItemDrop();
    stopListActionRowDoubleClick();
    stopListActionRowContextMenu();
    stopAnimationSelects();
    stopAnimationRanges();
    stopAnimationEvents.forEach((dispose) => dispose());
    stopIntersectionObserver();
    stopMutationObserver();
    stopResizeObserver();
    stopTabBars();
    systemDarkTheme.removeEventListener('change', syncSystemTheme);
  },
  { once: true },
);
