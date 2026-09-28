import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { PopupMenu } from '@kerfjs/ui/popup-menu';
import { PopupSurface } from '@kerfjs/ui/surface-scaffold';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { Archive, ArrowDownAZ, Copy, MoreHorizontal, Trash2 } from 'lucide';

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
          dividerSides=""
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
