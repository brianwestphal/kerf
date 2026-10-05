import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { px } from '@kerfjs/ui/css-values';
import { List } from '@kerfjs/ui/list';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { PopupMenu } from '@kerfjs/ui/popup-menu';
import { TokenSearchField } from '@kerfjs/ui/token-search-field';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import {
  Bold,
  CircleHelp,
  FileText,
  Filter,
  Italic,
  MoreHorizontal,
  RefreshCw,
  Settings,
  SlidersHorizontal,
  Underline,
} from 'lucide';

import { toolbarFindOpen, toolbarFindQuery } from './state.js';

export function ToolbarDemo() {
  const findExpanded =
    toolbarFindOpen.value || toolbarFindQuery.value.length > 0;
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'toolbar' }}>
      <CatalogExample
        label="Container width visibility"
        note="Secondary controls yield to the overflow action as this toolbar narrows. Resize the specimen to see the identity and utility actions return."
        viewport={{ width: 'wide', frame: 'solid' }}
        rootAttributes={{ 'data-demo-toolbar-width-visibility': '' }}
      >
        <Toolbar
          label="Workspace width visibility"
          leading={<ToolbarText text="Workspace" hideBelow={px(176)} />}
          trailing={
            <>
              <ToolbarControlGroup label="Refresh workspace" single>
                <button
                  type="button"
                  aria-label="Refresh workspace"
                  data-action="width-refresh"
                >
                  <LucideIcon icon={RefreshCw} name="refresh-cw" />
                </button>
              </ToolbarControlGroup>
              <ToolbarControlGroup
                label="Workspace utilities"
                hideBelow={px(416)}
              >
                <button
                  type="button"
                  aria-label="Filter workspace"
                  data-action="width-filter"
                >
                  <LucideIcon icon={Filter} name="filter" />
                </button>
                <button
                  type="button"
                  aria-label="Workspace settings"
                  data-action="log-settings"
                >
                  <LucideIcon icon={Settings} name="settings" />
                </button>
              </ToolbarControlGroup>
              <ToolbarControlGroup
                label="More workspace actions"
                single
                nestedDropdown
                showBelow={px(416)}
              >
                <PopupMenu
                  label="More workspace actions"
                  icon={
                    <LucideIcon icon={MoreHorizontal} name="more-horizontal" />
                  }
                  items={[
                    { label: 'Filter workspace', action: 'width-filter' },
                    { label: 'Workspace settings', action: 'log-settings' },
                  ]}
                />
              </ToolbarControlGroup>
            </>
          }
        />
      </CatalogExample>
      <CatalogExample
        label="Focus rings across toolbar zones"
        note="Keyboard focus stays visible on leading, center, and trailing controls, including beside a shrinking title."
        viewport={{ width: 'wide', frame: 'solid' }}
        rootAttributes={{ 'data-demo-toolbar-focus-zones': '' }}
      >
        <Toolbar
          label="Focus ring zones"
          responsive="stack"
          responsiveAt="compact"
          leading={
            <>
              <ToolbarControlGroup
                label="Leading action"
                focusRing="outline"
                single
              >
                <button type="button" aria-label="Leading action">
                  <LucideIcon icon={Filter} name="filter" />
                </button>
              </ToolbarControlGroup>
              <ToolbarText
                text="A long toolbar identity that can shrink"
                size="large"
              />
            </>
          }
          center={
            <ToolbarControlGroup
              label="Center action"
              focusRing="outline"
              single
            >
              <button type="button" aria-label="Center action">
                <LucideIcon icon={RefreshCw} name="refresh-cw" />
              </button>
            </ToolbarControlGroup>
          }
          trailing={
            <ToolbarControlGroup
              label="Trailing action"
              focusRing="outline"
              single
            >
              <button type="button" aria-label="Trailing action">
                <LucideIcon icon={Settings} name="settings" />
              </button>
            </ToolbarControlGroup>
          }
        />
      </CatalogExample>
      <CatalogExample
        label="Standalone primary action in trailing"
        note="A primary Web Awesome button keeps its brand pill while the toolbar aligns it beside grouped actions."
        viewport={{ width: 'medium', frame: 'solid' }}
        rootAttributes={{ 'data-demo-toolbar-primary-action': '' }}
      >
        <Toolbar
          label="Project heading"
          responsive="wrap"
          leading={<ToolbarText text="Project tickets" size="large" />}
          trailing={
            <>
              <ToolbarControlGroup label="Other actions" single>
                <button type="button" aria-label="Refresh tickets">
                  <LucideIcon icon={RefreshCw} name="refresh-cw" />
                </button>
              </ToolbarControlGroup>
              <wa-button variant="brand" data-action="log-add">
                New ticket…
              </wa-button>
            </>
          }
        />
      </CatalogExample>
      <CatalogExample viewport={{ width: 'wide', frame: 'solid' }}>
        <List gap="xs">
          <Toolbar
            label="Document controls"
            centerAlign="stretch"
            responsive="center-priority"
            leading={
              <ToolbarControlGroup appearance="borderless" single>
                <ToolbarText text="Component library" size="large" />
              </ToolbarControlGroup>
            }
            center={
              <ToolbarControlGroup
                content="search"
                focusRing="halo"
                expanded={findExpanded}
                single={!findExpanded}
              >
                <TokenSearchField
                  id="toolbar-find"
                  label="Find in workspace"
                  query={toolbarFindQuery.value}
                  collapsible
                  expanded={toolbarFindOpen.value}
                  fill
                  presentation="toolbar-group"
                  placeholder="Find in workspace"
                  expandLabel="Open find"
                  clearAction="clear-toolbar-find"
                  editorAttributes={{ 'data-demo-toolbar-find': 'true' }}
                  trailing={<LucideIcon icon={CircleHelp} name="circle-help" />}
                />
              </ToolbarControlGroup>
            }
            trailing={
              <ToolbarControlGroup
                label="View controls"
                buttonAppearance="push"
              >
                <button
                  type="button"
                  aria-label="Toggle inspector"
                  aria-pressed="true"
                >
                  <LucideIcon
                    icon={SlidersHorizontal}
                    name="sliders-horizontal"
                  />
                </button>
                <button type="button" aria-label="Settings">
                  <LucideIcon icon={Settings} name="settings" />
                </button>
              </ToolbarControlGroup>
            }
          />
          <Toolbar
            label="Compact toolbar"
            dividerSides="trbl"
            leading={
              <ToolbarControlGroup appearance="borderless" single>
                <ToolbarText text="Borderless" size="small" />
              </ToolbarControlGroup>
            }
            trailing={
              <ToolbarControlGroup appearance="borderless" single>
                <button type="button" data-action="log-add">
                  Add
                </button>
              </ToolbarControlGroup>
            }
          />
        </List>
      </CatalogExample>
      <CatalogExample
        label="Balanced center with trailing actions"
        note="Equal leading and trailing tracks keep the ticket number on the toolbar midpoint even when only the trailing side has actions."
        viewport={{ width: 'wide', frame: 'solid' }}
      >
        <Toolbar
          label="Ticket header"
          centerAlign="balanced"
          center={<ToolbarText text="TICKET-123" size="large" />}
          trailing={
            <ToolbarControlGroup appearance="borderless">
              <button type="button" aria-label="Refresh ticket">
                <LucideIcon icon={RefreshCw} name="refresh-cw" />
              </button>
              <button type="button" aria-label="Ticket settings">
                <LucideIcon icon={Settings} name="settings" />
              </button>
            </ToolbarControlGroup>
          }
        />
      </CatalogExample>
      <CatalogExample
        label="Gap without outer inset"
        note="An embedded toolbar can keep the 8px zone gap while its own padding is zero."
        viewport={{
          width: 'medium',
          tokens: { '--kui-toolbar-inset': '0px' },
        }}
      >
        <Toolbar
          label="Inset-free toolbar"
          leading={
            <ToolbarControlGroup appearance="borderless" single>
              <button type="button" aria-label="Filters">
                <LucideIcon icon={Filter} name="filter" />
              </button>
            </ToolbarControlGroup>
          }
          trailing={
            <ToolbarControlGroup appearance="borderless" single>
              <button type="button" aria-label="Refresh">
                <LucideIcon icon={RefreshCw} name="refresh-cw" />
              </button>
            </ToolbarControlGroup>
          }
        />
      </CatalogExample>
      <CatalogExample
        label="Stacked actions wrap"
        note="A stacked control zone moves whole groups to another row instead of clipping them."
        viewport={{ width: 'text', frame: 'solid' }}
        rootAttributes={{ 'data-demo-toolbar-overflow': 'stack' }}
      >
        <Toolbar
          label="Stacked editor controls"
          responsive="stack"
          responsiveAt="compact"
          leading={<ToolbarText text="Draft" size="small" />}
          trailing={
            <>
              <ToolbarControlGroup label="Text style" buttonAppearance="push">
                <button type="button" aria-label="Bold" aria-pressed="false">
                  <LucideIcon icon={Bold} name="bold" />
                </button>
                <button type="button" aria-label="Italic" aria-pressed="false">
                  <LucideIcon icon={Italic} name="italic" />
                </button>
                <button
                  type="button"
                  aria-label="Underline"
                  aria-pressed="false"
                >
                  <LucideIcon icon={Underline} name="underline" />
                </button>
              </ToolbarControlGroup>
              <ToolbarControlGroup
                label="Draft actions"
                buttonAppearance="push"
              >
                <button type="button" aria-label="Filter drafts">
                  <LucideIcon icon={Filter} name="filter" />
                </button>
                <button type="button" aria-label="Refresh drafts">
                  <LucideIcon icon={RefreshCw} name="refresh-cw" />
                </button>
              </ToolbarControlGroup>
              <ToolbarControlGroup label="More draft actions" single>
                <button type="button" aria-label="More draft actions">
                  <LucideIcon icon={MoreHorizontal} name="more-horizontal" />
                </button>
              </ToolbarControlGroup>
            </>
          }
        />
      </CatalogExample>
      <CatalogExample
        label="Heading identity stays whole"
        note="The wrap policy keeps one row while the title fits, then moves the trailing zone below the title."
        viewport={{ width: 'text', frame: 'solid' }}
        rootAttributes={{ 'data-demo-toolbar-overflow': 'wrap' }}
      >
        <Toolbar
          label="Q3 release"
          responsive="wrap"
          leading={
            <>
              <ToolbarControlGroup appearance="borderless" single>
                <LucideIcon icon={FileText} name="file-text" />
              </ToolbarControlGroup>
              <ToolbarText text="Q3 release" size="xlarge" />
            </>
          }
          trailing={
            <ToolbarControlGroup appearance="borderless" content="text" single>
              <button type="button" data-action="log-add">
                Publish
              </button>
            </ToolbarControlGroup>
          }
        />
      </CatalogExample>
      <CatalogExample
        label="Trailing search priority"
        note="An expanded trailing search takes the full row below the heading at narrow widths."
        viewport={{ width: 'text', frame: 'solid' }}
        rootAttributes={{ 'data-demo-toolbar-overflow': 'trailing-priority' }}
      >
        <Toolbar
          label="Search tickets"
          responsive="trailing-priority"
          leading={<ToolbarText text="Tickets" size="large" />}
          trailing={
            <>
              <ToolbarControlGroup content="search" expanded>
                <TokenSearchField
                  id="trailing-priority-search"
                  label="Search tickets"
                  collapsible
                  expanded
                  presentation="toolbar-group"
                  placeholder="Search tickets"
                />
              </ToolbarControlGroup>
              <ToolbarControlGroup
                label="View"
                single
                visibility="yield-to-expanded-sibling"
              >
                <button type="button" aria-label="List view">
                  <LucideIcon icon={FileText} name="file-text" />
                </button>
              </ToolbarControlGroup>
              <ToolbarControlGroup
                label="Actions"
                single
                visibility="yield-to-expanded-sibling"
              >
                <button type="button" aria-label="More actions">
                  <LucideIcon icon={MoreHorizontal} name="ellipsis" />
                </button>
              </ToolbarControlGroup>
            </>
          }
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
