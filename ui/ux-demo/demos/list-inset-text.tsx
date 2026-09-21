import { CatalogExample } from '@kerfjs/ui/catalog';
import { ListInsetText } from '@kerfjs/ui/list-inset-text';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { Check } from 'lucide';

import { icon } from './state.js';

export function ListInsetTextDemo() {
  return (
    <section
      class="list-inset-demo kui-catalog-example-stack"
      data-demo="list-inset-text"
      aria-label="ListInsetText demo"
    >
      <CatalogExample
        label="Inset bare text"
        note={
          <>
            Plain text has no margin, border, or padding, so it does not line up
            with bordered items. <code>ListInsetText</code> adds the
            content-item geometry so its left edge lands at the same inset.
          </>
        }
        align="none"
      >
        <div class="list-inset-demo__pane kui-content">
          <StateBanner
            tone="neutral"
            title="A content item, for reference"
            detail="Note where its title text starts."
            icon={icon(Check, 'check')}
          />
          <ListInsetText>
            Aligned plain text — its left edge lands at the same inset as the
            item above.
          </ListInsetText>
        </div>
      </CatalogExample>
      <CatalogExample
        label="Horizontal-only inset"
        note={
          <>
            Pass <code>horizontalOnly</code> to keep the horizontal inset but
            drop the vertical margin, border, and padding — tight lines that
            still align with bordered items.
          </>
        }
        align="none"
      >
        <div class="list-inset-demo__pane kui-content">
          <ListInsetText horizontalOnly>
            First tight line — aligned, no vertical box space.
          </ListInsetText>
          <ListInsetText horizontalOnly>
            Second tight line, packed against the first.
          </ListInsetText>
        </div>
      </CatalogExample>
    </section>
  );
}
