import { Button } from '@kerfjs/ui/button';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { px } from '@kerfjs/ui/css-values';
import { List } from '@kerfjs/ui/list';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { PopupMenu } from '@kerfjs/ui/popup-menu';
import { SearchField } from '@kerfjs/ui/search-field';
import { Toolbar } from '@kerfjs/ui/toolbar';
import {
  ToolbarButton,
  ToolbarControlGroup,
} from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import {
  Bold,
  CircleQuestionMark,
  Ellipsis,
  FileText,
  Funnel,
  Italic,
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
                <ToolbarButton
                  ariaLabel="Refresh Workspace"
                  action="width-refresh"
                  icon={<LucideIcon icon={RefreshCw} name="refresh-cw" />}
                />
              </ToolbarControlGroup>
              <ToolbarControlGroup
                label="Workspace Utilities"
                hideBelow={px(416)}
              >
                <ToolbarButton
                  ariaLabel="Filter Workspace"
                  action="width-filter"
                  icon={<LucideIcon icon={Funnel} name="funnel" />}
                />
                <ToolbarButton
                  ariaLabel="Workspace Settings"
                  action="log-settings"
                  icon={<LucideIcon icon={Settings} name="settings" />}
                />
              </ToolbarControlGroup>
              <ToolbarControlGroup
                label="More Workspace Actions"
                single
                nestedDropdown
                showBelow={px(416)}
              >
                <PopupMenu
                  label="More Workspace Actions"
                  icon={<LucideIcon icon={Ellipsis} name="ellipsis" />}
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
                <ToolbarButton
                  ariaLabel="Leading Action"
                  icon={<LucideIcon icon={Funnel} name="funnel" />}
                />
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
              <ToolbarButton
                ariaLabel="Center Action"
                icon={<LucideIcon icon={RefreshCw} name="refresh-cw" />}
              />
            </ToolbarControlGroup>
          }
          trailing={
            <ToolbarControlGroup
              label="Trailing Action"
              focusRing="outline"
              single
            >
              <ToolbarButton
                ariaLabel="Trailing Action"
                icon={<LucideIcon icon={Settings} name="settings" />}
              />
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
                <ToolbarButton
                  ariaLabel="Refresh Tickets"
                  icon={<LucideIcon icon={RefreshCw} name="refresh-cw" />}
                />
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
              <ToolbarButton
                ariaLabel="Refresh Activity"
                icon={<LucideIcon icon={RefreshCw} name="refresh-cw" />}
              />
              <ToolbarButton
                ariaLabel="Filter Activity"
                icon={<LucideIcon icon={Funnel} name="funnel" />}
              />
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
                <SearchField
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
                  trailing={
                    <LucideIcon
                      icon={CircleQuestionMark}
                      name="circle-question-mark"
                    />
                  }
                />
              </ToolbarControlGroup>
            }
            trailing={
              <ToolbarControlGroup
                label="View Controls"
                buttonAppearance="push"
              >
                <ToolbarButton
                  ariaLabel="Toggle Inspector"
                  pressed
                  icon={
                    <LucideIcon
                      icon={SlidersHorizontal}
                      name="sliders-horizontal"
                    />
                  }
                />
                <ToolbarButton
                  ariaLabel="Settings"
                  icon={<LucideIcon icon={Settings} name="settings" />}
                />
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
                <ToolbarButton action="log-add">Add</ToolbarButton>
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
              <ToolbarButton
                ariaLabel="Refresh Ticket"
                icon={<LucideIcon icon={RefreshCw} name="refresh-cw" />}
              />
              <ToolbarButton
                ariaLabel="Ticket Settings"
                icon={<LucideIcon icon={Settings} name="settings" />}
              />
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
              <ToolbarButton
                ariaLabel="Filters"
                icon={<LucideIcon icon={Funnel} name="funnel" />}
              />
            </ToolbarControlGroup>
          }
          trailing={
            <ToolbarControlGroup appearance="borderless" single>
              <ToolbarButton
                ariaLabel="Refresh"
                icon={<LucideIcon icon={RefreshCw} name="refresh-cw" />}
              />
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
                <ToolbarButton
                  ariaLabel="Bold"
                  pressed={false}
                  icon={<LucideIcon icon={Bold} name="bold" />}
                />
                <ToolbarButton
                  ariaLabel="Italic"
                  pressed={false}
                  icon={<LucideIcon icon={Italic} name="italic" />}
                />
                <ToolbarButton
                  ariaLabel="Underline"
                  pressed={false}
                  icon={<LucideIcon icon={Underline} name="underline" />}
                />
              </ToolbarControlGroup>
              <ToolbarControlGroup
                label="Draft Actions"
                buttonAppearance="push"
              >
                <ToolbarButton
                  ariaLabel="Filter Drafts"
                  icon={<LucideIcon icon={Funnel} name="funnel" />}
                />
                <ToolbarButton
                  ariaLabel="Refresh Drafts"
                  icon={<LucideIcon icon={RefreshCw} name="refresh-cw" />}
                />
              </ToolbarControlGroup>
              <ToolbarControlGroup label="More Draft Actions" single>
                <ToolbarButton
                  ariaLabel="More Draft Actions"
                  icon={<LucideIcon icon={Ellipsis} name="ellipsis" />}
                />
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
              <ToolbarButton action="log-add">Publish</ToolbarButton>
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
                <SearchField
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
                <ToolbarButton
                  ariaLabel="List View"
                  icon={<LucideIcon icon={FileText} name="file-text" />}
                />
              </ToolbarControlGroup>
              <ToolbarControlGroup
                label="Actions"
                single
                visibility="yield-to-expanded-sibling"
              >
                <ToolbarButton
                  ariaLabel="More Actions"
                  icon={<LucideIcon icon={Ellipsis} name="ellipsis" />}
                />
              </ToolbarControlGroup>
            </>
          }
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
