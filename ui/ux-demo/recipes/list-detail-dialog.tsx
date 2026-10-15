import '@kerfjs/ui/surface-scaffold/register';
import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/nav-stack.css';
import '@kerfjs/ui/split-view.css';
import '@kerfjs/ui/webawesome.css';
import '@awesome.me/webawesome/dist/components/dialog/dialog.js';

import { Button } from '@kerfjs/ui/button';
import { remify } from '@kerfjs/ui/css-values';
import { deviceClass } from '@kerfjs/ui/device-class';
import { List } from '@kerfjs/ui/list';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Pane } from '@kerfjs/ui/pane';
import { Row } from '@kerfjs/ui/row';
import { Spacer } from '@kerfjs/ui/spacer';
import { SplitView } from '@kerfjs/ui/split-view';
import { DialogSurface, openDialog } from '@kerfjs/ui/surface-scaffold';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { ValueTable, ValueTableRow } from '@kerfjs/ui/value-table';
import { signal } from 'kerfjs';
import { ChevronRight, FileText, X } from 'lucide';

import type { RecipeFactory, RecipePresentation } from './types.js';

const records = {
  alpha: {
    name: 'Northstar migration',
    owner: 'Mara Chen',
    state: 'In review',
    updated: 'Today, 09:42',
  },
  beta: {
    name: 'Tablet navigation',
    owner: 'Sam Rivera',
    state: 'Ready',
    updated: 'Yesterday, 16:20',
  },
  gamma: {
    name: 'Contrast audit',
    owner: 'Inez Okafor',
    state: 'Blocked',
    updated: 'Monday, 11:05',
  },
} as const;

type RecordId = keyof typeof records;

export const presentation: RecipePresentation = {
  viewport: { layout: 'grid', width: 'full' },
  note: 'On roomy devices the dialog body is a workbench: a full-height list sidebar with its own toolbar beside a full-height detail column that carries the primary title, close control, and record actions. Compact devices get a full-screen sheet that drills from the list into the detail. DialogSurface owns the native modal dialog (focus, Escape, and its geometry); SplitView owns the panes and the compact drill-down. The app owns open state, selection, and record actions.',
};

