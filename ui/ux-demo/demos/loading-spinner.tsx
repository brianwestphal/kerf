import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { LoadingSpinner } from '@kerfjs/ui/loading-spinner';

export function LoadingSpinnerDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'loading-spinner' }}>
      <CatalogExample
        label="Meaningful"
        note={<>Exposes its supplied label to assistive technology.</>}
        align="glyph"
      >
        <LoadingSpinner label="Loading preview" />
      </CatalogExample>
      <CatalogExample
        label="Decorative"
        note={<>No label — hidden from assistive technology.</>}
        align="glyph"
      >
        <LoadingSpinner />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
