import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/input/input.js';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { IconButton } from '@kerfjs/ui/icon-button';
import { ListInsetControl } from '@kerfjs/ui/list-inset-control';
import { Row } from '@kerfjs/ui/row';
import { FolderOpen, RefreshCw, Trash2 } from 'lucide';

export function IconButtonDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'icon-button' }}>
      <CatalogExample
        label="Beside a Field"
        note="A square one control height on each side, aligned with the field below its label."
        viewport={{ width: 'medium' }}
      >
        <ListInsetControl>
          <wa-input label="Project Path" value="~/Documents/projects/atlas" />
          <IconButton
            icon={FolderOpen}
            iconName="folder-open"
            label="Browse for a Folder"
            action="log-browse"
          />
        </ListInsetControl>
      </CatalogExample>
      <CatalogExample label="Appearances and Variants" align="inline-control">
        <Row>
          <IconButton
            icon={RefreshCw}
            iconName="refresh-cw"
            label="Refresh"
            action="log-refresh"
          />
          <IconButton
            icon={RefreshCw}
            iconName="refresh-cw"
            label="Refresh (Plain)"
            appearance="plain"
            action="log-refresh"
          />
          <IconButton
            icon={Trash2}
            iconName="trash-2"
            label="Delete"
            variant="danger"
            appearance="outlined"
            action="log-delete"
          />
          <IconButton
            icon={Trash2}
            iconName="trash-2"
            label="Delete (Disabled)"
            variant="danger"
            disabled
          />
        </Row>
      </CatalogExample>
      <CatalogExample label="Sizes" align="inline-control">
        <Row>
          {(['s', 'm', 'l'] as const).map((size) => (
            <IconButton
              icon={RefreshCw}
              iconName="refresh-cw"
              label={`Refresh (${size})`}
              size={size}
              action="log-refresh"
            />
          ))}
        </Row>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
