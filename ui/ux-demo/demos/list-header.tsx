import './list-header.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ListHeader } from '@kerfjs/ui/list-header';
import { Plus } from 'lucide';

import { DemoListPopover } from './demo-list-popover.js';
import { icon } from './state.js';

export function ListHeaderDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'list-header' }}>
      <CatalogExample align="none">
        <ListHeader
          label="Featured"
          badge={<span>New</span>}
          indicatorTone="pop"
        />
      </CatalogExample>
      <CatalogExample align="none">
        <div class="demo-list-header-inline-context">
          <span class="demo-list-header-inline-context__prefix">Queue:</span>
          <ListHeader
            label="Inline queue"
            count={12}
            countLabel="12 queued items"
            action="log-add"
            actionLabel="Add queued item"
            actionIcon={icon(Plus, 'plus')}
            divider="both"
            inline
          />
          <span class="demo-list-header-inline-context__suffix">ready</span>
        </div>
      </CatalogExample>
      <CatalogExample align="none">
        <ListHeader
          label="Needs attention"
          status={<span>3 blocked</span>}
          indicatorTone="danger"
          density="compact"
          divider="before"
        />
      </CatalogExample>
      <CatalogExample align="none">
        <ListHeader
          label="Attachments"
          count={12}
          countLabel="12 attachments"
          action="log-add"
          actionLabel="Add attachment"
          actionIcon={icon(Plus, 'plus')}
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
          actionIcon={icon(Plus, 'plus')}
          actionDisabled
        />
      </CatalogExample>
      <CatalogExample align="none">
        <ListHeader
          label="Attachments"
          count={0}
          countLabel="Loading attachments"
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
