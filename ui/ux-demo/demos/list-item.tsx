import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ListItem } from '@kerfjs/ui/list-item';
import { CircleHelp, Folder, Inbox, Wrench } from 'lucide';

import { icon } from './state.js';

export function ListItemDemo() {
  return (
    <CatalogExampleStack
      className="demo-list-demo"
      rootAttributes={{ 'data-demo': 'list-item' }}
    >
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
          icon={icon(Inbox, 'inbox')}
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
          icon={icon(Folder, 'folder')}
        />
      </CatalogExample>
      <CatalogExample align="none">
        <ListItem
          action="log-settings"
          itemId="multiline"
          label="A multiline item demonstrates content that wraps without clipping"
          icon={icon(Wrench, 'wrench')}
          multiline
        />
      </CatalogExample>
      <CatalogExample align="none">
        <ListItem
          action="disabled"
          itemId="disabled"
          label="Unavailable item"
          icon={icon(CircleHelp, 'circle-help')}
          disabled
        />
      </CatalogExample>
      <CatalogExample align="none">
        <ListItem
          action="log-projects"
          itemId="placeholder"
          label="Loading item"
          icon={icon(Folder, 'folder')}
          trailing={<span>0</span>}
          placeholder
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
