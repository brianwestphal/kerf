import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { Checkbox } from '@kerfjs/ui/checkbox';
import { List } from '@kerfjs/ui/list';

import { checkboxTasks } from './state.js';

export const checkboxTaskChoices = [
  { value: 'design', label: 'Design review' },
  { value: 'build', label: 'Build release' },
  { value: 'ship', label: 'Ship to customers' },
] as const;

export function CheckboxDemo() {
  const done = checkboxTasks.value;
  const all = done.length === checkboxTaskChoices.length;
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'checkbox' }}>
      <CatalogExample
        label="States"
        note="The label names the checkbox; a hint sits on the label's column and describes it."
        align="inline-control"
      >
        <List gap="xs">
          <Checkbox label="Include in release" checked action="checkbox-demo" />
          <Checkbox
            label="Email summaries"
            hint="Sent every Monday morning."
            action="checkbox-demo"
          />
          <Checkbox label="Locked setting" checked disabled />
          <Checkbox
            label="I accept the release terms"
            required
            error="Accept the terms to publish."
            action="checkbox-demo"
          />
        </List>
      </CatalogExample>
      <CatalogExample
        label="Mixed State"
        note="A parent checkbox is mixed while only some of its children are checked; checking it checks them all."
        align="inline-control"
      >
        <List gap="xs">
          <Checkbox
            label="All tasks"
            name="tasks-all"
            checked={all}
            indeterminate={done.length > 0 && !all}
            action="checkbox-demo"
          />
          {checkboxTaskChoices.map((task) => (
            <Checkbox
              label={task.label}
              name="tasks"
              value={task.value}
              checked={done.includes(task.value)}
              action="checkbox-demo"
            />
          ))}
        </List>
      </CatalogExample>
      <CatalogExample label="Compact" align="inline-control">
        <List gap="xs">
          <Checkbox
            size="compact"
            label="Show archived"
            checked
            action="checkbox-demo"
          />
          <Checkbox
            size="compact"
            label="Show drafts"
            hint="Only yours."
            action="checkbox-demo"
          />
        </List>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
