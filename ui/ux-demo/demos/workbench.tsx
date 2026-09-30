import '@kerfjs/ui/floating-toolbar.css';
import '@kerfjs/ui/lucide-icon.css';
import '@kerfjs/ui/workbench.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { PopupMenu } from '@kerfjs/ui/popup-menu';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { Workbench } from '@kerfjs/ui/workbench';
import { signal } from 'kerfjs';
import { FilePlus, Search } from 'lucide';

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
export const workbenchConsoleCollapsed = signal(true);

/** The controlled example's id, which `wireWorkbench` targets. */
export const COLLAPSED_WORKBENCH_ID = 'catalog-workbench-collapsed';
/** The controlled example's navigator, collapsed so its groups relocate. */
export const workbenchCollapsedNavigator = signal(true);

/** The responsive drawer example's id, which `wireWorkbench` targets. */
export const RESPONSIVE_DRAWER_WORKBENCH_ID =
  'catalog-workbench-responsive-drawer';
/**
 * The responsive drawer's app-owned collapsed flag. Open inline by default;
 * `wireWorkbench` collapses it while the drawer presents as an overlay.
 */
export const workbenchOutputCollapsed = signal(false);

/**
 * Start each visit with the navigator shown and the inspector hidden; the
 * remembered sizes are the wiring's to restore.
 */
export function resetWorkbenchDemo(): void {
  workbenchNavigatorCollapsed.value = false;
  workbenchInspectorCollapsed.value = true;
  workbenchConsoleCollapsed.value = true;
  workbenchOutputCollapsed.value = false;
  workbenchCollapsedNavigator.value = true;
}

export function toggleWorkbenchNavigator(): boolean {
  workbenchNavigatorCollapsed.value = !workbenchNavigatorCollapsed.value;
  return workbenchNavigatorCollapsed.value;
}

export function toggleWorkbenchInspector(): boolean {
  workbenchInspectorCollapsed.value = !workbenchInspectorCollapsed.value;
  return workbenchInspectorCollapsed.value;
}

export function toggleWorkbenchOutput(): boolean {
  workbenchOutputCollapsed.value = !workbenchOutputCollapsed.value;
  return workbenchOutputCollapsed.value;
}

export function toggleWorkbenchCollapsedNavigator(): boolean {
  workbenchCollapsedNavigator.value = !workbenchCollapsedNavigator.value;
  return workbenchCollapsedNavigator.value;
}

export function toggleWorkbenchConsole(): boolean {
  workbenchConsoleCollapsed.value = !workbenchConsoleCollapsed.value;
  return workbenchConsoleCollapsed.value;
}

/** A borderless single-button group with an icon action. */
function iconGroup(
  label: string,
  icon: typeof Search,
  name: string,
  relocateOnCollapse = false,
) {
  return (
    <ToolbarControlGroup
      label={label}
      appearance="borderless"
      single
      relocateOnCollapse={relocateOnCollapse}
    >
      <button
        type="button"
        aria-label={label}
        data-action="workbench-demo-command"
        data-demo-command={name}
      >
        <LucideIcon icon={icon} name={name} />
      </button>
    </ToolbarControlGroup>
  );
}

