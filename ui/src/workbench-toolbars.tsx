import {
  FloatingToolbar,
  type FloatingToolbarPosition,
} from './floating-toolbar.js';
import { List, type ListConfig } from './list.js';
import { Pane, type PaneConfig } from './pane.js';
import {
  composedPanelBody,
  type PanelSide,
  type PanelToggle,
  type PanelToggleAttributes,
  type PanelToolbar,
  relocatedPanelGroups,
} from './panel-toolbar.js';
import type { KerfUiContent } from './semantic-content.js';
import { Toolbar, type ToolbarConfig } from './toolbar.js';
import {
  type WorkbenchPanelKey,
  workbenchRegionId,
} from './workbench-resize.js';

/** The standard toggle a Workbench renders for a panel (see {@link PanelToggle}). */
export type WorkbenchPanelToggle = PanelToggle;

/**
 * A Workbench panel's top toolbar, composed by the Workbench so its groups can
 * follow the panel's open state (see {@link PanelToolbar} for the roles).
 * A collapsed rail's marked groups and toggle go to the leading edge of
 * `mainToolbar` (left rail) or its trailing edge (right rail); a collapsed
 * drawer's go to the trailing edge of `mainBottomToolbar`, else to a
 * `FloatingToolbar` in the work area's bottom-end corner.
 */
export type WorkbenchPanelToolbar = PanelToolbar;

/**
 * The work area's top toolbar; collapsed rails add their groups to it. Its
 * configuration forwards to its `Toolbar`. It draws no divider of its own by
 * default: the work area's `Pane` draws one under its header chrome, wherever
 * that chrome ends, while `main` is scrolled (`mainPane.chromeDividers`).
 */
export interface WorkbenchMainToolbar extends ToolbarConfig {
  label: string;
  /** The work area's title, usually an extra-large `ToolbarText`. */
  title?: KerfUiContent;
  /** Groups after the title. */
  leading?: KerfUiContent;
  center?: KerfUiContent;
  /** Groups at the trailing edge, before a collapsed right rail's groups. */
  trailing?: KerfUiContent;
}

/**
 * The work area's bottom toolbar; a collapsed drawer adds its groups to it.
 * Its configuration forwards to its `Toolbar`. It draws no divider of its own
 * by default: the work area's `Pane` draws one over its footer chrome while
 * more of `main` lies below (`mainPane.chromeDividers`).
 */
export interface WorkbenchMainBottomToolbar extends ToolbarConfig {
  label: string;
  leading?: KerfUiContent;
  center?: KerfUiContent;
  trailing?: KerfUiContent;
}

const SIDES: Record<WorkbenchPanelKey, PanelSide> = {
  leftRail: 'left',
  rightRail: 'right',
  bottomDrawer: 'bottom',
};

/** A panel as far as its toolbar is concerned. */
export interface WorkbenchToolbarPanel {
  toolbar?: WorkbenchPanelToolbar;
  footer?: KerfUiContent;
  /** Configuration for the `Pane` a `toolbar` panel's content renders in. */
  pane?: PaneConfig;
  content: KerfUiContent;
  collapsed?: boolean;
  /** The corner a collapsed panel's restore controls float in. */
  restorePosition?: FloatingToolbarPosition;
}

/** A Workbench toggle's wiring hooks: its side, morph key, and panel. */
const toggleAttributes = (
  workbenchId: string,
  key: WorkbenchPanelKey,
): PanelToggleAttributes => ({
  'data-workbench-toggle': SIDES[key],
  // Keyed, so the morph removes a toggle that leaves a toolbar instead of
  // reusing its (possibly focused) button for a different control.
  'data-key': `${workbenchRegionId(workbenchId, key)}-toggle`,
  'aria-controls': workbenchRegionId(workbenchId, key),
});

/**
 * The groups a collapsed panel hands to the work area: its marked groups,
 * then its toggle. Empty while the panel is open or has no toolbar.
 */
export function relocatedGroups(
  workbenchId: string,
  key: WorkbenchPanelKey,
  panel: WorkbenchToolbarPanel | undefined,
): KerfUiContent[] {
  return relocatedPanelGroups(
    panel?.toolbar,
    SIDES[key],
    Boolean(panel?.collapsed),
    toggleAttributes(workbenchId, key),
  );
}

/**
 * A panel's content, wrapped in a `Pane` under its composed toolbar when it
 * has one (with its optional `footer` below). Without a toolbar the content
 * renders as given.
 */
export function panelBody(
  workbenchId: string,
  key: WorkbenchPanelKey,
  panel: WorkbenchToolbarPanel,
) {
  const toolbar = panel.toolbar;
  if (!toolbar) return panel.content;
  return composedPanelBody({
    toolbar,
    side: SIDES[key],
    collapsed: Boolean(panel.collapsed),
    attributes: toggleAttributes(workbenchId, key),
    pane: panel.pane,
    footer: panel.footer,
    content: panel.content,
  });
}

/**
 * The work area's `mainHeader` / `mainFooter` chrome in a `List` carrying the
 * app's configuration; an omitted or `undefined` field keeps the `List`
 * default (no divider: the work area's `Pane` draws its chrome dividers).
 */
