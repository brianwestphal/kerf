import '@kerfjs/ui/workbench.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { Pane } from '@kerfjs/ui/pane';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { Workbench } from '@kerfjs/ui/workbench';
import { signal } from 'kerfjs';

import { DemoContentItem } from './demo-content-item.js';

const region = (title: string, detail: string) => (
  <div class="kui-content">
    <DemoContentItem title={title} detail={detail} />
  </div>
);

/** The resizable example's id, which `wireWorkbench` targets. */
export const RESIZABLE_WORKBENCH_ID = 'catalog-workbench-resizable';
/** App-owned sizes for the resizable example; `wireWorkbench` commits to them. */
export const workbenchNavigatorSize = signal(240);
export const workbenchConsoleSize = signal(160);
const navigatorCollapsed = signal(false);

/** Start each visit expanded; the remembered sizes are the wiring's to restore. */
export function resetWorkbenchDemo(): void {
  navigatorCollapsed.value = false;
}

export function toggleWorkbenchNavigator(): boolean {
  navigatorCollapsed.value = !navigatorCollapsed.value;
  return navigatorCollapsed.value;
}

function resizableEditor() {
  const collapsed = navigatorCollapsed.value;
  return (
    <Pane
      header={
        <Toolbar
          label="Editor"
          leading={<ToolbarText text="Editor" size="xlarge" />}
          trailing={
            <ToolbarControlGroup appearance="borderless" single>
              <button
                type="button"
                data-action="toggle-workbench-navigator"
                aria-pressed={String(!collapsed)}
              >
                {collapsed ? 'Show navigator' : 'Hide navigator'}
              </button>
            </ToolbarControlGroup>
          }
        />
      }
    >
      {region(
        'Resize the navigator and console',
        'Drag a separator, or focus it and use the arrow keys, Home, or End. A hidden navigator returns at its last width.',
      )}
    </Pane>
  );
}

export function WorkbenchDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'workbench' }}>
      <CatalogExample
        label="Full desktop workspace"
        note="The shell owns panel tracks and separators; each region owns its content and scroll behavior."
        align="none"
        compactFallback="Workbench is a desktop-class shell. Use focused navigation and overlays instead at this viewport width."
        viewport={{
          layout: 'grid',
          width: 'full',
          height: 'tall',
          frame: 'solid',
          surface: 'lowered',
          responsive: 'roomy-only',
        }}
      >
        <Workbench
          id="catalog-workbench-full"
          label="Project workbench"
          leftRail={{
            label: 'Navigator',
            content: region('Navigator', 'Files and symbols'),
          }}
          main={region(
            'Editor',
            'The central work area expands into free space.',
          )}
          rightRail={{
            label: 'Inspector',
            content: region('Inspector', 'Selection details'),
          }}
          bottomDrawer={{
            label: 'Console',
            content: region('Console', 'Build output and diagnostics'),
          }}
        />
      </CatalogExample>
      <CatalogExample
        label="Resizable panels"
        note="Resizing is opt-in per panel. The navigator and console opt in, and wireWorkbench drives their separators; panels without resizable keep a fixed size."
        align="none"
        compactFallback="Resizable rails are a desktop affordance. Compact layouts present rails as overlay drawers, which do not resize."
        viewport={{
          layout: 'grid',
          width: 'full',
          height: 'tall',
          frame: 'solid',
          surface: 'lowered',
          responsive: 'roomy-only',
        }}
      >
        <Workbench
          id={RESIZABLE_WORKBENCH_ID}
          label="Resizable workbench"
          leftRail={{
            label: 'Navigator',
            content: region('Navigator', '180–400 px wide'),
            collapsed: navigatorCollapsed.value,
            size: workbenchNavigatorSize.value,
            resizable: { min: 180, max: 400 },
          }}
          main={resizableEditor()}
          bottomDrawer={{
            label: 'Console',
            content: region('Console', '120–320 px tall'),
            size: workbenchConsoleSize.value,
            resizable: { min: 120, max: 320 },
          }}
        />
      </CatalogExample>
      <CatalogExample
        label="Controlled collapsed panels"
        note="Collapsed tracks snap to zero while their fixed-size content slides out."
        align="none"
        compactFallback="Collapsed tracks preserve desktop workspace state; they are not a compact-layout substitute."
        viewport={{
          layout: 'grid',
          width: 'full',
          height: 'reduced',
          frame: 'solid',
          surface: 'lowered',
          responsive: 'roomy-only',
        }}
      >
        <Workbench
          id="catalog-workbench-collapsed"
          label="Focused editor workbench"
          leftRail={{
            label: 'Navigator',
            content: region('Navigator', 'Still mounted'),
            collapsed: true,
          }}
          main={region('Editor', 'The app owns every collapsed flag.')}
          rightRail={{
            label: 'Inspector',
            content: region('Inspector', 'Visible peripheral panel'),
          }}
          bottomDrawer={{
            label: 'Console',
            content: region('Console', 'Still mounted'),
            collapsed: true,
            separator: 'hidden',
            collapseMotion: 'fade-slide',
            contentOverflow: 'visible',
            restoreControl: (
              <button type="button" aria-label="Show collapsed console">
                Show console
              </button>
            ),
          }}
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
