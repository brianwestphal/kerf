import { Button } from '@kerfjs/ui/button';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { mount, signal } from 'kerfjs';

const unavailable = signal(true);
const root = document.querySelector<HTMLElement>('[data-banner-fixture]')!;

mount(root, () => (
  <div>
    {unavailable.value && (
      <StateBanner
        title="Clipboard unavailable"
        detail="Copy is available from the prepared outcome."
        tone="warning"
        rootAttributes={{ 'data-key': 'clipboard-unavailable' }}
      />
    )}
    <StateBanner
      title="Prepared outcome"
      tone="success"
      rootAttributes={{ 'data-key': 'prepared-outcome' }}
      action={<Button action="copy-outcome">Copy</Button>}
    />
  </div>
));

Object.assign(globalThis, {
  clearClipboardUnavailable: () => {
    unavailable.value = false;
  },
});
