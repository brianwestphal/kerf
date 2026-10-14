import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/textarea/textarea.js';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { Composer } from '@kerfjs/ui/composer';
import { ContentItem } from '@kerfjs/ui/content-item';
import { remify } from '@kerfjs/ui/css-values';
import { List } from '@kerfjs/ui/list';
import { ListInsetControl } from '@kerfjs/ui/list-inset-control';
import { ListInsetText } from '@kerfjs/ui/list-inset-text';
import { ListItem } from '@kerfjs/ui/list-item';
import { PopupMenu } from '@kerfjs/ui/popup-menu';
import { SplitView } from '@kerfjs/ui/split-view';
import { StateBanner } from '@kerfjs/ui/state-banner';
import {
  DialogSurface,
  PopoverDialogSurface,
  PopupSurface,
} from '@kerfjs/ui/surface-scaffold';
import { Text } from '@kerfjs/ui/text';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { signal } from 'kerfjs';

const PROJECTS = ['Atlas', 'Borealis', 'Cirrus', 'Delta', 'Ember', 'Fjord'];

/** A list-detail SplitView that fills whichever surface it is given. */
function projectSplit(id: string) {
  return (
    <SplitView
      id={id}
      label="Projects"
      listTitle="Projects"
      detailTitle="Atlas"
      listWidth={{ size: 240, maxFraction: 0.4 }}
      list={
        <List>
          {PROJECTS.map((name, index) => (
            <ListItem
              label={name}
              itemId={name}
              action="log-more"
              selected={index === 0}
            />
          ))}
        </List>
      }
      detail={
        <List>
          <ListInsetText>
            Atlas is active. The split fills the surface's full height, and each
            column scrolls on its own.
          </ListInsetText>
        </List>
      }
    />
  );
}

/** The chat dialog example's id and its send action. */
export const CHAT_DIALOG_ID = 'catalog-chat-dialog';
export const SEND_CHAT_DIALOG_MESSAGE_ACTION = 'send-chat-dialog-message';

interface ChatMessage {
  readonly from: 'user' | 'assistant';
  readonly text: string;
}

const INITIAL_CHAT: readonly ChatMessage[] = [
  { from: 'user', text: 'Why did the nightly build fail?' },
  {
    from: 'assistant',
    text: 'The bundle budget check failed: the demo bundle grew by 213 bytes after the dialog changes landed.',
  },
  { from: 'user', text: 'Which entry grew?' },
  {
    from: 'assistant',
    text: 'The surface scaffold entry. Its stylesheet gained the floating footer and fill-last body rules.',
  },
  { from: 'user', text: 'Is that expected?' },
  {
    from: 'assistant',
    text: 'Yes. Rebaseline the budget with a reason that names the new dialog layouts.',
  },
  { from: 'user', text: 'Anything else failing?' },
  {
    from: 'assistant',
    text: 'No. Every other gate passed, including the browser suite.',
  },
];

/** The floating title bar example's id; it shares the send action. */
export const THREAD_DIALOG_ID = 'catalog-thread-dialog';

const INITIAL_THREAD: readonly ChatMessage[] = [
  { from: 'user', text: 'Is the 5.2 release candidate ready to tag?' },
  {
    from: 'assistant',
    text: 'Almost. The changelog still lists the floating dialog header under Unreleased.',
  },
  { from: 'user', text: 'Move it under 5.2, then. What about the docs?' },
  {
    from: 'assistant',
    text: 'The accessibility guide gained the chrome-material contrast rule, and the catalog shows the new title bar.',
  },
  { from: 'user', text: 'Did the browser suite pass in every engine?' },
  {
    from: 'assistant',
    text: 'Chromium, Firefox, and WebKit all passed. Forced colors paints the title bar opaque with a visible edge.',
  },
  { from: 'user', text: 'And reduced transparency?' },
  {
    from: 'assistant',
    text: 'The title bar turns opaque, and the transcript still starts below it.',
  },
  { from: 'user', text: 'Great. Tag it after lunch.' },
  {
    from: 'assistant',
    text: 'Scheduled. I will post the release notes here once the tag is pushed.',
  },
];

/** The resizable bottom sheet example's id. */
export const SHEET_DIALOG_ID = 'catalog-sheet-dialog';

