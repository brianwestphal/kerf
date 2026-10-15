import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { RadioGroup } from '@kerfjs/ui/radio-group';

import { radioDensity } from './state.js';

export function RadioGroupDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'radio-group' }}>
      <CatalogExample
        label="Vertical"
        note="One Tab stop; the arrow keys move and select. A choice may carry its own hint."
        align="inline-control"
      >
        <RadioGroup
          label="Layout Density"
          name="layout-density"
          value={radioDensity.value}
          hint="Applies to every list."
          action="radio-group-demo"
          choices={[
            { value: 'compact', label: 'Compact' },
            { value: 'balanced', label: 'Balanced' },
            {
              value: 'roomy',
              label: 'Roomy',
              hint: 'Larger rows for touch screens.',
            },
            { value: 'custom', label: 'Custom', disabled: true },
          ]}
        />
      </CatalogExample>
      <CatalogExample
        label="Horizontal and Compact"
        note="Short choices can line up and wrap; an error marks the group invalid."
        align="inline-control"
      >
        <RadioGroup
          label="Release Channel"
          name="release-channel"
          size="compact"
          orientation="horizontal"
          required
          error="Choose a channel."
          action="radio-group-demo"
          choices={[
            { value: 'stable', label: 'Stable' },
            { value: 'beta', label: 'Beta' },
            { value: 'nightly', label: 'Nightly' },
          ]}
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
