import { Button } from '@kerfjs/ui/button';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ListInsetControl } from '@kerfjs/ui/list-inset-control';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Row } from '@kerfjs/ui/row';
import { TextField } from '@kerfjs/ui/text-field';
import {
  Download,
  FolderOpen,
  MessageSquare,
  PanelRight,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide';

import { buttonToggleConversationOpen } from './state.js';

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
      <CatalogExample
        label="Icon-Only"
        note="With no label, a Button is a square one control height on each side, named by ariaLabel. Beside a field, it lines up with the field below its label."
        viewport={{ width: 'medium' }}
      >
        <ListInsetControl>
          <TextField label="Project Path" value="~/Documents/projects/atlas" />
          <Button
            icon={<LucideIcon icon={FolderOpen} name="folder-open" />}
            ariaLabel="Browse for a Folder"
            action="log-browse"
          />
        </ListInsetControl>
      </CatalogExample>
      <CatalogExample label="Icon-Only Tones and Sizes" align="inline-control">
        <Row wrap>
          <Button
            icon={<LucideIcon icon={RefreshCw} name="refresh-cw" />}
            ariaLabel="Refresh"
            action="log-refresh"
          />
          <Button
            icon={<LucideIcon icon={RefreshCw} name="refresh-cw" />}
            ariaLabel="Refresh (Plain)"
            emphasis="plain"
            action="log-refresh"
          />
          <Button
            icon={<LucideIcon icon={Trash2} name="trash-2" />}
            ariaLabel="Delete"
            tone="danger"
            emphasis="secondary"
            action="log-delete"
          />
          <Button
            icon={<LucideIcon icon={RefreshCw} name="refresh-cw" />}
            ariaLabel="Refresh (Compact)"
            size="compact"
            action="log-refresh"
          />
        </Row>
      </CatalogExample>
      <CatalogExample
        label="Toggle"
        note="pressed makes any Button a toggle: aria-pressed reports it and a pressed look draws on top of its tone and emphasis. The application flips the state. Click it to toggle."
        align="inline-control"
      >
        <Row wrap>
          <Button
            icon={<LucideIcon icon={MessageSquare} name="message-square" />}
            ariaLabel="Show Conversation"
            emphasis="plain"
            pressed={buttonToggleConversationOpen.value}
            action="toggle-button-demo"
          />
          <Button
            icon={<LucideIcon icon={MessageSquare} name="message-square" />}
            emphasis="secondary"
            pressed={buttonToggleConversationOpen.value}
            action="toggle-button-demo"
          >
            Conversation
          </Button>
          <Button
            tone="brand"
            pressed={buttonToggleConversationOpen.value}
            action="toggle-button-demo"
          >
            Live
          </Button>
        </Row>
      </CatalogExample>
      <CatalogExample
        label="Shapes"
        note="shape='pill' rounds the ends fully; an icon-only pill is a circle."
        align="inline-control"
      >
        <Row wrap>
          <Button shape="pill" action="log-more">
            Pill
          </Button>
          <Button
            shape="pill"
            icon={<LucideIcon icon={PanelRight} name="panel-right" />}
            ariaLabel="Inspector (Pill, Pressed)"
            emphasis="plain"
            pressed
          />
          <Button
            shape="pill"
            icon={<LucideIcon icon={PanelRight} name="panel-right" />}
            ariaLabel="Inspector (Pill)"
            emphasis="plain"
            pressed={false}
          />
          <Button
            icon={<LucideIcon icon={PanelRight} name="panel-right" />}
            ariaLabel="Inspector (Disabled)"
            emphasis="plain"
            pressed={false}
            disabled
          />
        </Row>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
