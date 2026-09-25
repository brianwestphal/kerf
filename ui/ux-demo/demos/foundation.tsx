import './foundation.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';

const tones = [
  ['Brand', 'brand'],
  ['Pop', 'pop'],
  ['Success', 'success'],
  ['Warning', 'warning'],
  ['Danger', 'danger'],
] as const;

export function FoundationDemo() {
  return (
    <CatalogExampleStack
      label="Foundation token examples"
      rootAttributes={{ 'data-demo': 'foundation' }}
    >
      <CatalogExample
        label="Semantic palette"
        note="Foundation roles stay readable in the active light or dark theme."
        align="none"
      >
        <div class="demo-foundation__tones">
          {tones.map(([label, tone]) => (
            <div class={`demo-foundation__tone demo-foundation__tone--${tone}`}>
              <strong>{label}</strong>
              <span class="demo-foundation__caption">
                Quiet semantic surface
              </span>
            </div>
          ))}
        </div>
      </CatalogExample>
      <CatalogExample
        label="Type and spacing"
        note="The public scale keeps application-owned composition aligned with component defaults."
        align="none"
      >
        <div class="demo-foundation__rhythm">
          <strong class="demo-foundation__heading">Application heading</strong>
          <span class="demo-foundation__caption demo-foundation__caption--quiet">
            Body copy uses the shared sans-serif and standard group gap.
          </span>
          <code class="demo-foundation__caption demo-foundation__caption--quiet">
            --kui-space-xs · --kui-font-s
          </code>
        </div>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
