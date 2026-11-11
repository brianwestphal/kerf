import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { List } from '@kerfjs/ui/list';
import { ListHeader } from '@kerfjs/ui/list-header';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Row } from '@kerfjs/ui/row';
import { Text } from '@kerfjs/ui/text';
import { Ellipsis, Plus } from 'lucide';

import { DemoListPopover } from './demo-list-popover.js';
import { listHeaderGroupOpen } from './state.js';

export function ListHeaderDemo() {
  const unpricedCount = 3;
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'list-header' }}>
      <CatalogExample label="Label Sizes" align="none">
        <List gap="xs" rootAttributes={{ 'data-demo-list-header-sizes': '' }}>
          <ListHeader label="Extra Small" size="xs" headingLevel={3} />
          <ListHeader label="Small" size="sm" headingLevel={3} />
          <ListHeader label="Medium" size="m" headingLevel={3} />
          <ListHeader label="Large" size="l" headingLevel={3} />
          <ListHeader label="Extra Large" size="xl" headingLevel={3} />
        </List>
      </CatalogExample>
      <CatalogExample align="none">
        <ListHeader label="Featured" badge="New" indicatorTone="pop" />
      </CatalogExample>
      <CatalogExample
        align="none"
        rootAttributes={{ 'data-demo-inline-list-header': '' }}
      >
        <Row vAlign="middle" wrap>
          <Text variant="span">Queue:</Text>
          <ListHeader
            label="Inline Queue"
            count={12}
            countLabel="12 queued items"
            action="log-add"
            actionLabel="Add queued item"
            actionIcon={<LucideIcon icon={Plus} name="plus" />}
            divider="both"
            inline
          />
          <Text variant="span" tone="quiet">
            ready
          </Text>
        </Row>
      </CatalogExample>
      <CatalogExample align="none">
        <ListHeader
          label="Needs Attention"
          status="3 blocked"
          indicatorTone="danger"
          density="compact"
          divider="before"
          headingLevel={3}
        />
      </CatalogExample>
      <CatalogExample
        label="Badge and Status Together"
        note="Both indicators can be shown together. Either prop can be undefined while app state changes."
        align="none"
        rootAttributes={{ 'data-demo-list-header-combined': '' }}
      >
        <ListHeader
          label="Purchases"
          badge={
            unpricedCount > 0 ? `${unpricedCount} lines unpriced` : undefined
          }
          status="Needs review"
          indicatorTone="danger"
        />
      </CatalogExample>
      <CatalogExample align="none">
        <ListHeader
          label="Attachments"
          count={12}
          countLabel="12 attachments"
          action="log-add"
          actionLabel="Add attachment"
          actionIcon={<LucideIcon icon={Plus} name="plus" />}
          triggerAttributes={{
            popoverTarget: 'list-header-attachments-popover',
            popoverTargetAction: 'toggle',
            'aria-controls': 'list-header-attachments-popover',
            'aria-haspopup': 'dialog',
          }}
        />
      </CatalogExample>
      <CatalogExample align="none">
        <ListHeader label="Notes" count={0} countLabel="0 notes" />
      </CatalogExample>
      <CatalogExample align="none">
        <ListHeader label="Duplicates" count={2} countLabel="2 duplicates" />
      </CatalogExample>
      <CatalogExample align="none">
        <ListHeader label="Preview" badge="New" />
      </CatalogExample>
      <CatalogExample align="none">
        <ListHeader
          label="Unavailable"
          action="log-add"
          actionLabel="Unavailable action"
          actionIcon={<LucideIcon icon={Plus} name="plus" />}
          actionDisabled
        />
      </CatalogExample>
      <CatalogExample align="none">
        <ListHeader
          label="Attachments"
          count={0}
          countLabel="Loading attachments"
          action="log-add"
          actionLabel="Upload attachment"
          actionIcon={<LucideIcon icon={Plus} name="plus" />}
          placeholder
        />
      </CatalogExample>
      <CatalogExample
        label="Collapsible Section with Actions"
        note="The label and arrow toggle the section; the trailing button opens its commands and never toggles it."
        align="none"
        viewport={{ width: 'sidebar', frame: 'solid' }}
        rootAttributes={{ 'data-demo-list-header-overflow': '' }}
      >
        <List>
          <ListHeader
            label="In Review"
            count={2}
            countLabel="2 tickets in review"
            toggle
            expanded={listHeaderGroupOpen.value}
            action="toggle-list-header-group"
            controls="list-header-group-content"
            overflowAction="log-more"
            overflowLabel="Group actions"
            overflowIcon={<LucideIcon icon={Ellipsis} name="ellipsis" />}
            overflowTriggerAttributes={{
              popoverTarget: 'list-header-group-actions-popover',
              popoverTargetAction: 'toggle',
              'aria-controls': 'list-header-group-actions-popover',
              'aria-haspopup': 'dialog',
            }}
          />
          <List
            id="list-header-group-content"
            hidden={!listHeaderGroupOpen.value}
          >
            <ListItem label="Rename the inbox filter" action="log-more" />
            <ListItem label="Check the export totals" action="log-more" />
          </List>
        </List>
      </CatalogExample>
      <DemoListPopover
        id="list-header-group-actions-popover"
        label="Group Actions"
      >
        Rename or ungroup this section.
      </DemoListPopover>
      <DemoListPopover
        id="list-header-attachments-popover"
        label="Attachment Action Details"
      >
        Application-owned popover content.
      </DemoListPopover>
    </CatalogExampleStack>
  );
}
