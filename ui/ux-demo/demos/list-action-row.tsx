import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { foregroundColor, uiColor } from '@kerfjs/ui/css-values';
import { List } from '@kerfjs/ui/list';
import { ListActionRow } from '@kerfjs/ui/list-action-row';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import {
  BookOpen,
  Folder,
  GripVertical,
  MoreHorizontal,
  Paintbrush,
  Pencil,
  Rocket,
  Terminal,
  Trash2,
} from 'lucide';

import { DemoListPopover } from './demo-list-popover.js';
import {
  iconTileCurrent,
  menuActionCurrent,
  menuActionPressed,
  reorderFiles,
  reorderSelection,
} from './state.js';

const iconTileCommands = [
  {
    id: 'tile-run-tests',
    label: 'Run Tests',
    command: 'npm test',
    icon: <LucideIcon icon={Terminal} name="terminal" />,
    tile: { color: foregroundColor('#30a46c') },
  },
  {
    id: 'tile-deploy-preview',
    label: 'Deploy Preview',
    command: 'npm run deploy',
    icon: <LucideIcon icon={Rocket} name="rocket" />,
    tile: { color: foregroundColor('#0090ff') },
  },
  {
    id: 'tile-format-code',
    label: 'Format Code',
    command: 'npm run format',
    icon: <LucideIcon icon={Paintbrush} name="paintbrush" />,
    tile: { color: foregroundColor('#ffc53d') },
  },
  {
    id: 'tile-clean-build',
    label: 'Clean Build',
    command: 'npm run clean',
    icon: <LucideIcon icon={Trash2} name="trash-2" />,
    tile: { color: foregroundColor('#e5484d') },
  },
  {
    id: 'tile-open-docs',
    label: 'Open Docs',
    command: 'npm run docs',
    icon: <LucideIcon icon={BookOpen} name="book-open" />,
    tile: {
      color: uiColor('brand-fill-loud'),
      foreground: uiColor('brand-on-loud'),
    },
  },
] as const;

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
            label: 'Actions for Run Tests',
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
        label="Colored Icon Tiles"
        note="Each command keeps its own color in a filled tile. A custom fill draws its glyph in black or white, whichever contrasts, unless the row names a foreground."
        align="none"
        viewport={{ width: 'medium' }}
      >
        <List rootAttributes={{ 'data-demo-icon-tiles': 'list-action-row' }}>
          {iconTileCommands.map((command) => (
            <ListActionRow
              label={command.label}
              description={command.command}
              icon={command.icon}
              iconTile={command.tile}
              action="select-icon-tile-row"
              itemId={command.id}
              selected={iconTileCurrent.value === command.id}
              trailingAction="open-list-action-row-actions"
              trailingActionLabel={`Edit ${command.label}`}
              trailingActionIcon={<LucideIcon icon={Pencil} name="pencil" />}
              trailingActionVisibility="interaction"
            />
          ))}
        </List>
      </CatalogExample>
      <CatalogExample
        label="Drag to Reorder"
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
      <CatalogExample label="Dragging and Insertion States" align="none">
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
      <DemoListPopover id="list-action-row-popover" label="File Actions">
        <button type="button" data-action="log-more">
          Open Details
        </button>
      </DemoListPopover>
    </CatalogExampleStack>
  );
}
