import { Button } from '@kerfjs/ui/button';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ContentItem } from '@kerfjs/ui/content-item';
import { remify } from '@kerfjs/ui/css-values';
import { List } from '@kerfjs/ui/list';
import { ListInsetControl } from '@kerfjs/ui/list-inset-control';
import { ListInsetText } from '@kerfjs/ui/list-inset-text';
import { ListItem } from '@kerfjs/ui/list-item';
import { MessageComposer } from '@kerfjs/ui/message-composer';
import { PopupMenu } from '@kerfjs/ui/popup-menu';
import { Row } from '@kerfjs/ui/row';
import { SplitView } from '@kerfjs/ui/split-view';
import { StateBanner } from '@kerfjs/ui/state-banner';
import {
  DialogSurface,
  PopoverDialogSurface,
  PopupSurface,
  wireDialogStack,
} from '@kerfjs/ui/surface-scaffold';
import { Text } from '@kerfjs/ui/text';
import { TextField } from '@kerfjs/ui/text-field';
import { Toolbar } from '@kerfjs/ui/toolbar';
import {
  ToolbarButton,
  ToolbarControlGroup,
} from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { signal } from 'kerfjs';
import { delegate } from 'kerfjs';
import { confirm, overlay } from 'kerfjs/overlay';

const QUEUE = [
  'Morning Light',
  'Harbor Lines',
  'Paper Kites',
  'Slow Current',
  'Northern Rooms',
  'Glass Garden',
  'Late Ferry',
  'Quiet Engines',
  'Salt and Cedar',
  'Low Orbit',
  'Long Way Home',
  'Afterglow',
];

const PROJECTS = ['Atlas', 'Borealis', 'Cirrus', 'Delta', 'Ember', 'Fjord'];

type ReaderId = 'atlas' | 'borealis';
const readerOrder = signal<readonly ReaderId[]>([]);

export function pushDialogStackDemo(): void {
  const current = readerOrder.value;
  if (current.length === 0) readerOrder.value = ['atlas'];
  else if (current.length === 1)
    readerOrder.value = [
      current[0]!,
      current[0] === 'atlas' ? 'borealis' : 'atlas',
    ];
}

export function popDialogStackDemo(): void {
  readerOrder.value = readerOrder.value.slice(0, -1);
}

export function reorderDialogStackDemo(): void {
  if (readerOrder.value.length === 2)
    readerOrder.value = [...readerOrder.value].reverse();
}

export function wireDialogStackDemo(root: ParentNode): () => void {
  const onClose = (event: Event) => {
    const dialog = event.target;
    if (!(dialog instanceof HTMLDialogElement)) return;
    if (readerOrder.value.at(-1) === dialog.getAttribute('data-reader-id'))
      popDialogStackDemo();
  };
  root.addEventListener('kui-request-close', onClose);
  const stop = wireDialogStack(root);
  return () => {
    stop();
    root.removeEventListener('kui-request-close', onClose);
  };
}

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
/**
 * A core `confirm()` presented as a bottom sheet (styled by
 * `@kerfjs/ui/overlay-sheet.css`), its content composed from components with
 * the wiring slots spread onto the controls.
 */
export function discardDraftSheet(): Promise<boolean> {
  return confirm('Discard this draft? Its changes are not saved.', {
    presentation: 'bottom-sheet',
    exitClass: 'kui-overlay-sheet-exit',
    exitDuration: 400,
    render: ({ message, ok, cancel }) => (
      <List gap="xs">
        <Toolbar
          label="Discard Draft"
          leading={
            <ToolbarText text="Discard Draft" size="xlarge" headingLevel={2} />
          }
        />
        <ListInsetText>{message}</ListInsetText>
        <Row hAlign="right" controlInsets="rl">
          <ToolbarControlGroup label="Discard Draft Actions" content="text">
            <ToolbarButton rootAttributes={cancel}>Keep Editing</ToolbarButton>
            <ToolbarButton rootAttributes={ok}>Discard</ToolbarButton>
          </ToolbarControlGroup>
        </Row>
      </List>
    ),
  });
}

/**
 * A core `overlay()` bottom sheet the person can resize: the
 * `kui-overlay-sheet-resizable` class opts it in, and the catalog's
 * `wireOverlaySheets()` adds the grabber. Resolves with the chosen song, or
 * `undefined` when dismissed.
 */
