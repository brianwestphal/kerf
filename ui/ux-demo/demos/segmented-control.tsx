import '@kerfjs/ui/lucide-icon.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { SegmentedControl } from '@kerfjs/ui/segmented-control';
import { Text } from '@kerfjs/ui/text';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { Bell, Columns3, Folder, List, Settings } from 'lucide';

import { displayDensity, inspectorSection, toolbarChoice } from './state.js';

export function SegmentedControlDemo() {
  return (
    <CatalogExampleStack
      label="SegmentedControl Variants"
      rootAttributes={{ 'data-demo': 'segmented-control' }}
    >
      <CatalogExample
        label="Toolbar"
        note="Pill controls share a toolbar group’s chrome."
        align="inline-control"
      >
        <ToolbarControlGroup>
          <SegmentedControl
            id="standalone-toolbar-view"
            label="Toolbar View Mode"
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
      <CatalogExample
        label="Rounded Rectangle"
        note="An equal-width inspector switcher with labels."
        align="inline-control"
        viewport={{ width: 'control' }}
      >
        <SegmentedControl<string>
          id="inspector-section"
          label="Inspector Section"
          value={inspectorSection.value}
          action="select-segment-demo"
          shape="rounded"
          layout="equal"
          choices={[
            {
              value: 'summary',
              label: 'Summary',
              content: (
                <>
                  <LucideIcon icon={List} name="list" />
                  <Text variant="span">Summary</Text>
                </>
              ),
            },
            {
              value: 'activity',
              label: 'Activity',
              content: (
                <>
                  <LucideIcon icon={Bell} name="bell" />
                  <Text variant="span">Activity</Text>
                </>
              ),
            },
            {
              value: 'files',
              label: 'Files',
              content: (
                <>
                  <LucideIcon icon={Folder} name="folder" />
                  <Text variant="span">Files</Text>
                </>
              ),
            },
          ]}
        />
      </CatalogExample>
      <CatalogExample
        label="Pill"
        note="A compact standalone choice with a disabled option."
        align="inline-control"
      >
        <SegmentedControl
          id="display-density"
          label="Display Density"
          value={displayDensity.value}
          action="select-segment-demo"
          appearance="outlined"
          shape="pill"
          size="small"
          choices={[
            { value: 'compact', label: 'Compact' },
            { value: 'comfortable', label: 'Comfortable' },
            {
              value: 'roomy',
              label: 'Roomy',
              disabled: true,
              title: 'Roomy density is unavailable',
            },
          ]}
        />
      </CatalogExample>
      <CatalogExample
        label="Placeholder"
        note="A loading switcher keeps its known choices, inert, with no selection until the value loads."
        align="inline-control"
      >
        <SegmentedControl<string>
          id="segmented-placeholder"
          label="Loading View Mode"
          value=""
          choices={[
            { value: 'list', label: 'List View' },
            { value: 'columns', label: 'Columns View' },
            { value: 'settings', label: 'Settings View' },
          ]}
          placeholder
        />
      </CatalogExample>
      <CatalogExample
        label="Disabled"
        note="The whole control is unavailable while its current choice stays visible, for a setting that cannot change right now."
        align="inline-control"
      >
        <SegmentedControl
          id="segmented-disabled"
          label="Report Range"
          value="week"
          choices={[
            { value: 'day', label: 'Day' },
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
          ]}
          disabled
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
