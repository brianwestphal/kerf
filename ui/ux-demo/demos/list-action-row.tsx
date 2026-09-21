import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ListActionRow } from '@kerfjs/ui/list-action-row';
import { Folder, MoreHorizontal } from 'lucide';

import { icon, menuActionCurrent, menuActionPressed } from './state.js';

export function ListActionRowDemo() {
  return (
    <CatalogExampleStack
      className="demo-list-demo"
      rootAttributes={{ 'data-demo': 'list-action-row' }}
    >
      <CatalogExample align="none">
        <ListActionRow
          label="src/main.ts"
          icon={icon(Folder, 'folder')}
          action="select-list-action-row"
          itemId="src/main.ts"
          selected={menuActionCurrent.value === 'src/main.ts'}
          accessibleLabel="Select src/main.ts"
          trailingAction="open-list-action-row-actions"
          trailingActionLabel="Actions for src/main.ts"
          trailingActionIcon={icon(MoreHorizontal, 'more-horizontal')}
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
          icon={icon(Folder, 'folder')}
          action="toggle-list-action-row"
          itemId="long-file"
          pressed={menuActionPressed.value}
          accessibleLabel="Select long file"
          multiline
          trailingAction="open-list-action-row-actions"
          trailingActionLabel="Actions for long file"
          trailingActionIcon={icon(MoreHorizontal, 'more-horizontal')}
          rootAttributes={{ 'data-demo-action-row': 'multiline' }}
        />
      </CatalogExample>
      <CatalogExample align="none">
        <ListActionRow
          label="Unavailable primary"
          action="select-list-action-row"
          itemId="disabled-primary"
          selected={menuActionCurrent.value === 'disabled-primary'}
          disabled
          trailingAction="open-list-action-row-actions"
          trailingActionLabel="Actions for unavailable primary"
          trailingActionIcon={icon(MoreHorizontal, 'more-horizontal')}
          rootAttributes={{ 'data-demo-action-row': 'disabled-primary' }}
        />
      </CatalogExample>
      <CatalogExample align="none">
        <ListActionRow
          label="Unavailable trailing action"
          action="select-list-action-row"
          itemId="disabled-trailing"
          selected={menuActionCurrent.value === 'disabled-trailing'}
          trailingAction="open-list-action-row-actions"
          trailingActionLabel="Unavailable actions"
          trailingActionIcon={icon(MoreHorizontal, 'more-horizontal')}
          trailingActionDisabled
          trailingActionTitle="Actions unavailable"
          rootAttributes={{ 'data-demo-action-row': 'disabled-trailing' }}
        />
      </CatalogExample>
      <CatalogExample align="none">
        <ListActionRow
          label="Loading file"
          icon={icon(Folder, 'folder')}
          action="select-list-action-row"
          itemId="placeholder"
          placeholder
          trailingAction="open-list-action-row-actions"
          trailingActionLabel="Actions"
          trailingActionIcon={icon(MoreHorizontal, 'more-horizontal')}
          rootAttributes={{ 'data-demo-action-row': 'placeholder' }}
        />
      </CatalogExample>
      <div
        id="list-action-row-popover"
        class="demo-list-popover"
        popover="auto"
        role="dialog"
        aria-label="File actions"
      >
        <button type="button" data-action="log-more">
          Open details
        </button>
      </div>
    </CatalogExampleStack>
  );
}
