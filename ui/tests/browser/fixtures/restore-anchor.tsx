import '@kerfjs/ui/foundation.css';
import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/floating-toolbar.css';
import '@kerfjs/ui/lucide-icon.css';
import '@kerfjs/ui/pane.css';
import '@kerfjs/ui/toolbar-control-group.css';
import '@kerfjs/ui/collapsible-panel.css';
import '@kerfjs/ui/resizable-region.css';
import '@kerfjs/ui/workbench.css';

import {
  CollapsiblePanel,
  CollapsiblePanelToggle,
} from '@kerfjs/ui/collapsible-panel';
import { FloatingToolbar } from '@kerfjs/ui/floating-toolbar';
import { Pane } from '@kerfjs/ui/pane';
import { ResizableRegion } from '@kerfjs/ui/resizable-region';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { wireSidebar } from '@kerfjs/ui/wire-sidebar';
import { Workbench } from '@kerfjs/ui/workbench';
import { mount, signal } from 'kerfjs';

/**
 * Collapsed CollapsiblePanel / ResizableRegion instances that carry a
 * `restoreControl`, in two placements: embedded in a scrolling page between
 * unrelated content (`embedded`), and as a full-viewport app shell
 * (`viewport`). The restore control must float in a corner of the component's
 * own container in both, never in a corner of the viewport. The `drawer`
 * scenario holds a collapsed rail beside an expanded bottom drawer: as a
 * sibling in the rail's own container, in a work-area column of that container,
 * and nested deeper inside the work-area content (which must not move it).
 * The `overlay` scenario opens a `wireSidebar` compact overlay (backdrop +
 * focus trap) beside another panel's collapsed restore control, and the
 * `region-overlay` scenario opens an overlay ResizableRegion drawer over a
 * collapsed rail's restore corner: an open overlay covers both.
 * The `workbench` scenario holds the Workbench equivalents: collapsed rails
 * with restore controls beside an expanded inline bottom drawer, a drawer that
 * becomes an overlay at narrow widths, and a drawer inside a nested Workbench
 * in the work area (which must not move the outer rail's control).
 */
type Scenario =
  | 'embedded'
  | 'viewport'
  | 'drawer'
  | 'overlay'
  | 'region-overlay'
  | 'workbench';

const scenario = signal<Scenario>('embedded');
/** Whether the drawer scenario's drawers are collapsed. */
const drawersCollapsed = signal(false);

const content = (title: string) => (
  <Pane>
    <div class="kui-content">
      <div class="kui-content-item">{title}</div>
    </div>
  </Pane>
);

/** Host content that fills the rest of its flex container. */
const fill = (title: string) => (
  <div style="display:flex;flex:1 1 0;min-width:0;min-height:0">
    {content(title)}
  </div>
);

const panel = (id = 'restore-nav') => (
  <CollapsiblePanel
    id={id}
    side="left"
    collapsed
    label="Navigator"
    restoreControl={
      <CollapsiblePanelToggle
        side="left"
        collapsed
        action="toggle-restore-nav"
        label="Show navigator"
      />
    }
  >
    {content('Navigator')}
  </CollapsiblePanel>
);

const drawer = (id: string) => (
  <CollapsiblePanel
    id={id}
    side="bottom"
    size={96}
    label="Drawer"
    collapsed={drawersCollapsed.value}
  >
    {content('Drawer')}
  </CollapsiblePanel>
);

const openRegion = () => (
  <ResizableRegion
    id="restore-open-console"
    label="Console"
    axis="vertical"
    edge="start"
    size={96}
    min={80}
    max={200}
    collapsed={drawersCollapsed.value}
  >
    {content('Console')}
  </ResizableRegion>
);

const region = () => (
  <ResizableRegion
    id="restore-console"
    label="Console"
    axis="vertical"
    edge="start"
    size={120}
    min={80}
    max={200}
    collapsed
    restoreControl={
      <FloatingToolbar label="Console" position="bottom-end">
        <ToolbarControlGroup label="Console" single>
          <CollapsiblePanelToggle
            side="bottom"
            collapsed
            action="toggle-restore-console"
            label="Show console"
          />
        </ToolbarControlGroup>
      </FloatingToolbar>
    }
  >
    {content('Console')}
  </ResizableRegion>
);