/** Each chat-style example's transcript, by its dialog id. */
const transcripts = {
  [CHAT_DIALOG_ID]: signal<readonly ChatMessage[]>(INITIAL_CHAT),
  [THREAD_DIALOG_ID]: signal<readonly ChatMessage[]>(INITIAL_THREAD),
} as const;

/** Append the person's message and a short reply to a chat-style example. */
export function sendSurfaceScaffoldChatMessage(
  text: string,
  dialogId: string = CHAT_DIALOG_ID,
): boolean {
  const transcript =
    dialogId === THREAD_DIALOG_ID
      ? transcripts[THREAD_DIALOG_ID]
      : transcripts[CHAT_DIALOG_ID];
  const trimmed = text.trim();
  if (!trimmed) return false;
  transcript.value = [
    ...transcript.value,
    { from: 'user', text: trimmed },
    { from: 'assistant', text: 'Noted. I will keep that in mind.' },
  ];
  return true;
}

/** Restore the chat-style examples' opening transcripts. */
export function resetSurfaceScaffoldDemo(): void {
  transcripts[CHAT_DIALOG_ID].value = INITIAL_CHAT;
  transcripts[THREAD_DIALOG_ID].value = INITIAL_THREAD;
}

/** A transcript's message bubbles. */
function chatBubbles(messages: readonly ChatMessage[]) {
  return messages.map((message) => (
    <ContentItem
      bubble={message.from === 'user' ? 'end' : 'start'}
      appearance={message.from === 'user' ? 'brand-loud' : 'neutral'}
    >
      <Text variant="span">{message.text}</Text>
    </ContentItem>
  ));
}

