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
        <div class="demo-text-stack">
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
    </CatalogExampleStack>
  );
}