/** The overlay scenarios' open panel / region state. */
const navCollapsed = signal(true);
const inspectorCollapsed = signal(true);
const consoleCollapsed = signal(false);

const compactOverlay = () => (
  <div
    data-restore-host="overlay"
    style="display:flex;height:100vh;height:100dvh"
  >
    <CollapsiblePanel
      id="overlay-nav"
      side="left"
      collapsed={navCollapsed.value}
      label="Navigator"
    >
      {content('Navigator')}
    </CollapsiblePanel>
    {fill('App content')}
    <CollapsiblePanel
      id="overlay-inspector"
      side="right"
      collapsed={inspectorCollapsed.value}
      label="Inspector"
      restoreControl={
        <CollapsiblePanelToggle
          side="right"
          collapsed
          action="toggle-overlay-inspector"
          label="Show inspector"
        />
      }
    >
      {content('Inspector')}
    </CollapsiblePanel>
  </div>
);

const regionOverlay = () => (
  <div
    data-restore-host="region-overlay"
    style="display:flex;height:100vh;height:100dvh"
  >
    <ResizableRegion
      id="overlay-rail"
      label="Navigator"
      size={240}
      min={160}
      max={320}
      collapsed
      restoreControl={
        <CollapsiblePanelToggle
          side="left"
          collapsed
          action="toggle-overlay-rail"
          label="Show navigator"
        />
      }
    >
      {content('Navigator')}
    </ResizableRegion>
    <div style="position:relative;display:flex;flex-direction:column;flex:1;min-width:0;overflow:hidden">
      {fill('App content')}
      <ResizableRegion
        id="overlay-console"
        label="Console"
        axis="vertical"
        edge="start"
        size={200}
        min={120}
        max={320}
        presentation="overlay"
        collapsed={consoleCollapsed.value}
      >
        {content('Console')}
      </ResizableRegion>
    </div>
  </div>
);

const intro = (
  <p data-page-text="intro" style="margin:0;height:160px">
    Unrelated page content above the components.
  </p>
);

// The sibling-drawer host is an app grid: the rail spans both rows and the
// drawer sits under the work area, both direct children of the rail's
// container.
const gridStyle = document.createElement('style');
gridStyle.textContent = `
  [data-restore-host="sibling-drawer"] > .kui-collapsible-panel--left { grid-row: 1 / -1; }
  [data-restore-host="sibling-drawer"] > .kui-collapsible-panel--bottom { grid-column: 2; }
`;
document.head.append(gridStyle);

const hostStyle = (extra: string) =>
  `height:240px;overflow:hidden;outline:1px dashed var(--kui-color-border);${extra}`;

const drawers = () => (
  <main style="display:grid;gap:24px;padding:24px">
    <div
      data-restore-host="sibling-drawer"
      style={hostStyle(
        'display:grid;grid-template-columns:auto 1fr;grid-template-rows:1fr auto',
      )}
    >
      {panel('restore-sibling-nav')}
      <div style="display:flex;min-width:0;min-height:0">
        {content('Work area')}
      </div>
      {drawer('restore-sibling-drawer')}
    </div>
    <div data-restore-host="column-drawer" style={hostStyle('display:flex')}>
      {panel('restore-column-nav')}
      <div style="display:flex;flex-direction:column;flex:1;min-width:0;overflow:hidden">
        {fill('Work area')}
        {openRegion()}
      </div>
    </div>
    <div data-restore-host="deep-drawer" style={hostStyle('display:flex')}>
      {panel('restore-deep-nav')}
      <div style="display:flex;flex:1 1 0;min-width:0;min-height:0">
        {/* Work-area content that happens to hold its own drawer. */}
        <div style="display:flex;flex-direction:column;flex:1;min-width:0">
          {fill('Work-area content')}
          {drawer('restore-deep-drawer')}
        </div>
      </div>
    </div>
  </main>
);

const railRestore = (side: 'left' | 'right', name: string) => (
  <CollapsiblePanelToggle
    side={side}
    collapsed
    action={`toggle-restore-${name}`}
    label={`Show ${name}`}
  />
);

