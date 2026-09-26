import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@kerfjs/ui/select/register';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ListInsetControl } from '@kerfjs/ui/list-inset-control';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Select } from '@kerfjs/ui/select';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { Check } from 'lucide';

import { DemoListInsetPane } from './demo-list-inset-pane.js';

export function ListInsetControlDemo() {
  return (
    <CatalogExampleStack
      label="ListInsetControl demo"
      rootAttributes={{ 'data-demo': 'list-inset-control' }}
    >
      <CatalogExample
        label="Inset a self-bordered control"
        note={
          <>
            A control that owns its border and padding but no outer margin (an
            input, a <code>wa-*</code> control) sits flush against the region
            edge. <code>ListInsetControl</code> gives it the 8px content inset
            and stretches it across the row.
          </>
        }
        align="none"
        viewport={{ width: 'medium' }}
      >
        <DemoListInsetPane>
          <StateBanner
            tone="info"
            title="A content item, for reference"
            detail="Its edges are the alignment reference."
            icon={<LucideIcon icon={Check} name="check" />}
          />
          <ListInsetControl>
            <wa-input
              label="Filter records"
              placeholder="An input that owns its border and padding"
            ></wa-input>
          </ListInsetControl>
        </DemoListInsetPane>
      </CatalogExample>
      <CatalogExample
        label="Selected physical sides"
        note="The sides prop defaults to all sides and can select any canonical top/right/bottom/left combination."
        align="none"
        viewport={{ width: 'medium' }}
      >
        <DemoListInsetPane>
          <ListInsetControl sides="rb">
            <wa-input
              label="Filter selected sides"
              placeholder="Right and bottom inset"
            ></wa-input>
          </ListInsetControl>
        </DemoListInsetPane>
      </CatalogExample>
      <CatalogExample
        label="Stretch any self-bordered control"
        note="A Select, a text input, and a button each fill the inset row. Several children in one inset share the row with an 8px gap."
        align="none"
        viewport={{ width: 'medium' }}
      >
        <DemoListInsetPane>
          <ListInsetControl sides="trl">
            <Select
              name="demo-inset-status"
              value="review"
              label="Status"
              choices={[
                { value: 'review', label: 'In review' },
                { value: 'ready', label: 'Ready' },
                { value: 'done', label: 'Done' },
              ]}
            />
          </ListInsetControl>
          <ListInsetControl sides="trl">
            <wa-input label="Assignee" placeholder="Search people"></wa-input>
          </ListInsetControl>
          <ListInsetControl>
            <wa-button appearance="outlined">Assign</wa-button>
          </ListInsetControl>
        </DemoListInsetPane>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
