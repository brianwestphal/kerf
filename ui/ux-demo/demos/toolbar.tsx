import { Button } from '@kerfjs/ui/button';
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
        label="Container Width Visibility"
        note="Secondary controls yield to the overflow action as this toolbar narrows. Resize the specimen to see the identity and utility actions return."
        viewport={{ width: 'wide', frame: 'solid' }}
        rootAttributes={{ 'data-demo-toolbar-width-visibility': '' }}
      >
        <Toolbar
          label="Workspace Width Visibility"
          leading={<ToolbarText text="Workspace" hideBelow={px(176)} />}
          trailing={
            <>
              <ToolbarControlGroup label="Refresh Workspace" single>
                <button
                  type="button"
                  aria-label="Refresh Workspace"
                  data-action="width-refresh"
                >
                  <LucideIcon icon={RefreshCw} name="refresh-cw" />
                </button>
              </ToolbarControlGroup>
              <ToolbarControlGroup
                label="Workspace Utilities"
                hideBelow={px(416)}
              >
                <button
                  type="button"
                  aria-label="Filter Workspace"
                  data-action="width-filter"
                >
                  <LucideIcon icon={Filter} name="filter" />
                </button>
                <button
                  type="button"
                  aria-label="Workspace Settings"
                  data-action="log-settings"
                >
                  <LucideIcon icon={Settings} name="settings" />
                </button>
              </ToolbarControlGroup>
              <ToolbarControlGroup
                label="More Workspace Actions"
                single
                nestedDropdown
                showBelow={px(416)}
              >
                <PopupMenu
                  label="More Workspace Actions"
                  icon={
                    <LucideIcon icon={MoreHorizontal} name="more-horizontal" />
                  }
                  items={[
                    { label: 'Filter Workspace', action: 'width-filter' },
                    { label: 'Workspace Settings', action: 'log-settings' },
                  ]}
                />
              </ToolbarControlGroup>
            </>
          }
        />
      </CatalogExample>
      <CatalogExample
        label="Focus Rings Across Toolbar Zones"
        note="Keyboard focus stays visible on leading, center, and trailing controls, including beside a shrinking title."
        viewport={{ width: 'wide', frame: 'solid' }}
        rootAttributes={{ 'data-demo-toolbar-focus-zones': '' }}
      >
        <Toolbar
          label="Focus Ring Zones"
          responsive="stack"
          responsiveAt="compact"
          leading={
            <>
              <ToolbarControlGroup
                label="Leading Action"
                focusRing="outline"
                single
              >
                <button type="button" aria-label="Leading Action">
                  <LucideIcon icon={Filter} name="filter" />
                </button>
              </ToolbarControlGroup>
              <ToolbarText
                text="A Long Toolbar Identity That Can Shrink"
                size="large"
              />
            </>
          }
          center={
            <ToolbarControlGroup
              label="Center Action"
              focusRing="outline"
              single
            >
              <button type="button" aria-label="Center Action">
                <LucideIcon icon={RefreshCw} name="refresh-cw" />
              </button>
            </ToolbarControlGroup>
          }
          trailing={
            <ToolbarControlGroup
              label="Trailing Action"
              focusRing="outline"
              single
            >
              <button type="button" aria-label="Trailing Action">
                <LucideIcon icon={Settings} name="settings" />
              </button>
            </ToolbarControlGroup>
          }
        />
      </CatalogExample>
      <CatalogExample
        label="Standalone Primary Action in Trailing"
        note="A primary Web Awesome button keeps its rounded rectangle while the toolbar aligns it beside grouped actions."
        viewport={{ width: 'medium', frame: 'solid' }}
        rootAttributes={{ 'data-demo-toolbar-primary-action': '' }}
      >
        <Toolbar
          label="Project Heading"
          responsive="wrap"
          leading={<ToolbarText text="Project Tickets" size="large" />}
          trailing={
            <>
              <ToolbarControlGroup label="Other Actions" single>
                <button type="button" aria-label="Refresh Tickets">
                  <LucideIcon icon={RefreshCw} name="refresh-cw" />
                </button>
              </ToolbarControlGroup>
              <Button tone="brand" action="log-add">
                New Ticket…
              </Button>
            </>
          }
        />
      </CatalogExample>
      <CatalogExample
        label="Compact Density"
        note="Compact density makes a 40px header for a panel embedded in a card or inspector; its groups take the compact size."
        viewport={{ width: 'medium', frame: 'solid' }}
        rootAttributes={{ 'data-demo-toolbar-compact': '' }}
      >
        <Toolbar
          label="Recent Activity"
          density="compact"
          leading={<ToolbarText text="Recent Activity" />}
          trailing={
            <ToolbarControlGroup
              label="Activity Actions"
              size="compact"
              content="icon"
            >
              <button type="button" aria-label="Refresh Activity">
                <LucideIcon icon={RefreshCw} name="refresh-cw" />
              </button>
              <button type="button" aria-label="Filter Activity">
                <LucideIcon icon={Filter} name="filter" />
              </button>
            </ToolbarControlGroup>
          }
        />
      </CatalogExample>
      <CatalogExample viewport={{ width: 'wide', frame: 'solid' }}>
        <List gap="xs">
          <Toolbar
            label="Document Controls"
            centerAlign="stretch"
            responsive="center-priority"
            leading={
              <ToolbarControlGroup appearance="borderless" single>
                <ToolbarText text="Component Library" size="large" />
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
                  label="Find in Workspace"
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
                label="View Controls"
                buttonAppearance="push"
              >
                <button
                  type="button"
                  aria-label="Toggle Inspector"
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
            label="Compact Toolbar"
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
        label="Balanced Center with Trailing Actions"
        note="Equal leading and trailing tracks keep the ticket number on the toolbar midpoint even when only the trailing side has actions."
        viewport={{ width: 'wide', frame: 'solid' }}
      >
        <Toolbar
          label="Ticket Header"
          centerAlign="balanced"
          center={<ToolbarText text="TICKET-123" size="large" />}
          trailing={
            <ToolbarControlGroup appearance="borderless">
              <button type="button" aria-label="Refresh Ticket">
                <LucideIcon icon={RefreshCw} name="refresh-cw" />
              </button>
              <button type="button" aria-label="Ticket Settings">
                <LucideIcon icon={Settings} name="settings" />
              </button>
            </ToolbarControlGroup>
          }
        />
      </CatalogExample>
      <CatalogExample
        label="Gap Without Outer Inset"
        note="An embedded toolbar can keep the 8px zone gap while its own padding is zero."
        viewport={{
          width: 'medium',
          tokens: { '--kui-toolbar-inset': '0px' },
        }}
      >
        <Toolbar
          label="Inset-Free Toolbar"
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
        label="Stacked Actions Wrap"
        note="A stacked control zone moves whole groups to another row instead of clipping them."
        viewport={{ width: 'text', frame: 'solid' }}
        rootAttributes={{ 'data-demo-toolbar-overflow': 'stack' }}
      >
        <Toolbar
          label="Stacked Editor Controls"
          responsive="stack"
          responsiveAt="compact"
          leading={<ToolbarText text="Draft" size="small" />}
          trailing={
            <>
              <ToolbarControlGroup label="Text Style" buttonAppearance="push">
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
                label="Draft Actions"
                buttonAppearance="push"
              >
                <button type="button" aria-label="Filter Drafts">
                  <LucideIcon icon={Filter} name="filter" />
                </button>
                <button type="button" aria-label="Refresh Drafts">
                  <LucideIcon icon={RefreshCw} name="refresh-cw" />
                </button>
              </ToolbarControlGroup>
              <ToolbarControlGroup label="More Draft Actions" single>
                <button type="button" aria-label="More Draft Actions">
                  <LucideIcon icon={MoreHorizontal} name="more-horizontal" />
                </button>
              </ToolbarControlGroup>
            </>
          }
        />
      </CatalogExample>
      <CatalogExample
        label="Heading Identity Stays Whole"
        note="The wrap policy keeps one row while the title fits, then moves the trailing zone below the title."
        viewport={{ width: 'text', frame: 'solid' }}
        rootAttributes={{ 'data-demo-toolbar-overflow': 'wrap' }}
      >
        <Toolbar
          label="Q3 Release"
          responsive="wrap"
          leading={
            <>
              <ToolbarControlGroup appearance="borderless" single>
                <LucideIcon icon={FileText} name="file-text" />
              </ToolbarControlGroup>
              <ToolbarText text="Q3 Release" size="xlarge" />
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
        label="Trailing Search Priority"
        note="An expanded trailing search takes the full row below the heading at narrow widths."
        viewport={{ width: 'text', frame: 'solid' }}
        rootAttributes={{ 'data-demo-toolbar-overflow': 'trailing-priority' }}
      >
        <Toolbar
          label="Search Tickets"
          responsive="trailing-priority"
          leading={<ToolbarText text="Tickets" size="large" />}
          trailing={
            <>
              <ToolbarControlGroup content="search" expanded>
                <TokenSearchField
                  id="trailing-priority-search"
                  label="Search Tickets"
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
                <button type="button" aria-label="List View">
                  <LucideIcon icon={FileText} name="file-text" />
                </button>
              </ToolbarControlGroup>
              <ToolbarControlGroup
                label="Actions"
                single
                visibility="yield-to-expanded-sibling"
              >
                <button type="button" aria-label="More Actions">
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
