// Play mode's state adapters (KF-60BEEJ: play mode core; docs/26-ui-editor.md
// §11.4). Each adapter installs one controlled component's real `wire…`
// helper over a rendered node and maps the intent it reports onto the
// play-time copy of the document (model/play-state.ts), which re-renders the
// view through the normal morph. Adapters are kept per rendered element, so
// a helper that animates across renders (a NavStack's pop) keeps its state;
// a node that leaves the view disposes its adapter. The stateless helpers
// (scroll dividers, text, search, slider, checkbox fields, tab-strip keys)
// are installed once over the root, as they are. KF-XV732Q adds resizing,
// SplitView, value controls (model/play-values.ts), sidebars with several
// toggles, per-row TabBarItem selection, and tab close. KF-7XQAFR: a value
// control nested inside an `$each` row records for its row (`data-kerf-row`),
// and a repeated tab closes wherever its items come from. KF-ZMBST3: a row
// inside another row is known by its path of row keys.
import type { ViewDocument } from '@kerfjs/ui/view';
import {
  delegate,
  effect,
  type ReadonlySignal,
  type Signal,
  signal,
} from 'kerfjs';

import { wireSummaryRows } from '../components/collections/summary-row/wiring/wire-summary-rows.js';
import { wireCheckboxes } from '../components/forms/checkbox/wiring/wire-checkboxes.js';
import {
  readChoiceChips,
  wireChoiceChips,
} from '../components/forms/choice-chips/wiring/wire-choice-chips.js';
import { wireColorFields } from '../components/forms/color-field/wiring/wire-color-fields.js';
import { wireColorPickers } from '../components/forms/color-picker/wiring/wire-color-pickers.js';
import { wireComboboxes } from '../components/forms/combobox/wiring/wire-comboboxes.js';
import { wireForms } from '../components/forms/form/wiring/wire-forms.js';
import { wireSearchFields } from '../components/forms/search-field/wiring/wire-search-fields.js';
import { wireSliders } from '../components/forms/slider/wiring/wire-sliders.js';
import { wireTagFields } from '../components/forms/tag-field/wiring/wire-tag-fields.js';
import { wireTextFields } from '../components/forms/text-field/wiring/wire-text-fields.js';
import { wireSidebar } from '../components/layout/collapsible-panel/wiring/wire-sidebar.js';
import { wireResizableRegions } from '../components/layout/resizable-region/wiring/wire-resizable-regions.js';
import { workbenchRegionId } from '../components/layout/workbench/internal/workbench-resize.js';
import { wireWorkbench } from '../components/layout/workbench/wiring/wire-workbench.js';
import { wireNavStack } from '../components/navigation/nav-stack/wiring/wire-nav-stack.js';
import { wireTabBars } from '../components/navigation/tab-bar/wiring/wire-tab-bars.js';
import { wireTabNavigator } from '../components/navigation/tab-navigator/wiring/wire-tab-navigator.js';
import { wireContentItems } from '../components/surfaces/content-item/wiring/wire-content-items.js';
import { wireScrollDividers } from '../wiring/wire-scroll-dividers.js';
import { findNode } from './model/document.js';
import {
  closeTabBarItem,
  closeTabBarItemInRow,
  COLLAPSIBLE_PANEL,
  followCompact,
  LIST_ITEM,
  NAV_STACK,
  popView,
  reorderTabBarItems,
  selectListItem,
  selectTab,
  selectTabBarItem,
  setDetailActive,
  setRegionSize,
  setSidebarCollapsed,
  setWorkbenchPanelCollapsed,
  setWorkbenchPanelSize,
  sidebarToggleActions,
  SPLIT_VIEW,
  TAB_BAR_ITEM,
  TAB_NAVIGATOR,
  WORKBENCH,
  WORKBENCH_PANELS,
  type WorkbenchPanelKey,
} from './model/play-state.js';
import {
  closeRow,
  nodeWithId,
  recordValue,
  type RowKey,
  rowPathOf,
  type RowProps,
  rowPropsOf,
} from './model/play-values.js';

