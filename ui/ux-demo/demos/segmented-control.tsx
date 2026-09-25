import '@kerfjs/ui/lucide-icon.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { SegmentedControl } from '@kerfjs/ui/segmented-control';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { Bell, Columns3, Folder, List, Settings } from 'lucide';

import { displayDensity, inspectorSection, toolbarChoice } from './state.js';

export function SegmentedControlDemo() {
  return (
    <CatalogExampleStack
      label="SegmentedControl variants"
      rootAttributes={{ 'data-demo': 'segmented-control' }}
    >
      <CatalogExample
        label="Toolbar"
        note={<>Pill controls share a toolbar group’s chrome.</>}
        align="inline-control"
      >
        <ToolbarControlGroup>
          <SegmentedControl
            id="standalone-toolbar-view"
            label="Toolbar view mode"
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
      <CatalogExample
        label="Rounded rectangle"
        note={<>An equal-width inspector switcher with labels.</>}
        align="inline-control"
        viewport={{ width: 'control' }}
      >
        <SegmentedControl<string>
          id="inspector-section"
          label="Inspector section"
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
                  <span>Summary</span>
                </>
              ),
            },
            {
              value: 'activity',
              label: 'Activity',
              content: (
                <>
                  <LucideIcon icon={Bell} name="bell" />
                  <span>Activity</span>
                </>
              ),
            },
            {
              value: 'files',
              label: 'Files',
              content: (
                <>
                  <LucideIcon icon={Folder} name="folder" />
                  <span>Files</span>
                </>
              ),
            },
          ]}
        />
      </CatalogExample>
      <CatalogExample
        label="Pill"
        note={<>A compact standalone choice with a disabled option.</>}
        align="inline-control"
      >
        <SegmentedControl
          id="display-density"
          label="Display density"
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
        note={
          <>
            A loading switcher renders inert pill chrome with skeleton labels.
          </>
        }
        align="inline-control"
      >
        <SegmentedControl<string>
          id="segmented-placeholder"
          label="Loading view mode"
          value=""
          choices={[
            { value: 'list', label: 'List view' },
            { value: 'columns', label: 'Columns view' },
            { value: 'settings', label: 'Settings view' },
          ]}
          placeholder
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
