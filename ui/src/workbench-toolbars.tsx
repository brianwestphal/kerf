import { collapsiblePanelToggleIcon } from './collapsible-panel.js';
import { FloatingToolbar } from './floating-toolbar.js';
import { List } from './list.js';
import { LucideIcon } from './lucide-icon.js';
import { Pane } from './pane.js';
import type { KerfUiContent } from './semantic-content.js';
import { Toolbar, type ToolbarProps } from './toolbar.js';
import { ToolbarControlGroup } from './toolbar-control-group.js';
import {
  type WorkbenchPanelKey,
  workbenchRegionId,
} from './workbench-resize.js';

/**
 * The standard collapse toggle a Workbench renders for a panel. The app
 * handles the button's `data-action` and flips its own `collapsed` flag.
 */
export interface WorkbenchPanelToggle {
  /** The `data-action` the toggle button carries. */
  action: string;
  /** The panel's short name, for the accessible "Show …" / "Hide …" label. */
  name: string;
}

/**
 * A Workbench panel's top toolbar, composed by the Workbench so its groups can
 * follow the panel's open state.
 *
 * - `title` (a `ToolbarText`) and `panelOnly` groups lead the toolbar and are
 *   available only while the panel is open.
 * - `constant` groups stay available either way: they trail the panel's
 *   toolbar while it is open and move to the work area's toolbar while it is
 *   collapsed.
 * - `toggle` is always the last group: in the panel's toolbar while it is
 *   open, and right after the `constant` groups in the work area's toolbar
 *   while it is collapsed.
 *
 * A collapsed rail's groups go to the leading edge of `mainToolbar` (left rail)
 * or its trailing edge (right rail); a collapsed drawer's go to the trailing
 * edge of `mainBottomToolbar`, else to a `FloatingToolbar` in the work area's
 * bottom-end corner. `constant` content renders in both places while the panel
 * is collapsed (the panel's copy is inert), so give it no `id`s.
 */
export interface WorkbenchPanelToolbar {
  /** Accessible name of the panel's toolbar. */
  label: string;
  title?: KerfUiContent;
  panelOnly?: KerfUiContent;
  constant?: KerfUiContent;
  toggle?: WorkbenchPanelToggle;
}

/** The work area's top toolbar; collapsed rails add their groups to it. */
export interface WorkbenchMainToolbar {
  label: string;
  /** The work area's title, usually an extra-large `ToolbarText`. */
  title?: KerfUiContent;
  /** Groups after the title. */
  leading?: KerfUiContent;
  center?: KerfUiContent;
  /** Groups at the trailing edge, before a collapsed right rail's groups. */
  trailing?: KerfUiContent;
  /** The toolbar's narrow-width policy (see `Toolbar.responsive`). */
  responsive?: ToolbarProps['responsive'];
  responsiveAt?: ToolbarProps['responsiveAt'];
}

/** The work area's bottom toolbar; a collapsed drawer adds its groups to it. */
export interface WorkbenchMainBottomToolbar {
  label: string;
  leading?: KerfUiContent;
  trailing?: KerfUiContent;
}

type ToolbarSide = 'left' | 'right' | 'bottom';

const SIDES: Record<WorkbenchPanelKey, ToolbarSide> = {
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
}

function toggleGroup(
  workbenchId: string,
  key: WorkbenchPanelKey,
  toggle: WorkbenchPanelToggle,
  collapsed: boolean,
) {
  const glyph = collapsiblePanelToggleIcon(SIDES[key], collapsed);
  // Keyed, so the morph removes a toggle that leaves a toolbar instead of
  // reusing its (possibly focused) button for a different control.
  return (
    <ToolbarControlGroup label={toggle.name} appearance="borderless" single>
      <button
        type="button"
        data-action={toggle.action}
        data-workbench-toggle={SIDES[key]}
        data-key={`${workbenchRegionId(workbenchId, key)}-toggle`}
        aria-controls={workbenchRegionId(workbenchId, key)}
        aria-expanded={String(!collapsed)}
        aria-label={`${collapsed ? 'Show' : 'Hide'} ${toggle.name}`}
      >
        <LucideIcon icon={glyph.icon} name={glyph.name} />
      </button>
    </ToolbarControlGroup>
  );
}

/**
 * The groups a collapsed panel hands to the work area: its `constant` groups,
 * then its toggle. Empty while the panel is open or has no toolbar.
 */
export function relocatedGroups(
  workbenchId: string,
  key: WorkbenchPanelKey,
  panel: WorkbenchToolbarPanel | undefined,
): KerfUiContent[] {
  const toolbar = panel?.toolbar;
  if (!panel?.collapsed || !toolbar) return [];
  return [
    toolbar.constant,
    toolbar.toggle ? toggleGroup(workbenchId, key, toolbar.toggle, true) : null,
  ].filter((group) => group !== undefined && group !== null && group !== false);
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
      header={
        <Toolbar
          label={toolbar.label}
          dividerSides="b"
          leading={
            <>
              {toolbar.title}
              {toolbar.panelOnly}
            </>
          }
          trailing={
            <>
              {toolbar.constant}
              {toolbar.toggle
                ? toggleGroup(
                    workbenchId,
                    key,
                    toolbar.toggle,
                    Boolean(panel.collapsed),
                  )
                : null}
            </>
          }
        />
      }
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
            dividerSides={mainHeader ? '' : 'b'}
            responsive={mainToolbar.responsive}
            responsiveAt={mainToolbar.responsiveAt}
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
            dividerSides={mainFooter ? '' : 't'}
            leading={mainBottomToolbar.leading}
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
      position={key === 'leftRail' ? 'bottom-start' : 'bottom-end'}
    >
      {groups}
    </FloatingToolbar>
  );
}
