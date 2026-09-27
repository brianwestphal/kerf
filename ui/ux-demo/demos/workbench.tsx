import '@kerfjs/ui/lucide-icon.css';
import '@kerfjs/ui/workbench.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { collapsiblePanelToggleIcon } from '@kerfjs/ui/collapsible-panel';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
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
export const workbenchInspectorSize = signal(160);
export const workbenchConsoleSize = signal(160);
const navigatorCollapsed = signal(false);
const inspectorCollapsed = signal(true);
const consoleCollapsed = signal(true);

/**
 * Start each visit with the navigator shown and the inspector hidden; the
 * remembered sizes are the wiring's to restore.
 */
export function resetWorkbenchDemo(): void {
  navigatorCollapsed.value = false;
  inspectorCollapsed.value = true;
  consoleCollapsed.value = true;
}

export function toggleWorkbenchNavigator(): boolean {
  navigatorCollapsed.value = !navigatorCollapsed.value;
  return navigatorCollapsed.value;
}

export function toggleWorkbenchInspector(): boolean {
  inspectorCollapsed.value = !inspectorCollapsed.value;
  return inspectorCollapsed.value;
}

export function toggleWorkbenchConsole(): boolean {
  consoleCollapsed.value = !consoleCollapsed.value;
  return consoleCollapsed.value;
}

/** A toggle carrying the standard per-side panel glyph. */
function panelToggle(
  side: 'left' | 'right' | 'bottom',
  name: string,
  collapsed: boolean,
  action: string,
) {
  const glyph = collapsiblePanelToggleIcon(side, collapsed);
  return (
    <button
      type="button"
      data-action={action}
      aria-expanded={String(!collapsed)}
      aria-label={`${collapsed ? 'Show' : 'Hide'} ${name}`}
    >
      <LucideIcon icon={glyph.icon} name={glyph.name} />
    </button>
  );
}

/**
 * The collapsed console's restore affordance: a floating control group in the
 * corner the Workbench reserves while the console is collapsed.
 */
function consoleRestore() {
  return (
    <ToolbarControlGroup label="Console" single>
      {panelToggle('bottom', 'console', true, 'toggle-workbench-console')}
    </ToolbarControlGroup>
  );
}

/** The collapsed example's editor; it hides the console while it is shown. */
function collapsedEditor() {
  return (
    <Pane
      header={
        <Toolbar
          label="Editor"
          leading={<ToolbarText text="Editor" size="xlarge" />}
          trailing={
            consoleCollapsed.value ? undefined : (
              <ToolbarControlGroup
                label="Console"
                appearance="borderless"
                single
              >
                {panelToggle(
                  'bottom',
                  'console',
                  false,
                  'toggle-workbench-console',
                )}
              </ToolbarControlGroup>
            )
          }
        />
      }
    >
      {region(
        'The app owns every collapsed flag',
        'Hide the console from this toolbar; restore it from the corner control.',
      )}
    </Pane>
  );
}

function resizableEditor() {
  return (
    <Pane
      header={
        <Toolbar
          label="Editor"
          leading={<ToolbarText text="Editor" size="xlarge" />}
          trailing={
            <ToolbarControlGroup label="Panels" appearance="borderless">
              {panelToggle(
                'left',
                'navigator',
                navigatorCollapsed.value,
                'toggle-workbench-navigator',
              )}
              {panelToggle(
                'right',
                'inspector',
                inspectorCollapsed.value,
                'toggle-workbench-inspector',
              )}
            </ToolbarControlGroup>
          }
        />
      }
    >
      {region(
        'Resize the panels',
        'Drag a separator, or focus it and use the arrow keys, Home, or End. The editor keeps at least 320 px, so a rail stops growing there; a hidden panel returns at its last size.',
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
        note="Resizing is opt-in per panel, and wireWorkbench drives the separators. Resizable rails leave the work area its 320 px minimum: they stop growing there and shrink in proportion when the workbench narrows. Below 704 px of workbench width the rails present as overlays, which do not resize."
        align="none"
        viewport={{
          layout: 'grid',
          width: 'full',
          height: 'tall',
          frame: 'solid',
          surface: 'lowered',
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
            responsiveOverlayAt: 'narrow',
          }}
          main={resizableEditor()}
          rightRail={{
            label: 'Inspector',
            content: region('Inspector', '160–360 px wide'),
            collapsed: inspectorCollapsed.value,
            size: workbenchInspectorSize.value,
            resizable: { min: 160, max: 360 },
            responsiveOverlayAt: 'narrow',
          }}
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
          main={collapsedEditor()}
          rightRail={{
            label: 'Inspector',
            content: region('Inspector', 'Visible peripheral panel'),
          }}
          bottomDrawer={{
            label: 'Console',
            content: region('Console', 'Still mounted'),
            collapsed: consoleCollapsed.value,
            size: 120,
            separator: 'hidden',
            collapseMotion: 'fade-slide',
            contentOverflow: 'visible',
            restoreControl: consoleRestore(),
          }}
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
