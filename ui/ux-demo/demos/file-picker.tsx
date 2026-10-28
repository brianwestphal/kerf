import { Button } from '@kerfjs/ui/button';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { FileDropZone, FilePickerTrigger } from '@kerfjs/ui/file-picker';
import { List } from '@kerfjs/ui/list';
import { ListInsetText } from '@kerfjs/ui/list-inset-text';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Row } from '@kerfjs/ui/row';
import { Text } from '@kerfjs/ui/text';
import { FolderOpen, Plus, Save, Upload } from 'lucide';

import { filePickerFiles } from './state.js';

export function FilePickerDemo() {
  const files = filePickerFiles.value;
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'file-picker' }}>
      <CatalogExample
        label="Browse Trigger and Drop Zone"
        note="Choose files with Add or by clicking the zone, or drop files anywhere on the attachments panel: the zone's dropScope names the panel, so wireFilePickers highlights the zone while files are over any part of it and reports drops there for the zone."
        viewport={{ width: 'medium' }}
      >
        <List gap="xs" rootAttributes={{ 'data-demo-attachments-panel': '' }}>
          <Row
            hAlign="space-between"
            vAlign="middle"
            textInsets="l"
            controlInsets="r"
          >
            <Text variant="h3" size="compact" flush>
              Attachments
            </Text>
            <FilePickerTrigger
              label="Add"
              accessibleLabel="Browse attachments"
              icon={<LucideIcon icon={Plus} name="plus" />}
              multiple
              pickerId="demo-attachments"
            />
          </Row>
          {files.length > 0 ? (
            <ListInsetText>{files.join(', ')}</ListInsetText>
          ) : (
            <></>
          )}
          <FileDropZone
            title="Drop attachments here or browse"
            detail="Images and PDFs, up to 10 MB each"
            accessibleLabel="Add attachments by dropping or choosing files"
            icon={<LucideIcon icon={Upload} name="upload" />}
            accept="image/*,.pdf"
            multiple
            pickerId="demo-drop"
            dropScope="[data-demo-attachments-panel]"
          />
        </List>
      </CatalogExample>
      <CatalogExample
        label="Button Look"
        note="With tone, emphasis, or size, the trigger looks like the Button beside it and stays a native file label."
        viewport={{ width: 'medium' }}
      >
        <Row
          gap="xs"
          vAlign="middle"
          controlInsets="trbl"
          rootAttributes={{ 'data-demo-file-buttons': '' }}
        >
          <FilePickerTrigger
            label="Import"
            accessibleLabel="Import a document"
            icon={<LucideIcon icon={FolderOpen} name="folder-open" />}
            tone="brand"
            pickerId="demo-import"
          />
          <FilePickerTrigger
            label="Open"
            icon={<LucideIcon icon={FolderOpen} name="folder-open" />}
            emphasis="plain"
            size="compact"
            pickerId="demo-open"
          />
          <Button
            emphasis="plain"
            size="compact"
            icon={<LucideIcon icon={Save} name="save" />}
          >
            Save
          </Button>
        </Row>
      </CatalogExample>
      <CatalogExample label="Disabled" viewport={{ width: 'medium' }}>
        <FileDropZone
          title="Uploads are paused"
          icon={<LucideIcon icon={Upload} name="upload" />}
          disabled
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
