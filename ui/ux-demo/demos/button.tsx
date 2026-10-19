import { Button } from '@kerfjs/ui/button';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ListInsetControl } from '@kerfjs/ui/list-inset-control';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Row } from '@kerfjs/ui/row';
import { SunkenPanel } from '@kerfjs/ui/sunken-panel';
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
        note="Neutral for most actions, brand for the main action, success for a positive one such as pricing, danger for a destructive one."
        align="inline-control"
      >
        <Row wrap>
          <Button action="log-more">Cancel</Button>
          <Button tone="brand" action="log-more">
            Save
          </Button>
          <Button tone="success" action="log-more">
            Price Check
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
      <CatalogExample
        label="Success Emphasis"
        note="A positive action keeps its success tone as a fill, outline, or plain text."
        align="inline-control"
      >
        <Row wrap rootAttributes={{ 'data-demo-section': 'success-emphasis' }}>
          <Button tone="success" action="log-more">
            Price Check
          </Button>
          <Button tone="success" emphasis="secondary" action="log-more">
            Review Prices
          </Button>
          <Button tone="success" emphasis="plain" action="log-more">
            View Results
          </Button>
        </Row>
      </CatalogExample>
      <CatalogExample
        label="Full-Width Primary Action"
        note="fill spans the button across its column instead of sizing it to the label; the label stays centered and ellipsizes once it no longer fits. A link Button (href) fills the same way."
        align="inline-control"
        viewport={{ width: 'compact' }}
      >
        <Button
          tone="brand"
          fill
          icon={<LucideIcon icon={Plus} name="plus" />}
          action="log-more"
          rootAttributes={{ 'data-demo-section': 'fill' }}
        >
          Create Project
        </Button>
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
          <Button tone="success" loading action="log-more">
            Checking Prices
          </Button>
          <Button tone="success" disabled>
            Pricing Unavailable
          </Button>
          <Button disabled>Unavailable</Button>
          <Button emphasis="secondary" disabled>
            Unavailable
          </Button>
        </Row>
      </CatalogExample>
      <CatalogExample
        label="Current Step"
        note="currentStep marks the active step with aria-current=step on a button or link, even when the step is disabled. The application still names each step."
        align="inline-control"
      >
        <Row wrap rootAttributes={{ 'data-demo-section': 'current-step' }}>
          <Button currentStep action="log-more">
            Configure
          </Button>
          <Button action="log-more">Review</Button>
          <Button href="#button" currentStep>
            Current Guide
          </Button>
          <Button currentStep disabled>
            Locked Step
          </Button>
        </Row>
      </CatalogExample>
      <CatalogExample
        label="Icon-Only"
        note="With no label, a Button is a square one control height on each side, named by ariaLabel; badge pins a count or dot to its corner, named by badgeLabel; its help tag repeats that name, and a title (Delete) gives longer native hover text instead. Beside a field, it lines up with the field below its label."
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
            title="Delete the Selected Draft"
            tone="danger"
            emphasis="secondary"
            action="log-delete"
          />
          <Button
            icon={<LucideIcon icon={MessageSquare} name="message-square" />}
            ariaLabel="Messages"
            badge={4}
            badgeLabel="4 unread"
            action="log-more"
            rootAttributes={{ 'data-demo-badge': 'count' }}
          />
          <Button
            icon={<LucideIcon icon={Download} name="download" />}
            ariaLabel="Downloads"
            badge
            badgeLabel="new download"
            badgeTone="info"
            action="log-more"
            rootAttributes={{ 'data-demo-badge': 'dot' }}
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
          <Button
            tone="success"
            pressed={buttonToggleConversationOpen.value}
            action="toggle-button-demo"
          >
            Approved
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
      <CatalogExample
        label="Inside a Clipping Container"
        note="focusRingInset keeps the focus ring inside the box when an ancestor clips overflow, as this frame does. A surface-colored line inside the ring keeps it visible on a loud fill of its own hue. Focus one to see it."
        align="inline-control"
        viewport={{ overflow: 'hidden' }}
      >
        <Row wrap rootAttributes={{ 'data-demo-section': 'focus-ring-inset' }}>
          <Button focusRingInset action="log-more">
            Dismiss
          </Button>
          <Button tone="brand" focusRingInset action="log-more">
            Confirm
          </Button>
          <Button tone="success" focusRingInset action="log-more">
            Apply
          </Button>
          <Button tone="danger" focusRingInset action="log-more">
            Erase
          </Button>
        </Row>
      </CatalogExample>
      <CatalogExample
        label="Inset Ring on a Sunken Surface"
        note="The line inside an inset ring paints the surface the button sits on, so on a sunken or tinted surface it reads as a cut through the fill rather than a light halo."
        align="inline-control"
        viewport={{ overflow: 'hidden' }}
      >
        <SunkenPanel ariaLabel="Sunken Actions">
          <Row
            wrap
            rootAttributes={{ 'data-demo-section': 'focus-ring-inset-sunken' }}
          >
            <Button focusRingInset action="log-more">
              Dismiss
            </Button>
            <Button tone="brand" focusRingInset action="log-more">
              Confirm
            </Button>
            <Button tone="success" focusRingInset action="log-more">
              Apply
            </Button>
            <Button tone="danger" focusRingInset action="log-more">
              Erase
            </Button>
          </Row>
        </SunkenPanel>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
