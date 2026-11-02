import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { rem } from '@kerfjs/ui/css-values';
import { List } from '@kerfjs/ui/list';
import { NavStack } from '@kerfjs/ui/nav-stack';
import { Pane } from '@kerfjs/ui/pane';
import { SizedRegion } from '@kerfjs/ui/sized-region';

import { DemoContentItem } from './demo-content-item.js';

/** A one-view NavStack: a whole-screen layout with no height of its own. */
const stack = (id: string, title: string) => (
  <NavStack
    id={id}
    label={title}
    views={[
      {
        key: 'root',
        toolbar: { title },
        pane: { appearance: 'sunken' },
        content: (
          <List>
            <DemoContentItem
              title="Fills the Region"
              detail="The stack's scenes take the height the SizedRegion gives them."
            />
          </List>
        ),
      },
    ]}
  />
);

export function SizedRegionDemo() {
  return (
    <CatalogExampleStack
      label="Sized Regions"
      rootAttributes={{ 'data-demo': 'sized-region' }}
    >
      <CatalogExample
        label="Fill Beside Other Content"
        note="The default fill takes the rest of the Pane's content after the item above it, so the nested NavStack keeps its scenes instead of collapsing to its toolbar."
        viewport={{
          layout: 'grid',
          width: 'compact',
          height: 'tall',
          frame: 'solid',
        }}
      >
        <Pane label="Project">
          <DemoContentItem
            title="Project Atlas"
            detail="Summary content sits above the nested layout."
          />
          <SizedRegion rootAttributes={{ 'data-sized-region-demo': 'fill' }}>
            {stack('sized-region-fill', 'Activity')}
          </SizedRegion>
        </Pane>
      </CatalogExample>
      <CatalogExample
        label="Minimum Height in Flowing Content"
        note="In content that sizes to itself, minHeight alone gives the layout a usable height; an ordinary min-height would not."
        viewport={{ width: 'compact' }}
      >
        <SizedRegion
          minHeight={rem(20)}
          rootAttributes={{ 'data-sized-region-demo': 'min' }}
        >
          {stack('sized-region-min', 'Notes')}
        </SizedRegion>
      </CatalogExample>
      <CatalogExample
        label="Bounded Fill"
        note="maxHeight stops a fill from growing past a readable size inside a tall parent."
        viewport={{
          layout: 'grid',
          width: 'compact',
          height: 'tall',
          frame: 'solid',
        }}
      >
        <Pane label="Inbox">
          <SizedRegion
            maxHeight={rem(18)}
            rootAttributes={{ 'data-sized-region-demo': 'max' }}
          >
            {stack('sized-region-max', 'Messages')}
          </SizedRegion>
        </Pane>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
