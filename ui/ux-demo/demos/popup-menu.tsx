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
  Copy,
  Gavel,
  MoreHorizontal,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from 'lucide';

import { popupContextAnchor, popupSortChoice } from './state.js';

export function PopupMenuDemo() {
  return (
    <CatalogExampleStack
      label="PopupMenu Demo"
      rootAttributes={{ 'data-demo': 'popup-menu' }}
    >
      <CatalogExample
        label="Icon Trigger in a Toolbar Group"
        note="A single group with nestedDropdown sizes the trigger as a toolbar button; menuInset sets the menu's inset. Hover or keyboard focus shows the label as a help tag."
        align="inline-control"
      >
        <ToolbarControlGroup single nestedDropdown menuInset="compact">
          <PopupMenu
            label="Sort Tickets"
            icon={<LucideIcon icon={ArrowDownAZ} name="arrow-down-a-z" />}
            items={[
              { label: 'Recently Updated', action: 'sort-recent' },
              { label: 'Priority', action: 'sort-priority' },
            ]}
          />
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample
        label="Grouped Commands with Icons"
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
      <CatalogExample label="Trailing Toolbar Menu" align="none">
        <Toolbar
          label="Ticket View"
          leading={<ToolbarText text="Tickets" size="xlarge" />}
          trailing={
            <ToolbarControlGroup single nestedDropdown menuInset="compact">
              <PopupMenu
                label="More Actions"
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
        label="Checked Choices"
        note="Open the menu to compare a checked choice, an unchecked choice that keeps the checkmark space, and a plain command that keeps it too because its menu holds choices. Choosing a sort option updates the checks."
        align="text-trigger"
      >
        <PopupMenu
          text="Sort Choices"
          rootAttributes={{ 'data-popup-checked-menu': '' }}
          items={[
            {
              label: 'Updated',
              action: 'sort-recent',
              checked: popupSortChoice.value === 'recent',
            },
            {
              label: 'Priority',
              action: 'sort-priority',
              checked: popupSortChoice.value === 'priority',
            },
            { kind: 'divider' },
            { label: 'More Sort Options', action: 'log-more' },
          ]}
        />
      </CatalogExample>
      <CatalogExample
        label="Nested Decisions"
        note="The Decide submenu mixes a checked choice with plain commands, so every row keeps the check column and icons line up; the top level holds no choice and keeps the compact start."
        align="text-trigger"
      >
        <PopupMenu
          text="Decide"
          items={[
            {
              label: 'Decide',
              icon: <LucideIcon icon={Gavel} name="decide" />,
              submenu: [
                { kind: 'heading', label: 'Review' },
                {
                  label: 'Approve',
                  action: 'log-decision',
                  icon: <LucideIcon icon={ThumbsUp} name="approve" />,
                  checked: true,
                  attributes: { 'data-decision': 'approve' },
                },
                {
                  label: 'Reject',
                  action: 'log-decision',
                  icon: <LucideIcon icon={ThumbsDown} name="reject" />,
                  tone: 'danger',
                  disabled: true,
                  disabledReason: 'A price is required',
                  attributes: { 'data-decision': 'reject' },
                },
                { kind: 'divider' },
                { kind: 'heading', label: 'More' },
                {
                  label: 'Other…',
                  action: 'log-decision',
                  icon: <LucideIcon icon={MoreHorizontal} name="other" />,
                  attributes: { 'data-decision': 'other' },
                },
              ],
            },
          ]}
        />
      </CatalogExample>
      <CatalogExample
        label="Context Menu"
        note="Right-click the row to open actions at the pointer, or use the adjacent action button."
        align="inline-control"
      >
        <ListItem
          label="Demand draft"
          action="log-more"
          rootAttributes={{ 'data-popup-menu-context-target': '' }}
        />
        <ToolbarControlGroup single>
          <button
            type="button"
            aria-label="Demand Actions"
            title="Demand Actions"
            data-action="open-demand-actions"
          >
            <LucideIcon icon={MoreHorizontal} name="actions" />
          </button>
        </ToolbarControlGroup>
        <PopupMenu
          context
          label="Demand Actions"
          anchor={popupContextAnchor.value}
          rootAttributes={{ 'data-popup-context-menu': '' }}
          items={[
            { label: 'Open', action: 'log-context-open' },
            {
              label: 'More Actions',
              submenu: [{ label: 'Copy Reference', action: 'log-more' }],
            },
            { label: 'Archive', action: 'log-more', tone: 'danger' },
          ]}
        />
      </CatalogExample>
      <CatalogExample
        label="Standalone in a Popup Surface"
        align="inline-control"
      >
        <PopupSurface inset="list-zero">
          <PopupMenu
            text="Choose View"
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
