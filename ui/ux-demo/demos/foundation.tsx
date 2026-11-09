import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';

import { renderFoundationPalette } from '../views/foundation-palette.view.js';
import { renderFoundationTypeSpacing } from '../views/foundation-type-spacing.view.js';

export function FoundationDemo() {
  return (
    <CatalogExampleStack
      label="Foundation Token Examples"
      rootAttributes={{ 'data-demo': 'foundation' }}
    >
      <CatalogExample
        label="Semantic Palette"
        note="Foundation roles stay readable in the active light or dark theme."
        align="none"
      >
        {renderFoundationPalette()}
      </CatalogExample>
      <CatalogExample
        label="Type and Spacing"
        note="The public scale keeps application-owned composition aligned with component defaults."
        align="none"
      >
        {renderFoundationTypeSpacing()}
      </CatalogExample>
    </CatalogExampleStack>
  );
}
