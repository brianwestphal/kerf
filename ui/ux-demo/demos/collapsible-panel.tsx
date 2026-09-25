import './collapsible-panel.css';
import '@kerfjs/ui/collapsible-panel.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { CollapsiblePanel } from '@kerfjs/ui/collapsible-panel';

import { DemoContentItem } from './demo-content-item.js';

const content = (title: string, detail: string) => (
  <div class="kui-content">
    <DemoContentItem title={title} detail={detail} />
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
        <div class="demo-collapsible-panel--rail">
          <CollapsiblePanel
            id="catalog-panel-left"
            side="left"
            size={280}
            label="Project navigator"
          >
            {content(
              'Navigator',
              'Collapse from panel chrome; restore from adjacent chrome.',
            )}
          </CollapsiblePanel>
        </div>
      </CatalogExample>
      <CatalogExample
        label="Right rail"
        note="Right-side panels use the mirrored separator and slide direction."
      >
        <div class="demo-collapsible-panel--rail">
          <CollapsiblePanel
            id="catalog-panel-right"
            side="right"
            size={280}
            label="Selection inspector"
          >
            {content(
              'Inspector',
              'The application owns size and collapsed state.',
            )}
          </CollapsiblePanel>
        </div>
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
