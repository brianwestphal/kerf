import '@kerfjs/ui/foundation.css';
import '@kerfjs/ui/button.css';
import '@kerfjs/ui/document.css';
import '@kerfjs/ui/lucide-icon.css';
import '@kerfjs/ui/row.css';
import '@kerfjs/ui/select.css';
import '@kerfjs/ui/text-field.css';

import { Button } from '@kerfjs/ui/button';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Row, wireRowControlAlignment } from '@kerfjs/ui/row';
import { Select } from '@kerfjs/ui/select';
import { TextField } from '@kerfjs/ui/text-field';
import { mount, signal } from 'kerfjs';
import { Trash2 } from 'lucide';

const root = document.querySelector<HTMLElement>('[data-fixture-root]')!;
const choices = [{ label: 'Triage', value: 'triage' }];
const invalid = signal(true);

mount(root, () => (
  <>
    <Row wrap vAlign="control" ariaLabel="Workflow rule">
      <Select
        className="fixture-field"
        name="step"
        label="Step"
        choices={choices}
        value="triage"
      />
      <Select
        className="fixture-field"
        name="match"
        label="Once a matching task enters the workflow"
        choices={choices}
        value={invalid.value ? '' : 'triage'}
        placeholderText="Select a step"
        hint="Choose the step that starts the workflow."
        error={invalid.value ? 'Choose a step before saving.' : undefined}
      />
      <Button
        ariaLabel="Remove rule"
        icon={<LucideIcon icon={Trash2} name="trash-2" size="s" />}
      />
    </Row>
    <Row vAlign="control" ariaLabel="Rule name">
      <TextField name="name" label="Rule name" value="Triage new tasks" />
      <Button>Rename</Button>
    </Row>
  </>
));
wireRowControlAlignment(root);
root.addEventListener('fixture:clear-error', () => {
  invalid.value = false;
});
