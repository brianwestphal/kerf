import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { remify } from '@kerfjs/ui/css-values';
import { DisclosureArrow } from '@kerfjs/ui/disclosure-arrow';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { ArrowRight } from 'lucide';

import {
  customDisclosureOpen,
  disclosureOpen,
  sizedDisclosureOpen,
} from './state.js';

export function DisclosureArrowDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'disclosure-arrow' }}>
      <CatalogExample
        label="Default"
        note="Closed points right, open points down. Toggle to animate."
        align="inline-control"
      >
        <button
          type="button"
          data-action="toggle-disclosure"
          aria-expanded={String(disclosureOpen.value)}
        >
          <DisclosureArrow open={disclosureOpen.value} />
          <span>Details</span>
        </button>
      </CatalogExample>
      <CatalogExample
        label="Replacement icon"
        note="A replacement glyph, closed left and open up."
        align="inline-control"
      >
        <button
          type="button"
          data-action="toggle-custom-disclosure"
          aria-expanded={String(customDisclosureOpen.value)}
        >
          <DisclosureArrow
            open={customDisclosureOpen.value}
            openDirection="up"
            closedDirection="left"
            icon={<LucideIcon icon={ArrowRight} name="arrow-right" />}
          />
          <span>Preview</span>
        </button>
      </CatalogExample>
      <CatalogExample
        label="Sized"
        note={
          <>
            A typed <code>size</code> (here <code>remify(24)</code>) resizes the
            square visual; the default is 18px.
          </>
        }
        align="inline-control"
      >
        <button
          type="button"
          data-action="toggle-sized-disclosure"
          aria-expanded={String(sizedDisclosureOpen.value)}
        >
          <DisclosureArrow open={sizedDisclosureOpen.value} size={remify(24)} />
          <span>Activity</span>
        </button>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
