import './list-inset-control.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ListInsetControl } from '@kerfjs/ui/list-inset-control';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { Check } from 'lucide';

import { DemoListInsetPane } from './demo-list-inset-pane.js';
import { icon } from './state.js';

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
            icon={icon(Check, 'check')}
          />
          <ListInsetControl>
            <input
              class="list-inset-demo__input"
              type="text"
              aria-label="Filter records"
              placeholder="An input that owns its border and padding"
            />
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
            <input
              class="list-inset-demo__input"
              type="text"
              aria-label="Filter selected sides"
              placeholder="Right and bottom inset"
            />
          </ListInsetControl>
        </DemoListInsetPane>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
