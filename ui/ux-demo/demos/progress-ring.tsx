import { Button } from '@kerfjs/ui/button';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ProgressRing } from '@kerfjs/ui/progress-ring';
import { Row } from '@kerfjs/ui/row';
import { Text } from '@kerfjs/ui/text';

import {
  progressDemoFiles,
  STEP_PROGRESS_DEMO_ACTION,
} from './progress-bar.js';

export function ProgressRingDemo() {
  const files = progressDemoFiles.value;
  return (
    <CatalogExampleStack
      label="ProgressRing Variants"
      rootAttributes={{ 'data-demo': 'progress-ring' }}
    >
      <CatalogExample
        label="Sizes"
        note="small sits in a line of text, medium (the default) beside an icon in a row or toolbar, and large on its own. Upload Next File advances them."
        align="inline-control"
      >
        <Row gap="m" vAlign="middle">
          {(['small', 'medium', 'large'] as const).map((size) => (
            <ProgressRing
              label={`Upload Progress, ${size}`}
              value={files}
              max={12}
              valueText={`${files} of 12 files`}
              size={size}
            />
          ))}
          <Button action={STEP_PROGRESS_DEMO_ACTION}>Upload Next File</Button>
        </Row>
      </CatalogExample>
      <CatalogExample
        label="Tones and Indeterminate"
        note="tone colors the arc for a status. Without a value the ring spins a quarter arc; it holds still under reduced motion."
        align="inline-control"
      >
        <Row gap="m" vAlign="middle">
          <ProgressRing
            label="Claim Time Remaining"
            value={0.75}
            tone="success"
          />
          <ProgressRing label="Quota Used" value={0.9} tone="warning" />
          <ProgressRing label="Error Budget Used" value={0.98} tone="danger" />
          <ProgressRing label="Connecting" />
          <Text>Connecting…</Text>
        </Row>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
