import { CatalogExample } from '@kerfjs/ui/catalog';
import { ListInsetControl } from '@kerfjs/ui/list-inset-control';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { Check } from 'lucide';

import { icon } from './state.js';

export function ListInsetControlDemo() {
  return (
    <section
      class="list-inset-demo kui-catalog-example-stack"
      data-demo="list-inset-control"
      aria-label="ListInsetControl demo"
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
        <div class="list-inset-demo__pane kui-content">
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
        </div>
      </CatalogExample>
    </section>
  );
}
