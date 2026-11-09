import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';

import { renderHeaders } from '../views/headers.view.js';

export function HeadersDemo() {
  return (
    <CatalogExampleStack
      label="Heading Compositions"
      rootAttributes={{ 'data-demo': 'headers' }}
    >
      <CatalogExample label="Page and Panel Headings">
        {renderHeaders()}
      </CatalogExample>
    </CatalogExampleStack>
  );
}
