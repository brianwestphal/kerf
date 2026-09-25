import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { Text } from '@kerfjs/ui/text';

export function TextDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'text' }}>
      <CatalogExample
        label="Semantic variants"
        note="Text renders the selected native heading or paragraph while giving each text box the standard transparent border and content padding."
        align="none"
      >
        <div data-demo-section="semantic-variants">
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
        </div>
      </CatalogExample>
      <CatalogExample
        label="Presentation roles"
        note="Tone, size, and font are independent of the native semantic element, so applications can express supporting copy, errors, compact metadata, and code without global utility classes."
        align="none"
      >
        <div data-demo-section="presentation-roles">
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
        </div>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
