import '@kerfjs/ui/floating-toolbar.css';
import '@kerfjs/ui/lucide-icon.css';
import '@kerfjs/ui/workbench.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { collapsiblePanelToggleIcon } from '@kerfjs/ui/collapsible-panel';
import { FloatingToolbar } from '@kerfjs/ui/floating-toolbar';
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
/**
 * App-owned collapsed flags for the resizable example's rails. `wireWorkbench`
 * collapses a rail when it becomes a responsive overlay and closes an open
 * overlay on Escape or an outside press.
 */
export const workbenchNavigatorCollapsed = signal(false);
export const workbenchInspectorCollapsed = signal(true);
const consoleCollapsed = signal(true);

/**
 * Start each visit with the navigator shown and the inspector hidden; the
 * remembered sizes are the wiring's to restore.
 */
export function resetWorkbenchDemo(): void {
  workbenchNavigatorCollapsed.value = false;
  workbenchInspectorCollapsed.value = true;
  consoleCollapsed.value = true;
}

export function toggleWorkbenchNavigator(): boolean {
  workbenchNavigatorCollapsed.value = !workbenchNavigatorCollapsed.value;
  return workbenchNavigatorCollapsed.value;
}

export function toggleWorkbenchInspector(): boolean {
  workbenchInspectorCollapsed.value = !workbenchInspectorCollapsed.value;
  return workbenchInspectorCollapsed.value;
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
 * The collapsed console's restore affordance: a FloatingToolbar in the corner
 * of the work area the console restores into. The corner owns the inset, so
 * the toolbar floats from it at the corner's own position.
 */
function consoleRestore() {
  return (
    <FloatingToolbar label="Console" position="bottom-end">
      <ToolbarControlGroup label="Console" single>
        {panelToggle('bottom', 'console', true, 'toggle-workbench-console')}
      </ToolbarControlGroup>
    </FloatingToolbar>
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

/**
 * A resizable example rail: a Pane whose own header carries the control that
 * hides it. The editor toolbar's toggles stay the always-visible way to show a
 * rail, but an overlay rail covers part of the editor — at a narrow width the
 * inspector covers its own toolbar toggle — so each rail can always be closed
 * from inside itself.
 */
function railPane(
  side: 'left' | 'right',
  name: string,
  content: { title: string; detail: string },
  action: string,
) {
  const title = name[0]!.toUpperCase() + name.slice(1);
  return (
    <Pane
      header={
        <Toolbar
          label={title}
          leading={<ToolbarText text={title} />}
          trailing={
            <ToolbarControlGroup label={title} appearance="borderless" single>
              {panelToggle(side, name, false, action)}
            </ToolbarControlGroup>
          }
        />
      }
    >
      {region(content.title, content.detail)}
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
                workbenchNavigatorCollapsed.value,
                'toggle-workbench-navigator',
              )}
              {panelToggle(
                'right',
                'inspector',
                workbenchInspectorCollapsed.value,
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
        note="Resizing is opt-in per panel, and wireWorkbench drives the separators. Resizable rails leave the work area its 320 px minimum: they stop growing there and shrink in proportion when the workbench narrows. Below 704 px of workbench width the rails present as overlays, which start hidden, do not resize, and close from their own header, on Escape, or on a click outside."
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
            content: railPane(
              'left',
              'navigator',
              { title: 'Files and symbols', detail: '180–400 px wide' },
              'toggle-workbench-navigator',
            ),
            collapsed: workbenchNavigatorCollapsed.value,
            size: workbenchNavigatorSize.value,
            resizable: { min: 180, max: 400 },
            responsiveOverlayAt: 'narrow',
          }}
          main={resizableEditor()}
          rightRail={{
            label: 'Inspector',
            content: railPane(
              'right',
              'inspector',
              { title: 'Selection', detail: '160–360 px wide' },
              'toggle-workbench-inspector',
            ),
            collapsed: workbenchInspectorCollapsed.value,
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
