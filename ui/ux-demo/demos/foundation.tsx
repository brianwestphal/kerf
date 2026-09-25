import '@awesome.me/webawesome/dist/components/callout/callout.js';
import '@awesome.me/webawesome/dist/components/card/card.js';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { Grid } from '@kerfjs/ui/grid';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { Text } from '@kerfjs/ui/text';

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
        <Grid columns={2} gap="xs">
          {tones.map(([label, tone]) =>
            tone === 'brand' ? (
              <wa-callout variant="brand">
                <strong>{label}</strong> · Quiet semantic surface
              </wa-callout>
            ) : (
              <StateBanner
                tone={tone}
                title={label}
                detail="Quiet semantic surface"
              />
            ),
          )}
        </Grid>
      </CatalogExample>
      <CatalogExample
        label="Type and spacing"
        note="The public scale keeps application-owned composition aligned with component defaults."
        align="none"
      >
        <wa-card appearance="outlined">
          <Text variant="h3">Application heading</Text>
          <Text tone="quiet">
            Body copy uses the shared sans-serif and standard group gap.
          </Text>
          <Text tone="quiet" size="compact" font="monospace">
            --kui-space-xs · --kui-font-s
          </Text>
        </wa-card>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