function chromeList(content: KerfUiContent, config: ListConfig | undefined) {
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

/**
 * Whether the work area's header or footer chrome stays pinned (`fixed`),
 * scrolls away with the content (`scroll`), or stays pinned while the work
 * area is tall enough and scrolls with the content when it is short (`auto`,
 * the Pane's `chromePlacement="auto"`; it applies to the pinned header and
 * footer together).
 */
export type WorkbenchChromePlacement = 'fixed' | 'scroll' | 'auto';

/**
 * The work area: the app's `main` in a `Pane` (configured by `mainPane`)
 * under `mainToolbar` and any `mainHeader` list, and above any `mainFooter`
 * list and `mainBottomToolbar` (the header and footer lists configured by
 * `mainHeaderList` / `mainFooterList`), with each collapsed panel's groups
 * added to the toolbar on its side. Without any of that chrome, `main`
 * renders as given; only `mainPane.appearance` applies to the Workbench's
 * own scroll region in that case.
 */
export function mainBody({
  workbenchId,
  main,
  mainToolbar,
  mainHeader,
  mainFooter,
  mainBottomToolbar,
  mainHeaderPlacement = 'fixed',
  mainFooterPlacement = 'fixed',
  mainPane,
  mainHeaderList,
  mainFooterList,
  leftRail,
  rightRail,
  bottomDrawer,
}: {
  workbenchId: string;
  main: KerfUiContent;
  mainToolbar?: WorkbenchMainToolbar;
  mainHeader?: KerfUiContent;
  mainFooter?: KerfUiContent;
  mainBottomToolbar?: WorkbenchMainBottomToolbar;
  mainHeaderPlacement?: WorkbenchChromePlacement;
  mainFooterPlacement?: WorkbenchChromePlacement;
  mainPane?: PaneConfig;
  mainHeaderList?: ListConfig;
  mainFooterList?: ListConfig;
  leftRail?: WorkbenchToolbarPanel;
  rightRail?: WorkbenchToolbarPanel;
  bottomDrawer?: WorkbenchToolbarPanel;
}) {
  if (!mainToolbar && !mainBottomToolbar && !mainHeader && !mainFooter)
    return main;
  const left = relocatedGroups(workbenchId, 'leftRail', leftRail);
  const right = relocatedGroups(workbenchId, 'rightRail', rightRail);
  const drawer = mainBottomToolbar
    ? relocatedGroups(workbenchId, 'bottomDrawer', bottomDrawer)
    : [];
  // The Pane draws one divider under the header chrome and one over the
  // footer chrome, wherever that chrome ends, from the scroll state.
  const header =
    !mainToolbar && !mainHeader ? undefined : (
      <>
        {mainToolbar ? (
          <Toolbar
            label={mainToolbar.label}
            dividerSides={mainToolbar.dividerSides}
            centerAlign={mainToolbar.centerAlign}
            responsive={mainToolbar.responsive}
            responsiveAt={mainToolbar.responsiveAt}
            safeAreaEdges={mainToolbar.safeAreaEdges}
            leading={
              <>
                {left}
                {mainToolbar.title}
                {mainToolbar.leading}
              </>
            }
            center={mainToolbar.center}
            trailing={
              <>
                {mainToolbar.trailing}
                {right}
              </>
            }
          />
        ) : null}
        {mainHeader ? chromeList(mainHeader, mainHeaderList) : null}
      </>
    );
  const footer =
    !mainFooter && !mainBottomToolbar ? undefined : (
      <>
        {mainFooter ? chromeList(mainFooter, mainFooterList) : null}
        {mainBottomToolbar ? (
          <Toolbar
            label={mainBottomToolbar.label}
            dividerSides={mainBottomToolbar.dividerSides}
            centerAlign={mainBottomToolbar.centerAlign}
            responsive={mainBottomToolbar.responsive}
            responsiveAt={mainBottomToolbar.responsiveAt}
            safeAreaEdges={mainBottomToolbar.safeAreaEdges}
            leading={mainBottomToolbar.leading}
            center={mainBottomToolbar.center}
            trailing={
              <>
                {mainBottomToolbar.trailing}
                {drawer}
              </>
            }
          />
        ) : null}
      </>
    );
  const scrollHeader = mainHeaderPlacement === 'scroll';
  const scrollFooter = mainFooterPlacement === 'scroll';
  return (
    <Pane
      header={scrollHeader ? undefined : header}
      footer={scrollFooter ? undefined : footer}
      chromePlacement={
        mainHeaderPlacement === 'auto' || mainFooterPlacement === 'auto'
          ? 'auto'
          : 'fixed'
      }
      contentElement={mainPane?.contentElement}
      contentLabel={mainPane?.contentLabel}
      separators={mainPane?.separators}
      safeAreaEdges={mainPane?.safeAreaEdges}
      chromeDividers={mainPane?.chromeDividers}
      appearance={mainPane?.appearance}
    >
      {scrollHeader || scrollFooter ? (
        // Chrome that scrolls joins the content in one gapless column that
        // fills the scroller, so it scrolls away with the content.
        <List flex>
          {scrollHeader ? header : null}
          {main}
          {scrollFooter ? footer : null}
        </List>
      ) : (
        main
      )}
    </Pane>
  );
}

/**
 * A collapsed panel's groups when the work area has no toolbar on its side
 * to take them: a `FloatingToolbar` for the panel's restore corner, so the
 * panel can always be reopened.
 */
export function floatingRestore(
  workbenchId: string,
  key: WorkbenchPanelKey,
  panel: WorkbenchToolbarPanel | undefined,
  hasTargetToolbar: boolean,
) {
  if (hasTargetToolbar) return undefined;
  const groups = relocatedGroups(workbenchId, key, panel);
  if (groups.length === 0) return undefined;
  return (
    <FloatingToolbar
      label={panel!.toolbar!.label}
      position={
        panel!.restorePosition ??
        (key === 'leftRail' ? 'bottom-start' : 'bottom-end')
      }
    >
      {groups}
    </FloatingToolbar>
  );
}