export function SurfaceScaffoldDemo() {
  return (
    <CatalogExampleStack
      label="Surface Scaffold Demo"
      rootAttributes={{ 'data-demo': 'surface-scaffold' }}
    >
      <CatalogExample label="Medium Dialog" align="inline-control">
        <DialogSurface
          size="medium"
          presentation="modal"
          bodyInset="none"
          footerInset="comfortable"
        >
          <wa-button data-action="show-wa-dialog">Open Dialog</wa-button>
          <wa-dialog id="catalog-wa-dialog" label="Edit Workspace">
            <List>
              <ListInsetText>
                Dialog content uses list-owned item geometry.
              </ListInsetText>
            </List>
            <wa-button slot="footer" data-action="hide-wa-dialog">
              Cancel
            </wa-button>
            <wa-button
              slot="footer"
              variant="brand"
              data-action="hide-wa-dialog"
            >
              Save
            </wa-button>
          </wa-dialog>
        </DialogSurface>
      </CatalogExample>
      <CatalogExample
        label="Viewport-Bounded Modal"
        note="An 832px preferred width overrides the large preset; an 8px gutter and viewport height cap keep it on phones."
        align="inline-control"
      >
        <DialogSurface
          size="large"
          preferredWidth={remify(832)}
          viewportGutter={remify(8)}
          maxHeight="viewport"
          bodyInset="none"
        >
          <wa-button
            data-action="show-wa-dialog"
            data-dialog-id="catalog-bounded-dialog"
          >
            Open Bounded Dialog
          </wa-button>
          <wa-dialog id="catalog-bounded-dialog" label="Close Workspace">
            <List>
              <ListInsetText>
                Closing this workspace stops its running tasks. Saved files
                remain available when you reopen it.
              </ListInsetText>
              <ListInsetText>
                Review your changes before stopping the workspace. Unsaved
                terminal output will be lost.
              </ListInsetText>
            </List>
            <wa-button
              slot="footer"
              data-action="hide-wa-dialog"
              data-dialog-id="catalog-bounded-dialog"
            >
              Keep Working
            </wa-button>
            <wa-button
              slot="footer"
              variant="brand"
              data-action="hide-wa-dialog"
              data-dialog-id="catalog-bounded-dialog"
            >
              Stop and Close
            </wa-button>
          </wa-dialog>
        </DialogSurface>
      </CatalogExample>
      <CatalogExample
        label="Capped Modal"
        note="A 480px preferred width and typed 360px maximum stay viewport-bounded while the footer remains outside the scrolling body."
        align="inline-control"
      >
        <DialogSurface
          preferredWidth={remify(480)}
          viewportGutter={remify(8)}
          maxHeight={remify(360)}
          bodyInset="none"
        >
          <wa-button
            data-action="show-wa-dialog"
            data-dialog-id="catalog-capped-dialog"
          >
            Open Capped Dialog
          </wa-button>
          <wa-dialog
            id="catalog-capped-dialog"
            label="Review Workspace Changes"
          >
            <List>
              {[
                'Saved files remain available.',
                'Running tasks will stop.',
                'Terminal sessions will close.',
                'Unsaved output will be lost.',
                'Background synchronization will stop.',
                'Reopen the workspace to resume your work.',
              ].map((copy) => (
                <ListInsetText>{copy}</ListInsetText>
              ))}
            </List>
            <wa-button
              slot="footer"
              data-action="hide-wa-dialog"
              data-dialog-id="catalog-capped-dialog"
            >
              Cancel Review
            </wa-button>
          </wa-dialog>
        </DialogSurface>
      </CatalogExample>
      <CatalogExample
        label="Filled List-Detail Modal"
        note='height gives the modal a definite, viewport-bounded size and bodyLayout="fill" hands the whole body to one SplitView.'
        align="inline-control"
      >
        <DialogSurface
          size="large"
          viewportGutter={remify(8)}
          height={remify(480)}
          bodyInset="none"
          bodyLayout="fill"
        >
          <wa-button
            data-action="show-wa-dialog"
            data-dialog-id="catalog-filled-dialog"
          >
            Open Project Details
          </wa-button>
          <wa-dialog id="catalog-filled-dialog" label="Project Details">
            {projectSplit('catalog-filled-dialog-split')}
          </wa-dialog>
        </DialogSurface>
      </CatalogExample>
      <CatalogExample
        label="Chat Dialog"
        note='footerPresentation="floating" lays a Composer over the body, 8px from the panel edges so its text aligns with the transcript; bodyLayout="fill-last" keeps the notice at its height while the transcript fills the rest; with scrollClearance="block-end" the transcript scrolls beneath the composer and its last message still rests above it.'
        align="inline-control"
      >
        <DialogSurface
          viewportGutter={remify(8)}
          height={remify(560)}
          bodyInset="none"
          bodyLayout="fill-last"
          footerPresentation="floating"
          footerOffset={remify(8)}
          footerInset="none"
        >
          <wa-button
            data-action="show-wa-dialog"
            data-dialog-id={CHAT_DIALOG_ID}
          >
            Open Assistant
          </wa-button>
          <wa-dialog id={CHAT_DIALOG_ID} label="Assistant">
            <StateBanner
              title="Answers use the latest nightly build."
              tone="neutral"
            />
            <List
              gap="xs"
              controlInsets="tb"
              scrollable
              scrollClearance="block-end"
              rootAttributes={{ 'data-demo-chat-transcript': '' }}
            >
              {chatBubbles(transcripts[CHAT_DIALOG_ID].value)}
            </List>
            <Composer
              submitOnEnter
              slot="footer"
              id="catalog-chat-message"
              name="catalog-chat-message"
              label="Message"
              placeholder="Ask about this build"
              actions={
                <wa-button
                  variant="brand"
                  data-action={SEND_CHAT_DIALOG_MESSAGE_ACTION}
                >
                  Send
                </wa-button>
              }
            />
          </wa-dialog>
        </DialogSurface>
      </CatalogExample>
      <CatalogExample
        label="Floating Title Bar"
        note='headerPresentation="floating" lays the title bar over the body on the translucent chrome material. With bodyLayout="fill" and scrollClearance="both", the transcript scrolls visibly beneath both the title bar and the floating composer, while its first and last messages rest clear of them.'
        align="inline-control"
      >
        <DialogSurface
          viewportGutter={remify(8)}
          height={remify(560)}
          bodyInset="none"
          bodyLayout="fill"
          headerPresentation="floating"
          footerPresentation="floating"
          footerOffset={remify(8)}
          footerInset="none"
        >
          <wa-button
            data-action="show-wa-dialog"
            data-dialog-id={THREAD_DIALOG_ID}
          >
            Open Release Thread
          </wa-button>
          <wa-dialog id={THREAD_DIALOG_ID} label="Release Thread">
            <ToolbarText
              slot="label"
              text="Release Thread"
              size="xlarge"
              description="Engineering · 5.2 candidate"
            />
            <List
              gap="xs"
              controlInsets="tb"
              scrollable
              scrollClearance="both"
              rootAttributes={{ 'data-demo-chat-transcript': '' }}
            >
              {chatBubbles(transcripts[THREAD_DIALOG_ID].value)}
            </List>
            <Composer
              submitOnEnter
              slot="footer"
              id="catalog-thread-message"
              name="catalog-thread-message"
              label="Message"
              placeholder="Reply to the thread"
              actions={
                <wa-button
                  variant="brand"
                  data-action={SEND_CHAT_DIALOG_MESSAGE_ACTION}
                >
                  Send
                </wa-button>
              }
            />
          </wa-dialog>
        </DialogSurface>
      </CatalogExample>
      <CatalogExample
        label="Resizable Bottom Sheet"
        note='presentation="bottom-sheet" attaches the dialog to the bottom edge with square bottom corners and clears the safe area and the virtual keyboard. resizable adds a grabber that resizes it between minHeight and the viewport (drag, or the arrow keys); it slides in and out unless motion is reduced.'
        align="inline-control"
      >
        <DialogSurface
          presentation="bottom-sheet"
          height={remify(360)}
          minHeight={remify(200)}
          resizable
          bodyInset="none"
        >
          <wa-button
            data-action="show-wa-dialog"
            data-dialog-id={SHEET_DIALOG_ID}
          >
            Open New Message
          </wa-button>
          <wa-dialog id={SHEET_DIALOG_ID} label="New Message" light-dismiss>
            <List>
              <ListInsetControl>
                <wa-input label="To" name="catalog-sheet-to" />
              </ListInsetControl>
              <ListInsetControl>
                <wa-input label="Subject" name="catalog-sheet-subject" />
              </ListInsetControl>
              <ListInsetControl>
                <wa-textarea
                  label="Message"
                  name="catalog-sheet-message"
                  rows={4}
                />
              </ListInsetControl>
            </List>
          </wa-dialog>
        </DialogSurface>
      </CatalogExample>
      <CatalogExample
        label="Non-Modal Popover Dialog"
        note="A native popover: it light-dismisses on Escape or a press outside and leaves the page interactive. labelledBy and describedBy name it from its heading's title and description."
        align="inline-control"
      >
        <ToolbarControlGroup single>
          <button type="button" popoverTarget="catalog-popover-dialog">
            Open Repository Status
          </button>
        </ToolbarControlGroup>
        <PopoverDialogSurface
          id="catalog-popover-dialog"
          labelledBy="catalog-popover-dialog-title"
          describedBy="catalog-popover-dialog-description"
          preferredWidth={remify(720)}
          height={remify(420)}
          viewportGutter={remify(8)}
          bodyLayout="fill-last"
        >
          <Toolbar
            label="Repository Status Heading"
            leading={
              <ToolbarText
                text="Repository Status"
                size="xlarge"
                id="catalog-popover-dialog-title"
                description="Three projects have uncommitted changes."
                descriptionId="catalog-popover-dialog-description"
              />
            }
          />
          {projectSplit('catalog-popover-dialog-split')}
        </PopoverDialogSurface>
      </CatalogExample>
      <CatalogExample
        label="Embedded Popover Dialog"
        note='presentation="embedded" shows the same surface in flow, for a catalog or an inline preview.'
        align="inline-control"
      >
        <PopoverDialogSurface
          label="Repository Status Preview"
          presentation="embedded"
          preferredWidth={remify(560)}
          height={remify(280)}
          bodyLayout="fill"
        >
          {projectSplit('catalog-embedded-dialog-split')}
        </PopoverDialogSurface>
      </CatalogExample>
      <CatalogExample label="Zero-Inset List Popup" align="inline-control">
        <PopupSurface inset="list-zero">
          <PopupMenu
            text="Choose View"
            items={[{ label: 'Inbox' }, { label: 'Archive' }]}
          />
        </PopupSurface>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
