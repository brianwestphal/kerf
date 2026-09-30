import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { PopupMenu } from '@kerfjs/ui/popup-menu';
import { PopupSurface } from '@kerfjs/ui/surface-scaffold';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import {
  Archive,
  ArrowDownAZ,
  Check,
  Copy,
  Gavel,
  MoreHorizontal,
  Trash2,
} from 'lucide';

export function PopupMenuDemo() {
  return (
    <CatalogExampleStack
      label="PopupMenu demo"
      rootAttributes={{ 'data-demo': 'popup-menu' }}
    >
      <CatalogExample
        label="Icon trigger in a toolbar group"
        note="A single group with nestedDropdown sizes the trigger as a toolbar button; menuInset sets the menu's inset. Hover or keyboard focus shows the label as a help tag."
        align="inline-control"
      >
        <ToolbarControlGroup single nestedDropdown menuInset="compact">
          <PopupMenu
            label="Sort tickets"
            icon={<LucideIcon icon={ArrowDownAZ} name="arrow-down-a-z" />}
            items={[
              { label: 'Recently updated', action: 'sort-recent' },
              { label: 'Priority', action: 'sort-priority' },
            ]}
          />
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample
        label="Grouped commands with icons"
        align="inline-control"
      >
        <ToolbarControlGroup
          single
          content="mixed"
          nestedDropdown
          menuInset="compact"
        >
          <PopupMenu
            text="Actions"
            icon={<LucideIcon icon={MoreHorizontal} name="ellipsis" />}
            items={[
              { kind: 'heading', label: 'Ticket' },
              {
                label: 'Duplicate',
                action: 'log-more',
                icon: <LucideIcon icon={Copy} name="copy" />,
              },
              {
                label: 'Archive',
                action: 'log-more',
                icon: <LucideIcon icon={Archive} name="archive" />,
              },
              { kind: 'divider' },
              {
                label: 'Delete',
                action: 'log-more',
                icon: <LucideIcon icon={Trash2} name="trash-2" />,
                disabled: true,
              },
            ]}
          />
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample label="Trailing toolbar menu" align="none">
        <Toolbar
          label="Ticket view"
          leading={<ToolbarText text="Tickets" size="xlarge" />}
          trailing={
            <ToolbarControlGroup single nestedDropdown menuInset="compact">
              <PopupMenu
                label="More actions"
                icon={<LucideIcon icon={MoreHorizontal} name="ellipsis" />}
                placement="bottom-end"
                items={[
                  { label: 'Export', action: 'log-more' },
                  { label: 'Print', action: 'log-more' },
                ]}
              />
            </ToolbarControlGroup>
          }
        />
      </CatalogExample>
      <CatalogExample
        label="Decisions and selected choices"
        align="inline-control"
      >
        <PopupMenu
          text="Decide"
          items={[
            { kind: 'heading', label: 'Sort by' },
            {
              label: 'Updated',
              action: 'sort-recent',
              details: <LucideIcon icon={Check} name="Selected" />,
            },
            { label: 'Priority', action: 'sort-priority' },
            { kind: 'divider' },
            {
              label: 'Decide',
              icon: <LucideIcon icon={Gavel} name="decide" />,
              submenu: [
                {
                  label: 'Approve',
                  action: 'log-decision',
                  checked: true,
                  attributes: { 'data-decision': 'approve' },
                },
                {
                  label: 'Reject',
                  action: 'log-decision',
                  tone: 'danger',
                  disabled: true,
                  disabledReason: 'A price is required',
                  attributes: { 'data-decision': 'reject' },
                },
              ],
            },
          ]}
        />
      </CatalogExample>
      <CatalogExample
        label="Context menu"
        note="Right-click the row; its visible action stays disabled until the row opens a menu at the pointer."
        align="inline-control"
      >
        <ListItem
          label="Demand draft"
          action="log-more"
          rootAttributes={{ 'data-popup-menu-context-target': '' }}
        />
        <ToolbarControlGroup single>
          <button type="button" disabled aria-label="Demand actions">
            <LucideIcon icon={MoreHorizontal} name="actions" />
          </button>
        </ToolbarControlGroup>
        <PopupMenu
          context
          label="Demand actions"
          rootAttributes={{ 'data-popup-context-menu': '' }}
          items={[
            { label: 'Open', action: 'log-context-open' },
            { label: 'Archive', action: 'log-more', tone: 'danger' },
          ]}
        />
      </CatalogExample>
      <CatalogExample
        label="Standalone in a popup surface"
        align="inline-control"
      >
        <PopupSurface inset="list-zero">
          <PopupMenu
            text="Choose view"
            items={[
              { label: 'Inbox', action: 'log-more' },
              { label: 'Archive', action: 'log-more' },
            ]}
          />
        </PopupSurface>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
