import { BackdropImage } from '@kerfjs/ui/backdrop-image';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ContentItem } from '@kerfjs/ui/content-item';
import { remify, uiColor } from '@kerfjs/ui/css-values';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Pane } from '@kerfjs/ui/pane';
import { PopupMenu } from '@kerfjs/ui/popup-menu';
import { Row } from '@kerfjs/ui/row';
import { SegmentedControl } from '@kerfjs/ui/segmented-control';
import { Select } from '@kerfjs/ui/select';
import { Text } from '@kerfjs/ui/text';
import { TokenSearchField } from '@kerfjs/ui/token-search-field';
import { Toolbar } from '@kerfjs/ui/toolbar';
import {
  ToolbarActionLink,
  ToolbarControlGroup,
} from '@kerfjs/ui/toolbar-control-group';
import {
  ArrowDownAZ,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Columns3,
  ExternalLink,
  Flag,
  GitCompare,
  List,
  MoreHorizontal,
  PanelLeftOpen,
  Pin,
  Settings,
  Share2,
  Star,
} from 'lucide';

import { SKYLINE, svgUrl } from '../components/sample-artwork.js';
import {
  toolbarAvatarChoice,
  toolbarChoice,
  toolbarGroupBusy,
  toolbarGroupSearchOpen,
  toolbarGroupShape,
  toolbarSort,
  toolbarStackSearchOpen,
} from './state.js';

const profileImageUrl = new URL(
  '../../../assets/logo.svg?no-inline',
  import.meta.url,
).href;

const sortChoices = [
  { value: 'recent', label: 'Recently Updated', icon: CalendarClock },
  { value: 'priority', label: 'Priority', icon: Flag },
  { value: 'title', label: 'Title', icon: ArrowDownAZ },
];

