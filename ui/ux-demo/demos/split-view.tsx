import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/list.css';
import '@kerfjs/ui/list-header.css';
import '@kerfjs/ui/list-item.css';
import '@kerfjs/ui/lucide-icon.css';
import '@kerfjs/ui/nav-stack.css';
import '@kerfjs/ui/split-view.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { List } from '@kerfjs/ui/list';
import { ListHeader } from '@kerfjs/ui/list-header';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { SplitView } from '@kerfjs/ui/split-view';
import { signal } from 'kerfjs';
import { ChevronRight, MessageSquareText } from 'lucide';

import { DemoContentItem } from './demo-content-item.js';

interface Message {
  id: string;
  subject: string;
  sender: string;
  preview: string;
  body: string;
}

const MESSAGES: readonly Message[] = [
  {
    id: 'project-update',
    subject: 'Project update',
    sender: 'Mina Chen',
    preview: 'The interaction pass is ready for review.',
    body: 'The interaction pass is ready. Please review the navigation and responsive states before Thursday.',
  },
  {
    id: 'design-review',
    subject: 'Design review',
    sender: 'Sam Rivera',
    preview: 'Notes from today’s component review.',
    body: 'Today’s review notes cover list density, detail hierarchy, and the remaining compact-layout checks.',
  },
  {
    id: 'launch-plan',
    subject: 'Launch plan',
    sender: 'Avery Singh',
    preview: 'Beta milestones and owner assignments.',
    body: 'The beta milestones now have owners. The final readiness check is scheduled for next week.',
  },
];

const selectedMessageId = signal<string | null>(null);
const roomyMessageId = signal(MESSAGES[0].id);

function selectedMessage(): Message | undefined {
  return MESSAGES.find(({ id }) => id === selectedMessageId.value);
}

export function resetSplitViewDemo(): void {
  selectedMessageId.value = null;
  roomyMessageId.value = MESSAGES[0].id;
}

export function selectSplitViewMessage(id: string): void {
  if (MESSAGES.some((message) => message.id === id))
    selectedMessageId.value = id;
}

export function selectRoomySplitViewMessage(id: string): void {
  if (MESSAGES.some((message) => message.id === id)) roomyMessageId.value = id;
}

export function clearSplitViewSelection(): void {
  selectedMessageId.value = null;
}

function messageList(action: string, selectedId: string | null = null) {
  return (
    <List>
      {[
        <ListHeader
          label="Inbox"
          count={MESSAGES.length}
          countLabel={`${MESSAGES.length} messages`}
        />,
        ...MESSAGES.map((message) => (
          <ListItem
            action={action}
            itemId={message.id}
            label={message.subject}
            description={`${message.sender} · ${message.preview}`}
            icon={<LucideIcon icon={MessageSquareText} name="message" />}
            trailing={<LucideIcon icon={ChevronRight} name="chevron-right" />}
            selected={message.id === selectedId}
            multiline
          />
        )),
      ]}
    </List>
  );
}

function messageDetail(message: Message) {
  return (
    <div class="kui-content">
      <DemoContentItem
        eyebrow={`From ${message.sender}`}
        title={message.subject}
        detail={message.body}
      />
    </div>
  );
}

export function SplitViewDemo() {
  const compactSelection = selectedMessage();
  const roomySelection =
    MESSAGES.find(({ id }) => id === roomyMessageId.value) ?? MESSAGES[0];
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'split-view' }}>
      <CatalogExample
        label="Roomy list-detail split"
        note="The public list-width token controls the fixed primary pane; selection stays visible alongside its detail."
        align="none"
        viewport={{
          layout: 'grid',
          width: 'full',
          height: 'medium',
          frame: 'solid',
          responsive: 'roomy-only',
          tokens: { '--kui-split-view-list-width': '15rem' },
        }}
      >
        <SplitView
          id="catalog-split-view-roomy"
          label="Messages"
          listTitle="Threads"
          detailTitle={roomySelection.subject}
          list={messageList(
            'select-roomy-split-view-message',
            roomySelection.id,
          )}
          detail={messageDetail(roomySelection)}
        />
      </CatalogExample>
      <CatalogExample
        label="Interactive compact drill-down"
        note="Choose a message to push its detail into the controlled navigation stack. Back clears the selection and restores the list."
        align="none"
        viewport={{
          layout: 'grid',
          width: 'compact',
          height: 'medium',
          frame: 'solid',
        }}
      >
        <SplitView
          id="catalog-split-view-compact"
          label="Compact messages"
          compact
          detailActive={Boolean(compactSelection)}
          listTitle="Inbox"
          detailTitle={compactSelection?.subject ?? ''}
          backLabel="Back to inbox"
          list={messageList('open-split-view-message')}
          detail={
            compactSelection ? messageDetail(compactSelection) : <div></div>
          }
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
