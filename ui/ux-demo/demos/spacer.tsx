import '@awesome.me/webawesome/dist/components/card/card.js';

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
        viewport={{ width: 'compact' }}
        note="Width and height accept the finite UI spacing scale or a typed CssLength."
      >
        <DemoFrameShell>
          <Row vAlign="middle" gap="none">
            {chip('Before')}
            <Spacer width="m" height="l" />
            {chip('After')}
          </Row>
        </DemoFrameShell>
      </CatalogExample>
      <CatalogExample
        label="Flexible space"
        viewport={{ width: 'compact' }}
        note="flex fills the available space along a flex parent's main axis while the neighboring controls keep their natural size."
      >
        <DemoFrameShell>
          <Row vAlign="middle" gap="none">
            {chip('Leading')}
            <Spacer flex />
            {chip('Trailing')}
          </Row>
        </DemoFrameShell>
      </CatalogExample>
      <CatalogExample
        label="Vertical space"
        note="A height-only spacer separates vertical content without introducing semantics or a wrapper gap policy."
      >
        <wa-card appearance="sunken">
          <List gap="none">
            {chip('Above')}
            <Spacer height="m" />
            {chip('Below')}
          </List>
        </wa-card>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
