import { Badge } from '@kerfjs/ui/badge';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { remify, uiColor } from '@kerfjs/ui/css-values';
import { List } from '@kerfjs/ui/list';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { PopupMenu } from '@kerfjs/ui/popup-menu';
import { Row } from '@kerfjs/ui/row';
import { Select } from '@kerfjs/ui/select';
import { Text } from '@kerfjs/ui/text';
import { Toolbar } from '@kerfjs/ui/toolbar';
import {
  ToolbarButton,
  ToolbarControlGroup,
} from '@kerfjs/ui/toolbar-control-group';
import { Bell, Ellipsis, Funnel, Pin, SlidersHorizontal, Wrench } from 'lucide';

import {
  itemTypes,
  selectedChoice,
  selectViewTitle,
  ticketLabelFilter,
  ticketLabels,
} from './state.js';

const toolbarChoices = [
  { value: 'quiet', label: 'Quiet', icon: Bell },
  { value: 'balanced', label: 'Balanced', icon: SlidersHorizontal },
  { value: 'explicit', label: 'Explicit', icon: Wrench },
];

const labelChoices = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'docs', label: 'Docs' },
  { value: 'design', label: 'Design' },
  { value: 'performance', label: 'Performance' },
];

export function SelectDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'select' }}>
      <CatalogExample label="Rendering Balance" align="inline-control">
        <List gap="xs">
          <Select<string>
            name="rendering-balance"
            value={selectedChoice.value}
            ariaLabel="Rendering Balance"
            choices={[
              {
                value: 'quiet',
                label: 'Quiet',
                icon: Bell,
                iconName: 'bell',
                color: uiColor('success-on-quiet'),
                group: 'Attention',
              },
              {
                value: 'balanced',
                label: 'Balanced',
                icon: SlidersHorizontal,
                iconName: 'sliders-horizontal',
                group: 'Attention',
              },
              {
                value: 'explicit',
                label: 'Explicit',
                icon: Wrench,
                iconName: 'wrench',
                group: 'Control',
                separatorBefore: true,
              },
            ]}
            renderSelected={(choice) => (
              <Row vAlign="middle">
                {choice.icon ? (
                  <LucideIcon
                    icon={choice.icon}
                    name={
                      choice.iconName ??
                      choice.label.toLowerCase().replaceAll(' ', '-')
                    }
                  />
                ) : null}
                <Text variant="span" wrap="nowrap">
                  {choice.label}
                </Text>
              </Row>
            )}
          />
          <Text tone="quiet" size="compact">
            Live value:{' '}
            <strong data-select-value>{selectedChoice.value}</strong>
          </Text>
        </List>
      </CatalogExample>
      <CatalogExample
        label="Multiple Selection"
        note="Choosing toggles a check and keeps the popup open; click away or press Escape to close."
        align="inline-control"
      >
        <Select<string>
          name="ticket-labels"
          multiple
          value={ticketLabels.value}
          label="Labels"
          placeholderText="No labels"
          choices={labelChoices}
        />
      </CatalogExample>
      <CatalogExample
        label="Multiple Selection Actions"
        note="Select all includes enabled choices only; Clear reports an ordinary change. Unavailable choices remain visible with a reason."
        align="inline-control"
      >
        <Select<string>
          name="item-types"
          multiple
          value={itemTypes.value}
          label="Item Types"
          placeholderText="No types"
          selectAllLabel="Select all"
          clearLabel="Clear"
          choices={[
            { value: 'files', label: 'Files' },
            { value: 'windows', label: 'Windows' },
            {
              value: 'browsers',
              label: 'Web Browsers',
              disabled: true,
              disabledReason: 'Not yet supported',
            },
            { value: 'tabs', label: 'Tabs' },
          ]}
        />
      </CatalogExample>
      <CatalogExample
        label="Toolbar Filter"
        note="A multiple icon-only trigger keeps a fixed icon and counts the chosen filters; hover or keyboard focus shows a help tag with its name and chosen labels."
        align="inline-control"
      >
        <Toolbar
          label="Toolbar Filter"
          leading={
            <ToolbarControlGroup
              label="Label Filter"
              content="icon"
              focusRing="outline"
              single
            >
              <Select<string>
                name="ticket-label-filter"
                multiple
                value={ticketLabelFilter.value}
                ariaLabel="Filter by Label"
                presentation="toolbar-borderless"
                selectedPresentation="icon-only"
                triggerIcon={<LucideIcon icon={Funnel} name="funnel" />}
                focusRingOwner="group"
                choices={labelChoices}
              />
            </ToolbarControlGroup>
          }
        />
      </CatalogExample>
      <CatalogExample
        label="Toolbar Filter Beside Actions"
        note="The pin button, filter, and menu each show their name as a help tag on hover or keyboard focus."
        align="inline-control"
      >
        <Toolbar
          label="Toolbar Filter Beside Actions"
          leading={
            <ToolbarControlGroup label="Ticket View">
              <ToolbarButton
                ariaLabel="Pin View"
                action="log-pin"
                icon={<LucideIcon icon={Pin} name="pin" />}
              />
              <Select<string>
                name="toolbar-ticket-label-filter"
                multiple
                value={ticketLabelFilter.value}
                ariaLabel="Filter by Label"
                presentation="toolbar-borderless"
                selectedPresentation="icon-only"
                triggerIcon={<LucideIcon icon={Funnel} name="funnel" />}
                choices={labelChoices}
              />
              <PopupMenu
                label="More Actions"
                icon={<LucideIcon icon={Ellipsis} name="ellipsis" />}
                items={[{ label: 'Archive', action: 'log-more' }]}
              />
            </ToolbarControlGroup>
          }
        />
      </CatalogExample>
      <CatalogExample
        label="Accessible Name Without a Visible Label"
        align="inline-control"
      >
        <Select<string>
          name="plain-rendering-balance"
          value={selectedChoice.value}
          ariaLabel="Plain Rendering Balance"
          choices={[
            { value: 'quiet', label: 'Quiet' },
            { value: 'balanced', label: 'Balanced' },
            { value: 'explicit', label: 'Explicit' },
          ]}
        />
      </CatalogExample>
      <CatalogExample label="Visible Label" align="inline-control">
        <Select<string>
          name="labeled-rendering-balance"
          value={selectedChoice.value}
          label="Rendering Preference"
          triggerWidth="fill"
          hint="Controls how much rendering detail is shown."
          choices={[
            { value: 'quiet', label: 'Quiet' },
            { value: 'balanced', label: 'Balanced' },
            { value: 'explicit', label: 'Explicit' },
          ]}
        />
      </CatalogExample>
      <CatalogExample
        label="Compact Selected Text"
        align="inline-control"
        viewport={{
          tokens: {
            '--kui-select-selected-color': 'var(--kui-color-text-quiet)',
            '--kui-select-selected-font-size': 'var(--kui-font-2xs)',
            '--kui-select-selected-font-weight': '650',
          },
        }}
      >
        <Select<string>
          name="compact-workspace"
          value="long"
          ariaLabel="Workspace"
          presentation="toolbar-borderless"
          size="compact"
          triggerWidth="fit-content"
          maxTriggerWidth={remify(160)}
          choices={[{ value: 'long', label: 'A Very Long Workspace Name' }]}
          renderSelected={(choice) => (
            <Text variant="span" wrap="nowrap">
              {choice.label}
            </Text>
          )}
        />
      </CatalogExample>
      <CatalogExample
        label="Toolbar Icon"
        note="An icon-only trigger keeps its caret; a single group grows to fit both. Hover or keyboard focus shows a help tag with its name and current choice."
        align="inline-control"
      >
        <Toolbar
          label="Toolbar Icon"
          leading={
            <ToolbarControlGroup
              label="Rendering Mode"
              content="icon"
              focusRing="outline"
              single
            >
              <Select<string>
                name="toolbar-default-rendering-balance"
                value={selectedChoice.value}
                ariaLabel="Default Toolbar Rendering Balance"
                presentation="toolbar-borderless"
                selectedPresentation="icon-only"
                focusRingOwner="group"
                choices={toolbarChoices}
              />
            </ToolbarControlGroup>
          }
        />
      </CatalogExample>
      <CatalogExample
        label="Round Toolbar Icon"
        note="An icon-only Select can omit its caret to match a round action trigger. The accessible name and current choice remain available on hover and focus."
        align="inline-control"
      >
        <Toolbar
          label="Round Toolbar Icon"
          leading={
            <ToolbarControlGroup
              label="Workspace Sort"
              content="icon"
              focusRing="outline"
              shape="pill"
              single
            >
              <Select<string>
                name="toolbar-round-rendering-balance"
                value={selectedChoice.value}
                ariaLabel="Workspace Sort"
                presentation="toolbar-borderless"
                selectedPresentation="icon-only"
                caret={false}
                focusRingOwner="group"
                choices={toolbarChoices}
              />
            </ToolbarControlGroup>
          }
        />
      </CatalogExample>
      <CatalogExample
        label="Round Toolbar Custom Icon"
        note="A custom selected icon stays centered in the same caret-free round trigger."
        align="inline-control"
      >
        <Toolbar
          label="Round Toolbar Custom Icon"
          leading={
            <ToolbarControlGroup
              label="Custom Workspace Sort"
              content="icon"
              focusRing="outline"
              shape="pill"
              single
            >
              <Select<string>
                name="toolbar-round-custom-rendering-balance"
                value={selectedChoice.value}
                ariaLabel="Custom Workspace Sort"
                presentation="toolbar-borderless"
                selectedPresentation="icon-only"
                caret={false}
                focusRingOwner="group"
                renderSelected={(choice) => (
                  <LucideIcon
                    icon={choice.icon!}
                    name={choice.label.toLowerCase()}
                  />
                )}
                choices={toolbarChoices}
              />
            </ToolbarControlGroup>
          }
        />
      </CatalogExample>
      <CatalogExample label="Compact Toolbar Icon" align="inline-control">
        <Toolbar
          label="Compact Toolbar Icon"
          leading={
            <ToolbarControlGroup
              label="Rendering Mode"
              size="compact"
              content="icon"
              focusRing="outline"
              single
            >
              <Select<string>
                name="toolbar-rendering-balance"
                value={selectedChoice.value}
                ariaLabel="Toolbar Rendering Balance"
                presentation="toolbar-borderless"
                size="compact"
                selectedPresentation="icon-only"
                focusRingOwner="group"
                choices={toolbarChoices}
              />
            </ToolbarControlGroup>
          }
        />
      </CatalogExample>
      <CatalogExample
        label="Long Options Within Viewport"
        align="inline-control"
      >
        <Row hAlign="right">
          <ToolbarControlGroup
            label="Project Attention"
            size="compact"
            content="icon"
            single
          >
            <Select<string>
              name="viewport-attention"
              value={selectedChoice.value}
              ariaLabel="Project Attention"
              presentation="toolbar-borderless"
              size="compact"
              selectedPresentation="icon-only"
              focusRingOwner="group"
              choices={[
                { value: 'quiet', label: 'Quiet', icon: Bell },
                {
                  value: 'balanced',
                  label:
                    'Attention Needed for Project Configuration and Deployment Settings',
                  icon: SlidersHorizontal,
                },
                { value: 'explicit', label: 'Explicit', icon: Wrench },
              ]}
            />
          </ToolbarControlGroup>
        </Row>
      </CatalogExample>
      <CatalogExample label="Navigation Label" align="inline-control">
        <Select<string>
          name="navigation-rendering-balance"
          value={selectedChoice.value}
          ariaLabel="Navigation Rendering Balance"
          presentation="navigation"
          triggerWidth="max-content"
          size="compact"
          labelMaxWidth={120}
          choices={[
            { value: 'quiet', label: 'Quiet Navigation Workspace' },
            {
              value: 'balanced',
              label: 'Balanced Navigation Workspace',
            },
            { value: 'explicit', label: 'Explicit Navigation Workspace' },
          ]}
        />
      </CatalogExample>
      <CatalogExample
        label="View Title"
        note="The 36px title trigger starts flush, keeps its caret beside the name, and draws focus inside clipped panels."
        viewport={{ width: 'compact' }}
      >
        <div data-demo-section="select-view-title">
          <Toolbar
            leading={
              <ToolbarControlGroup appearance="borderless" single>
                <Select<string>
                  name="view-title-demo"
                  value={selectViewTitle.value}
                  ariaLabel="Ticket View"
                  presentation="title"
                  focusRingInset
                  choices={[
                    { value: 'queue', label: 'Queue' },
                    { value: 'active', label: 'Active' },
                    { value: 'archive', label: 'Archive' },
                  ]}
                />
              </ToolbarControlGroup>
            }
          />
          <List gap="none">
            <ListItem
              label="Review Incoming Tickets"
              action="select-demo-ticket"
            />
            <ListItem label="Check Assigned Work" action="select-demo-ticket" />
          </List>
        </div>
      </CatalogExample>
      <CatalogExample
        label="Inline Status Badge"
        note="The selected badge supplies the whole closed trigger box; focus and the listbox remain Select-owned."
        align="inline-control"
      >
        <Select<string>
          name="inline-status"
          value={selectedChoice.value}
          ariaLabel="Status"
          presentation="inline"
          caret={false}
          choices={toolbarChoices}
          renderSelected={(choice) => (
            <Badge tone="success" size="compact">
              {choice.label}
            </Badge>
          )}
        />
      </CatalogExample>
      <CatalogExample
        label="Placeholder"
        note="Loading renders a static, inert box in place of the interactive control."
        align="inline-control"
      >
        <Select
          name="select-placeholder"
          value=""
          label="Rendering Balance"
          ariaLabel="Rendering Balance"
          hint="Loading selection options."
          choices={[]}
          placeholder
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