const title = (text: string) => <ToolbarText text={text} />;
const mainTitle = (text: string) => <ToolbarText text={text} size="xlarge" />;

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
        note="Resizing is opt-in per panel, and wireWorkbench drives the separators. The panels leave the work area its minimum, 320 px wide and 120 px tall: resizing stops there, and the rails shrink in proportion when the workbench narrows. Below 704 px of workbench width the rails present as overlays by default, which start hidden, open one at a time over the editor and console, do not resize, and close from their own toolbar, on Escape, or on a click outside. A closed rail's toggle moves to the editor toolbar, on the rail's side. At phone widths an open rail fills the workbench less a 44 px strip that closes it."
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
          mainToolbar={{ label: 'Editor', title: mainTitle('Editor') }}
          main={region(
            'Resize the panels',
            'Drag a separator, or focus it and use the arrow keys, Home, or End. The editor keeps at least 320 px, so a rail stops growing there; a hidden panel returns at its last size.',
          )}
          leftRail={{
            label: 'Navigator',
            toolbar: {
              label: 'Navigator',
              title: title('Navigator'),
              toggle: {
                action: 'toggle-workbench-navigator',
                name: 'navigator',
              },
            },
            content: region('Files and symbols', '180–400 px wide'),
            collapsed: workbenchNavigatorCollapsed.value,
            size: workbenchNavigatorSize.value,
            resizable: { min: 180, max: 400 },
          }}
          rightRail={{
            label: 'Inspector',
            toolbar: {
              label: 'Inspector',
              title: title('Inspector'),
              toggle: {
                action: 'toggle-workbench-inspector',
                name: 'inspector',
              },
            },
            content: region('Selection', '160–360 px wide'),
            collapsed: workbenchInspectorCollapsed.value,
            size: workbenchInspectorSize.value,
            resizable: { min: 160, max: 360 },
          }}
          bottomDrawer={{
            label: 'Console',
            content: (
              <div class="kui-content">
                <DemoContentItem title="Console" detail="120–320 px tall" />
                <PopupMenu
                  text="Create item"
                  placement="top-start"
                  items={[
                    { label: 'New terminal', action: 'create-terminal' },
                    { label: 'New task', action: 'create-task' },
                  ]}
                />
              </div>
            ),
            size: workbenchConsoleSize.value,
            resizable: { min: 120, max: 320 },
            contentOverflow: 'auto',
          }}
        />
      </CatalogExample>
      <CatalogExample
        label="Responsive overlay drawer"
        note="With responsiveOverlayAt, the drawer takes its own track beside a wide editor and overlays the bottom of the editor once the workbench is 704 px or narrower. There wireWorkbench starts it hidden and closes it from its own toolbar, on Escape, or on a click outside; while it is closed, its toggle trails the editor's bottom toolbar."
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
          id={RESPONSIVE_DRAWER_WORKBENCH_ID}
          label="Responsive drawer workbench"
          mainToolbar={{ label: 'Editor', title: mainTitle('Editor') }}
          mainBottomToolbar={{
            label: 'Editor status',
            leading: <ToolbarText text="Ready" size="small" />,
          }}
          main={region(
            'Narrow the workbench',
            'At 704 px or narrower the output drawer overlays the bottom of the editor instead of taking its own track.',
          )}
          bottomDrawer={{
            label: 'Output',
            toolbar: {
              label: 'Output',
              title: title('Output'),
              toggle: { action: 'toggle-workbench-output', name: 'output' },
            },
            content: region(
              'Build output',
              'Inline above 704 px; an overlay below it',
            ),
            collapsed: workbenchOutputCollapsed.value,
            size: 180,
            responsiveOverlayAt: 'narrow',
          }}
        />
      </CatalogExample>
      <CatalogExample
        label="Controlled collapsed panels"
        note="Collapsed tracks snap to zero while their fixed-size content slides out. A closed rail's marked groups and toggle lead the editor toolbar, and its unmarked groups wait in the closed panel. With no editor bottom toolbar, a closed drawer's toggle floats in the editor's corner."
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
          id={COLLAPSED_WORKBENCH_ID}
          label="Focused editor workbench"
          mainToolbar={{ label: 'Editor', title: mainTitle('Editor') }}
          main={region(
            'The app owns every collapsed flag',
            'A closed panel lends its always-available groups and its toggle to the editor toolbars.',
          )}
          leftRail={{
            label: 'Navigator',
            toolbar: {
              label: 'Navigator',
              leading: iconGroup('New file', FilePlus, 'file-plus'),
              trailing: iconGroup('Search files', Search, 'search', true),
              toggle: {
                action: 'toggle-workbench-collapsed-navigator',
                name: 'navigator',
              },
            },
            content: region('Navigator', 'Still mounted'),
            collapsed: workbenchCollapsedNavigator.value,
          }}
          rightRail={{
            label: 'Inspector',
            content: region('Inspector', 'Visible peripheral panel'),
          }}
          bottomDrawer={{
            label: 'Console',
            toolbar: {
              label: 'Console',
              title: title('Console'),
              toggle: { action: 'toggle-workbench-console', name: 'console' },
            },
            content: region('Console', 'Still mounted'),
            collapsed: workbenchConsoleCollapsed.value,
            size: 120,
            separator: 'hidden',
            collapseMotion: 'fade-slide',
            contentOverflow: 'visible',
          }}
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
