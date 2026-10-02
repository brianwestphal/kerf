import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { Row } from '@kerfjs/ui/row';
import { Text } from '@kerfjs/ui/text';

export function TextDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'text' }}>
      <CatalogExample
        label="Semantic variants"
        note="Text renders the selected native heading or paragraph while giving each text box the standard transparent border and content padding."
        align="inline-control"
        rootAttributes={{ 'data-demo-section': 'semantic-variants' }}
      >
        <Text variant="h1">Heading level 1</Text>
        <Text variant="h2">Heading level 2</Text>
        <Text variant="h3">Heading level 3</Text>
        <Text variant="h4">Heading level 4</Text>
        <Text variant="h5">Heading level 5</Text>
        <Text variant="h6">Heading level 6</Text>
        <Text
          id="text-demo-paragraph"
          lang="en"
          data-demo-copy="paragraph"
          aria-label="Example paragraph"
        >
          Paragraph text keeps native semantics and accepts ordinary global,
          data, and ARIA attributes.
        </Text>
      </CatalogExample>
      <CatalogExample
        label="Presentation roles"
        note="Tone, size, and font are independent of the native semantic element, so applications can express supporting copy, errors, compact metadata, prominent copy, and code without global utility classes."
        align="inline-control"
        rootAttributes={{ 'data-demo-section': 'presentation-roles' }}
      >
        <Text tone="quiet">Quiet supporting copy</Text>
        <Text tone="danger">Danger or validation copy</Text>
        <Text size="compact">Compact metadata</Text>
        <Text font="monospace">Monospace identifier: INV-2048</Text>
        <Text tone="quiet" size="compact" font="monospace">
          Quiet compact code: PO-1042
        </Text>
        <Text>
          <strong>
            Inbox
            <Text variant="span" tone="quiet" size="compact">
              {' · 3 msg'}
            </Text>
          </strong>
        </Text>
        <Text size="large">Large body copy</Text>
        <Text size="xlarge">Extra large body copy</Text>
      </CatalogExample>
      <CatalogExample label="Flush dialog copy" align="glyph">
        <Text flush lineHeight="tight" data-demo-copy="flush">
          Compact supporting copy inside a dialog body.
        </Text>
      </CatalogExample>
      <CatalogExample
        label="Long copy and truncation"
        note="Text breaks long identifiers, caps summaries, or yields space to a fixed sibling with a one-line ellipsis."
        align="inline-control"
        viewport={{ width: 'medium' }}
      >
        <Text wrap="anywhere" data-demo-copy="anywhere">
          DOCUMENT-2026-OCTOBER-PROCUREMENT-VERY-LONG-UNBROKEN-REFERENCE-123456789
        </Text>
        <Text wrap="normal" maxLines={2} data-demo-copy="capped">
          A long summary can stop after two lines while retaining a useful
          preview of the original message. Additional detail stays available in
          the full record, and the summary keeps the surrounding layout compact.
        </Text>
        <Row gap="xs" controlInsets="rl">
          <Text variant="span" wrap="truncate" data-demo-copy="truncate">
            Acme International Procurement and Manufacturing Limited
          </Text>
          <Text variant="span" wrap="nowrap" data-demo-copy="price">
            $129 / unit
          </Text>
        </Row>
        <Text wrap="nowrap" data-demo-copy="nowrap">
          This status stays on one line.
        </Text>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
