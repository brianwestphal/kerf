import '@kerfjs/ui/surface-scaffold/register';
import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/nav-stack.css';
import '@kerfjs/ui/split-view.css';
import '@kerfjs/ui/webawesome.css';

import { Button } from '@kerfjs/ui/button';
import { remify } from '@kerfjs/ui/css-values';
import { deviceClass } from '@kerfjs/ui/device-class';
import { List } from '@kerfjs/ui/list';
import { ListDetailDialog } from '@kerfjs/ui/list-detail-dialog';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Row } from '@kerfjs/ui/row';
import { Spacer } from '@kerfjs/ui/spacer';
import { openDialog } from '@kerfjs/ui/surface-scaffold';
import { ValueTable, ValueTableRow } from '@kerfjs/ui/value-table';
import { signal } from 'kerfjs';
import { ChevronRight, FileText } from 'lucide';

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
  note: 'ListDetailDialog: on roomy devices a full-height list column with its own title sits beside a full-height detail column that carries the primary title, the close control, and the record actions, so the divider runs from top to bottom. Compact devices get a full-screen dialog that drills from the list into the detail. The component owns the native modal dialog, the columns, and the compact drill-down; the app owns open state, selection, and record actions.',
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

  const render = () => {
    const compact = device.value.compact;
    const record = records[selected.value];
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
          <ListDetailDialog
            id="recipe-projects"
            label="Project Details"
            compact={compact}
            detailActive={detailOpen.value}
            backLabel="Back to Projects"
            viewportGutter={remify(16)}
            list={{
              title: 'Recent Projects',
              content: (
                <List controlInsets={compact ? undefined : 'tb'}>
                  {projectRows(compact)}
                </List>
              ),
            }}
            detail={{
              title: record.name,
              content: (
                <List controlInsets="tb">
                  <ValueTable label="Project Details">
                    <ValueTableRow label="Owner" value={record.owner} />
                    <ValueTableRow label="Status" value={record.state} />
                    <ValueTableRow label="Updated" value={record.updated} />
                  </ValueTable>
                </List>
              ),
              footer: recordActions(),
            }}
          />
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
