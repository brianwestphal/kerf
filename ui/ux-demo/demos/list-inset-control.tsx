import '@kerfjs/ui/select/register';

import { Button } from '@kerfjs/ui/button';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ListInsetControl } from '@kerfjs/ui/list-inset-control';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Select } from '@kerfjs/ui/select';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { TextField } from '@kerfjs/ui/text-field';
import { Check } from 'lucide';

import { DemoListInsetPane } from './demo-list-inset-pane.js';

export function ListInsetControlDemo() {
  return (
    <CatalogExampleStack
      label="ListInsetControl Demo"
      rootAttributes={{ 'data-demo': 'list-inset-control' }}
    >
      <CatalogExample
        label="Inset a Self-Bordered Control"
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
            title="A Content Item, for Reference"
            detail="Its edges are the alignment reference."
            icon={<LucideIcon icon={Check} name="check" />}
          />
          <ListInsetControl>
            <TextField
              label="Filter Records"
              placeholder="An input that owns its border and padding"
            />
          </ListInsetControl>
        </DemoListInsetPane>
      </CatalogExample>
      <CatalogExample
        label="Selected Physical Sides"
        note="The sides prop defaults to all sides and can select any canonical top/right/bottom/left combination."
        align="none"
        viewport={{ width: 'medium' }}
      >
        <DemoListInsetPane>
          <ListInsetControl sides="rb">
            <TextField
              label="Filter Selected Sides"
              placeholder="Right and bottom inset"
            />
          </ListInsetControl>
        </DemoListInsetPane>
      </CatalogExample>
      <CatalogExample
        label="Stretch Any Self-Bordered Control"
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
                { value: 'review', label: 'In Review' },
                { value: 'ready', label: 'Ready' },
                { value: 'done', label: 'Done' },
              ]}
            />
          </ListInsetControl>
          <ListInsetControl sides="trl">
            <TextField label="Assignee" placeholder="Search people" />
          </ListInsetControl>
          <ListInsetControl>
            <Button emphasis="secondary">Assign</Button>
          </ListInsetControl>
        </DemoListInsetPane>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