/** What the player shares with its adapters besides the document. */
export interface PlayStateOptions {
  /** Per-row props of repeated nodes (KF-XV732Q). */
  readonly rows: Signal<RowProps>;
  /** The view's param values now. */
  readonly params: () => Readonly<Record<string, unknown>>;
  /** Sets param values, re-rendering the view. */
  readonly setParams: (values: Readonly<Record<string, unknown>>) => void;
  /** The played device's class: SplitView's `compact` follows it. */
  readonly device: ReadonlySignal<{ readonly compact: boolean }>;
}

/** What an adapter needs: the rendered node and the play-time document. */
interface AdapterContext {
  readonly element: HTMLElement;
  readonly id: string;
  readonly state: Signal<ViewDocument>;
  /** The player's root, for helpers whose controls sit outside the node. */
  readonly root: HTMLElement;
}

/** A value mirrored between a helper's signal and the document. */
function mirrored<Value>(
  read: (document: ViewDocument) => Value,
  write: (document: ViewDocument, value: Value) => ViewDocument,
  state: Signal<ViewDocument>,
) {
  const value = signal(read(state.peek()));
  const stop = effect(() => {
    const next = value.value;
    const current = state.peek();
    if (read(current) !== next) state.value = write(current, next);
  });
  return { value, stop };
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

/** A Workbench panel's default size, as the Workbench renders it. */
const defaultSize = (key: WorkbenchPanelKey) =>
  key === 'bottomDrawer' ? 220 : 280;

/** The path of the row `element` (a rendered node) is in (KF-ZMBST3). */
const rowAt = (element: HTMLElement) =>
  rowPathOf((name) => element.getAttribute(name) ?? undefined);

/**
 * The nearest rendered node at or above `element`, with its `data-key` (a
 * template root's) and the path of the row it is in: (KF-7XQAFR) a node
 * nested inside a row is in that row too, and (KF-ZMBST3) a row inside
 * other rows is known by their keys as well as its own.
 */
const nodeAt = (element: Element | null) => {
  const rendered = element?.closest<HTMLElement>('[data-kerf-node]');
  return rendered
    ? {
        element: rendered,
        id: rendered.dataset.kerfNode!,
        key: rendered.dataset.key,
        row: rowAt(rendered),
      }
    : undefined;
};

/**
 * The row keys of `element`'s row and every row it sits in, by template
 * node id (KF-7XQAFR), innermost first wins.
 */
const rowKeysAt = (element: HTMLElement, root: HTMLElement) => {
  const keys: Record<string, string> = {};
  for (
    let row = element.closest<HTMLElement>('[data-kerf-node][data-key]');
    row && root.contains(row);
    row = row.parentElement!.closest<HTMLElement>('[data-kerf-node][data-key]')
  )
    keys[row.dataset.kerfNode!] ??= row.dataset.key!;
  return keys;
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
  // KF-XV732Q: a compact SplitView's stack pops its detail, and a ListItem
  // in its list selects that row and, compact, pushes the detail.
  [SPLIT_VIEW]: ({ element, id, state }) => {
    const compact = element.dataset.splitMode === 'compact';
    const stops = [
      compact
        ? wireNavStack(
            element.querySelector(':scope > [data-component="nav-stack"]')!,
            {
              onBack: () => {
                state.value = setDetailActive(state.value, id, false);
              },
            },
          )
        : () => {},
      delegate<HTMLElement>(
        element,
        'click',
        '[data-component="list-item"]',
        (_event, row) => {
          const list = compact
            ? row.closest('.kui-nav-stack__view[data-nav-key="list"]')
            : row.closest('[data-split-list]');
          if (list?.closest('[data-component="split-view"]') !== element)
            return;
          // A toggle row (`pressed`) toggles; it does not select.
          if (row.hasAttribute('aria-pressed')) return;
          const at = nodeAt(row)!;
          let next = selectListItem(state.value, at.id);
          if (compact) next = setDetailActive(next, id, true);
          state.value = next;
        },
      ),
    ];
    return () => {
      for (const stop of stops) stop();
    };
  },
  [WORKBENCH]: ({ element, id, state }) => {
    const workbenchId = findNode(state.peek(), id)?.node.props?.id;
    if (typeof workbenchId !== 'string') return undefined;
    const keys = WORKBENCH_PANELS.filter((key) =>
      panelOf(state.peek(), id, key),
    );
    const panels = keys.map((key) => {
      const collapsed = mirrored(
        (document) => Boolean(panelOf(document, id, key)?.collapsed),
        (document, value) =>
          setWorkbenchPanelCollapsed(document, id, key, value),
        state,
      );
      // KF-XV732Q: a resizable panel's committed size goes to its `size`.
      const size = panelOf(state.peek(), id, key)!.resizable
        ? mirrored(
            (document) => {
              const value = panelOf(document, id, key)?.size;
              return typeof value === 'number' ? value : defaultSize(key);
            },
            (document, value) =>
              setWorkbenchPanelSize(document, id, key, value),
            state,
          )
        : undefined;
      return { key, collapsed, size };
    });
    const stops = [
      wireWorkbench(element, {
        id: workbenchId,
        panels: Object.fromEntries(
          panels.map(({ key, collapsed, size }) => [
            key,
            { collapsed: collapsed.value, size: size?.value },
          ]),
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
          if (panel) panel.collapsed.value.value = !panel.collapsed.value.value;
        },
      ),
      ...panels.flatMap(({ collapsed, size }) =>
        size ? [collapsed.stop, size.stop] : [collapsed.stop],
      ),
    ];
    return () => {
      for (const stop of stops) stop();
    };
  },
  [COLLAPSIBLE_PANEL]: ({ id, state, root }) => {
    const panelId = findNode(state.peek(), id)?.node.props?.id;
    if (typeof panelId !== 'string') return undefined;
    // wireSidebar delegates one toggle action per panel; KF-XV732Q: any
    // other action that names the panel flips the same state.
    const [toggleAction, ...others] = sidebarToggleActions(
      state.peek(),
      panelId,
    );
    if (!toggleAction) return undefined;
    const { value: collapsed, stop } = mirrored(
      (document) => findNode(document, id)?.node.props?.collapsed === true,
      (document, value) => setSidebarCollapsed(document, panelId, value),
      state,
    );
    const stopSidebar = wireSidebar(root, {
      panels: [{ id: panelId, collapsed, toggleAction }],
    });
    const stopOthers = delegate<HTMLElement>(
      root,
      'click',
      '[data-action]',
      (_event, trigger) => {
        if (others.includes(trigger.dataset.action!))
          collapsed.value = !collapsed.value;
      },
    );
    return () => {
      stopSidebar();
      stopOthers();
      stop();
    };
  },
};

/**
 * How a value control reports a person's change (KF-XV732Q): the event on
 * its rendered root, and the prop and value it changed.
 */
type ValueReader = (
  element: HTMLElement,
  event: Event,
  document: ViewDocument,
  id: string,
) => { prop: string; value: unknown } | undefined;

const inputOf = (event: Event) => event.target as HTMLInputElement;
const checked = (_element: HTMLElement, event: Event) => ({
  prop: 'checked',
  value: inputOf(event).checked,
});

/** Controls that report on `change`, by catalog key. */
const ON_CHANGE: Readonly<Record<string, ValueReader>> = {
  '@kerfjs/ui:switch': checked,
  '@kerfjs/ui:checkbox': checked,
  '@kerfjs/ui:radio-group': (_element, event) => ({
    prop: 'value',
    value: inputOf(event).value,
  }),
  '@kerfjs/ui:slider': (_element, event) => ({
    prop: 'value',
    value: Number(inputOf(event).value),
  }),
  '@kerfjs/ui:select': (element) => ({
    prop: 'value',
    value: (element as HTMLElement & { value: unknown }).value,
  }),
  '@kerfjs/ui:choice-chips': (element, _event, document, id) => {
    const multiple = findNode(document, id)!.node.props?.multiple;
    if (multiple === true)
      return { prop: 'value', value: readChoiceChips(element) };
    const values = [
      ...element.querySelectorAll<HTMLInputElement>(
        'input.kui-choice-chips__input:checked',
      ),
    ].map((input) => input.value);
    return {
      prop: 'value',
      value: multiple === 'toggle' ? values : values[0],
    };
  },
};

/** Controls that report on `click`, by catalog key. */
const ON_CLICK: Readonly<Record<string, ValueReader>> = {
  '@kerfjs/ui:segmented-control': (_element, event) => {
    const segment = (event.target as Element).closest<HTMLButtonElement>(
      '[data-segment-value]',
    );
    return segment && !segment.disabled
      ? { prop: 'value', value: segment.dataset.segmentValue }
      : undefined;
  },
  // A toggle row: a ListItem rendered with `pressed`.
  [LIST_ITEM]: (element) => {
    const pressed = element.getAttribute('aria-pressed');
    return pressed === null
      ? undefined
      : { prop: 'pressed', value: pressed !== 'true' };
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
  { rows, params, setParams, device }: PlayStateOptions,
): { sync: () => void; dispose: () => void } {
  /** Each adapted element's node id, its shape, and its disposer. */
  const adapters = new Map<
    HTMLElement,
    { id: string; shape: string | undefined; stop: () => void }
  >();
  /** Records the person's change to node `id`'s `prop` (row `key`). */
  const record = (
    id: string,
    key: RowKey | undefined,
    prop: string,
    value: unknown,
  ) => {
    const recorded = recordValue(
      state.peek(),
      rows.peek(),
      id,
      key,
      prop,
      value,
    );
    state.value = recorded.document;
    rows.value = recorded.rows;
    if (recorded.params) setParams(recorded.params);
  };
  /** Records a change a helper reported by the control's `id` prop. */
  const recordById =
    (type: string, prop: string) =>
    (change: { id: string; value?: unknown; tags?: unknown }) => {
      const id = nodeWithId(state.peek(), type, change.id);
      if (id) record(id, undefined, prop, change[prop as 'value' | 'tags']);
    };
  /** Records a value control's change from its own event. */
  const onValue =
    (readers: Readonly<Record<string, ValueReader>>) => (event: Event) => {
      const at = nodeAt(event.target as Element);
      if (!at) return;
      const node = findNode(state.peek(), at.id)?.node;
      const reader = node && readers[node.type];
      const change = reader?.(at.element, event, state.peek(), at.id);
      if (change) record(at.id, at.row, change.prop, change.value);
    };
  const onChange = onValue(ON_CHANGE);
  const onClick = onValue(ON_CLICK);
  // A Disclosure is a native <details>, whose `toggle` does not bubble.
  const onToggle = (event: Event) => {
    const details = event.target as HTMLElement;
    const at = nodeAt(details);
    if (
      at?.element === details &&
      findNode(state.peek(), at.id)?.node.type === '@kerfjs/ui:disclosure'
    )
      record(at.id, at.row, 'open', (details as HTMLDetailsElement).open);
  };
  root.addEventListener('change', onChange);
  root.addEventListener('click', onClick);
  root.addEventListener('toggle', onToggle, true);

  /** The TabBarItem node at or above `element`, with its row key. */
  const tabItemAt = (element: Element) => {
    for (
      let at = nodeAt(element);
      at && root.contains(at.element);
      at = nodeAt(at.element.parentElement)
    )
      if (findNode(state.value, at.id)?.node.type === TAB_BAR_ITEM) return at;
    return undefined;
  };
  const selectItem = (id: string, key: RowKey | undefined) => {
    const selected = selectTabBarItem(state.value, id, rows.value, key);
    rows.value = selected.rows;
    state.value = selected.document;
  };

  const stateless = [
    wireScrollDividers(root),
    wireTextFields(root),
    wireSearchFields(root),
    wireSliders(root),
    wireCheckboxes(root),
    // KF-XX4Y95: submitting a Form in play never navigates the page.
    wireForms(root),
    wireChoiceChips(root),
    // KF-963DMT: the shipped keyboard for ContentItems (Enter/Space, media
    // state, and a selectable grid or listbox's one Tab stop and arrows) and
    // for a SummaryRow listbox. Their activation is a click, so an option's
    // action still reaches the action log.
    wireContentItems(root),
    wireSummaryRows(root),
    // KF-XV732Q: the helpers that report a value by the control's `id`.
    wireComboboxes(root, {
      onCommit: recordById('@kerfjs/ui:combobox', 'value'),
    }),
    wireColorFields(root, {
      onChange: recordById('@kerfjs/ui:color-field', 'value'),
    }),
    wireColorPickers(root, {
      onChange: recordById('@kerfjs/ui:color-picker', 'value'),
    }),
    wireTagFields(root, {
      onChange: recordById('@kerfjs/ui:tag-field', 'tags'),
    }),
    // A ResizableRegion's, or a SplitView list's, committed size.
    wireResizableRegions(root, {
      onCommit: ({ id, size }) => {
        state.value = setRegionSize(state.value, id, size);
      },
    }),
    // A SplitView's `compact` follows the played device.
    effect(() => {
      const next = followCompact(state.value, device.value.compact);
      if (next !== state.peek()) state.value = next;
    }),
    // Arrow keys move between a strip's tabs (by clicking them), and a
    // draggable tab moves in its bar.
    wireTabBars(root, {
      onReorder: (change) => {
        state.value = reorderTabBarItems(state.value, change);
      },
    }),
    // KF-XV732Q: a tab's close removes it from the play copy; a repeated
    // tab leaves its `$each`'s items, in the param they come from
    // (KF-7XQAFR: also through a `$bind`, such as an outer row's array).
    delegate<HTMLElement>(
      root,
      'click',
      '.kui-tab-bar-item__close',
      (_event, close) => {
        const at = tabItemAt(close);
        if (!at) return;
        if (at.key === undefined) {
          // KF-36QBFM: a placed tab in a bar inside a row closes for that
          // row only.
          if (at.row)
            rows.value = closeTabBarItemInRow(
              state.value,
              rows.value,
              at.id,
              at.row,
            );
          else state.value = closeTabBarItem(state.value, at.id);
          return;
        }
        const closed = closeRow(
          state.value,
          at.id,
          rowKeysAt(at.element, root),
          params(),
        );
        if (!closed) return;
        // A closed selected row hands its selection to a neighbor row.
        if (rowPropsOf(rows.value, at.id, at.row!).selected === true) {
          const siblings = [
            ...at.element.parentElement!.querySelectorAll<HTMLElement>(
              `:scope > [data-kerf-node="${at.id}"]`,
            ),
          ];
          const index = siblings.indexOf(at.element);
          const neighbor = siblings[index + 1] ?? siblings[index - 1];
          if (neighbor) selectItem(at.id, rowAt(neighbor));
        }
        setParams(closed);
      },
    ),
    // A TabBarItem's click selects it in its TabBar.
    // Its content may hold nodes of its own (an icon), so the click's
    // nearest TabBarItem node is the one selected.
    delegate<HTMLElement>(
      root,
      'click',
      '[data-kerf-node]',
      (_event, target) => {
        if (target.closest('.kui-tab-bar-item__close')) return;
        const at = tabItemAt(target);
        // A repeated tab selects by its row path; KF-36QBFM: a placed tab
        // in a bar inside a row selects for that row (its path is the
        // bar's row), and anywhere else in the document.
        if (at) selectItem(at.id, at.row);
      },
    ),
    () => {
      root.removeEventListener('change', onChange);
      root.removeEventListener('click', onClick);
      root.removeEventListener('toggle', onToggle, true);
    },
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
      // The morph may reuse an element for another node, or a SplitView's
      // element for its other mode.
      const shape = element.dataset.splitMode;
      const current = adapters.get(element);
      if (current?.id === id && current.shape === shape) {
        seen.add(element);
        continue;
      }
      current?.stop();
      adapters.delete(element);
      const stop = adapter({ element, id, state, root });
      if (!stop) continue;
      adapters.set(element, { id, shape, stop });
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
