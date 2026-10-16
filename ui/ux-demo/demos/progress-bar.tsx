import { Button } from '@kerfjs/ui/button';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { List } from '@kerfjs/ui/list';
import { ProgressBar } from '@kerfjs/ui/progress-bar';
import { Row } from '@kerfjs/ui/row';
import { signal } from 'kerfjs';

/** The delegated action that advances the demo upload by one file. */
export const STEP_PROGRESS_DEMO_ACTION = 'step-progress-demo';

const TOTAL_FILES = 12;
/** Files uploaded so far, shared by the ProgressBar and ProgressRing demos. */
export const progressDemoFiles = signal(3);

/** Advance the demo upload one file, wrapping back to none after the last. */
export function stepProgressDemo(): number {
  progressDemoFiles.value =
    progressDemoFiles.value >= TOTAL_FILES ? 0 : progressDemoFiles.value + 1;
  return progressDemoFiles.value;
}

export function resetProgressDemo(): void {
  progressDemoFiles.value = 3;
}

export function ProgressBarDemo() {
  const files = progressDemoFiles.value;
  return (
    <CatalogExampleStack
      label="ProgressBar Variants"
      rootAttributes={{ 'data-demo': 'progress-bar' }}
    >
      <CatalogExample
        label="Determinate"
        viewport={{ width: 'medium' }}
        note="A native progress element: value of max, a visible label that names it, and the value (or valueText) at the end of the label row. Upload Next File advances it."
      >
        <List gap="xs">
          <ProgressBar
            id="progress-bar-demo-upload"
            label="Uploading Files"
            value={files}
            max={TOTAL_FILES}
            valueText={`${files} of ${TOTAL_FILES} files`}
            showValue
          />
          <Row>
            <Button action={STEP_PROGRESS_DEMO_ACTION}>Upload Next File</Button>
          </Row>
        </List>
      </CatalogExample>
      <CatalogExample
        label="Indeterminate"
        viewport={{ width: 'medium' }}
        note="Without a value the bar sweeps a band across its track, for work whose size is unknown; the band holds still under reduced motion."
      >
        <ProgressBar
          id="progress-bar-demo-migration"
          label="Migrating Database"
        />
      </CatalogExample>
      <CatalogExample
        label="Tones and Compact Size"
        viewport={{ width: 'medium' }}
        note="tone colors the fill for a status; size compact is a 4px track for a row or table cell. Without a visible label, ariaLabel names it."
      >
        <List gap="xs">
          <ProgressBar
            id="progress-bar-demo-confidence"
            label="Confidence"
            value={0.82}
            tone="success"
            showValue
          />
          <ProgressBar
            id="progress-bar-demo-storage"
            label="Storage Used"
            value={0.93}
            tone="warning"
            showValue
          />
          <ProgressBar ariaLabel="Sync Progress" value={0.4} size="compact" />
        </List>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
