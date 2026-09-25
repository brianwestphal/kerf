import './spacer.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { List } from '@kerfjs/ui/list';
import { Row } from '@kerfjs/ui/row';
import { Spacer } from '@kerfjs/ui/spacer';

import { DemoChip } from './demo-chip.js';
import { DemoFrameShell } from './demo-frame-shell.js';

const chip = (label: string) => <DemoChip label={label} />;

export function SpacerDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'spacer' }}>
      <CatalogExample
        label="Named dimensions"
        note="Width and height accept the finite UI spacing scale or a typed CssLength. The colored area makes the otherwise invisible spacer measurable."
      >
        <DemoFrameShell measure="standard">
          <Row vAlign="middle" gap="none">
            {chip('Before')}
            <div class="demo-spacer-marker">
              <Spacer width="m" height="l" />
            </div>
            {chip('After')}
          </Row>
        </DemoFrameShell>
      </CatalogExample>
      <CatalogExample
        label="Flexible space"
        note="flex fills the available space along a flex parent's main axis while the neighboring controls keep their natural size."
      >
        <DemoFrameShell measure="standard">
          <Row vAlign="middle" gap="none">
            {chip('Leading')}
            <div class="demo-spacer-marker demo-spacer-marker--flex">
              <Spacer flex />
            </div>
            {chip('Trailing')}
          </Row>
        </DemoFrameShell>
      </CatalogExample>
      <CatalogExample
        label="Vertical space"
        note="A height-only spacer separates vertical content without introducing semantics or a wrapper gap policy."
      >
        <div class="demo-spacer-list">
          <List gap="none">
            {chip('Above')}
            <div class="demo-spacer-marker">
              <Spacer height="m" />
            </div>
            {chip('Below')}
          </List>
        </div>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
