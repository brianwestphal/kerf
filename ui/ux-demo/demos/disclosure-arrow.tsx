import { Button } from '@kerfjs/ui/button';
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

// KF-DE348P: DisclosureArrow is the specimen, the icon of the Button that
// owns it and reports its state with `expanded` (aria-expanded).
export function DisclosureArrowDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'disclosure-arrow' }}>
      <CatalogExample
        label="Default"
        note="Closed points right, open points down. Toggle to animate."
        align="inline-control"
      >
        <Button
          emphasis="plain"
          action="toggle-disclosure"
          expanded={disclosureOpen.value}
          icon={<DisclosureArrow open={disclosureOpen.value} />}
        >
          Details
        </Button>
      </CatalogExample>
      <CatalogExample
        label="Replacement Icon"
        note="A replacement glyph, closed left and open up."
        align="inline-control"
      >
        <Button
          emphasis="plain"
          action="toggle-custom-disclosure"
          expanded={customDisclosureOpen.value}
          icon={
            <DisclosureArrow
              open={customDisclosureOpen.value}
              openDirection="up"
              closedDirection="left"
              icon={<LucideIcon icon={ArrowRight} name="arrow-right" />}
            />
          }
        >
          Preview
        </Button>
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
        <Button
          emphasis="plain"
          action="toggle-sized-disclosure"
          expanded={sizedDisclosureOpen.value}
          icon={
            <DisclosureArrow
              open={sizedDisclosureOpen.value}
              size={remify(24)}
            />
          }
        >
          Activity
        </Button>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
