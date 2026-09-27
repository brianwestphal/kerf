import '@kerfjs/ui/foundation.css';
import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/floating-toolbar.css';
import '@kerfjs/ui/lucide-icon.css';
import '@kerfjs/ui/pane.css';
import '@kerfjs/ui/toolbar-control-group.css';
import '@kerfjs/ui/collapsible-panel.css';
import '@kerfjs/ui/resizable-region.css';

import {
  CollapsiblePanel,
  CollapsiblePanelToggle,
} from '@kerfjs/ui/collapsible-panel';
import { FloatingToolbar } from '@kerfjs/ui/floating-toolbar';
import { Pane } from '@kerfjs/ui/pane';
import { ResizableRegion } from '@kerfjs/ui/resizable-region';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
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
 */
type Scenario = 'embedded' | 'viewport' | 'drawer';

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

const view = () =>
  scenario.value === 'drawer' ? (
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
  },
  collapseDrawers(value: boolean) {
    drawersCollapsed.value = value;
  },
};
