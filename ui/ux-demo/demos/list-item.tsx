import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ListItem, ListItemLink } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { CircleHelp, Folder, Inbox, Wrench } from 'lucide';

export function ListItemDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'list-item' }}>
      <CatalogExample align="none">
        <ListItem
          action="log-projects"
          itemId="status"
          label="Build checks"
          description="Updated a moment ago"
          status="Passing"
          density="compact"
          divider="before"
        />
      </CatalogExample>
      <CatalogExample align="none">
        <ListItem
          action="log-projects"
          itemId="busy"
          label="Refreshing results"
          description="Keeping the current result visible"
          busy
        />
      </CatalogExample>
      <CatalogExample align="none">
        <ListItem
          action="log-inbox"
          itemId="selected"
          label="Selected item"
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
          label="Jump to list destination"
          icon={<LucideIcon icon={Folder} name="folder" />}
          trailing={<span>Link</span>}
        />
        <span id="list-item-link-target">List destination</span>
      </CatalogExample>
      <CatalogExample label="External navigation link" align="none">
        <ListItemLink
          href="https://example.com"
          itemId="external-link"
          label="Open external example"
          external
        />
      </CatalogExample>
      <CatalogExample align="none">
        <ListItem
          action="log-projects"
          itemId="default"
          label="Default item"
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
          label="Create a project from an existing repository with a longer name"
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
          label="Move ticket here"
          state="drag-target"
        />
      </CatalogExample>
      <CatalogExample align="none">
        <ListItem
          action="disabled"
          itemId="disabled"
          label="Unavailable item"
          icon={<LucideIcon icon={CircleHelp} name="circle-help" />}
          disabled
        />
      </CatalogExample>
      <CatalogExample align="none">
        <ListItem
          action="log-projects"
          itemId="placeholder"
          label="Loading item"
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
          label="Refreshing results"
          status="Updating"
          busy
          placeholder
        />
      </CatalogExample>
      <CatalogExample align="none">
        <ListItem
          action="disabled"
          itemId="disabled-placeholder"
          label="Unavailable item"
          icon={<LucideIcon icon={CircleHelp} name="circle-help" />}
          disabled
          placeholder
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
