import type { SafeHtml } from 'kerfjs';
import {
  PanelBottomClose,
  PanelBottomOpen,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide';

import {
  Toolbar,
  type ToolbarConfig,
} from '../../components/actions/toolbar/toolbar.js';
import { ToolbarControlGroup } from '../../components/actions/toolbar-control-group/toolbar-control-group.js';
import {
  List,
  type ListConfig,
} from '../../components/collections/list/list.js';
import { Pane, type PaneConfig } from '../../components/layout/pane/pane.js';
import { LucideIcon } from '../../components/media/lucide-icon/lucide-icon.js';
import type { KerfUiContent } from '../content/semantic-content.js';
import { isRelocatableGroup } from './panel-toolbar-group.js';

/** Which edge a collapsible panel docks to. */
export type PanelSide = 'left' | 'right' | 'bottom';

/**
 * The standard collapse/expand icon for a panel `side` and `collapsed` state,
 * so every app's sidebars and drawers use one recognizable convention:
 * `PanelLeft*` for a left rail, `PanelRight*` for a right rail, `PanelBottom*`
 * for a bottom drawer — the `Close` glyph while open, the `Open` glyph while
 * collapsed. Exposed so an app can render its own toggle affordance.
 */
export function collapsiblePanelToggleIcon(
  side: PanelSide,
  collapsed: boolean,
): { icon: Parameters<typeof LucideIcon>[0]['icon']; name: string } {
  if (side === 'left')
    return collapsed
      ? { icon: PanelLeftOpen, name: 'panel-left-open' }
      : { icon: PanelLeftClose, name: 'panel-left-close' };
  if (side === 'right')
    return collapsed
      ? { icon: PanelRightOpen, name: 'panel-right-open' }
      : { icon: PanelRightClose, name: 'panel-right-close' };
  return collapsed
    ? { icon: PanelBottomOpen, name: 'panel-bottom-open' }
    : { icon: PanelBottomClose, name: 'panel-bottom-close' };
}

/**
 * The standard collapse toggle a panel toolbar renders. The app handles the
 * button's `data-action` and flips its own `collapsed` flag.
 */
export interface PanelToggle {
  /** The `data-action` the toggle button carries. */
  action: string;
  /** The panel's short name, for the accessible "Show …" / "Hide …" label. */
  name: string;
  /** Accessible label while the panel is collapsed. Defaults to `Show {name}`. */
  showLabel?: string;
  /** Accessible label while the panel is open. Defaults to `Hide {name}`. */
  hideLabel?: string;
}

/**
 * A collapsible panel's top toolbar, composed so its groups follow the
 * panel's open state.
 *
 * - `title` precedes the `leading` zone. Groups may appear in any of the
 *   `leading`, `center`, and `trailing` zones while the panel is open.
 * - Groups marked `relocateOnCollapse` move to the work area's toolbar while
 *   the panel is collapsed, preserving their order across the three zones.
 * - `toggle` is always the last group: in the panel's toolbar while it is
 *   open, and right after the relocated groups in the work area's toolbar
 *   while it is collapsed.
 *
 * Relocated content renders in both places while the panel is collapsed (the
 * panel's copy is inert), so give it no `id`s. Pass groups directly or in
 * arrays so their render-time annotation remains available to the panel.
 *
 * The toolbar's configuration (`dividerSides`, `centerAlign`, `responsive`,
 * `responsiveAt`, `safeAreaEdges`) forwards to its `Toolbar`. It draws no
 * divider of its own: the panel's `Pane` draws the line under it while the
 * content is scrolled (its `chromeDividers`, wired by `wireScrollDividers`).
 */
export interface PanelToolbar extends ToolbarConfig {
  /** Accessible name of the panel's toolbar. */
  label: string;
  title?: KerfUiContent;
  leading?: KerfUiContent;
  center?: KerfUiContent;
  trailing?: KerfUiContent;
  toggle?: PanelToggle;
}

/** A panel's fixed bottom toolbar, below its optional footer content. */
export interface PanelBottomToolbar extends ToolbarConfig {
  label: string;
  leading?: KerfUiContent;
  center?: KerfUiContent;
  trailing?: KerfUiContent;
}

/** Whether panel chrome stays fixed, scrolls, or follows Pane's auto rule. */
export type PanelChromePlacement = 'fixed' | 'scroll' | 'auto';

function panelChromeList(content: KerfUiContent, config?: ListConfig) {
  return (
    <List
      dividerSides={config?.dividerSides}
      gap={config?.gap}
      hAlign={config?.hAlign}
      vAlign={config?.vAlign}
      textInsets={config?.textInsets}
      controlInsets={config?.controlInsets}
    >
      {content}
    </List>
  );
}

/** Owner-specific attributes a toggle button carries (its wiring hooks). */
export type PanelToggleAttributes = Readonly<Record<string, string>>;

/** The standard toggle, alone in a borderless group. */
export function panelToggleGroup(
  side: PanelSide,
  toggle: PanelToggle,
  collapsed: boolean,
  attributes: PanelToggleAttributes,
): SafeHtml {
  const glyph = collapsiblePanelToggleIcon(side, collapsed);
  return (
    <ToolbarControlGroup label={toggle.name} appearance="borderless" single>
      <button
        type="button"
        {...attributes}
        data-action={toggle.action}
        aria-expanded={String(!collapsed)}
        aria-label={
          collapsed
            ? (toggle.showLabel ?? `Show ${toggle.name}`)
            : (toggle.hideLabel ?? `Hide ${toggle.name}`)
        }
      >
        <LucideIcon icon={glyph.icon} name={glyph.name} />
      </button>
    </ToolbarControlGroup>
  );
}

/**
 * The panel's own toolbar: content keeps its chosen zones and the toggle trails.
 */
export function composedPanelToolbar(
  toolbar: PanelToolbar,
  side: PanelSide,
  collapsed: boolean,
  attributes: PanelToggleAttributes,
): SafeHtml {
  return (
    <Toolbar
      label={toolbar.label}
      dividerSides={toolbar.dividerSides}
      centerAlign={toolbar.centerAlign}
      responsive={toolbar.responsive}
      responsiveAt={toolbar.responsiveAt}
      safeAreaEdges={toolbar.safeAreaEdges}
      center={toolbar.center}
      leading={
        <>
          {toolbar.title}
          {toolbar.leading}
        </>
      }
      trailing={
        <>
          {toolbar.trailing}
          {toolbar.toggle
            ? panelToggleGroup(side, toolbar.toggle, collapsed, attributes)
            : null}
        </>
      }
    />
  );
}

/**
 * A toolbar panel's body: its content in a `Pane` under its composed toolbar,
 * with its optional `footer` below. The panel's `pane` configuration forwards
 * to that `Pane`; an omitted or `undefined` field keeps the `Pane` default.
 */
export function composedPanelBody({
  toolbar,
  side,
  collapsed,
  attributes,
  pane,
  header,
  headerList,
  headerPlacement = 'fixed',
  footer,
  footerList,
  bottomToolbar,
  footerPlacement = 'fixed',
  content,
}: {
  toolbar: PanelToolbar;
  side: PanelSide;
  collapsed: boolean;
  attributes: PanelToggleAttributes;
  pane: PaneConfig | undefined;
  header?: KerfUiContent;
  headerList?: ListConfig;
  headerPlacement?: PanelChromePlacement;
  footer?: KerfUiContent;
  footerList?: ListConfig;
  bottomToolbar?: PanelBottomToolbar;
  footerPlacement?: PanelChromePlacement;
  content: KerfUiContent;
}): SafeHtml {
  const panelHeader = (
    <>
      {composedPanelToolbar(toolbar, side, collapsed, attributes)}
      {header ? panelChromeList(header, headerList) : null}
    </>
  );
  const panelFooter =
    footer || bottomToolbar ? (
      <>
        {footer ? panelChromeList(footer, footerList) : null}
        {bottomToolbar ? (
          <Toolbar
            position="footer"
            label={bottomToolbar.label}
            dividerSides={bottomToolbar.dividerSides}
            centerAlign={bottomToolbar.centerAlign}
            responsive={bottomToolbar.responsive}
            responsiveAt={bottomToolbar.responsiveAt}
            safeAreaEdges={bottomToolbar.safeAreaEdges}
            leading={bottomToolbar.leading}
            center={bottomToolbar.center}
            trailing={bottomToolbar.trailing}
          />
        ) : null}
      </>
    ) : undefined;
  const scrollHeader = headerPlacement === 'scroll';
  const scrollFooter = footerPlacement === 'scroll';
  return (
    <Pane
      header={scrollHeader ? undefined : panelHeader}
      footer={scrollFooter ? undefined : panelFooter}
      chromePlacement={
        headerPlacement === 'auto' || footerPlacement === 'auto'
          ? 'auto'
          : 'fixed'
      }
      contentElement={pane?.contentElement}
      contentLabel={pane?.contentLabel}
      separators={pane?.separators}
      safeAreaEdges={pane?.safeAreaEdges}
      chromeDividers={pane?.chromeDividers}
      appearance={pane?.appearance}
      deepInset={pane?.deepInset}
      tabIndex={pane?.tabIndex}
      outlined={pane?.outlined}
    >
      {scrollHeader ? panelHeader : null}
      {content}
      {scrollFooter ? panelFooter : null}
    </Pane>
  );
}

/**
 * The groups a collapsed panel hands to the work area, in zone order, then its
 * toggle. Empty while the panel is open or has no toolbar.
 */
export function relocatedPanelGroups(
  toolbar: PanelToolbar | undefined,
  side: PanelSide,
  collapsed: boolean,
  attributes: PanelToggleAttributes,
): KerfUiContent[] {
  if (!collapsed || !toolbar) return [];
  const groups: KerfUiContent[] = [];
  const collect = (content: KerfUiContent): void => {
    if (Array.isArray(content)) {
      for (const item of content) collect(item);
    } else if (isRelocatableGroup(content)) {
      groups.push(content);
    }
  };
  collect(toolbar.leading);
  collect(toolbar.center);
  collect(toolbar.trailing);
  return [
    ...groups,
    toolbar.toggle
      ? panelToggleGroup(side, toolbar.toggle, true, attributes)
      : null,
  ].filter((group) => group !== undefined && group !== null && group !== false);
}
