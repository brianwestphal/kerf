import { Button } from '@kerfjs/ui/button';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { Row } from '@kerfjs/ui/row';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { toast, type ToastOptions } from 'kerfjs/overlay';

/** The delegated action every Show button in this demo uses. */
export const SHOW_TOAST_DEMO_ACTION = 'show-toast-demo';

/** The exit every demo toast takes, as `@kerfjs/ui/overlay-toast.css` names it. */
const EXIT: ToastOptions = {
  exitClass: 'kui-toast-exit',
  exitDuration: 200,
};

/** Show the toast a demo button names in its `data-toast` attribute. */
export function showToastDemo(kind: string): void {
  switch (kind) {
    case 'plain':
      toast('Draft saved.', EXIT);
      return;
    case 'success':
      toast('Project published.', { ...EXIT, variant: 'success' });
      return;
    case 'warning':
      toast('Sync paused: you are offline.', { ...EXIT, variant: 'warning' });
      return;
    case 'banner':
      toast(
        () => (
          <StateBanner
            title="Export Finished"
            detail="report.csv is in your Downloads folder."
            tone="success"
          />
        ),
        { ...EXIT, duration: 6000 },
      );
      return;
    case 'replace':
      toast(`Copied at ${new Date().toLocaleTimeString()}.`, {
        ...EXIT,
        mode: 'replace',
      });
      return;
  }
}

function showButton(kind: string, label: string) {
  return (
    <Button
      action={SHOW_TOAST_DEMO_ACTION}
      rootAttributes={{ 'data-toast': kind }}
    >
      {label}
    </Button>
  );
}

export function ToastDemo() {
  return (
    <CatalogExampleStack
      label="Toast Variants"
      rootAttributes={{ 'data-demo': 'toast' }}
    >
      <CatalogExample
        label="Plain and Toned Toasts"
        note="kerfjs/overlay's toast() with @kerfjs/ui/overlay-toast.css imported: toasts stack above the bottom edge on the raised surface and fade in; the variant option tones them. Each dismisses after four seconds, fading out through exitClass 'kui-toast-exit'."
        align="inline-control"
      >
        <Row gap="xs" wrap>
          {showButton('plain', 'Show Toast')}
          {showButton('success', 'Show Success')}
          {showButton('warning', 'Show Warning')}
        </Row>
      </CatalogExample>
      <CatalogExample
        label="StateBanner Content"
        note="A toast whose only content is a StateBanner takes the banner's tone, border, and inset, keeping the toast's elevation."
        align="inline-control"
      >
        {showButton('banner', 'Show Export Result')}
      </CatalogExample>
      <CatalogExample
        label="Replace the Current Toast"
        note="mode: 'replace' dismisses the toast already showing, so a rapid sequence collapses to the latest message."
        align="inline-control"
      >
        {showButton('replace', 'Copy Link')}
      </CatalogExample>
    </CatalogExampleStack>
  );
}
