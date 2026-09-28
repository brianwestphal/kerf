import {
  FloatingToolbar,
  type FloatingToolbarPosition,
} from './floating-toolbar.js';
import { List } from './list.js';
import { Pane } from './pane.js';
import {
  composedPanelToolbar,
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
 * A collapsed rail's `constant` groups and toggle go to the leading edge of
 * `mainToolbar` (left rail) or its trailing edge (right rail); a collapsed
 * drawer's go to the trailing edge of `mainBottomToolbar`, else to a
 * `FloatingToolbar` in the work area's bottom-end corner.
 */
export type WorkbenchPanelToolbar = PanelToolbar;

/**
 * The work area's top toolbar; collapsed rails add their groups to it. Its
 * configuration forwards to its `Toolbar`. By default it draws the divider
 * under the work area's header chrome: its own bottom edge, or none when a
 * `mainHeader` follows (which then carries the divider).
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
 * Its configuration forwards to its `Toolbar`. By default it draws the divider
 * over the work area's footer chrome: its own top edge, or none when a
 * `mainFooter` precedes it.
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
 * The groups a collapsed panel hands to the work area: its `constant` groups,
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
  return (
    <Pane
      header={composedPanelToolbar(
        toolbar,
        SIDES[key],
        Boolean(panel.collapsed),
        toggleAttributes(workbenchId, key),
      )}
      footer={panel.footer}
    >
      {panel.content}
    </Pane>
  );
}

/**
 * The work area: the app's `main` under `mainToolbar` (and above
 * `mainBottomToolbar`), with each collapsed panel's groups added to the
 * toolbar on its side. Without either toolbar, `main` renders as given.
 */
/**
 * Whether the work area's header or footer chrome stays pinned (`fixed`) or
 * scrolls away with the content (`scroll`).
 */
export type WorkbenchChromePlacement = 'fixed' | 'scroll';

export function mainBody({
  workbenchId,
  main,
  mainToolbar,
  mainHeader,
  mainFooter,
  mainBottomToolbar,
  mainHeaderPlacement = 'fixed',
  mainFooterPlacement = 'fixed',
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
  // One divider under the header chrome and one over the footer chrome,
  // wherever that chrome ends.
  const header =
    !mainToolbar && !mainHeader ? undefined : (
      <>
        {mainToolbar ? (
          <Toolbar
            label={mainToolbar.label}
            dividerSides={mainToolbar.dividerSides ?? (mainHeader ? '' : 'b')}
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
        {mainHeader ? <List dividerSides="b">{mainHeader}</List> : null}
      </>
    );
  const footer =
    !mainFooter && !mainBottomToolbar ? undefined : (
      <>
        {mainFooter ? (
          <List dividerSides={mainBottomToolbar ? '' : 't'}>{mainFooter}</List>
        ) : null}
        {mainBottomToolbar ? (
          <Toolbar
            label={mainBottomToolbar.label}
            dividerSides={
              mainBottomToolbar.dividerSides ?? (mainFooter ? '' : 't')
            }
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