export function openUpNextSheet(): Promise<string | undefined> {
  const handle = overlay(
    <List gap="xs">
      <Toolbar
        label="Up Next"
        leading={<ToolbarText text="Up Next" size="xlarge" headingLevel={2} />}
        trailing={
          <ToolbarControlGroup label="Up Next Actions" content="text">
            <ToolbarButton rootAttributes={{ 'data-up-next-done': '' }}>
              Done
            </ToolbarButton>
          </ToolbarControlGroup>
        }
      />
      {QUEUE.map((title, index) => (
        <ListItem
          action="play-up-next"
          itemId={`up-next-${String(index + 1)}`}
          label={title}
        />
      ))}
    </List>,
    {
      className: 'kerf-overlay kui-overlay-sheet-resizable',
      presentation: 'bottom-sheet',
      dismiss: ['escape', 'backdrop'],
      exitClass: 'kui-overlay-sheet-exit',
      exitDuration: 400,
    },
  );
  const stopDone = delegate(handle.el, 'click', '[data-up-next-done]', () =>
    handle.close(),
  );
  const stopPlay = delegate(
    handle.el,
    'click',
    '[data-action="play-up-next"]',
    (_event, item) => handle.close(item.textContent.trim()),
  );
  return handle.result.then((value) => {
    stopDone();
    stopPlay();
    return typeof value === 'string' ? value : undefined;
  });
}

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
  readerOrder.value = [];
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
  const readers = readerOrder.value;
  return (
    <CatalogExampleStack
      label="Surface Scaffold Demo"
      rootAttributes={{ 'data-demo': 'surface-scaffold' }}
    >
      <CatalogExample
        label="Controlled Reader Stack"
        note="Two native modal dialogs share one controlled reader stack. Open, push, reorder, close, and Escape keep focus and the top layer in sync."
        align="inline-control"
      >
        <div data-dialog-stack-demo>
          <Button action="push-dialog-stack" disabled={readers.length === 2}>
            {readers.length === 0 ? 'Open Reader' : 'Push Reader'}
          </Button>
          <Button action="reorder-dialog-stack" disabled={readers.length !== 2}>
            Swap Order
          </Button>
          {(['atlas', 'borealis'] as const).map((id) => {
            const position = readers.indexOf(id) + 1;
            return (
              <DialogSurface
                id={`catalog-reader-${id}`}
                label={`${id === 'atlas' ? 'Atlas' : 'Borealis'} Reader`}
                preferredWidth={remify(1024)}
                height="viewport"
                bodyInset="none"
                bodyLayout="fill"
                stack={{
                  open: position > 0,
                  active: position === readers.length && position > 0,
                  position:
                    position > 0
                      ? position
                      : readers.length === 0 && id === 'atlas'
                        ? 1
                        : 2,
                  count: 2,
                  offset: remify(-10 * (readers.length - position)),
                }}
                rootAttributes={{ 'data-reader-id': id }}
              >
                <List>
                  <ListInsetText>
                    This reader occupies the dialog body and keeps its overlay
                    host inside the native top layer.
                  </ListInsetText>
                  <ListItem
                    label="Review ticket"
                    itemId={id}
                    action="log-more"
                  />
                  <ListInsetControl>
                    <PopupMenu
                      text="Reader Actions"
                      items={[
                        { label: 'Copy Link' },
                        { label: 'View History' },
                      ]}
                    />
                  </ListInsetControl>
                </List>
              </DialogSurface>
            );
          })}
        </div>
      </CatalogExample>
      <CatalogExample
        label="Medium Dialog"
        note="closeEmphasis=quiet softens the built-in close glyph while retaining its target, accessible name, keyboard focus, and close request."
        align="inline-control"
      >
        <Button
          action="show-dialog"
          rootAttributes={{ 'data-dialog-id': 'catalog-medium-dialog' }}
        >
          Open Dialog
        </Button>
        <DialogSurface
          id="catalog-medium-dialog"
          label="Edit Workspace"
          closeEmphasis="quiet"
          size="medium"
          presentation="modal"
          bodyInset="none"
          footerInset="comfortable"
          footer={
            <>
              <Button rootAttributes={{ 'data-dialog-close': '' }}>
                Cancel
              </Button>
              <Button tone="brand" rootAttributes={{ 'data-dialog-close': '' }}>
                Save
              </Button>
            </>
          }
        >
          <List>
            <ListInsetText>
              Dialog content uses list-owned item geometry.
            </ListInsetText>
          </List>
        </DialogSurface>
      </CatalogExample>
      <CatalogExample
        label="Viewport-Bounded Modal"
        note="An 832px preferred width overrides the large preset; an 8px gutter and viewport height cap keep it on phones. describedBy makes the body's summary line the dialog's accessible description."
        align="inline-control"
      >
        <Button
          action="show-dialog"
          rootAttributes={{ 'data-dialog-id': 'catalog-bounded-dialog' }}
        >
          Open Bounded Dialog
        </Button>
        <DialogSurface
          id="catalog-bounded-dialog"
          label="Close Workspace"
          describedBy="catalog-bounded-dialog-summary"
          size="large"
          preferredWidth={remify(832)}
          viewportGutter={remify(8)}
          maxHeight="viewport"
          bodyInset="none"
          footer={
            <>
              <Button rootAttributes={{ 'data-dialog-close': '' }}>
                Keep Working
              </Button>
              <Button tone="brand" rootAttributes={{ 'data-dialog-close': '' }}>
                Stop and Close
              </Button>
            </>
          }
        >
          <List>
            <ListInsetText>
              <Text variant="span" id="catalog-bounded-dialog-summary">
                Closing this workspace stops its running tasks. Saved files
                remain available when you reopen it.
              </Text>
            </ListInsetText>
            <ListInsetText>
              Review your changes before stopping the workspace. Unsaved
              terminal output will be lost.
            </ListInsetText>
          </List>
        </DialogSurface>
      </CatalogExample>
      <CatalogExample
        label="Alert Dialog"
        note="A confirmation before a destructive action is an alert dialog, described by its message; it closes only from its buttons or Escape."
        align="inline-control"
      >
        <Button
          tone="danger"
          action="show-dialog"
          rootAttributes={{ 'data-dialog-id': 'catalog-alert-dialog' }}
        >
          Delete Topic
        </Button>
        <DialogSurface
          id="catalog-alert-dialog"
          label="Delete Topic"
          alert
          describedBy="catalog-alert-dialog-message"
          size="small"
          footer={
            <>
              <Button rootAttributes={{ 'data-dialog-close': '' }}>
                Cancel
              </Button>
              <Button
                tone="danger"
                rootAttributes={{ 'data-dialog-close': '' }}
              >
                Delete
              </Button>
            </>
          }
        >
          <ListInsetText>
            <Text variant="span" id="catalog-alert-dialog-message">
              Delete this topic? Its saved stories are removed too.
            </Text>
          </ListInsetText>
        </DialogSurface>
      </CatalogExample>
      <CatalogExample
        label="Capped Modal"
        note="A 480px preferred width and typed 360px maximum stay viewport-bounded while the footer remains outside the scrolling body."
        align="inline-control"
      >
        <Button
          action="show-dialog"
          rootAttributes={{ 'data-dialog-id': 'catalog-capped-dialog' }}
        >
          Open Capped Dialog
        </Button>
        <DialogSurface
          id="catalog-capped-dialog"
          label="Review Workspace Changes"
          preferredWidth={remify(480)}
          viewportGutter={remify(8)}
          maxHeight={remify(360)}
          bodyInset="none"
          footer={
            <Button rootAttributes={{ 'data-dialog-close': '' }}>
              Cancel Review
            </Button>
          }
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
        </DialogSurface>
      </CatalogExample>
      <CatalogExample
        label="Chat Dialog"
        note='footerPresentation="floating" lays a MessageComposer over the body, 8px from the panel edges so its text aligns with the transcript; bodyLayout="fill-last" keeps the notice at its height while the transcript fills the rest; with scrollClearance="block-end" the transcript scrolls beneath the composer and its last message still rests above it.'
        align="inline-control"
      >
        <Button
          action="show-dialog"
          rootAttributes={{ 'data-dialog-id': CHAT_DIALOG_ID }}
        >
          Open Assistant
        </Button>
        <DialogSurface
          id={CHAT_DIALOG_ID}
          label="Assistant"
          viewportGutter={remify(8)}
          height={remify(560)}
          bodyInset="none"
          bodyLayout="fill-last"
          footerPresentation="floating"
          footerOffset={remify(8)}
          footerInset="none"
          footer={
            <MessageComposer
              submitOnEnter
              id="catalog-chat-message"
              name="catalog-chat-message"
              label="Message"
              placeholder="Ask about this build"
              trailing={
                <Button tone="brand" action={SEND_CHAT_DIALOG_MESSAGE_ACTION}>
                  Send
                </Button>
              }
            />
          }
        >
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
        </DialogSurface>
      </CatalogExample>
      <CatalogExample
        label="Floating Title Bar"
        note='headerPresentation="floating" lays the title bar over the body on the translucent chrome material. With bodyLayout="fill" and scrollClearance="both", the transcript scrolls visibly beneath both the title bar and the floating composer, while its first and last messages rest clear of them.'
        align="inline-control"
      >
        <Button
          action="show-dialog"
          rootAttributes={{ 'data-dialog-id': THREAD_DIALOG_ID }}
        >
          Open Release Thread
        </Button>
        <DialogSurface
          id={THREAD_DIALOG_ID}
          label="Release Thread"
          describedBy="catalog-thread-dialog-description"
          heading={
            <ToolbarText
              text="Release Thread"
              size="xlarge"
              description="Engineering · 5.2 candidate"
              descriptionId="catalog-thread-dialog-description"
            />
          }
          viewportGutter={remify(8)}
          height={remify(560)}
          bodyInset="none"
          bodyLayout="fill"
          headerPresentation="floating"
          footerPresentation="floating"
          footerOffset={remify(8)}
          footerInset="none"
          footer={
            <MessageComposer
              submitOnEnter
              id="catalog-thread-message"
              name="catalog-thread-message"
              label="Message"
              placeholder="Reply to the thread"
              trailing={
                <Button tone="brand" action={SEND_CHAT_DIALOG_MESSAGE_ACTION}>
                  Send
                </Button>
              }
            />
          }
        >
          <List
            gap="xs"
            controlInsets="tb"
            scrollable
            scrollClearance="both"
            rootAttributes={{ 'data-demo-chat-transcript': '' }}
          >
            {chatBubbles(transcripts[THREAD_DIALOG_ID].value)}
          </List>
        </DialogSurface>
      </CatalogExample>
      <CatalogExample
        label="Resizable Bottom Sheet"
        note='presentation="bottom-sheet" attaches the dialog to the bottom edge with square bottom corners and clears the safe area and the virtual keyboard. Without a height it opens at its content height. resizable adds a grabber that resizes it between minHeight and the viewport (drag, or the arrow keys); it slides in and out unless motion is reduced.'
        align="inline-control"
      >
        <Button
          action="show-dialog"
          rootAttributes={{ 'data-dialog-id': SHEET_DIALOG_ID }}
        >
          Open New Message
        </Button>
        <DialogSurface
          id={SHEET_DIALOG_ID}
          label="New Message"
          lightDismiss
          presentation="bottom-sheet"
          minHeight={remify(200)}
          resizable
          bodyInset="none"
        >
          <List>
            <ListInsetControl>
              <TextField label="To" name="catalog-sheet-to" />
            </ListInsetControl>
            <ListInsetControl>
              <TextField label="Subject" name="catalog-sheet-subject" />
            </ListInsetControl>
            <ListInsetControl>
              <TextField
                multiline
                label="Message"
                name="catalog-sheet-message"
                rows={4}
              />
            </ListInsetControl>
          </List>
        </DialogSurface>
      </CatalogExample>
      <CatalogExample
        label="Core Dialog as a Bottom Sheet"
        note="kerfjs/overlay's confirm, prompt, form, and choice take presentation: 'bottom-sheet'. Import @kerfjs/ui/overlay-sheet.css once and the sheet gets this package's geometry: the bottom edge, square bottom corners, the safe area and keyboard as bottom padding, and a slide up."
        align="inline-control"
      >
        <ToolbarControlGroup single>
          <ToolbarButton action="open-overlay-sheet">
            Discard Draft
          </ToolbarButton>
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample
        label="Resizable Core Sheet"
        note="Add the kui-overlay-sheet-resizable class and call wireOverlaySheets() from @kerfjs/ui/wire-overlay-sheets once for the container you open sheets in. The sheet gets a resizable DialogSurface sheet's grabber: drag it, or focus it and use the arrow keys, Page Up/Down, Home, and End."
        align="inline-control"
      >
        <ToolbarControlGroup single>
          <ToolbarButton action="open-up-next-sheet">
            Show Up Next
          </ToolbarButton>
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample
        label="Non-Modal Popover Dialog"
        note="A native popover: it light-dismisses on Escape or a press outside and leaves the page interactive. labelledBy and describedBy name it from its heading's title and description."
        align="inline-control"
      >
        <ToolbarControlGroup single>
          {/* Raw: ToolbarButton has no popoverTarget. */}
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
