import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { toast, type ToastOptions } from 'kerfjs/overlay';

import { renderToastBannerButton } from '../views/toast-banner-button.view.js';
import { renderToastBannerContent } from '../views/toast-banner-content.view.js';
import { renderToastButtons } from '../views/toast-buttons.view.js';
import { renderToastReplaceButton } from '../views/toast-replace-button.view.js';

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
      toast(() => renderToastBannerContent(), { ...EXIT, duration: 6000 });
      return;
    case 'replace':
      toast(`Copied at ${new Date().toLocaleTimeString()}.`, {
        ...EXIT,
        mode: 'replace',
      });
      return;
  }
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
        {renderToastButtons()}
      </CatalogExample>
      <CatalogExample
        label="StateBanner Content"
        note="A toast whose only content is a StateBanner takes the banner's tone, border, and inset, keeping the toast's elevation."
        align="inline-control"
      >
        {renderToastBannerButton()}
      </CatalogExample>
      <CatalogExample
        label="Replace the Current Toast"
        note="mode: 'replace' dismisses the toast already showing, so a rapid sequence collapses to the latest message."
        align="inline-control"
      >
        {renderToastReplaceButton()}
      </CatalogExample>
    </CatalogExampleStack>
  );
}
