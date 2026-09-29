import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/list.css';
import '@kerfjs/ui/list-header.css';
import '@kerfjs/ui/list-item.css';
import '@kerfjs/ui/lucide-icon.css';
import '@kerfjs/ui/nav-stack.css';
import '@kerfjs/ui/split-view.css';
import '@kerfjs/ui/floating-toolbar.css';
import '@kerfjs/ui/pane.css';
import '@kerfjs/ui/resizable-region.css';
import '@kerfjs/ui/toolbar.css';
import '@kerfjs/ui/toolbar-control-group.css';
import '@kerfjs/ui/toolbar-text.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { FloatingToolbar } from '@kerfjs/ui/floating-toolbar';
import { List } from '@kerfjs/ui/list';
import { ListHeader } from '@kerfjs/ui/list-header';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Pane } from '@kerfjs/ui/pane';
import { SplitView } from '@kerfjs/ui/split-view';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { signal } from 'kerfjs';
import {
  Archive,
  ChevronRight,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Reply,
  SquarePen,
} from 'lucide';

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

/** The resizable example's list region id, which `wireResizableRegions` reports. */
export const RESIZABLE_SPLIT_VIEW_LIST_ID = 'catalog-split-view-resizable-list';
/** The `data-action` both of the resizable example's list toggles carry. */
export const TOGGLE_SPLIT_VIEW_LIST_ACTION = 'toggle-split-view-list';

const LIST_SIZE = 280;

const selectedMessageId = signal<string | null>(null);
const roomyMessageId = signal(MESSAGES[0].id);
const resizableListSize = signal(LIST_SIZE);
const resizableListCollapsed = signal(false);

function selectedMessage(): Message | undefined {
  return MESSAGES.find(({ id }) => id === selectedMessageId.value);
}

export function resetSplitViewDemo(): void {
  selectedMessageId.value = null;
  roomyMessageId.value = MESSAGES[0].id;
  resizableListSize.value = LIST_SIZE;
  resizableListCollapsed.value = false;
}

/** Record the resizable list's committed width so a re-render keeps it. */
export function resizeSplitViewList(size: number): void {
  resizableListSize.value = size;
}

/** Collapse or restore the resizable list; returns whether it is now collapsed. */
export function toggleSplitViewList(): boolean {
  resizableListCollapsed.value = !resizableListCollapsed.value;
  return resizableListCollapsed.value;
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

function iconGroup(
  label: string,
  icon: typeof Archive,
  name: string,
  action = 'split-view-demo-command',
) {
  return (
    <ToolbarControlGroup label={label} appearance="borderless" single>
      <button type="button" aria-label={label} data-action={action}>
        <LucideIcon icon={icon} name={name} />
      </button>
    </ToolbarControlGroup>
  );
}

function messageList(
  action: string,
  selectedId: string | null = null,
  header = true,
) {
  return (
    <List>
      {[
        ...(header
          ? [
              <ListHeader
                label="Inbox"
                count={MESSAGES.length}
                countLabel={`${MESSAGES.length} messages`}
              />,
            ]
          : []),
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
        label="Resizable, collapsible list"
        note="resizable forwards the list's ResizableRegion options: drag the hidden separator to resize, or hide the list and restore it from the FloatingToolbar that docks in the split's corner."
        align="none"
        viewport={{
          layout: 'grid',
          width: 'full',
          height: 'medium',
          frame: 'solid',
          responsive: 'roomy-only',
        }}
      >
        <SplitView
          id="catalog-split-view-resizable"
          label="Resizable messages"
          listTitle="Threads"
          detailTitle={roomySelection.subject}
          list={
            <Pane
              header={
                <Toolbar
                  label="Threads"
                  leading={<ToolbarText text="Threads" />}
                  trailing={iconGroup(
                    'Hide threads',
                    PanelLeftClose,
                    'panel-left-close',
                    TOGGLE_SPLIT_VIEW_LIST_ACTION,
                  )}
                />
              }
            >
              {messageList(
                'select-roomy-split-view-message',
                roomySelection.id,
                false,
              )}
            </Pane>
          }
          detail={messageDetail(roomySelection)}
          resizable={{
            size: resizableListSize.value,
            min: 220,
            max: 420,
            separator: 'hidden',
            collapsed: resizableListCollapsed.value,
            collapseMotion: 'fade-slide',
            restorePosition: 'bottom-start',
            restoreControl: (
              <FloatingToolbar label="Threads" position="bottom-start">
                <ToolbarControlGroup label="Threads" single>
                  <button
                    type="button"
                    aria-label="Show threads"
                    data-action={TOGGLE_SPLIT_VIEW_LIST_ACTION}
                  >
                    <LucideIcon icon={PanelLeftOpen} name="panel-left-open" />
                  </button>
                </ToolbarControlGroup>
              </FloatingToolbar>
            ),
          }}
        />
      </CatalogExample>
      <CatalogExample
        label="Interactive compact drill-down"
        note="Choose a message to push its detail into the controlled navigation stack. Back clears the selection and restores the list. compactStack gives each view its own toolbar groups and the detail its own bottom toolbar."
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
          compactStack={{
            toolbarConfig: { headingLevel: 2, dividerSides: 'b' },
            list: { toolbar: iconGroup('Compose', SquarePen, 'square-pen') },
            detail: {
              toolbar: iconGroup('Reply', Reply, 'reply'),
              bottomToolbar: (
                <Toolbar
                  label="Message actions"
                  leading={<ToolbarText text="Received today" size="small" />}
                  trailing={iconGroup('Archive', Archive, 'archive')}
                />
              ),
            },
          }}
          list={messageList('open-split-view-message')}
          detail={
            compactSelection ? messageDetail(compactSelection) : <div></div>
          }
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
