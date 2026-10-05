import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { foregroundColor, uiColor } from '@kerfjs/ui/css-values';
import { LoadingSpinner } from '@kerfjs/ui/loading-spinner';
import { Row } from '@kerfjs/ui/row';

export function LoadingSpinnerDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'loading-spinner' }}>
      <CatalogExample
        label="Meaningful"
        note="Exposes its supplied label to assistive technology."
        align="glyph"
      >
        <LoadingSpinner label="Loading preview" />
      </CatalogExample>
      <CatalogExample
        label="Decorative"
        note="No label — hidden from assistive technology."
        align="glyph"
      >
        <LoadingSpinner />
      </CatalogExample>
      <CatalogExample
        label="Spinner sizes"
        note="Named xs/s/m/l/xl steps use 12/16/20/24/32px at a 16px root; a positive numeric pixel size converts to rem. The default remains 1em."
        align="glyph"
      >
        <Row gap="m" rootAttributes={{ 'data-demo-spinner-sizes': '' }}>
          <LoadingSpinner size="xs" />
          <LoadingSpinner size="s" />
          <LoadingSpinner size="m" />
          <LoadingSpinner size="l" />
          <LoadingSpinner size="xl" />
          <LoadingSpinner size={30} />
        </Row>
      </CatalogExample>
      <CatalogExample
        label="Spinner colors"
        note="Use a semantic foreground token or an application color. Omit color to inherit surrounding text."
        align="glyph"
      >
        <Row gap="m" rootAttributes={{ 'data-demo-spinner-colors': '' }}>
          <LoadingSpinner size="s" />
          <LoadingSpinner size="s" color={uiColor('warning-on-quiet')} />
          <LoadingSpinner size="s" color={foregroundColor('rebeccapurple')} />
        </Row>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
