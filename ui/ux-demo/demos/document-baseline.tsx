import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/split-view.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { SplitView } from '@kerfjs/ui/split-view';

import { DemoContentItem } from './demo-content-item.js';

// The catalog page itself imports @kerfjs/ui/document.css and mounts into
// `<div id="app" class="kui-app-root">`; this specimen repeats that one
// mount container inside a fixed-height viewport so the definite height
// chain a percentage-height shell needs is visible at example scale.
export function DocumentBaselineDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'document-baseline' }}>
      <CatalogExample
        label="Full-height application root"
        note="Put kui-app-root on the one direct mount container. The SplitView inside it fills the definite height with no application-owned height."
        align="none"
        viewport={{
          layout: 'grid',
          width: 'full',
          height: 'short',
          frame: 'solid',
          tokens: { '--kui-split-view-list-width': '10rem' },
        }}
      >
        <div class="kui-app-root" data-document-baseline-root>
          <SplitView
            id="catalog-document-baseline-split"
            label="Application shell"
            listTitle="Mailboxes"
            detailTitle="Inbox"
            list={
              <div class="kui-content">
                <DemoContentItem
                  title="Mailboxes"
                  detail="The list pane fills the root height."
                />
              </div>
            }
            detail={
              <div class="kui-content">
                <DemoContentItem
                  title="Inbox"
                  detail="The detail pane fills it too."
                />
              </div>
            }
          />
        </div>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
