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
          Explain this field
        </button>
      </CatalogExample>
      <CatalogExample
        label="Pointer placement"
        note="Right-click or press the button. The content stays in the viewport near the pointer."
        align="inline-control"
      >
        <button type="button" data-anchored-surface-trigger="pointer">
          Open at pointer
        </button>
      </CatalogExample>
      <CatalogExample label="Help inside a modal" align="inline-control">
        <button type="button" data-anchored-surface-open-modal>
          Open dialog
        </button>
        <dialog data-anchored-surface-modal>
          <Text>Dialog content can open interactive anchored help.</Text>
          <button type="button" data-anchored-surface-trigger="modal">
            Explain in dialog
          </button>
          <button type="button" data-anchored-surface-close-modal>
            Close dialog
          </button>
          <div data-kerf-overlay-host data-morph-skip />
        </dialog>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
