import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { List } from '@kerfjs/ui/list';
import { TagField } from '@kerfjs/ui/tag-field';
import { signal } from 'kerfjs';

const INITIAL: Record<string, readonly string[]> = {
  'tag-field-demo-labels': ['bug', 'docs'],
  'tag-field-demo-recipients': ['mara@example.com'],
};
const tags = signal<Record<string, readonly string[]>>({ ...INITIAL });
/** A rejected value's message per field, shown as the field's error. */
const errors = signal<Record<string, string>>({});

/** Apply a TagField's next tags (from `wireTagFields`' onChange). */
export function setTagFieldDemoTags(id: string, next: readonly string[]): void {
  if (!(id in INITIAL)) return;
  tags.value = { ...tags.value, [id]: next };
  if (errors.value[id]) errors.value = { ...errors.value, [id]: '' };
}

/** Show why a typed value was not added. */
export function rejectTagFieldDemoValue(
  id: string,
  value: string,
  reason: 'duplicate' | 'max' | 'invalid',
): void {
  const message =
    reason === 'duplicate'
      ? `“${value}” is already added.`
      : reason === 'max'
        ? 'Remove a recipient to add another.'
        : `“${value}” is not an email address.`;
  errors.value = { ...errors.value, [id]: message };
}

export function resetTagFieldDemo(): void {
  tags.value = { ...INITIAL };
  errors.value = {};
}

export function TagFieldDemo() {
  const current = tags.value;
  const error = errors.value;
  return (
    <CatalogExampleStack
      label="TagField Variants"
      rootAttributes={{ 'data-demo': 'tag-field' }}
    >
      <CatalogExample
        label="Labels"
        note="Type a label and press Enter or a comma; Backspace at the start removes the last tag, a chip's label moves it back to edit, ArrowLeft and ArrowRight move between chips. Each tag submits as its own hidden input."
        viewport={{ width: 'medium' }}
      >
        <TagField
          id="tag-field-demo-labels"
          label="Labels"
          name="labels"
          tags={current['tag-field-demo-labels'] ?? []}
          hint="Press Enter or a comma to add a label."
          error={error['tag-field-demo-labels'] || undefined}
        />
      </CatalogExample>
      <CatalogExample
        label="Validated with a Limit"
        note="max refuses tags past the limit and normalize refuses values the app does not accept; wireTagFields reports each refusal, and the app shows it as the field's error."
        viewport={{ width: 'medium' }}
      >
        <List gap="xs">
          <TagField
            id="tag-field-demo-recipients"
            label="Recipients"
            name="recipients"
            tags={current['tag-field-demo-recipients'] ?? []}
            max={3}
            placeholder="Add an email address…"
            hint="Up to three addresses."
            error={error['tag-field-demo-recipients'] || undefined}
            required
          />
          <TagField
            id="tag-field-demo-locked"
            label="Locked Labels"
            tags={['release', 'frozen']}
            disabled
          />
        </List>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
