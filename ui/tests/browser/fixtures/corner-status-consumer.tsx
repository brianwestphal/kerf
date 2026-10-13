import { CornerStatus } from '@kerfjs/ui/corner-status';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { wireCornerStatus } from '@kerfjs/ui/wire-corner-status';
import { mount, signal } from 'kerfjs';

const progress = signal<number | null>(null);
const root = document.querySelector<HTMLElement>('[data-app]')!;

mount(root, () =>
  progress.value === null ? (
    <span />
  ) : (
    <CornerStatus>
      <StateBanner
        tone="neutral"
        urgency="status"
        title={`Updating Tickets… ${progress.value} of 12`}
      />
    </CornerStatus>
  ),
);
wireCornerStatus(document);

Object.assign(globalThis, {
  setProgress: (value: number | null) => {
    progress.value = value;
  },
});
