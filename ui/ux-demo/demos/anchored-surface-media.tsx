import '@awesome.me/webawesome/dist/components/slider/slider.js';

import { openAnchoredSurface } from '@kerfjs/ui/anchored-surface';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { delegate } from 'kerfjs';
import { Volume2, VolumeX } from 'lucide';

import { mediaMuted, mediaVolume } from './anchored-surface.js';

// The AnchoredSurface demo's dark-tone volume popup, loaded on first use so
// its slider stays out of the catalog shell.

const TOGGLE_MUTE_ACTION = 'toggle-media-mute';

/** A mute row and a vertical slider: content that inherits the tone. */
function MediaVolumeSurface() {
  const muted = mediaMuted.value;
  return (
    <div>
      <ListItem
        action={TOGGLE_MUTE_ACTION}
        label="Mute"
        icon={
          <LucideIcon
            icon={muted ? VolumeX : Volume2}
            name={muted ? 'volume-x' : 'volume-2'}
          />
        }
        pressed={muted}
      />
      <wa-slider
        data-media-volume
        label="Volume"
        orientation="vertical"
        value={String(mediaVolume.value)}
        disabled={muted}
      />
    </div>
  );
}

/**
 * Open the volume popup above dark media chrome. The app owns the mute and
 * volume state; the surface only hosts the controls.
 */
export function openMediaVolumeSurface(trigger: HTMLElement): void {
  const handle = openAnchoredSurface(trigger, () => <MediaVolumeSurface />, {
    label: 'Volume',
    tone: 'dark',
    placement: 'top',
  });
  const stopMute = delegate(
    handle.el,
    'click',
    `[data-action="${TOGGLE_MUTE_ACTION}"]`,
    () => {
      mediaMuted.value = !mediaMuted.value;
    },
  );
  const stopVolume = delegate(
    handle.el,
    'input',
    '[data-media-volume]',
    (_event, slider) => {
      mediaVolume.value = Number(
        (slider as HTMLElement & { value: number }).value,
      );
    },
  );
  void handle.result.then(() => {
    stopMute();
    stopVolume();
  });
}
