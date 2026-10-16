import { Button } from '@kerfjs/ui/button';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { MessageComposer } from '@kerfjs/ui/message-composer';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { Paperclip } from 'lucide';

/** The delegated action every Send button in this demo uses. */
export const SEND_COMPOSER_DEMO_ACTION = 'send-composer-demo';

export function MessageComposerDemo() {
  return (
    <CatalogExampleStack
      label="MessageComposer Variants"
      rootAttributes={{ 'data-demo': 'message-composer' }}
    >
      <CatalogExample
        label="Chat Composer"
        note="The field grows with each line up to eight, then scrolls; the frame turns brand while focus is within. submitOnEnter sends on Enter; Shift+Enter adds a line."
      >
        <MessageComposer
          submitOnEnter
          id="message-composer-demo-chat"
          name="message-composer-demo-chat"
          label="Message"
          placeholder="Ask about this build"
          hint="Answers use the latest nightly build."
          trailing={
            <Button
              tone="brand"
              action={SEND_COMPOSER_DEMO_ACTION}
              rootAttributes={{
                'data-message-composer-id': 'message-composer-demo-chat',
              }}
            >
              Send
            </Button>
          }
        />
      </CatalogExample>
      <CatalogExample
        label="Prompt with Leading Controls"
        note="minRows and maxRows set where the field starts and where it stops growing. The action row is a compact Toolbar, so leading controls use an ordinary ToolbarControlGroup."
      >
        <MessageComposer
          id="message-composer-demo-prompt"
          name="message-composer-demo-prompt"
          label="Prompt"
          placeholder="Describe the change you want"
          minRows={3}
          maxRows={12}
          leading={
            <ToolbarControlGroup appearance="borderless" single>
              <button
                type="button"
                aria-label="Attach File"
                data-action="attach-composer-demo"
              >
                <LucideIcon icon={Paperclip} name="paperclip" />
              </button>
            </ToolbarControlGroup>
          }
          trailing={
            <Button
              tone="brand"
              action={SEND_COMPOSER_DEMO_ACTION}
              rootAttributes={{
                'data-message-composer-id': 'message-composer-demo-prompt',
              }}
            >
              Generate
            </Button>
          }
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
