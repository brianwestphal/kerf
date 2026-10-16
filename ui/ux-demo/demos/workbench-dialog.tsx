import { Button } from '@kerfjs/ui/button';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { remify } from '@kerfjs/ui/css-values';
import { deviceClass } from '@kerfjs/ui/device-class';
import { List } from '@kerfjs/ui/list';
import { ListInsetText } from '@kerfjs/ui/list-inset-text';
import { ListItem } from '@kerfjs/ui/list-item';
import { Row } from '@kerfjs/ui/row';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { ValueTable, ValueTableRow } from '@kerfjs/ui/value-table';
import { WorkbenchDialog } from '@kerfjs/ui/workbench-dialog';
import { signal } from 'kerfjs';

/** The demo dialog's id; its Workbench is `<id>-workbench`. */
export const WORKBENCH_DIALOG_DEMO_ID = 'workbench-dialog-demo';
/** The delegated action each layer row uses to select itself. */
export const SELECT_WORKBENCH_DIALOG_LAYER_ACTION =
  'select-workbench-dialog-layer';
export const TOGGLE_WORKBENCH_DIALOG_LAYERS_ACTION =
  'toggle-workbench-dialog-layers';
export const TOGGLE_WORKBENCH_DIALOG_INSPECTOR_ACTION =
  'toggle-workbench-dialog-inspector';

const LAYERS = [
  { id: 'title', name: 'Title', kind: 'Text', size: '640 × 96' },
  { id: 'hero', name: 'Hero Image', kind: 'Image', size: '1280 × 720' },
  { id: 'caption', name: 'Caption', kind: 'Text', size: '640 × 48' },
  { id: 'badge', name: 'Badge', kind: 'Shape', size: '64 × 64' },
] as const;

const device = deviceClass();
const selectedLayer = signal<string>(LAYERS[1].id);
/** App-owned collapsed flags; `wireWorkbench` closes an overlay rail. */
export const workbenchDialogLayersCollapsed = signal(false);
export const workbenchDialogInspectorCollapsed = signal(false);

export function resetWorkbenchDialogDemo(): void {
  selectedLayer.value = LAYERS[1].id;
  // Compact dialogs start with their rails hidden.
  const compact = device.value.compact;
  workbenchDialogLayersCollapsed.value = compact;
  workbenchDialogInspectorCollapsed.value = compact;
}

export function selectWorkbenchDialogLayer(id: string): void {
  if (LAYERS.some((layer) => layer.id === id)) selectedLayer.value = id;
}

export function toggleWorkbenchDialogLayers(): boolean {
  workbenchDialogLayersCollapsed.value = !workbenchDialogLayersCollapsed.value;
  return workbenchDialogLayersCollapsed.value;
}

export function toggleWorkbenchDialogInspector(): boolean {
  workbenchDialogInspectorCollapsed.value =
    !workbenchDialogInspectorCollapsed.value;
  return workbenchDialogInspectorCollapsed.value;
}

export function WorkbenchDialogDemo() {
  const compact = device.value.compact;
  const layer =
    LAYERS.find(({ id }) => id === selectedLayer.value) ?? LAYERS[1];
  return (
    <CatalogExampleStack
      label="WorkbenchDialog Variants"
      rootAttributes={{ 'data-demo': 'workbench-dialog' }}
    >
      <CatalogExample
        label="Edit Slide"
        note="The work area's toolbar carries the dialog's title, the close control, and the toggles of hidden rails; each rail keeps its own toolbar and runs the dialog's full height. On compact devices (compact) the dialog fills the screen, its rails start hidden, and each opens as an overlay over the work area instead of narrowing it; Escape or a press outside closes an open rail before it closes the dialog."
        align="inline-control"
      >
        <Button
          action="show-dialog"
          rootAttributes={{ 'data-dialog-id': WORKBENCH_DIALOG_DEMO_ID }}
        >
          Edit Slide
        </Button>
        <WorkbenchDialog
          id={WORKBENCH_DIALOG_DEMO_ID}
          label="Edit Slide"
          title="Edit Slide"
          description="Slide 3 of 12"
          compact={compact}
          viewportGutter={remify(8)}
          height={remify(520)}
          preferredWidth={remify(960)}
          main={
            <List controlInsets="tb">
              <ListInsetText>{`The slide canvas goes here. ${layer.name} is selected.`}</ListInsetText>
            </List>
          }
          mainBottomToolbar={{
            label: 'Slide Actions',
            trailing: (
              <Row hAlign="right" gap="xs">
                <Button
                  emphasis="secondary"
                  rootAttributes={{ 'data-dialog-close': '' }}
                >
                  Cancel
                </Button>
                <Button tone="brand" action="log-more">
                  Save Slide
                </Button>
              </Row>
            ),
          }}
          leftRail={{
            label: 'Layers',
            size: 200,
            collapsed: workbenchDialogLayersCollapsed.value,
            toolbar: {
              label: 'Layers',
              title: <ToolbarText text="Layers" />,
              toggle: {
                action: TOGGLE_WORKBENCH_DIALOG_LAYERS_ACTION,
                name: 'Layers',
              },
            },
            content: (
              <List controlInsets="tb">
                {LAYERS.map(({ id, name, kind }) => (
                  <ListItem
                    label={name}
                    description={kind}
                    itemId={id}
                    action={SELECT_WORKBENCH_DIALOG_LAYER_ACTION}
                    selected={id === layer.id}
                  />
                ))}
              </List>
            ),
          }}
          rightRail={{
            label: 'Inspector',
            size: 220,
            collapsed: workbenchDialogInspectorCollapsed.value,
            toolbar: {
              label: 'Inspector',
              title: <ToolbarText text="Inspector" />,
              toggle: {
                action: TOGGLE_WORKBENCH_DIALOG_INSPECTOR_ACTION,
                name: 'Inspector',
              },
            },
            content: (
              <List controlInsets="tb">
                <ValueTable label="Layer Details">
                  <ValueTableRow label="Name" value={layer.name} />
                  <ValueTableRow label="Kind" value={layer.kind} />
                  <ValueTableRow label="Size" value={layer.size} />
                </ValueTable>
              </List>
            ),
          }}
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
