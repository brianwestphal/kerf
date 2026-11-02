// Play mode's state adapters (KF-60BEEJ: play mode core; docs/26-ui-editor.md
// §11.4). Each adapter installs one controlled component's real `wire…`
// helper over a rendered node and maps the intent it reports onto the
// play-time copy of the document (model/play-state.ts), which re-renders the
// view through the normal morph. Adapters are kept per rendered element, so
// a helper that animates across renders (a NavStack's pop) keeps its state;
// a node that leaves the view disposes its adapter. The stateless helpers
// (scroll dividers, text, search, slider, checkbox fields, tab-strip keys)
// are installed once over the root, as they are.
import type { ViewDocument } from '@kerfjs/ui/view';
import { delegate, effect, type Signal, signal } from 'kerfjs';

import { wireCheckboxes } from '../components/forms/checkbox/wiring/wire-checkboxes.js';
import { wireSearchFields } from '../components/forms/search-field/wiring/wire-search-fields.js';
import { wireSliders } from '../components/forms/slider/wiring/wire-sliders.js';
import { wireTextFields } from '../components/forms/text-field/wiring/wire-text-fields.js';
import { wireSidebar } from '../components/layout/collapsible-panel/wiring/wire-sidebar.js';
import { workbenchRegionId } from '../components/layout/workbench/internal/workbench-resize.js';
import { wireWorkbench } from '../components/layout/workbench/wiring/wire-workbench.js';
import { wireNavStack } from '../components/navigation/nav-stack/wiring/wire-nav-stack.js';
import { wireTabBars } from '../components/navigation/tab-bar/wiring/wire-tab-bars.js';
import { wireTabNavigator } from '../components/navigation/tab-navigator/wiring/wire-tab-navigator.js';
import { wireScrollDividers } from '../wiring/wire-scroll-dividers.js';
import { findNode } from './model/document.js';
import {
  COLLAPSIBLE_PANEL,
  NAV_STACK,
  popView,
  reorderTabBarItems,
  selectTab,
  selectTabBarItem,
  setSidebarCollapsed,
  setWorkbenchPanelCollapsed,
  sidebarToggleActions,
  TAB_BAR_ITEM,
  TAB_NAVIGATOR,
  WORKBENCH,
  WORKBENCH_PANELS,
  type WorkbenchPanelKey,
} from './model/play-state.js';

/** What an adapter needs: the rendered node and the play-time document. */
interface AdapterContext {
  readonly element: HTMLElement;
  readonly id: string;
  readonly state: Signal<ViewDocument>;
  /** The player's root, for helpers whose controls sit outside the node. */
  readonly root: HTMLElement;
}

/** A collapsed flag mirrored between a helper's signal and the document. */
function mirrored(
  read: (document: ViewDocument) => boolean,
  write: (document: ViewDocument, collapsed: boolean) => ViewDocument,
  state: Signal<ViewDocument>,
) {
  const collapsed = signal(read(state.peek()));
  const stop = effect(() => {
    const value = collapsed.value;
    const current = state.peek();
    if (read(current) !== value) state.value = write(current, value);
  });
  return { collapsed, stop };
}

const panelOf = (
  document: ViewDocument,
  id: string,
  key: WorkbenchPanelKey,
): Record<string, unknown> | undefined => {
  const value = findNode(document, id)?.node.props?.[key];
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
};

const ADAPTERS: Readonly<
  Record<string, (context: AdapterContext) => (() => void) | undefined>
