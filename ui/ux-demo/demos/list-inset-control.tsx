import '@awesome.me/webawesome/dist/components/input/input.js';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { List } from '@kerfjs/ui/list';
import { ListInsetControl } from '@kerfjs/ui/list-inset-control';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
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
      >
        <DemoListInsetPane>
          <StateBanner
            tone="info"
            title="A content item, for reference"
            detail="Its edges are the alignment reference."
            icon={<LucideIcon icon={Check} name="check" />}
          />
          <ListInsetControl>
            <List flex>
              <wa-input
                label="Filter records"
                placeholder="An input that owns its border and padding"
              ></wa-input>
            </List>
          </ListInsetControl>
        </DemoListInsetPane>
      </CatalogExample>
      <CatalogExample
        label="Selected physical sides"
        note="The sides prop defaults to all sides and can select any canonical top/right/bottom/left combination."
        align="none"
      >
        <DemoListInsetPane>
          <ListInsetControl sides="rb">
            <List flex>
              <wa-input
                label="Filter selected sides"
                placeholder="Right and bottom inset"
              ></wa-input>
            </List>
          </ListInsetControl>
        </DemoListInsetPane>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
