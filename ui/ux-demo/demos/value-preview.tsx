import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { px } from '@kerfjs/ui/css-values';
import { SunkenPanel } from '@kerfjs/ui/sunken-panel';
import { ValuePreview } from '@kerfjs/ui/value-preview';

const LONG_VALUE = [
  'A title with a deliberate line break',
  'Second line keeps its indentation and a long token:',
  `    ${'recorded-source-'.repeat(18)}`,
  'A final line remains available by scrolling.',
].join('\n');

export function ValuePreviewDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'value-preview' }}>
      <CatalogExample
        label="Two Read-Only Versions"
        note="Each value keeps literal newlines and wraps long tokens inside its own bounded scroll area. SunkenPanel owns the lowered frame."
        align="none"
      >
        <SunkenPanel>
          <ValuePreview label="Their Latest Version" value={LONG_VALUE} />
        </SunkenPanel>
        <SunkenPanel>
          <ValuePreview
            label="Your Version"
            value={'A local edit\nwith a second line.'}
          />
        </SunkenPanel>
      </CatalogExample>
      <CatalogExample
        label="Custom Bounds"
        note="Typed minHeight and maxHeight adjust the scroll window without adding another frame."
        align="none"
      >
        <SunkenPanel>
          <ValuePreview
            label="Long Change"
            value={LONG_VALUE}
            minHeight={px(64)}
            maxHeight={px(160)}
          />
        </SunkenPanel>
      </CatalogExample>
      <CatalogExample label="Empty Value" align="none">
        <SunkenPanel>
          <ValuePreview label="Empty Version" value="" />
        </SunkenPanel>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
