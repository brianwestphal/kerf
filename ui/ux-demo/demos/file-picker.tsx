import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { FileDropZone, FilePickerTrigger } from '@kerfjs/ui/file-picker';
import { List } from '@kerfjs/ui/list';
import { ListInsetText } from '@kerfjs/ui/list-inset-text';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Row } from '@kerfjs/ui/row';
import { Text } from '@kerfjs/ui/text';
import { Plus, Upload } from 'lucide';

import { filePickerFiles } from './state.js';

export function FilePickerDemo() {
  const files = filePickerFiles.value;
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'file-picker' }}>
      <CatalogExample
        label="Browse Trigger and Drop Zone"
        note="Choose files with Add or by clicking the zone, or drop files on the zone; wireFilePickers reports both and highlights the zone while dragging."
        viewport={{ width: 'medium' }}
      >
        <List gap="xs">
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
          />
        </List>
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
