import { CatalogExample } from '@kerfjs/ui/catalog';
import { LoadingSpinner } from '@kerfjs/ui/loading-spinner';

export function LoadingSpinnerDemo() {
  return <div class="kui-catalog-example-stack" data-demo="loading-spinner">
    <CatalogExample label="Meaningful" note={<>Exposes its supplied label to assistive technology.</>} align="glyph"><LoadingSpinner label="Loading preview" /></CatalogExample>
    <CatalogExample label="Decorative" note={<>No label — hidden from assistive technology.</>} align="glyph"><LoadingSpinner /></CatalogExample>
  </div>;
}