const workbench = (
  id: string,
  drawerPanel?: { responsive?: boolean },
  main = content('Work area'),
) => (
  <Workbench
    id={id}
    label={id}
    mainMinSize={0}
    leftRail={{
      label: 'Navigator',
      content: content('Navigator'),
      collapsed: true,
      restoreControl: railRestore('left', 'navigator'),
    }}
    main={main}
    rightRail={
      drawerPanel
        ? {
            label: 'Inspector',
            content: content('Inspector'),
            collapsed: true,
            restoreControl: railRestore('right', 'inspector'),
          }
        : undefined
    }
    bottomDrawer={
      drawerPanel
        ? {
            label: 'Console',
            content: content('Console'),
            size: 96,
            collapsed: drawersCollapsed.value,
            responsiveOverlayAt: drawerPanel.responsive ? 'narrow' : undefined,
          }
        : undefined
    }
  />
);

const workbenches = () => (
  <main style="display:grid;gap:24px;padding:24px">
    <div data-restore-host="workbench" style={hostStyle('')}>
      {workbench('restore-wb', {})}
    </div>
    <div data-restore-host="workbench-responsive" style={hostStyle('')}>
      {workbench('restore-wb-responsive', { responsive: true })}
    </div>
    <div data-restore-host="workbench-nested" style={hostStyle('')}>
      {workbench(
        'restore-wb-outer',
        undefined,
        workbench('restore-wb-inner', {}),
      )}
    </div>
  </main>
);

const view = () =>
  scenario.value === 'overlay' ? (
    compactOverlay()
  ) : scenario.value === 'region-overlay' ? (
    regionOverlay()
  ) : scenario.value === 'workbench' ? (
    workbenches()
  ) : scenario.value === 'drawer' ? (
    drawers()
  ) : scenario.value === 'embedded' ? (
    <main style="display:grid;gap:24px;padding:24px">
      {intro}
      <div
        data-restore-host="panel"
        style="display:flex;height:240px;overflow:hidden;outline:1px dashed var(--kui-color-border)"
      >
        {panel()}
        {fill('Panel host content')}
      </div>
      <div
        data-restore-host="region"
        style="display:flex;flex-direction:column;height:240px;overflow:hidden;outline:1px dashed var(--kui-color-border)"
      >
        {fill('Region host content')}
        {region()}
      </div>
      <p data-page-text="footer" style="margin:0;height:1200px">
        Unrelated page content below the components.
      </p>
    </main>
  ) : (
    <div
      data-restore-host="viewport"
      style="display:flex;height:100vh;height:100dvh"
    >
      {panel()}
      <div style="display:flex;flex-direction:column;flex:1;min-width:0;overflow:hidden">
        {fill('App content')}
        {region()}
      </div>
    </div>
  );

mount(document.querySelector<HTMLElement>('[data-restore-fixture]')!, view);

(globalThis as unknown as Record<string, unknown>).restoreFixture = {
  show(value: Scenario) {
    scenario.value = value;
    if (value !== 'overlay') return;
    // A compact device, so wireSidebar presents the panels as an overlay with
    // a backdrop and a focus trap. Wire-up starts every panel collapsed.
    const compact = signal({
      size: 'mobile' as const,
      orientation: 'portrait' as const,
      segments: 1,
      verticalSegments: 1,
      handset: true,
      compact: true,
      atLeast: () => false,
    });
    wireSidebar(document.querySelector<HTMLElement>('[data-restore-host]')!, {
      deviceClass: compact,
      storage: { getItem: () => null, setItem: () => undefined },
      panels: [
        { id: 'overlay-nav', collapsed: navCollapsed, toggleAction: 'x' },
        {
          id: 'overlay-inspector',
          collapsed: inspectorCollapsed,
          toggleAction: 'toggle-overlay-inspector',
        },
      ],
    });
  },
  openNav() {
    navCollapsed.value = false;
  },
  collapseConsole(value: boolean) {
    consoleCollapsed.value = value;
  },
  collapseDrawers(value: boolean) {
    drawersCollapsed.value = value;
  },
};
