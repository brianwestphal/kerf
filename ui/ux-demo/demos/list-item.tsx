import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ListItem } from '@kerfjs/ui/list-item';
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
          icon={<LucideIcon icon={Folder} name="folder" />}
          trailing={<span>0</span>}
          placeholder
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
