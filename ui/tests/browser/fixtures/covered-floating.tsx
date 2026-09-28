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
 * Layouts whose open side overlay covers a work area that holds floating
 * controls: an app-owned `FloatingToolbar` in the work area (`data-floating`
 * = "main") and a collapsed panel's restore corner. While a side overlay is
 * open those controls hide; the overlay's own FloatingToolbar (`data-floating`
 * = "overlay") stays. Scenarios:
 *
 * - `workbench` — rails with the default `narrow` responsive overlay (inline
 *   when wide, an overlay at 704px or less);
 * - `workbench-static` — a `presentation: "overlay"` right rail;
 * - `sidebar` — CollapsiblePanels under `wireSidebar` on a compact device;
 * - `panel-static` — a `presentation="overlay"` CollapsiblePanel;
 * - `region` — `presentation="overlay"` ResizableRegions beside the work area
 *   (the Hot Sheet app-shell shape), plus a vertical overlay drawer, which is
 *   not a side overlay and hides nothing.
 */
type Scenario =
  'workbench' | 'workbench-static' | 'sidebar' | 'panel-static' | 'region';

const scenario = signal<Scenario>('workbench');
const leftCollapsed = signal(true);
const rightCollapsed = signal(true);
const drawerCollapsed = signal(true);

const toolbar = (where: 'main' | 'overlay') => (
  <FloatingToolbar
    label={where === 'main' ? 'Work area actions' : 'Overlay actions'}
    position="bottom-end"
  >
    <ToolbarControlGroup label="Actions" single>
      <button
        type="button"
        data-floating={where}
        aria-label={where === 'main' ? 'Main action' : 'Overlay action'}
      >
        ⚑
      </button>
    </ToolbarControlGroup>
  </FloatingToolbar>
);

/** A work area whose positioned body floats the main FloatingToolbar. */
const main = () => (
  <div style="position:relative;display:flex;flex:1 1 0;min-width:0;min-height:0">
    <Pane>
      <div class="kui-content">
        <div class="kui-content-item">Work area</div>
      </div>
    </Pane>
    {toolbar('main')}
  </div>
);

/** An overlay's content, holding its own floating toolbar. */
const overlayContent = (title: string) => (
  <div style="position:relative;display:flex;height:100%;min-width:0">
    <Pane>
      <div class="kui-content">
        <div class="kui-content-item">{title}</div>
      </div>
    </Pane>
    {toolbar('overlay')}
  </div>
);

const toggle = (side: 'left' | 'right' | 'bottom', name: string) => (
  <CollapsiblePanelToggle
    side={side}
    collapsed
    action={`toggle-${name}`}
    label={`Show ${name}`}
  />
);

const workbench = (presentation: 'inline' | 'overlay') => (
  <Workbench
    id="covered-wb"
    label="Covered workbench"
    mainMinSize={0}
    leftRail={{
      label: 'Navigator',
      content: overlayContent('Navigator'),
      collapsed: leftCollapsed.value,
      restoreControl: toggle('left', 'navigator'),
    }}
    main={main()}
    rightRail={{
      label: 'Inspector',
      content: overlayContent('Inspector'),
      collapsed: rightCollapsed.value,
      presentation,
      restoreControl: toggle('right', 'inspector'),
    }}
    bottomDrawer={{
      label: 'Console',
      content: overlayContent('Console'),
      collapsed: drawerCollapsed.value,
      responsiveOverlayAt: 'never',
      restoreControl: toggle('bottom', 'console'),
    }}
  />
);

const host = (children: unknown) => (
  <div
    data-covered-host
    style="position:relative;display:flex;height:100vh;height:100dvh;overflow:hidden"
  >
    {children}
  </div>
);

/** A block host: the Workbench is an inline-size container, so it needs a
 * definite width rather than a flex item's content size. */
const wbHost = (children: unknown) => (
  <div data-covered-host style="height:100vh;height:100dvh">
    {children}
  </div>
);

const panels = (presentation: 'inline' | 'overlay') =>
  host(
    <>
      <CollapsiblePanel
        id="covered-nav"
        side="left"
        collapsed={leftCollapsed.value}
        label="Navigator"
        presentation={presentation}
        restoreControl={toggle('left', 'navigator')}
      >
        {overlayContent('Navigator')}
      </CollapsiblePanel>
      <div style="display:flex;flex-direction:column;flex:1;min-width:0">
        {main()}
        <CollapsiblePanel
          id="covered-console"
          side="bottom"
          size={120}
          collapsed={drawerCollapsed.value}
          label="Console"
          restoreControl={toggle('bottom', 'console')}
        >
          {overlayContent('Console')}
        </CollapsiblePanel>
      </div>
      <CollapsiblePanel
        id="covered-inspector"
        side="right"
        collapsed={rightCollapsed.value}
        label="Inspector"
        presentation={presentation}
      >
        {overlayContent('Inspector')}
      </CollapsiblePanel>
    </>,
  );

const regions = () =>
  host(
    <>
      <ResizableRegion
        id="covered-nav-region"
        label="Navigator"
        size={240}
        min={160}
        max={320}
        presentation="overlay"
        collapsed={leftCollapsed.value}
        restoreControl={toggle('left', 'navigator')}
      >
        {overlayContent('Navigator')}
      </ResizableRegion>
      <div style="position:relative;display:flex;flex-direction:column;flex:1;min-width:0;overflow:hidden">
        {main()}
        <ResizableRegion
          id="covered-console-region"
          label="Console"
          axis="vertical"
          edge="start"
          size={160}
          min={120}
          max={320}
          presentation="overlay"
          collapsed={drawerCollapsed.value}
        >
          {overlayContent('Console')}
        </ResizableRegion>
      </div>
      <ResizableRegion
        id="covered-inspector-region"
        label="Inspector"
        size={280}
        min={200}
        max={400}
        edge="start"
        presentation="overlay"
        collapsed={rightCollapsed.value}
      >
        {overlayContent('Inspector')}
      </ResizableRegion>
    </>,
  );

const view = () =>
  scenario.value === 'workbench'
    ? wbHost(workbench('inline'))
    : scenario.value === 'workbench-static'
      ? wbHost(workbench('overlay'))
      : scenario.value === 'panel-static'
        ? panels('overlay')
        : scenario.value === 'region'
          ? regions()
          : panels('inline');

mount(document.querySelector<HTMLElement>('[data-covered-fixture]')!, view);

(globalThis as unknown as Record<string, unknown>).coveredFixture = {
  show(value: Scenario) {
    scenario.value = value;
    if (value !== 'sidebar') return;
    const compact = signal({
      size: 'mobile' as const,
      orientation: 'portrait' as const,
      segments: 1,
      verticalSegments: 1,
      handset: true,
      compact: true,
      atLeast: () => false,
    });
    wireSidebar(document.querySelector<HTMLElement>('[data-covered-host]')!, {
      deviceClass: compact,
      storage: { getItem: () => null, setItem: () => undefined },
      exclusiveCompact: false,
      panels: [
        { id: 'covered-nav', collapsed: leftCollapsed, toggleAction: 'x' },
        {
          id: 'covered-inspector',
          collapsed: rightCollapsed,
          toggleAction: 'y',
        },
        {
          id: 'covered-console',
          collapsed: drawerCollapsed,
          toggleAction: 'toggle-console',
        },
      ],
    });
  },
  set(name: 'left' | 'right' | 'drawer', collapsed: boolean) {
    (name === 'left'
      ? leftCollapsed
      : name === 'right'
        ? rightCollapsed
        : drawerCollapsed
    ).value = collapsed;
  },
};
