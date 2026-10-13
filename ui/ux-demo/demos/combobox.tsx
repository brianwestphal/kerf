import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { Chip } from '@kerfjs/ui/chip';
import { Combobox } from '@kerfjs/ui/combobox';
import { List } from '@kerfjs/ui/list';
import { ListInsetControl } from '@kerfjs/ui/list-inset-control';
import { Row } from '@kerfjs/ui/row';

import { comboboxTags } from './state.js';

const tagSuggestions = ['bug', 'design', 'docs', 'performance', 'regression'];

export function ComboboxDemo() {
  const tags = comboboxTags.value;
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'combobox' }}>
      <CatalogExample
        label="Add or Create a Tag"
        note="Type to filter existing tags; Enter or a comma adds the highlighted tag, or creates the typed one."
        viewport={{ width: 'medium', minHeight: 'medium' }}
      >
        <List gap="xs">
          <Row wrap controlInsets="rl">
            {tags.map((tag) => (
              <Chip>{tag}</Chip>
            ))}
          </Row>
          <ListInsetControl sides="rl">
            <Combobox
              id="demo-tag-combobox"
              label="Tag Name"
              placeholder="Search or create a tag"
              hint="Press Enter to add"
              suggestions={tagSuggestions.filter((tag) => !tags.includes(tag))}
            />
          </ListInsetControl>
        </List>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