export function ToolbarControlGroupDemo() {
  const shape = toolbarGroupShape.value;
  return (
    <CatalogExampleStack
      label="ToolbarControlGroup Demo"
      rootAttributes={{ 'data-demo': 'toolbar-control-group' }}
    >
      <CatalogExample
        label="Icon Tile Tones"
        note="A contained single group with a direct decorative icon can use a quiet semantic tileTone. Interactive groups retain their control chrome."
        align="inline-control"
        rootAttributes={{ 'data-demo-section': 'icon-tile-tones' }}
      >
        {(['neutral', 'brand', 'success', 'warning', 'danger'] as const).map(
          (tileTone) => (
            <Row vAlign="middle">
              <ToolbarControlGroup
                single
                tileTone={tileTone}
                shape={shape}
                label={`${tileTone.charAt(0).toUpperCase() + tileTone.slice(1)} Icon Tile`}
              >
                <LucideIcon icon={Settings} name="settings" />
              </ToolbarControlGroup>
              <Text flush>
                {tileTone.charAt(0).toUpperCase() + tileTone.slice(1)} Heading
                Identity
              </Text>
            </Row>
          ),
        )}
      </CatalogExample>
      <CatalogExample
        label="Shape"
        note={
          <>
            Groups are <code>pill</code>-shaped by default; switch every example
            below to the softer <code>rounded</code> rectangle.
          </>
        }
        align="inline-control"
      >
        <ToolbarControlGroup>
          <SegmentedControl
            id="toolbar-group-shape"
            label="Group Shape"
            value={shape}
            action="select-segment-demo"
            appearance="toolbar"
            shape="pill"
            size="small"
            choices={[
              { value: 'pill', label: 'Pill' },
              { value: 'rounded', label: 'Rounded' },
            ]}
          />
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample label="Segmented Choices" align="inline-control">
        <ToolbarControlGroup shape={shape}>
          <SegmentedControl
            id="toolbar-view"
            label="View Mode"
            value={toolbarChoice.value}
            action="select-segment-demo"
            appearance="toolbar"
            shape="pill"
            size="small"
            choices={[
              {
                value: 'list',
                label: 'List View',
                content: <LucideIcon icon={List} name="list" />,
              },
              {
                value: 'columns',
                label: 'Columns View',
                content: <LucideIcon icon={Columns3} name="columns-3" />,
              },
              {
                value: 'settings',
                label: 'Settings View',
                content: <LucideIcon icon={Settings} name="settings" />,
              },
            ]}
          />
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample label="Popup Menu" align="inline-control">
        <ToolbarControlGroup
          single
          shape={shape}
          nestedDropdown
          menuInset="compact"
        >
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
      <CatalogExample label="Action Link" align="inline-control">
        <ToolbarControlGroup content="mixed" shape={shape} single>
          <ToolbarActionLink
            href="https://github.com/brianwestphal/kerf"
            label="Repository"
            external
            icon={<LucideIcon icon={ExternalLink} name="external-link" />}
          />
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample
        label="Button Group"
        note="Name an icon-only button with aria-label; hover or keyboard focus shows that name as a help tag."
        align="inline-control"
      >
        <ToolbarControlGroup label="View Actions" shape={shape}>
          <button
            type="button"
            aria-label="Favorite View"
            data-action="log-favorite"
          >
            <LucideIcon icon={Star} name="star" />
          </button>
          <button
            type="button"
            aria-label="More Actions"
            data-action="log-more"
          >
            <LucideIcon icon={MoreHorizontal} name="ellipsis" />
          </button>
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample
        label="Select Beside Actions"
        note="An icon-only Select shares the group's inset, hover, and per-control focus ring with its sibling buttons."
        align="inline-control"
      >
        <ToolbarControlGroup label="Ticket View" shape={shape}>
          <button
            type="button"
            aria-label="Pin View"
            aria-pressed="true"
            data-action="log-pin"
          >
            <LucideIcon icon={Pin} name="pin" />
          </button>
          <Select<string>
            name="toolbar-group-sort"
            value={toolbarSort.value}
            ariaLabel="Sort Tickets"
            presentation="toolbar-borderless"
            selectedPresentation="icon-only"
            choices={sortChoices}
          />
          <PopupMenu
            label="More Actions"
            icon={<LucideIcon icon={MoreHorizontal} name="ellipsis" />}
            items={[{ label: 'Archive', action: 'log-more' }]}
          />
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample label="Single Button" align="inline-control">
        <ToolbarControlGroup single shape={shape}>
          <button type="button" aria-label="Pin View" data-action="log-pin">
            <LucideIcon icon={Pin} name="pin" />
          </button>
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample
        label="Busy Action"
        note="The original action keeps its size while inert; a status announces the work."
        align="inline-control"
      >
        <ToolbarControlGroup
          single
          shape={shape}
          busy={toolbarGroupBusy.value}
          busyLabel="Running pricing check"
        >
          <button
            type="button"
            aria-label="Run Pricing Check"
            data-action="log-pricing-check"
          >
            <LucideIcon icon={GitCompare} name="git-compare" />
          </button>
        </ToolbarControlGroup>
        <button type="button" data-action="toggle-toolbar-group-busy">
          {toolbarGroupBusy.value ? 'Finish' : 'Start'} pricing check
        </button>
      </CatalogExample>
      <CatalogExample label="Borderless Group" align="inline-control">
        <ToolbarControlGroup appearance="borderless" single shape={shape}>
          <button
            type="button"
            aria-label="Show Sidebar"
            data-action="log-sidebar"
          >
            <LucideIcon icon={PanelLeftOpen} name="panel-left-open" />
          </button>
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample label="Push Button, Resting" align="inline-control">
        <ToolbarControlGroup buttonAppearance="push" single shape={shape}>
          <button
            type="button"
            aria-label="Resting Comparison"
            aria-pressed="false"
            data-action="log-resting"
          >
            <LucideIcon icon={GitCompare} name="git-compare" />
          </button>
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample label="Push Button, Pressed" align="inline-control">
        <ToolbarControlGroup buttonAppearance="push" single shape={shape}>
          <button
            type="button"
            aria-label="Pressed Comparison"
            aria-pressed="true"
            data-action="log-pressed"
          >
            <LucideIcon icon={GitCompare} name="git-compare" />
          </button>
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample label="Pop Selected Tone" align="inline-control">
        <ToolbarControlGroup
          label="Featured Action"
          selectedChrome="filled"
          selectedTone="pop"
          shape={shape}
        >
          <button
            type="button"
            aria-label="Featured"
            aria-pressed="true"
            data-action="log-featured"
          >
            <LucideIcon icon={Star} name="star" />
          </button>
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample
        label="Icon-State Toggle"
        note='The filled star already shows the pressed state, so data-selected-chrome="none" keeps that one button from painting selected chrome; selectedChrome="none" does the same for a whole group.'
        align="inline-control"
      >
        <ToolbarControlGroup label="Ticket Actions" shape={shape}>
          <button
            type="button"
            aria-label="Up Next"
            aria-pressed="true"
            data-selected-chrome="none"
            data-action="log-up-next"
          >
            <LucideIcon icon={Star} name="star" appearance="solid" />
          </button>
          <button type="button" aria-label="Share" data-action="log-share">
            <LucideIcon icon={Share2} name="share-2" />
          </button>
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample label="Dark Group" align="inline-control">
        <ToolbarControlGroup label="Dark Navigation" tone="dark" shape={shape}>
          <button
            type="button"
            aria-label="Previous"
            data-action="log-previous"
          >
            <LucideIcon icon={ChevronLeft} name="chevron-left" />
          </button>
          <button type="button" aria-label="Next" data-action="log-next">
            <LucideIcon icon={ChevronRight} name="chevron-right" />
          </button>
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample
        label="Glass Material"
        note={
          <>
            <code>material="glass"</code> paints a group on the translucent,
            blurred chrome material with a specular edge, for controls floating
            over imagery or a clear toolbar. Controls keep the normal text color
            so they stay legible over any content, in both color schemes; the
            fill turns opaque under reduced transparency or increased contrast.
            Here the groups sit in a clear Pane header over artwork; scroll to
            pass content beneath them.
          </>
        }
        align="none"
        rootAttributes={{ 'data-demo-section': 'glass-material' }}
        viewport={{
          layout: 'grid',
          width: 'medium',
          height: 'medium',
          frame: 'solid',
          overflow: 'hidden',
        }}
      >
        <Pane
          label="Glass Over Artwork"
          headerPresentation="clear"
          scrollEdge="material"
          header={
            <Toolbar
              label="Glass Controls"
              leading={
                <ToolbarControlGroup
                  label="Glass Navigation"
                  material="glass"
                  shape={shape}
                >
                  <button
                    type="button"
                    aria-label="Earlier Photo"
                    data-action="log-previous"
                  >
                    <LucideIcon icon={ChevronLeft} name="chevron-left" />
                  </button>
                  <button
                    type="button"
                    aria-label="Later Photo"
                    data-action="log-next"
                  >
                    <LucideIcon icon={ChevronRight} name="chevron-right" />
                  </button>
                </ToolbarControlGroup>
              }
              trailing={
                <ToolbarControlGroup
                  label="Glass Share"
                  material="glass"
                  single
                  shape={shape}
                >
                  <button
                    type="button"
                    aria-label="Share Photo"
                    data-action="log-share"
                  >
                    <LucideIcon icon={Share2} name="share-2" />
                  </button>
                </ToolbarControlGroup>
              }
            />
          }
        >
          <BackdropImage
            src={svgUrl(SKYLINE)}
            alt=""
            height={remify(200)}
            fadeTo={uiColor('surface')}
            underChrome
          >
            {[
              'Coastal Ridge',
              'Harbor Lights',
              'Northbound',
              'Glass Coast',
            ].map((title) => (
              <ContentItem>{title}</ContentItem>
            ))}
          </BackdropImage>
        </Pane>
      </CatalogExample>
      <CatalogExample label="Compact Mixed Controls" align="inline-control">
        <ToolbarControlGroup
          label="Compact Formatting"
          size="compact"
          content="mixed"
          nestedDropdown
          shape={shape}
        >
          <button type="button" aria-pressed="true">
            <LucideIcon icon={Star} name="star" /> Favorite
          </button>
          <PopupMenu text="More" items={[{ label: 'Archive' }]} />
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample label="Avatar Profile" align="inline-control">
        <ToolbarControlGroup
          label="Profile"
          content="avatar"
          selectedTone="neutral"
          scrim
          single
          shape={shape}
          avatarImage={profileImageUrl}
        >
          <button type="button" aria-label="Open Brian Profile" />
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample label="Avatar Selection" align="inline-control">
        <ToolbarControlGroup
          label="Profile View"
          content="avatar"
          selectedTone="neutral"
          avatarImage={profileImageUrl}
          shape={shape}
        >
          <button
            type="button"
            aria-label="Primary Profile"
            aria-pressed={String(toolbarAvatarChoice.value === 'primary')}
            data-action="select-avatar-demo"
            data-avatar-value="primary"
          />
          <button
            type="button"
            aria-label="Secondary Profile"
            aria-pressed={String(toolbarAvatarChoice.value === 'secondary')}
            data-action="select-avatar-demo"
            data-avatar-value="secondary"
          />
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample
        label="Collapsible Search"
        note={
          <>
            An empty, unfocused search collapses to one iconic control in the
            group; activating it expands the group to reveal the editor, and it
            re-collapses when focus leaves while empty.{' '}
            <code>wireTokenSearchFields</code> manages the
            expand/collapse/focus. Set <code>expandedOverflow="visible"</code>
            when app-owned suggestions, date pickers, or help surfaces must
            extend below the group; the group remains their positioning anchor.
          </>
        }
        align="inline-control"
        viewport={{ width: 'compact' }}
      >
        <div data-demo-section="toolbar-group-search">
          <ToolbarControlGroup
            shape={shape}
            content="search"
            focusRing="halo"
            expandedOverflow="visible"
            expanded={toolbarGroupSearchOpen.value}
            single={!toolbarGroupSearchOpen.value}
          >
            <TokenSearchField
              id="toolbar-group-search"
              label="Search Views"
              collapsible
              expanded={toolbarGroupSearchOpen.value}
              presentation="toolbar-group"
              placeholder="Search views"
              expandLabel="Open search"
            />
          </ToolbarControlGroup>
        </div>
      </CatalogExample>
      <CatalogExample
        label="Wrapping Zone Sizing"
        note="The first search grows from a 19rem basis. In the rail example, the collapsed search sits after Sort at the row's end, then expands onto a full row with a downward entrance."
        align="none"
        viewport={{ width: 'full' }}
      >
        <div data-demo-section="toolbar-group-sizing">
          <Toolbar
            responsive="stack"
            trailing={
              <>
                <ToolbarControlGroup
                  content="search"
                  sizing="grow"
                  growBasis="19rem"
                  expanded
                  single
                  label="Search"
                >
                  <TokenSearchField
                    id="toolbar-group-grow-search"
                    label="Search Tickets"
                    collapsible
                    expanded
                    presentation="toolbar-group"
                    placeholder="Search tickets"
                  />
                </ToolbarControlGroup>
                <ToolbarControlGroup label="View" single>
                  <button type="button" aria-label="List View">
                    <LucideIcon icon={List} name="list" />
                  </button>
                </ToolbarControlGroup>
                <ToolbarControlGroup label="Sort" single>
                  <button type="button" aria-label="Sort Tickets">
                    <LucideIcon icon={ArrowDownAZ} name="arrow-down-a-z" />
                  </button>
                </ToolbarControlGroup>
              </>
            }
          />
          <Toolbar
            responsive="stack"
            trailing={
              <>
                <ToolbarControlGroup sizing="fill" label="Rail View">
                  <SegmentedControl
                    id="toolbar-group-fill-view"
                    label="Rail View"
                    value="list"
                    action="select-segment-demo"
                    appearance="toolbar"
                    choices={[
                      { value: 'list', label: 'List' },
                      { value: 'board', label: 'Board' },
                    ]}
                  />
                </ToolbarControlGroup>
                <ToolbarControlGroup label="Sort" single>
                  <button type="button" aria-label="Sort Tickets">
                    <LucideIcon icon={ArrowDownAZ} name="arrow-down-a-z" />
                  </button>
                </ToolbarControlGroup>
                <ToolbarControlGroup
                  content="search"
                  visibility="hide-collapsed-tiny"
                  sizing={toolbarStackSearchOpen.value ? 'fill' : 'content'}
                  placement="end"
                  expanded={toolbarStackSearchOpen.value}
                  single={!toolbarStackSearchOpen.value}
                  label="Search"
                >
                  <TokenSearchField
                    id="toolbar-stack-search"
                    label="Search Tickets"
                    collapsible
                    expanded={toolbarStackSearchOpen.value}
                    fill={toolbarStackSearchOpen.value}
                    presentation="toolbar-group"
                    expandLabel="Open search"
                    placeholder="Search tickets"
                  />
                </ToolbarControlGroup>
              </>
            }
          />
        </div>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
