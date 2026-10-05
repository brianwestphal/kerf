import { Badge } from '@kerfjs/ui/badge';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';

export function BadgeDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'badge' }}>
      <CatalogExample
        label="Status"
        note="Tone communicates emphasis while the text carries the meaning."
        align="inline-control"
      >
        <Badge tone="success">Ready</Badge>
      </CatalogExample>
      <CatalogExample label="Count" align="inline-control">
        <Badge
          tone="info"
          appearance="solid"
          size="compact"
          label="12 unread items"
        >
          12
        </Badge>
      </CatalogExample>
      <CatalogExample
        label="Dot"
        note="A text-free mark for new content without a count; it carries its own label or is hidden when its owner announces it."
        align="inline-control"
      >
        <Badge tone="danger" size="dot" label="New activity" />
      </CatalogExample>
      <CatalogExample label="Category tag" align="inline-control">
        <Badge tone="pop" appearance="outline" shape="rounded">
          Design
        </Badge>
      </CatalogExample>
      <CatalogExample label="Neutral metadata" align="inline-control">
        <Badge>Draft</Badge>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
