import { Button } from '@kerfjs/ui/button';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { remify } from '@kerfjs/ui/css-values';
import { deviceClass } from '@kerfjs/ui/device-class';
import { List } from '@kerfjs/ui/list';
import { ListDetailDialog } from '@kerfjs/ui/list-detail-dialog';
import { ListInsetText } from '@kerfjs/ui/list-inset-text';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Row } from '@kerfjs/ui/row';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ValueTable, ValueTableRow } from '@kerfjs/ui/value-table';
import { signal } from 'kerfjs';
import { ChevronRight } from 'lucide';

/** The delegated action each project row uses to select itself. */
export const SELECT_LIST_DETAIL_PROJECT_ACTION = 'select-list-detail-project';

const PROJECTS = [
  { id: 'atlas', name: 'Atlas', owner: 'Mara Chen', state: 'Active' },
  { id: 'borealis', name: 'Borealis', owner: 'Sam Rivera', state: 'Ready' },
  { id: 'cirrus', name: 'Cirrus', owner: 'Inez Okafor', state: 'Blocked' },
  { id: 'delta', name: 'Delta', owner: 'Theo Park', state: 'In review' },
  { id: 'ember', name: 'Ember', owner: 'Ana Ruiz', state: 'Active' },
  { id: 'fjord', name: 'Fjord', owner: 'Lena Holm', state: 'Archived' },
] as const;

const device = deviceClass();
const selectedProject = signal<string>(PROJECTS[0].id);
// Compact devices drill from the list into the detail; this is the pushed
// detail view. Roomy devices show both columns.
const detailOpen = signal(false);

export function resetListDetailDialogDemo(): void {
  selectedProject.value = PROJECTS[0].id;
  detailOpen.value = false;
}

export function selectListDetailDialogProject(id: string): void {
  if (!PROJECTS.some((project) => project.id === id)) return;
  selectedProject.value = id;
  detailOpen.value = true;
}

/** The compact stack's back control returns to the list. */
export function popListDetailDialogDemo(): void {
  detailOpen.value = false;
}

export function ListDetailDialogDemo() {
  const compact = device.value.compact;
  const project =
    PROJECTS.find(({ id }) => id === selectedProject.value) ?? PROJECTS[0];
  return (
    <CatalogExampleStack
      label="ListDetailDialog Variants"
      rootAttributes={{ 'data-demo': 'list-detail-dialog' }}
    >
      <CatalogExample
        label="Project Details"
        note="Both columns run the dialog's full height, so the divider runs from top to bottom. The list column carries its own title and controls; the detail column carries the dialog's primary title, its actions, and the close control, with the record actions pinned below. On compact devices (compact) it fills the screen and drills from the list into the detail; see the List-detail dialog recipe."
        align="inline-control"
      >
        <Button
          action="show-dialog"
          rootAttributes={{ 'data-dialog-id': 'list-detail-dialog-demo' }}
        >
          Open Project Details
        </Button>
        <ListDetailDialog
          id="list-detail-dialog-demo"
          label="Project Details"
          compact={compact}
          detailActive={detailOpen.value}
          backLabel="Back to Projects"
          viewportGutter={remify(8)}
          height={remify(480)}
          list={{
            title: 'Projects',
            toolbar: (
              <ToolbarControlGroup appearance="borderless" single>
                <button
                  type="button"
                  aria-label="New Project"
                  data-action="log-more"
                >
                  New
                </button>
              </ToolbarControlGroup>
            ),
            content: (
              <List controlInsets={compact ? undefined : 'tb'}>
                {PROJECTS.map(({ id, name, owner }) => (
                  <ListItem
                    label={name}
                    description={owner}
                    itemId={id}
                    action={SELECT_LIST_DETAIL_PROJECT_ACTION}
                    selected={!compact && id === project.id}
                    trailing={
                      compact ? (
                        <LucideIcon icon={ChevronRight} name="chevron-right" />
                      ) : undefined
                    }
                  />
                ))}
              </List>
            ),
          }}
          detail={{
            title: project.name,
            description: project.state,
            content: (
              <List controlInsets="tb">
                <ValueTable label="Project Details">
                  <ValueTableRow label="Owner" value={project.owner} />
                  <ValueTableRow label="Status" value={project.state} />
                </ValueTable>
                <ListInsetText>
                  Each column scrolls on its own beneath its pinned chrome.
                </ListInsetText>
              </List>
            ),
            footer: (
              <Row hAlign="right" gap="xs" controlInsets="trbl">
                <Button
                  emphasis="secondary"
                  rootAttributes={{ 'data-dialog-close': '' }}
                >
                  Done
                </Button>
                <Button tone="brand" action="log-more">
                  Open Project
                </Button>
              </Row>
            ),
          }}
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
