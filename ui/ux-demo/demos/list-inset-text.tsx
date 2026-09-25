import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ListInsetText } from '@kerfjs/ui/list-inset-text';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { Check } from 'lucide';

import { DemoListInsetPane } from './demo-list-inset-pane.js';
import { icon } from './state.js';

export function ListInsetTextDemo() {
  return (
    <CatalogExampleStack
      label="ListInsetText demo"
      rootAttributes={{ 'data-demo': 'list-inset-text' }}
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
        <DemoListInsetPane>
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
        </DemoListInsetPane>
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
        <DemoListInsetPane>
          <ListInsetText horizontalOnly>
            First tight line — aligned, no vertical box space.
          </ListInsetText>
          <ListInsetText horizontalOnly>
            Second tight line, packed against the first.
          </ListInsetText>
        </DemoListInsetPane>
      </CatalogExample>
      <CatalogExample
        label="Selected physical sides"
        note="The sides prop uses canonical top/right/bottom/left order; only selected sides receive the full text inset geometry."
        align="none"
      >
        <DemoListInsetPane>
          <ListInsetText sides="tbl">
            Top, bottom, and left are inset; the right edge stays flush.
          </ListInsetText>
        </DemoListInsetPane>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
