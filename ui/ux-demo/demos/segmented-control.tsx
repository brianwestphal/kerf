import './segmented-control.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { SegmentedControl } from '@kerfjs/ui/segmented-control';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { Bell, Columns3, Folder, List, Settings } from 'lucide';

import {
  displayDensity,
  icon,
  inspectorSection,
  toolbarChoice,
} from './state.js';

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
                content: icon(List, 'list'),
              },
              {
                value: 'columns',
                label: 'Columns view',
                content: icon(Columns3, 'columns-3'),
              },
              {
                value: 'settings',
                label: 'Settings view',
                content: icon(Settings, 'settings'),
              },
            ]}
          />
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample
        label="Rounded rectangle"
        note={<>An equal-width inspector switcher with labels.</>}
        align="inline-control"
      >
        <div class="segmented-control-demo__equal-frame">
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
                    {icon(List, 'list')}
                    <span>Summary</span>
                  </>
                ),
              },
              {
                value: 'activity',
                label: 'Activity',
                content: (
                  <>
                    {icon(Bell, 'bell')}
                    <span>Activity</span>
                  </>
                ),
              },
              {
                value: 'files',
                label: 'Files',
                content: (
                  <>
                    {icon(Folder, 'folder')}
                    <span>Files</span>
                  </>
                ),
              },
            ]}
          />
        </div>
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
