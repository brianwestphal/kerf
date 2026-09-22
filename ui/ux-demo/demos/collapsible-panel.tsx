import '@kerfjs/ui/collapsible-panel.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { CollapsiblePanel } from '@kerfjs/ui/collapsible-panel';

const content = (title: string, detail: string) => (
  <div class="kui-content">
    <div class="kui-content-item">
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  </div>
);

export function CollapsiblePanelDemo() {
  return (
    <CatalogExampleStack
      label="Collapsible panel dock positions"
      rootAttributes={{ 'data-demo': 'collapsible-panel' }}
    >
      <CatalogExample
        label="Left rail"
        note="The panel owns its width and trailing separator; its child owns internal content geometry."
      >
        <CollapsiblePanel
          id="catalog-panel-left"
          side="left"
          size={280}
          label="Project navigator"
          className="demo-collapsible-panel demo-collapsible-panel--rail"
        >
          {content(
            'Navigator',
            'Collapse from panel chrome; restore from adjacent chrome.',
          )}
        </CollapsiblePanel>
      </CatalogExample>
      <CatalogExample
        label="Right rail"
        note="Right-side panels use the mirrored separator and slide direction."
      >
        <CollapsiblePanel
          id="catalog-panel-right"
          side="right"
          size={280}
          label="Selection inspector"
          className="demo-collapsible-panel demo-collapsible-panel--rail"
        >
          {content(
            'Inspector',
            'The application owns size and collapsed state.',
          )}
        </CollapsiblePanel>
      </CatalogExample>
      <CatalogExample
        label="Bottom drawer"
        note="A drawer owns its top separator and controlled height."
      >
        <CollapsiblePanel
          id="catalog-panel-bottom"
          side="bottom"
          size={180}
          label="Build output"
          className="demo-collapsible-panel"
        >
          {content(
            'Build output',
            'Use Workbench when several panels form one shell.',
          )}
        </CollapsiblePanel>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
