import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { List } from '@kerfjs/ui/list';
import { ListHeader } from '@kerfjs/ui/list-header';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Row } from '@kerfjs/ui/row';
import { Text } from '@kerfjs/ui/text';
import { Plus } from 'lucide';

import { DemoListPopover } from './demo-list-popover.js';

export function ListHeaderDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'list-header' }}>
      <CatalogExample label="Label sizes" align="none">
        <List gap="xs" rootAttributes={{ 'data-demo-list-header-sizes': '' }}>
          <ListHeader label="Extra small" size="xs" headingLevel={3} />
          <ListHeader label="Small" size="sm" headingLevel={3} />
          <ListHeader label="Medium" size="m" headingLevel={3} />
          <ListHeader label="Large" size="l" headingLevel={3} />
          <ListHeader label="Extra large" size="xl" headingLevel={3} />
        </List>
      </CatalogExample>
      <CatalogExample align="none">
        <ListHeader
          label="Featured"
          badge={<span>New</span>}
          indicatorTone="pop"
        />
      </CatalogExample>
      <CatalogExample
        align="none"
        rootAttributes={{ 'data-demo-inline-list-header': '' }}
      >
        <Row vAlign="middle">
          <Text variant="span">Queue:</Text>
          <ListHeader
            label="Inline queue"
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
          label="Needs attention"
          status={<span>3 blocked</span>}
          indicatorTone="danger"
          density="compact"
          divider="before"
          headingLevel={3}
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
        <ListHeader label="Preview" badge={<span>New</span>} />
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
      <DemoListPopover
        id="list-header-attachments-popover"
        label="Attachment action details"
      >
        Application-owned popover content.
      </DemoListPopover>
    </CatalogExampleStack>
  );
}
