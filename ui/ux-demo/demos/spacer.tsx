import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { List } from '@kerfjs/ui/list';
import { Row } from '@kerfjs/ui/row';
import { Spacer } from '@kerfjs/ui/spacer';

const chip = (label: string) => <span class="demo-row-chip">{label}</span>;

export function SpacerDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'spacer' }}>
      <CatalogExample
        label="Named dimensions"
        note="Width and height accept the finite UI spacing scale or a typed CssLength. The colored area makes the otherwise invisible spacer measurable."
      >
        <Row
          className="demo-row-frame demo-spacer-row"
          vAlign="middle"
          gap="none"
        >
          {chip('Before')}
          <Spacer width="m" height="l" className="demo-spacer-marker" />
          {chip('After')}
        </Row>
      </CatalogExample>
      <CatalogExample
        label="Flexible space"
        note="flex fills the available space along a flex parent's main axis while the neighboring controls keep their natural size."
      >
        <Row
          className="demo-row-frame demo-spacer-flex"
          vAlign="middle"
          gap="none"
        >
          {chip('Leading')}
          <Spacer flex className="demo-spacer-marker" />
          {chip('Trailing')}
        </Row>
      </CatalogExample>
      <CatalogExample
        label="Vertical space"
        note="A height-only spacer separates vertical content without introducing semantics or a wrapper gap policy."
      >
        <List className="demo-spacer-list" gap="none">
          {chip('Above')}
          <Spacer height="m" className="demo-spacer-marker" />
          {chip('Below')}
        </List>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
