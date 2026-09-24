import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { List } from '@kerfjs/ui/list';
import {
  type HorizontalAlignment,
  Row,
  type VerticalAlignment,
} from '@kerfjs/ui/row';

const horizontal: readonly [string, HorizontalAlignment][] = [
  ['Left', 'left'],
  ['Center', 'center'],
  ['Right', 'right'],
  ['Full', 'full'],
];
const vertical: readonly [string, VerticalAlignment][] = [
  ['Top', 'top'],
  ['Middle', 'middle'],
  ['Bottom', 'bottom'],
  ['Full', 'full'],
  ['Baseline', 'baseline'],
];

const chips = (prefix: string) => [
  <span class="demo-row-chip">{prefix} one</span>,
  <span class="demo-row-chip demo-row-chip--tall">{prefix} two</span>,
  <span class="demo-row-chip">{prefix} three</span>,
];

export function RowDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'row' }}>
      <CatalogExample
        label="Default row"
        note="Row defaults to left, full-height children, the xs gap, and no wrapping."
      >
        <Row className="demo-row-frame demo-row-default">
          {chips('Default')}
        </Row>
      </CatalogExample>
      <CatalogExample
        label="Horizontal distribution"
        note="Center uses space-around while full uses space-between; left and right pin the group to an edge."
      >
        <List gap="xs" className="demo-row-gallery">
          {horizontal.map(([label, alignment]) => (
            <section>
              <code>{label}</code>
              <Row
                className={`demo-row-frame demo-row-horizontal-${alignment}`}
                hAlign={alignment}
                vAlign="middle"
              >
                {chips(label)}
              </Row>
            </section>
          ))}
        </List>
      </CatalogExample>
      <CatalogExample
        label="Vertical alignment"
        note="Cross-axis alignment remains valid CSS: top, centered middle, bottom, stretched full, or text baseline. Wrapped lines use the matching distribution."
      >
        <List gap="xs" className="demo-row-gallery">
          {vertical.map(([label, alignment]) => (
            <section>
              <code>{label}</code>
              <Row
                className={`demo-row-frame demo-row-vertical-${alignment}`}
                hAlign="left"
                vAlign={alignment}
              >
                {chips(label)}
              </Row>
            </section>
          ))}
        </List>
      </CatalogExample>
      <CatalogExample
        label="Wrapped row"
        note="Wrapping is opt-in and keeps the same physical alignment and typed gap contract."
      >
        <Row
          className="demo-row-frame demo-row-wrapped"
          hAlign="full"
          vAlign="middle"
          gap="m"
          wrap
        >
          {['Alpha', 'Beta release', 'Gamma', 'Delta workspace', 'Epsilon'].map(
            (label) => (
              <span class="demo-row-chip demo-row-chip--wide">{label}</span>
            ),
          )}
        </Row>
      </CatalogExample>
      <CatalogExample
        label="Flex participation"
        note="Row accepts the same boolean, finite-keyword, and typed flex grammar as List when it participates in a parent flex layout."
      >
        <List gap="xs" className="demo-row-flex-stack">
          <Row
            className="demo-row-frame demo-row-flex-grow"
            flex
            vAlign="middle"
          >
            {chips('Growing')}
          </Row>
          <Row
            className="demo-row-frame demo-row-flex-none"
            flex="none"
            vAlign="middle"
          >
            {chips('Fixed')}
          </Row>
        </List>
      </CatalogExample>
      <CatalogExample
        label="Side-selectable insets"
        note="Text insets apply the full 8px + 1px + 8px content geometry; control insets apply 8px. Physical sides use canonical top/right/bottom/left order."
      >
        <Row
          className="demo-row-frame demo-row-insets"
          textInsets="tbl"
          controlInsets="r"
          vAlign="middle"
        >
          {chips('Inset')}
        </Row>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
