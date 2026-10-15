import { Button } from '@kerfjs/ui/button';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Row } from '@kerfjs/ui/row';
import { Download, Plus, Trash2 } from 'lucide';

export function ButtonDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'button' }}>
      <CatalogExample
        label="Tones"
        note="Neutral for most actions, brand for the main action, danger for a destructive one."
        align="inline-control"
      >
        <Row wrap>
          <Button action="log-more">Cancel</Button>
          <Button tone="brand" action="log-more">
            Save
          </Button>
          <Button tone="danger" action="log-more">
            Delete
          </Button>
        </Row>
      </CatalogExample>
      <CatalogExample
        label="Emphasis"
        note="Primary fills the button, secondary outlines it, and plain shows only its text until hovered."
        align="inline-control"
      >
        <Row wrap>
          <Button tone="brand" emphasis="primary" action="log-more">
            Primary
          </Button>
          <Button tone="brand" emphasis="secondary" action="log-more">
            Secondary
          </Button>
          <Button tone="brand" emphasis="plain" action="log-more">
            Plain
          </Button>
        </Row>
      </CatalogExample>
      <CatalogExample label="Compact and Icons" align="inline-control">
        <Row wrap vAlign="middle">
          <Button
            size="compact"
            icon={<LucideIcon icon={Plus} name="plus" size="s" />}
            action="log-more"
          >
            New Item
          </Button>
          <Button
            emphasis="secondary"
            icon={<LucideIcon icon={Download} name="download" size="s" />}
            href="#button"
          >
            Download
          </Button>
          <Button
            tone="danger"
            emphasis="plain"
            icon={<LucideIcon icon={Trash2} name="trash-2" size="s" />}
            action="log-more"
          >
            Remove
          </Button>
        </Row>
      </CatalogExample>
      <CatalogExample
        label="States"
        note="A busy button shows a spinner in place of its label and reports aria-busy; a disabled button dims."
        align="inline-control"
      >
        <Row wrap>
          <Button tone="brand" loading action="log-more">
            Saving
          </Button>
          <Button disabled>Unavailable</Button>
          <Button emphasis="secondary" disabled>
            Unavailable
          </Button>
        </Row>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
