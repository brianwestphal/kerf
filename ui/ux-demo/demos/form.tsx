import { Button } from '@kerfjs/ui/button';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { Form } from '@kerfjs/ui/form';
import { List } from '@kerfjs/ui/list';
import { Row } from '@kerfjs/ui/row';
import { Spacer } from '@kerfjs/ui/spacer';
import { TextField } from '@kerfjs/ui/text-field';

export function FormDemo() {
  return (
    <CatalogExampleStack
      label="Form Variants"
      rootAttributes={{ 'data-demo': 'form' }}
    >
      <CatalogExample
        label="Native Validation"
        note="Save or Enter in the field submits the form; the browser checks the required field first, and the page never navigates. The submit handler reads the field with FormData."
        viewport={{ width: 'compact' }}
      >
        <Form id="form-demo-native" action="form-demo">
          <List gap="xs" controlInsets="rl">
            <TextField
              name="project"
              label="Project Name"
              hint="Required. Press Enter or Save."
              required
            />
            <Row gap="xs">
              <Spacer flex />
              <Button type="submit" tone="brand">
                Save
              </Button>
            </Row>
          </List>
        </Form>
      </CatalogExample>
      <CatalogExample
        label="Application Validation"
        note="noValidate skips the browser's checks, so the submit handler validates the value and reports the result itself."
        viewport={{ width: 'compact' }}
      >
        <Form id="form-demo-app" action="form-demo" noValidate>
          <List gap="xs" controlInsets="rl">
            <TextField name="project" label="Project Name" required />
            <Row gap="xs">
              <Spacer flex />
              <Button type="submit" tone="brand">
                Save
              </Button>
            </Row>
          </List>
        </Form>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
