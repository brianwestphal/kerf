import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { uiColor } from '@kerfjs/ui/css-values';
import { List } from '@kerfjs/ui/list';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { PopupMenu } from '@kerfjs/ui/popup-menu';
import { Row } from '@kerfjs/ui/row';
import { Select } from '@kerfjs/ui/select';
import { Text } from '@kerfjs/ui/text';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import {
  Bell,
  Funnel,
  MoreHorizontal,
  Pin,
  SlidersHorizontal,
  Wrench,
} from 'lucide';

import {
  itemTypes,
  selectedChoice,
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
      <CatalogExample label="Rendering balance" align="inline-control">
        <List gap="xs">
          <Select<string>
            name="rendering-balance"
            value={selectedChoice.value}
            ariaLabel="Rendering balance"
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
                <span>{choice.label}</span>
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
        label="Multiple selection"
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
        label="Multiple selection actions"
        note="Select all includes enabled choices only; Clear reports an ordinary change. Unavailable choices remain visible with a reason."
        align="inline-control"
      >
        <Select<string>
          name="item-types"
          multiple
          value={itemTypes.value}
          label="Item types"
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
        label="Toolbar filter"
        note="A multiple icon-only trigger keeps a fixed icon and counts the chosen filters; hover or keyboard focus shows a help tag with its name and chosen labels."
        align="inline-control"
      >
        <ToolbarControlGroup
          label="Label filter"
          content="icon"
          focusRing="outline"
          single
        >
          <Select<string>
            name="ticket-label-filter"
            multiple
            value={ticketLabelFilter.value}
            ariaLabel="Filter by label"
            presentation="toolbar-borderless"
            selectedPresentation="icon-only"
            triggerIcon={<LucideIcon icon={Funnel} name="funnel" />}
            focusRingOwner="group"
            choices={labelChoices}
          />
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample
        label="Toolbar filter beside actions"
        note="The pin button, filter, and menu each show their name as a help tag on hover or keyboard focus."
        align="inline-control"
      >
        <ToolbarControlGroup label="Ticket view">
          <button type="button" aria-label="Pin view" data-action="log-pin">
            <LucideIcon icon={Pin} name="pin" />
          </button>
          <Select<string>
            name="toolbar-ticket-label-filter"
            multiple
            value={ticketLabelFilter.value}
            ariaLabel="Filter by label"
            presentation="toolbar-borderless"
            selectedPresentation="icon-only"
            triggerIcon={<LucideIcon icon={Funnel} name="funnel" />}
            choices={labelChoices}
          />
          <PopupMenu
            label="More actions"
            icon={<LucideIcon icon={MoreHorizontal} name="ellipsis" />}
            items={[{ label: 'Archive', action: 'log-more' }]}
          />
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample
        label="Accessible name without a visible label"
        align="inline-control"
      >
        <Select<string>
          name="plain-rendering-balance"
          value={selectedChoice.value}
          ariaLabel="Plain rendering balance"
          choices={[
            { value: 'quiet', label: 'Quiet' },
            { value: 'balanced', label: 'Balanced' },
            { value: 'explicit', label: 'Explicit' },
          ]}
        />
      </CatalogExample>
      <CatalogExample label="Visible label" align="inline-control">
        <Select<string>
          name="labeled-rendering-balance"
          value={selectedChoice.value}
          label="Rendering preference"
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
        label="Compact selected text"
        align="inline-control"
        viewport={{
          tokens: {
            '--kui-select-trigger-max-width': '160px',
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
          choices={[{ value: 'long', label: 'A very long workspace name' }]}
          renderSelected={(choice) => <span>{choice.label}</span>}
        />
      </CatalogExample>
      <CatalogExample
        label="Toolbar icon"
        note="An icon-only trigger keeps its caret; a single group grows to fit both. Hover or keyboard focus shows a help tag with its name and current choice."
        align="inline-control"
      >
        <ToolbarControlGroup
          label="Rendering mode"
          content="icon"
          focusRing="outline"
          single
        >
          <Select<string>
            name="toolbar-default-rendering-balance"
            value={selectedChoice.value}
            ariaLabel="Default toolbar rendering balance"
            presentation="toolbar-borderless"
            selectedPresentation="icon-only"
            focusRingOwner="group"
            choices={toolbarChoices}
          />
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample
        label="Round toolbar icon"
        note="An icon-only Select can omit its caret to match a round action trigger. The accessible name and current choice remain available on hover and focus."
        align="inline-control"
      >
        <ToolbarControlGroup
          label="Workspace sort"
          content="icon"
          focusRing="outline"
          shape="pill"
          single
        >
          <Select<string>
            name="toolbar-round-rendering-balance"
            value={selectedChoice.value}
            ariaLabel="Workspace sort"
            presentation="toolbar-borderless"
            selectedPresentation="icon-only"
            caret={false}
            focusRingOwner="group"
            choices={toolbarChoices}
          />
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample label="Compact toolbar icon" align="inline-control">
        <ToolbarControlGroup
          label="Rendering mode"
          size="compact"
          content="icon"
          focusRing="outline"
          single
        >
          <Select<string>
            name="toolbar-rendering-balance"
            value={selectedChoice.value}
            ariaLabel="Toolbar rendering balance"
            presentation="toolbar-borderless"
            size="compact"
            selectedPresentation="icon-only"
            focusRingOwner="group"
            choices={toolbarChoices}
          />
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample label="Navigation label" align="inline-control">
        <Select<string>
          name="navigation-rendering-balance"
          value={selectedChoice.value}
          ariaLabel="Navigation rendering balance"
          presentation="navigation"
          triggerWidth="max-content"
          size="compact"
          labelMaxWidth={120}
          choices={[
            { value: 'quiet', label: 'Quiet navigation workspace' },
            {
              value: 'balanced',
              label: 'Balanced navigation workspace',
            },
            { value: 'explicit', label: 'Explicit navigation workspace' },
          ]}
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
          label="Rendering balance"
          ariaLabel="Rendering balance"
          hint="Loading selection options."
          choices={[]}
          placeholder
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
