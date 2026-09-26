import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { SegmentedControl } from '@kerfjs/ui/segmented-control';
import { Select } from '@kerfjs/ui/select';
import { TokenSearchField } from '@kerfjs/ui/token-search-field';
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
  Star,
} from 'lucide';

import {
  toolbarAvatarChoice,
  toolbarChoice,
  toolbarGroupSearchOpen,
  toolbarGroupShape,
  toolbarSort,
} from './state.js';

const profileImageUrl = new URL(
  '../../../assets/logo.svg?no-inline',
  import.meta.url,
).href;

const sortChoices = [
  { value: 'recent', label: 'Recently updated', icon: CalendarClock },
  { value: 'priority', label: 'Priority', icon: Flag },
  { value: 'title', label: 'Title', icon: ArrowDownAZ },
];

export function ToolbarControlGroupDemo() {
  const shape = toolbarGroupShape.value;
  return (
    <CatalogExampleStack
      label="ToolbarControlGroup demo"
      rootAttributes={{ 'data-demo': 'toolbar-control-group' }}
    >
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
            label="Group shape"
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
      <CatalogExample label="Segmented choices" align="inline-control">
        <ToolbarControlGroup shape={shape}>
          <SegmentedControl
            id="toolbar-view"
            label="View mode"
            value={toolbarChoice.value}
            action="select-segment-demo"
            appearance="toolbar"
            shape="pill"
            size="small"
            choices={[
              {
                value: 'list',
                label: 'List view',
                content: <LucideIcon icon={List} name="list" />,
              },
              {
                value: 'columns',
                label: 'Columns view',
                content: <LucideIcon icon={Columns3} name="columns-3" />,
              },
              {
                value: 'settings',
                label: 'Settings view',
                content: <LucideIcon icon={Settings} name="settings" />,
              },
            ]}
          />
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample label="Popup menu" align="inline-control">
        <ToolbarControlGroup
          single
          shape={shape}
          nestedDropdown
          menuInset="compact"
        >
          <wa-dropdown placement="bottom-start" data-morph-skip-children>
            <wa-button
              slot="trigger"
              appearance="plain"
              with-caret
              aria-label="Sort tickets"
            >
              <LucideIcon icon={ArrowDownAZ} name="arrow-down-a-z" />
            </wa-button>
            <wa-dropdown-item data-action="sort-recent">
              Recently updated
            </wa-dropdown-item>
            <wa-dropdown-item data-action="sort-priority">
              Priority
            </wa-dropdown-item>
          </wa-dropdown>
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample label="Action link" align="inline-control">
        <ToolbarControlGroup content="mixed" shape={shape} single>
          <ToolbarActionLink
            href="https://github.com/brianwestphal/kerf"
            label="Repository"
            external
            icon={<LucideIcon icon={ExternalLink} name="external-link" />}
          />
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample label="Button group" align="inline-control">
        <ToolbarControlGroup label="View actions" shape={shape}>
          <wa-button
            appearance="plain"
            aria-label="Favorite view"
            data-action="log-favorite"
          >
            <LucideIcon icon={Star} name="star" />
          </wa-button>
          <wa-button
            appearance="plain"
            aria-label="More actions"
            data-action="log-more"
          >
            <LucideIcon icon={MoreHorizontal} name="ellipsis" />
          </wa-button>
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample
        label="Select beside actions"
        note="An icon-only Select shares the group's inset, hover, and per-control focus ring with its sibling buttons."
        align="inline-control"
      >
        <ToolbarControlGroup label="Ticket view" shape={shape}>
          <button
            type="button"
            aria-label="Pin view"
            aria-pressed="true"
            data-action="log-pin"
          >
            <LucideIcon icon={Pin} name="pin" />
          </button>
          <Select<string>
            name="toolbar-group-sort"
            value={toolbarSort.value}
            ariaLabel="Sort tickets"
            presentation="toolbar-borderless"
            selectedPresentation="icon-only"
            choices={sortChoices}
          />
          <wa-dropdown placement="bottom-start" data-morph-skip-children>
            <wa-button
              slot="trigger"
              appearance="plain"
              with-caret
              aria-label="More actions"
            >
              <LucideIcon icon={MoreHorizontal} name="ellipsis" />
            </wa-button>
            <wa-dropdown-item data-action="log-more">Archive</wa-dropdown-item>
          </wa-dropdown>
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample label="Single button" align="inline-control">
        <ToolbarControlGroup single shape={shape}>
          <wa-button
            appearance="plain"
            aria-label="Pin view"
            data-action="log-pin"
          >
            <LucideIcon icon={Pin} name="pin" />
          </wa-button>
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample label="Borderless group" align="inline-control">
        <ToolbarControlGroup appearance="borderless" single shape={shape}>
          <button
            type="button"
            aria-label="Show sidebar"
            data-action="log-sidebar"
          >
            <LucideIcon icon={PanelLeftOpen} name="panel-left-open" />
          </button>
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample label="Push button, resting" align="inline-control">
        <ToolbarControlGroup buttonAppearance="push" single shape={shape}>
          <button
            type="button"
            aria-label="Resting comparison"
            aria-pressed="false"
            data-action="log-resting"
          >
            <LucideIcon icon={GitCompare} name="git-compare" />
          </button>
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample label="Push button, pressed" align="inline-control">
        <ToolbarControlGroup buttonAppearance="push" single shape={shape}>
          <button
            type="button"
            aria-label="Pressed comparison"
            aria-pressed="true"
            data-action="log-pressed"
          >
            <LucideIcon icon={GitCompare} name="git-compare" />
          </button>
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample label="Pop selected tone" align="inline-control">
        <ToolbarControlGroup
          label="Featured action"
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
      <CatalogExample label="Dark group" align="inline-control">
        <ToolbarControlGroup label="Dark navigation" tone="dark" shape={shape}>
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
      <CatalogExample label="Compact mixed controls" align="inline-control">
        <ToolbarControlGroup
          label="Compact formatting"
          size="compact"
          content="mixed"
          nestedDropdown
          shape={shape}
        >
          <button type="button" aria-pressed="true">
            <LucideIcon icon={Star} name="star" /> Favorite
          </button>
          <wa-dropdown placement="bottom-start" data-morph-skip-children>
            <wa-button slot="trigger" appearance="plain" with-caret>
              More
            </wa-button>
            <wa-dropdown-item>Archive</wa-dropdown-item>
          </wa-dropdown>
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample label="Avatar profile" align="inline-control">
        <ToolbarControlGroup
          label="Profile"
          content="avatar"
          selectedTone="neutral"
          scrim
          single
          shape={shape}
          avatarImage={profileImageUrl}
        >
          <button type="button" aria-label="Open Brian profile" />
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample label="Avatar selection" align="inline-control">
        <ToolbarControlGroup
          label="Profile view"
          content="avatar"
          selectedTone="neutral"
          avatarImage={profileImageUrl}
          shape={shape}
        >
          <button
            type="button"
            aria-label="Primary profile"
            aria-pressed={String(toolbarAvatarChoice.value === 'primary')}
            data-action="select-avatar-demo"
            data-avatar-value="primary"
          />
          <button
            type="button"
            aria-label="Secondary profile"
            aria-pressed={String(toolbarAvatarChoice.value === 'secondary')}
            data-action="select-avatar-demo"
            data-avatar-value="secondary"
          />
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample
        label="Collapsible search"
        note={
          <>
            An empty, unfocused search collapses to one iconic control in the
            group; activating it expands the group to reveal the editor, and it
            re-collapses when focus leaves while empty.{' '}
            <code>wireTokenSearchFields</code> manages the
            expand/collapse/focus.
          </>
        }
        align="inline-control"
      >
        <div data-demo-section="toolbar-group-search">
          <ToolbarControlGroup
            shape={shape}
            content="search"
            focusRing="halo"
            expanded={toolbarGroupSearchOpen.value}
            single={!toolbarGroupSearchOpen.value}
          >
            <TokenSearchField
              id="toolbar-group-search"
              label="Search views"
              collapsible
              expanded={toolbarGroupSearchOpen.value}
              presentation="toolbar-group"
              placeholder="Search views"
              expandLabel="Open search"
            />
          </ToolbarControlGroup>
        </div>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
