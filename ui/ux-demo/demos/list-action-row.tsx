import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { List } from '@kerfjs/ui/list';
import { ListActionRow } from '@kerfjs/ui/list-action-row';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import {
  Folder,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Terminal,
  Trash2,
} from 'lucide';

import { DemoListPopover } from './demo-list-popover.js';
import {
  menuActionCurrent,
  menuActionPressed,
  reorderFiles,
  reorderSelection,
} from './state.js';

export function ListActionRowDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'list-action-row' }}>
      <CatalogExample align="none">
        <ListActionRow
          label="generated-report.json"
          description="Ready to review"
          status="3 warnings"
          density="compact"
          divider="before"
          action="select-list-action-row"
          itemId="status-action"
          trailingAction="open-list-action-row-actions"
          trailingActionLabel="Actions for generated report"
          trailingActionIcon={
            <LucideIcon icon={MoreHorizontal} name="more-horizontal" />
          }
          trailingActionVisibility="interaction"
          rootAttributes={{ 'data-demo-action-row': 'status' }}
        />
      </CatalogExample>
      <CatalogExample align="none">
        <ListActionRow
          label="Run Tests"
          description="npm test"
          icon={<LucideIcon icon={Terminal} name="terminal" />}
          action="select-list-action-row"
          itemId="run-tests"
          selected={menuActionCurrent.value === 'run-tests'}
          accessibleLabel="Select Run tests"
          trailingActionVisibility="interaction"
          trailingMenu={{
            label: 'Actions for Run tests',
            icon: <LucideIcon icon={MoreHorizontal} name="more-horizontal" />,
            items: [
              {
                label: 'Edit',
                action: 'edit-list-action-row',
                icon: <LucideIcon icon={Pencil} name="pencil" />,
              },
              { kind: 'divider' },
              {
                label: 'Delete',
                action: 'delete-list-action-row',
                tone: 'danger',
                icon: <LucideIcon icon={Trash2} name="trash-2" />,
              },
            ],
          }}
          rootAttributes={{ 'data-demo-action-row': 'menu' }}
        />
      </CatalogExample>
      <CatalogExample align="none">
        <ListActionRow
          label="src/main.ts"
          icon={<LucideIcon icon={Folder} name="folder" />}
          action="select-list-action-row"
          itemId="src/main.ts"
          selected={menuActionCurrent.value === 'src/main.ts'}
          accessibleLabel="Select src/main.ts"
          trailingAction="open-list-action-row-actions"
          trailingActionLabel="Actions for src/main.ts"
          trailingActionIcon={
            <LucideIcon icon={MoreHorizontal} name="more-horizontal" />
          }
          rootAttributes={{ 'data-demo-action-row': 'selected' }}
          trailingActionAttributes={{
            popoverTarget: 'list-action-row-popover',
            popoverTargetAction: 'toggle',
            'aria-controls': 'list-action-row-popover',
            'aria-haspopup': 'dialog',
            'data-demo-trailing-action': 'selected',
          }}
        />
      </CatalogExample>
      <CatalogExample align="none">
        <ListActionRow
          label="packages/application/src/components/a-long-file-name-that-wraps-at-narrow-width.tsx"
          icon={<LucideIcon icon={Folder} name="folder" />}
          action="toggle-list-action-row"
          itemId="long-file"
          pressed={menuActionPressed.value}
          accessibleLabel="Select long file"
          multiline
          trailingAction="open-list-action-row-actions"
          trailingActionLabel="Actions for long file"
          trailingActionIcon={
            <LucideIcon icon={MoreHorizontal} name="more-horizontal" />
          }
          rootAttributes={{ 'data-demo-action-row': 'multiline' }}
        />
      </CatalogExample>
      <CatalogExample align="none">
        <ListActionRow
          label="Unavailable Primary"
          action="select-list-action-row"
          itemId="disabled-primary"
          selected={menuActionCurrent.value === 'disabled-primary'}
          disabled
          trailingAction="open-list-action-row-actions"
          trailingActionLabel="Actions for unavailable primary"
          trailingActionIcon={
            <LucideIcon icon={MoreHorizontal} name="more-horizontal" />
          }
          rootAttributes={{ 'data-demo-action-row': 'disabled-primary' }}
        />
      </CatalogExample>
      <CatalogExample align="none">
        <ListActionRow
          label="Unavailable Trailing Action"
          action="select-list-action-row"
          itemId="disabled-trailing"
          selected={menuActionCurrent.value === 'disabled-trailing'}
          trailingAction="open-list-action-row-actions"
          trailingActionLabel="Unavailable actions"
          trailingActionIcon={
            <LucideIcon icon={MoreHorizontal} name="more-horizontal" />
          }
          trailingActionDisabled
          trailingActionTitle="Actions unavailable"
          rootAttributes={{ 'data-demo-action-row': 'disabled-trailing' }}
        />
      </CatalogExample>
      <CatalogExample align="none">
        <ListActionRow
          label="Loading File"
          description="Loading description"
          status="Syncing"
          busy
          icon={<LucideIcon icon={Folder} name="folder" />}
          action="select-list-action-row"
          itemId="placeholder"
          placeholder
          trailingAction="open-list-action-row-actions"
          trailingActionLabel="Actions"
          trailingActionIcon={
            <LucideIcon icon={MoreHorizontal} name="more-horizontal" />
          }
          rootAttributes={{ 'data-demo-action-row': 'placeholder' }}
        />
      </CatalogExample>
      <CatalogExample
        label="Drag to reorder"
        note="Drag a row, or focus it and press Alt+Shift+Up or Down. The row under the pointer shows where the dragged rows land."
        align="none"
      >
        <List rootAttributes={{ 'data-list-id': 'demo-reorder-files' }}>
          {reorderFiles.value.map((file) => (
            <ListActionRow
              label={file.label}
              icon={<LucideIcon icon={GripVertical} name="grip-vertical" />}
              action="toggle-reorder-row"
              itemId={file.id}
              pressed={reorderSelection.value.includes(file.id)}
              draggable
              trailingAction="open-list-action-row-actions"
              trailingActionLabel={`Actions for ${file.label}`}
              trailingActionIcon={
                <LucideIcon icon={MoreHorizontal} name="more-horizontal" />
              }
              trailingActionVisibility="interaction"
            />
          ))}
        </List>
      </CatalogExample>
      <CatalogExample label="Dragging and insertion states" align="none">
        <List>
          <ListActionRow
            label="Drops Above This Row"
            action="select-list-action-row"
            itemId="reorder-before"
            draggable
            dropPosition="before"
            trailingAction="open-list-action-row-actions"
            trailingActionLabel="Actions for the row below the drop"
            trailingActionIcon={
              <LucideIcon icon={MoreHorizontal} name="more-horizontal" />
            }
          />
          <ListActionRow
            label="Row Being Dragged"
            action="select-list-action-row"
            itemId="reorder-dragging"
            draggable
            dragging
            trailingAction="open-list-action-row-actions"
            trailingActionLabel="Actions for the dragged row"
            trailingActionIcon={
              <LucideIcon icon={MoreHorizontal} name="more-horizontal" />
            }
          />
          <ListActionRow
            label="Drops Below This Row"
            action="select-list-action-row"
            itemId="reorder-after"
            draggable
            dropPosition="after"
            trailingAction="open-list-action-row-actions"
            trailingActionLabel="Actions for the row above the drop"
            trailingActionIcon={
              <LucideIcon icon={MoreHorizontal} name="more-horizontal" />
            }
          />
        </List>
      </CatalogExample>
      <DemoListPopover id="list-action-row-popover" label="File actions">
        <button type="button" data-action="log-more">
          Open Details
        </button>
      </DemoListPopover>
    </CatalogExampleStack>
  );
}