> = {
  [TAB_NAVIGATOR]: ({ element, id, state }) =>
    wireTabNavigator(element, {
      onSelect: (tabId) => {
        state.value = selectTab(state.value, id, tabId);
      },
    }),
  [NAV_STACK]: ({ element, id, state }) =>
    wireNavStack(element, {
      onBack: () => {
        state.value = popView(state.value, id);
      },
    }),
  [WORKBENCH]: ({ element, id, state }) => {
    const workbenchId = findNode(state.peek(), id)?.node.props?.id;
    if (typeof workbenchId !== 'string') return undefined;
    const keys = WORKBENCH_PANELS.filter((key) =>
      panelOf(state.peek(), id, key),
    );
    const panels = keys.map((key) => ({
      key,
      ...mirrored(
        (document) => Boolean(panelOf(document, id, key)?.collapsed),
        (document, collapsed) =>
          setWorkbenchPanelCollapsed(document, id, key, collapsed),
        state,
      ),
    }));
    const stops = [
      wireWorkbench(element, {
        id: workbenchId,
        panels: Object.fromEntries(
          panels.map(({ key, collapsed }) => [key, { collapsed }]),
        ),
      }),
      // A panel's standard toggle names the panel it controls.
      delegate(
        element,
        'click',
        '[data-workbench-toggle]',
        (_event, toggle) => {
          const controls = toggle.getAttribute('aria-controls');
          const panel = panels.find(
            ({ key }) => workbenchRegionId(workbenchId, key) === controls,
          );
          if (panel) panel.collapsed.value = !panel.collapsed.value;
        },
      ),
      ...panels.map(({ stop }) => stop),
    ];
    return () => {
      for (const stop of stops) stop();
    };
  },
  [COLLAPSIBLE_PANEL]: ({ id, state, root }) => {
    const panelId = findNode(state.peek(), id)?.node.props?.id;
    if (typeof panelId !== 'string') return undefined;
    // wireSidebar delegates one toggle action per panel.
    const [toggleAction] = sidebarToggleActions(state.peek(), panelId);
    if (!toggleAction) return undefined;
    const { collapsed, stop } = mirrored(
      (document) => findNode(document, id)?.node.props?.collapsed === true,
      (document, value) => setSidebarCollapsed(document, panelId, value),
      state,
    );
    const stopSidebar = wireSidebar(root, {
      panels: [{ id: panelId, collapsed, toggleAction }],
    });
    return () => {
      stopSidebar();
      stop();
    };
  },
};

/**
 * Installs the play-time wiring over `root`, which renders `state`. Call the
 * returned `sync` after each render, so a newly rendered controlled node
 * gets its adapter and a removed one is disposed. `dispose` removes it all.
 */
export function wirePlayState(
  root: HTMLElement,
  state: Signal<ViewDocument>,
): { sync: () => void; dispose: () => void } {
  /** Each adapted element's node id and disposer. */
  const adapters = new Map<HTMLElement, { id: string; stop: () => void }>();
  const stateless = [
    wireScrollDividers(root),
    wireTextFields(root),
    wireSearchFields(root),
    wireSliders(root),
    wireCheckboxes(root),
    // Arrow keys move between a strip's tabs (by clicking them), and a
    // draggable tab moves in its bar.
    wireTabBars(root, {
      onReorder: (change) => {
        state.value = reorderTabBarItems(state.value, change);
      },
    }),
    // A TabBarItem's click selects it in its TabBar.
    // Its content may hold nodes of its own (an icon), so the click's
    // nearest TabBarItem node is the one selected.
    delegate<HTMLElement>(
      root,
      'click',
      '[data-kerf-node]',
      (_event, target) => {
        for (
          let element: HTMLElement | null = target;
          element && root.contains(element);
          element =
            element.parentElement?.closest<HTMLElement>('[data-kerf-node]') ??
            null
        ) {
          const id = element.dataset.kerfNode!;
          if (findNode(state.value, id)?.node.type !== TAB_BAR_ITEM) continue;
          state.value = selectTabBarItem(state.value, id);
          return;
        }
      },
    ),
  ];
  const sync = () => {
    const seen = new Set<HTMLElement>();
    for (const element of root.querySelectorAll<HTMLElement>(
      '[data-kerf-node]',
    )) {
      const id = element.dataset.kerfNode!;
      // Each rendered node is one of the play copy's.
      const adapter = ADAPTERS[findNode(state.peek(), id)!.node.type];
      if (!adapter) continue;
      // The morph may reuse an element for another node.
      const current = adapters.get(element);
      if (current?.id === id) {
        seen.add(element);
        continue;
      }
      current?.stop();
      adapters.delete(element);
      const stop = adapter({ element, id, state, root });
      if (!stop) continue;
      adapters.set(element, { id, stop });
      seen.add(element);
    }
    for (const [element, { stop }] of adapters) {
      if (seen.has(element)) continue;
      stop();
      adapters.delete(element);
    }
  };
  return {
    sync,
    dispose: () => {
      for (const { stop } of adapters.values()) stop();
      adapters.clear();
      for (const stop of stateless) stop();
    },
  };
}
