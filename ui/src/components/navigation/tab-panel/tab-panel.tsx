import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import {
  filterDataAttributes,
  type RootDataAttributes,
} from '../../../shared/dom/extension-attributes.js';

export interface TabPanelProps {
  /** The panel's DOM id: the controlling `TabBarItem`'s `panelId`
   * (its `aria-controls`). */
  id: string;
  /** The DOM id of the tab that names this panel: the controlling
   * `TabBarItem`'s `tabId`, written as `aria-labelledby`. */
  tabId: string;
  /** Hide the panel while its tab is not selected. The application keeps
   * exactly one panel of a tab set visible, the selected tab's. */
  hidden?: boolean;
  /** The panel's content is still loading (`aria-busy`), as for a
   * `pending` `TabBarItem` whose panel shows placeholders. */
  busy?: boolean;
  /** The panel's content. */
  children?: KerfUiContent;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
  /** Application `data-*` metadata on the root, such as a test hook or an
   * editor node marker; the component's own markers stay protected. */
  rootAttributes?: RootDataAttributes;
}

const TAB_PANEL_PROTECTED = new Set(['data-component']);

/**
 * The application-owned panel a `TabBarItem` controls: a `tabpanel` region
 * named by its tab. It adds no inset, chrome, or layout of its own; the
 * content inside it owns those. Selection stays application state: render
 * every panel of a tab set and set `hidden` on all but the selected tab's.
 */
export function TabPanel({
  id,
  tabId,
  hidden = false,
  busy = false,
  children,
  className = '',
  slot,
  rootAttributes = {},
}: TabPanelProps) {
  return (
    <div
      {...filterDataAttributes(rootAttributes, TAB_PANEL_PROTECTED)}
      id={id}
      class={`kui-tab-panel ${className}`.trim()}
      data-component="tab-panel"
      role="tabpanel"
      aria-labelledby={tabId}
      aria-busy={busy ? 'true' : undefined}
      hidden={hidden || undefined}
      slot={slot}
    >
      {children}
    </div>
  );
}
