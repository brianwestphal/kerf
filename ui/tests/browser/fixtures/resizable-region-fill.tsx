import '@kerfjs/ui/foundation.css';
import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/pane.css';
import '@kerfjs/ui/row.css';
import '@kerfjs/ui/list.css';
import '@kerfjs/ui/resizable-region.css';

import { List } from '@kerfjs/ui/list';
import { Pane } from '@kerfjs/ui/pane';
import { ResizableRegion } from '@kerfjs/ui/resizable-region';
import { Row } from '@kerfjs/ui/row';
import { mount } from 'kerfjs';

/**
 * ResizableRegion content in a fixed-height frame: a horizontal region with a
 * lone Pane of long content, a vertical region with a lone Pane, and a
 * horizontal region with two plain children that keep their natural height.
 */
const items = (prefix: string) => (
  <div class="kui-content">
    {Array.from({ length: 40 }, (_, index) => (
      <div class="kui-content-item">
        {prefix} {index + 1}
      </div>
    ))}
  </div>
);

const view = () => (
  <div style="height:400px">
    <List fill>
      <Row gap="none" flex>
        <ResizableRegion
          id="fill-horizontal"
          label="Horizontal"
          size={200}
          min={120}
          max={320}
        >
          <Pane safeAreaEdges={[]} rootAttributes={{ 'data-case': 'h-pane' }}>
            {items('Horizontal')}
          </Pane>
        </ResizableRegion>
        <ResizableRegion
          id="fill-stack"
          label="Stack"
          size={200}
          min={120}
          max={320}
        >
          <p data-case="stack-a">First</p>
          <p data-case="stack-b">Second</p>
        </ResizableRegion>
      </Row>
      <ResizableRegion
        id="fill-vertical"
        label="Vertical"
        axis="vertical"
        edge="start"
        size={150}
        min={100}
        max={250}
      >
        <Pane safeAreaEdges={[]} rootAttributes={{ 'data-case': 'v-pane' }}>
          {items('Vertical')}
        </Pane>
      </ResizableRegion>
    </List>
  </div>
);

const root = document.querySelector<HTMLElement>('[data-fill-host]');
if (root) mount(root, view);
