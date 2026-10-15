import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { List } from '@kerfjs/ui/list';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { TextField } from '@kerfjs/ui/text-field';
import { Search } from 'lucide';

export function TextFieldDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'text-field' }}>
      <CatalogExample
        label="Labels and Hints"
        note="The label sits above the field and the hint below it; both name and describe the input."
        align="inline-control"
      >
        <List gap="xs">
          <TextField
            label="Project Name"
            value="Component library"
            hint="Visible to collaborators"
            clearable
          />
          <TextField
            ariaLabel="Search Components"
            placeholder="Search components"
            icon={<LucideIcon icon={Search} name="search" size="s" />}
            type="search"
            clearable
          />
        </List>
      </CatalogExample>
      <CatalogExample
        label="Validation"
        note="An error replaces nothing: it follows the hint in the danger color and marks the field invalid."
        align="inline-control"
      >
        <List gap="xs">
          <TextField
            label="Email"
            type="email"
            value="robin@"
            hint="Used for sign-in."
            error="Enter a complete email address."
            required
          />
          <TextField label="Owner" value="Design Systems" readOnly />
        </List>
      </CatalogExample>
      <CatalogExample
        label="Compact"
        note="The compact size matches compact Buttons and Selects."
        align="inline-control"
      >
        <List gap="xs">
          <TextField size="compact" label="Quantity" value="12" />
          <TextField size="compact" label="Unit" value="pieces" disabled />
        </List>
      </CatalogExample>
      <CatalogExample
        label="Multiple Lines"
        note="A fixed-height textarea resizes vertically; a growing one follows its content up to maxRows, then scrolls."
        align="inline-control"
      >
        <List gap="xs">
          <TextField
            multiline
            rows={4}
            label="Release Note"
            value="Every free component has a focused catalog route."
            hint="Markdown is supported."
            maxLength={200}
            showCount
          />
          <TextField
            multiline
            rows={2}
            maxRows={6}
            label="Comment"
            placeholder="Grows as you type"
          />
        </List>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
