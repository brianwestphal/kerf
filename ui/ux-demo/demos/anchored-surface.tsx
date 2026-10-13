import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { Text } from '@kerfjs/ui/text';

export function AnchoredSurfaceDemo() {
  return (
    <CatalogExampleStack
      label="AnchoredSurface demo"
      rootAttributes={{ 'data-demo': 'anchored-surface' }}
    >
      <CatalogExample label="Interactive help" align="inline-control">
        <button type="button" data-anchored-surface-trigger="element">
          Explain This Field
        </button>
      </CatalogExample>
      <CatalogExample
        label="Pointer placement"
        note="Right-click or press the button. The content stays in the viewport near the pointer."
        align="inline-control"
      >
        <button type="button" data-anchored-surface-trigger="pointer">
          Open at Pointer
        </button>
      </CatalogExample>
      <CatalogExample label="Help inside a modal" align="inline-control">
        <button type="button" data-anchored-surface-open-modal>
          Open Dialog
        </button>
        <wa-dialog data-anchored-surface-modal label="Field settings">
          <Text>Dialog content can open interactive anchored help.</Text>
          <button type="button" data-anchored-surface-trigger="modal">
            Explain in Dialog
          </button>
          <button type="button" slot="footer" data-dialog="close">
            Close Dialog
          </button>
        </wa-dialog>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