export const createRecipe: RecipeFactory = (announce) => {
  const selected = signal<RecordId>('alpha');
  // Compact devices drill from the list into the detail; this flag is the
  // pushed detail view. Roomy devices show both panes side by side.
  const detailOpen = signal(false);
  const device = deviceClass();

  const projectRows = (compact: boolean) => (
    <section aria-label="Projects">
      {Object.entries(records).map(([id, record]) => (
        <ListItem
          action="recipe-action"
          itemId={id}
          label={record.name}
          description={`${record.owner} · ${record.state}`}
          icon={<LucideIcon icon={FileText} name="file-text" />}
          trailing={
            compact ? (
              <LucideIcon icon={ChevronRight} name="chevron-right" />
            ) : undefined
          }
          selected={!compact && selected.value === id}
          multiline
        />
      ))}
    </section>
  );

  const recordActions = () => (
    <Row gap="xs" wrap controlInsets="trbl">
      <Spacer flex />
      <Button
        emphasis="secondary"
        action="recipe-action"
        rootAttributes={{ 'data-recipe-command': 'archive' }}
      >
        Archive
      </Button>
      <Button
        tone="brand"
        action="recipe-action"
        rootAttributes={{ 'data-recipe-command': 'open-record' }}
      >
        Open Project
      </Button>
    </Row>
  );

  // Roomy: a workbench. The list is a full-height sidebar with its own top
  // toolbar; the detail column carries the dialog's primary title, the close
  // control, and the record actions, and runs the full dialog height too.
  const sidebar = () => (
    <Pane
      label="Recent Projects"
      header={
        <Toolbar
          label="Recent Projects"
          leading={<ToolbarText text="Recent Projects" />}
        />
      }
    >
      <List controlInsets="tb">{projectRows(false)}</List>
    </Pane>
  );

  const detailColumn = () => {
    const record = records[selected.value];
    return (
      <Pane
        label={record.name}
        header={
          <Toolbar
            label="Project Details"
            leading={
              <ToolbarText
                text={record.name}
                size="xlarge"
                id="recipe-project-title"
                headingLevel={2}
              />
            }
            trailing={
              <ToolbarControlGroup appearance="borderless" single>
                <button type="button" aria-label="Close" data-dialog-close>
                  <LucideIcon icon={X} name="x" />
                </button>
              </ToolbarControlGroup>
            }
          />
        }
        footer={recordActions()}
      >
        <List controlInsets="tb">
          <ValueTable label="Project Details">
            <ValueTableRow label="Owner" value={record.owner} />
            <ValueTableRow label="Status" value={record.state} />
            <ValueTableRow label="Updated" value={record.updated} />
          </ValueTable>
        </List>
      </Pane>
    );
  };

  const compactDetail = () => {
    const record = records[selected.value];
    return (
      <List>
        <ValueTable label="Project Details">
          <ValueTableRow label="Owner" value={record.owner} />
          <ValueTableRow label="Status" value={record.state} />
          <ValueTableRow label="Updated" value={record.updated} />
        </ValueTable>
      </List>
    );
  };

  const render = () => {
    const compact = device.value.compact;
    return (
      <section
        data-recipe="recipe-list-detail-dialog"
        aria-label="Project Details Dialog"
      >
        <Row hAlign="center">
          <Button
            tone="brand"
            action="recipe-action"
            rootAttributes={{ 'data-recipe-command': 'open' }}
          >
            Open Project Details
          </Button>
          {/* One dialog in both layouts, so crossing the compact breakpoint
              while it is open morphs it in place and it stays open. */}
          <DialogSurface
            label="Project Details"
            size="large"
            presentation={compact ? 'fullscreen' : 'modal'}
            viewportGutter={remify(16)}
            maxHeight="viewport"
            bodyInset="none"
            footerInset="comfortable"
            withoutHeader={!compact}
            footer={
              compact ? (
                <>
                  <Button
                    emphasis="secondary"
                    action="recipe-action"
                    rootAttributes={{ 'data-recipe-command': 'archive' }}
                  >
                    Archive
                  </Button>
                  <Button
                    tone="brand"
                    action="recipe-action"
                    rootAttributes={{ 'data-recipe-command': 'open-record' }}
                  >
                    Open Project
                  </Button>
                </>
              ) : undefined
            }
          >
            {compact ? (
              <SplitView
                id="recipe-projects"
                label="Projects"
                compact
                detailActive={detailOpen.value}
                listTitle="Recent projects"
                detailTitle={records[selected.value].name}
                backLabel="Back to Projects"
                list={<List>{projectRows(true)}</List>}
                detail={compactDetail()}
              />
            ) : (
              <SplitView
                id="recipe-projects"
                label="Projects"
                compact={false}
                listTitle="Recent projects"
                detailTitle={records[selected.value].name}
                list={sidebar()}
                detail={detailColumn()}
              />
            )}
          </DialogSurface>
        </Row>
      </section>
    );
  };
  return {
    render,
    action(command, element) {
      if (command === 'nav-back') {
        detailOpen.value = false;
        announce('Back to projects');
        return;
      }
      const id = element.dataset.itemId;
      if (id && id in records) {
        selected.value = id as RecordId;
        detailOpen.value = true;
        announce(`Selected ${records[selected.value].name}`);
        return;
      }
      const dialog = element
        .closest('[data-recipe]')
        ?.querySelector<HTMLDialogElement>('dialog.kui-dialog-surface');
      if (command === 'open' && dialog) {
        element.focus();
        openDialog(dialog);
        return;
      }
      announce(`${command} requested`);
    },
    afterHide() {
      detailOpen.value = false;
    },
  };
};
