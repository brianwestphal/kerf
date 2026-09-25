import './row.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { List } from '@kerfjs/ui/list';
import {
  type HorizontalAlignment,
  Row,
  type VerticalAlignment,
} from '@kerfjs/ui/row';

import { DemoChip } from './demo-chip.js';
import { DemoFrameShell } from './demo-frame-shell.js';

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
  <DemoChip label={`${prefix} one`} />,
  <DemoChip label={`${prefix} two`} size="tall" />,
  <DemoChip label={`${prefix} three`} />,
];

export function RowDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'row' }}>
      <CatalogExample
        label="Default row"
        note="Row defaults to left, full-height children, the xs gap, and no wrapping."
      >
        <DemoFrameShell>
          <Row>{chips('Default')}</Row>
        </DemoFrameShell>
      </CatalogExample>
      <CatalogExample
        label="Horizontal distribution"
        note="Center uses space-around while full uses space-between; left and right pin the group to an edge."
      >
        <List gap="xs">
          {horizontal.map(([label, alignment]) => (
            <section class="demo-row-gallery__section">
              <code class="demo-row-gallery__label">{label}</code>
              <DemoFrameShell>
                <Row hAlign={alignment} vAlign="middle">
                  {chips(label)}
                </Row>
              </DemoFrameShell>
            </section>
          ))}
        </List>
      </CatalogExample>
      <CatalogExample
        label="Vertical alignment"
        note="Cross-axis alignment remains valid CSS: top, centered middle, bottom, stretched full, or text baseline. Wrapped lines use the matching distribution."
      >
        <List gap="xs">
          {vertical.map(([label, alignment]) => (
            <section class="demo-row-gallery__section">
              <code class="demo-row-gallery__label">{label}</code>
              <DemoFrameShell>
                <Row hAlign="left" vAlign={alignment}>
                  {chips(label)}
                </Row>
              </DemoFrameShell>
            </section>
          ))}
        </List>
      </CatalogExample>
      <CatalogExample
        label="Wrapped row"
        note="Wrapping is opt-in and keeps the same physical alignment and typed gap contract."
      >
        <DemoFrameShell measure="wrapped">
          <Row hAlign="full" vAlign="middle" gap="m" wrap>
            {[
              'Alpha',
              'Beta release',
              'Gamma',
              'Delta workspace',
              'Epsilon',
            ].map((label) => (
              <DemoChip label={label} size="wide" />
            ))}
          </Row>
        </DemoFrameShell>
      </CatalogExample>
      <CatalogExample
        label="Flex participation"
        note="Row accepts the same boolean, finite-keyword, and typed flex grammar as List when it participates in a parent flex layout."
      >
        <div class="demo-row-flex-stack">
          <List gap="xs">
            <Row flex vAlign="middle">
              {chips('Growing')}
            </Row>
            <Row flex="none" vAlign="middle">
              {chips('Fixed')}
            </Row>
          </List>
        </div>
      </CatalogExample>
      <CatalogExample
        label="Side-selectable insets"
        note="Text insets apply the full 8px + 1px + 8px content geometry; control insets apply 8px. Physical sides use canonical top/right/bottom/left order."
      >
        <DemoFrameShell>
          <Row textInsets="tbl" controlInsets="r" vAlign="middle">
            {chips('Inset')}
            <Row controlInsets="b" vAlign="middle">
              {chips('Nested')}
            </Row>
          </Row>
        </DemoFrameShell>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
