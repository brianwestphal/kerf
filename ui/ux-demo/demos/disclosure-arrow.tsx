import { CatalogExample } from '@kerfjs/ui/catalog';
import { DisclosureArrow } from '@kerfjs/ui/disclosure-arrow';
import { ArrowRight } from 'lucide';

import { customDisclosureOpen, disclosureOpen, icon } from './state.js';

export function DisclosureArrowDemo() {
  return (
    <div class="kui-catalog-example-stack" data-demo="disclosure-arrow">
      <CatalogExample
        label="Default"
        note={<>Closed points right, open points down. Toggle to animate.</>}
        align="glyph"
      >
        <button
          type="button"
          class="demo-disclosure-toggle"
          data-action="toggle-disclosure"
          aria-expanded={String(disclosureOpen.value)}
        >
          <DisclosureArrow open={disclosureOpen.value} />
          <span>Details</span>
        </button>
      </CatalogExample>
      <CatalogExample
        label="Replacement icon"
        note={<>A replacement glyph, closed left and open up.</>}
        align="glyph"
      >
        <button
          type="button"
          class="demo-disclosure-toggle"
          data-action="toggle-custom-disclosure"
          aria-expanded={String(customDisclosureOpen.value)}
        >
          <DisclosureArrow
            open={customDisclosureOpen.value}
            openDirection="up"
            closedDirection="left"
            icon={icon(ArrowRight, 'arrow-right')}
          />
          <span>Preview</span>
        </button>
      </CatalogExample>
    </div>
  );
}
