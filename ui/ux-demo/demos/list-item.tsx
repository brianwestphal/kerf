import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { List } from '@kerfjs/ui/list';
import { ListItem, ListItemLink } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { CircleHelp, Folder, GripVertical, Inbox, Wrench } from 'lucide';

import { reorderCommands, reorderSelection } from './state.js';

export function ListItemDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'list-item' }}>
      <CatalogExample align="none">
        <ListItem
          action="log-projects"
          itemId="status"
          label="Build Checks"
          description="Updated a moment ago"
          status="Passing"
          density="compact"
          divider="before"
        />
      </CatalogExample>
      <CatalogExample
        label="Divided list"
        note="Every row but the last divides after itself, so lines sit only between rows. Corners round only on the outer edges of the group, so a hovered or selected first, middle, or last row keeps the right shape."
        align="none"
        viewport={{ width: 'medium' }}
      >
        <List rootAttributes={{ 'data-demo-divided-list': '' }}>
          {['Ana Ruiz', 'Ben Okafor', 'Chen Wei', 'Dana Holt'].map(
            (name, index, names) => (
              <ListItem
                action="log-projects"
                itemId={`member-${index}`}
                label={name}
                description="Member"
                selected={index === 1}
                divider={index < names.length - 1 ? 'after' : 'none'}
              />
            ),
          )}
        </List>
      </CatalogExample>
      <CatalogExample
        label="Filled command rows"
        note="Public color, fill, and border tokens let a list carry its own resting, hover, and selected tones without a wrapper."
        align="none"
        viewport={{
          width: 'medium',
          tokens: {
            '--kui-list-item-background': 'var(--kui-color-neutral-fill-quiet)',
            '--kui-list-item-color': 'var(--kui-color-brand-on-quiet)',
            '--kui-list-item-border': 'var(--kui-color-neutral-border-quiet)',
            '--kui-list-item-hover-background':
              'var(--kui-color-brand-fill-quiet)',
            '--kui-list-item-hover-border':
              'var(--kui-color-brand-border-normal)',
            '--kui-list-item-selected-background':
              'var(--kui-color-brand-fill-quiet)',
            '--kui-list-item-selected-color': 'var(--kui-color-brand-on-quiet)',
            '--kui-list-item-selected-border':
              'var(--kui-color-brand-border-normal)',
          },
        }}
      >
        <List>
          <ListItem
            action="log-projects"
            itemId="tone-rest"
            label="New Project"
          />
          <ListItem
            action="log-projects"
            itemId="tone-selected"
            label="Current Project"
            selected
          />
        </List>
      </CatalogExample>
      <CatalogExample align="none">
        <ListItem
          action="log-projects"
          itemId="busy"
          label="Refreshing Results"
          description="Keeping the current result visible"
          busy
        />
      </CatalogExample>
      <CatalogExample align="none">
        <ListItem
          action="log-inbox"
          itemId="selected"
          label="Selected Item"
          icon={<LucideIcon icon={Inbox} name="inbox" />}
          trailing={<span>12</span>}
          selected
          rootAttributes={{ 'data-demo-drop-status': 'ready' }}
        />
      </CatalogExample>
      <CatalogExample label="Native navigation link" align="none">
        <ListItemLink
          href="#list-item-link-target"
          itemId="link"
          label="Jump to List Destination"
          icon={<LucideIcon icon={Folder} name="folder" />}
          trailing={<span>Link</span>}
        />
        <span id="list-item-link-target">List destination</span>
      </CatalogExample>
      <CatalogExample label="External navigation link" align="none">
        <ListItemLink
          href="https://example.com"
          itemId="external-link"
          label="Open External Example"
          external
        />
      </CatalogExample>
      <CatalogExample align="none">
        <ListItem
          action="log-projects"
          itemId="default"
          label="Default Item"
          icon={<LucideIcon icon={Folder} name="folder" />}
        />
      </CatalogExample>
      <CatalogExample align="none">
        <ListItem
          action="log-settings"
          itemId="multiline"
          label="A multiline item demonstrates content that wraps without clipping"
          icon={<LucideIcon icon={Wrench} name="wrench" />}
          multiline
        />
      </CatalogExample>
      <CatalogExample label="Spacious option and centered icon" align="none">
        <ListItem
          action="log-settings"
          itemId="spacious"
          label="Create a Project from an Existing Repository with a Longer Name"
          icon={<LucideIcon icon={Wrench} name="wrench" />}
          trailing={<span>Open</span>}
          density="spacious"
          divider="after"
          multiline
          multilineIconAlign="center"
        />
      </CatalogExample>
      <CatalogExample label="Drop target" align="none">
        <ListItem
          action="log-projects"
          itemId="drag-target"
          label="Move Ticket Here"
          state="drag-target"
        />
      </CatalogExample>
      <CatalogExample
        label="Drag to reorder"
        note="Drag a row, or focus it and press Alt+Shift+Up or Down. Press several rows to move them together."
        align="none"
      >
        <List rootAttributes={{ 'data-list-id': 'demo-reorder-commands' }}>
          {reorderCommands.value.map((command) => (
            <ListItem
              action="toggle-reorder-row"
              itemId={command.id}
              label={command.label}
              icon={<LucideIcon icon={GripVertical} name="grip-vertical" />}
              pressed={reorderSelection.value.includes(command.id)}
              draggable
            />
          ))}
        </List>
      </CatalogExample>
      <CatalogExample label="Dragging and insertion states" align="none">
        <List>
          <ListItem
            action="log-projects"
            itemId="reorder-before"
            label="Drops Above This Row"
            draggable
            dropPosition="before"
          />
          <ListItem
            action="log-projects"
            itemId="reorder-dragging"
            label="Row Being Dragged"
            draggable
            dragging
          />
          <ListItem
            action="log-projects"
            itemId="reorder-after"
            label="Drops Below This Row"
            draggable
            dropPosition="after"
          />
        </List>
      </CatalogExample>
      <CatalogExample align="none">
        <ListItem
          action="disabled"
          itemId="disabled"
          label="Unavailable Item"
          icon={<LucideIcon icon={CircleHelp} name="circle-help" />}
          disabled
        />
      </CatalogExample>
      <CatalogExample align="none">
        <ListItem
          action="log-projects"
          itemId="placeholder"
          label="Loading Item"
          description="Loading description"
          icon={<LucideIcon icon={Folder} name="folder" />}
          trailing={<span>0</span>}
          placeholder
        />
      </CatalogExample>
      <CatalogExample align="none">
        <ListItem
          action="log-projects"
          itemId="busy-placeholder"
          label="Refreshing Results"
          status="Updating"
          busy
          placeholder
        />
      </CatalogExample>
      <CatalogExample align="none">
        <ListItem
          action="disabled"
          itemId="disabled-placeholder"
          label="Unavailable Item"
          icon={<LucideIcon icon={CircleHelp} name="circle-help" />}
          disabled
          placeholder
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
