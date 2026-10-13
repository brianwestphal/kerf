import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { Composer } from '@kerfjs/ui/composer';

/** The delegated action every Send button in this demo uses. */
export const SEND_COMPOSER_DEMO_ACTION = 'send-composer-demo';

export function ComposerDemo() {
  return (
    <CatalogExampleStack
      label="Composer Variants"
      rootAttributes={{ 'data-demo': 'composer' }}
    >
      <CatalogExample
        label="Chat Composer"
        note="The field grows with each line up to eight, then scrolls; the frame turns brand while focus is within. submitOnEnter sends on Enter; Shift+Enter adds a line."
      >
        <Composer
          submitOnEnter
          id="composer-demo-chat"
          name="composer-demo-chat"
          label="Message"
          placeholder="Ask about this build"
          hint="Answers use the latest nightly build."
          actions={
            <wa-button
              variant="brand"
              data-action={SEND_COMPOSER_DEMO_ACTION}
              data-composer-id="composer-demo-chat"
            >
              Send
            </wa-button>
          }
        />
      </CatalogExample>
      <CatalogExample
        label="Prompt with Taller Bounds"
        note="minRows and maxRows set where the field starts and where it stops growing."
      >
        <Composer
          id="composer-demo-prompt"
          name="composer-demo-prompt"
          label="Prompt"
          placeholder="Describe the change you want"
          minRows={3}
          maxRows={12}
          actions={
            <wa-button
              variant="brand"
              data-action={SEND_COMPOSER_DEMO_ACTION}
              data-composer-id="composer-demo-prompt"
            >
              Generate
            </wa-button>
          }
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
