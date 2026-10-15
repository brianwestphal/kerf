import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { DialogSurface } from '@kerfjs/ui/surface-scaffold';
import { Text } from '@kerfjs/ui/text';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { signal } from 'kerfjs';
import { Volume2, VolumeX } from 'lucide';

/** The dark-tone media demo's volume, owned by the app. */
export const mediaMuted = signal(false);
export const mediaVolume = signal(70);

export function AnchoredSurfaceDemo() {
  const muted = mediaMuted.value;
  return (
    <CatalogExampleStack
      label="AnchoredSurface Demo"
      rootAttributes={{ 'data-demo': 'anchored-surface' }}
    >
      <CatalogExample label="Interactive Help" align="inline-control">
        <button type="button" data-anchored-surface-trigger="element">
          Explain This Field
        </button>
      </CatalogExample>
      <CatalogExample
        label="Pointer Placement"
        note="Right-click or press the button. The content stays in the viewport near the pointer."
        align="inline-control"
      >
        <button type="button" data-anchored-surface-trigger="pointer">
          Open at Pointer
        </button>
      </CatalogExample>
      <CatalogExample
        label="Dark Tone for Media Chrome"
        note="Press the volume control. The popup takes the dark control group's inverse tone, so it matches its anchor in both color schemes, and its content inherits the inverse text, border, and focus colors."
        align="inline-control"
      >
        <ToolbarControlGroup label="Playback" tone="dark" single>
          <button
            type="button"
            aria-label="Volume"
            aria-haspopup="dialog"
            data-anchored-surface-trigger="media"
          >
            <LucideIcon
              icon={muted ? VolumeX : Volume2}
              name={muted ? 'volume-x' : 'volume-2'}
            />
          </button>
        </ToolbarControlGroup>
      </CatalogExample>
      <CatalogExample label="Help Inside a Modal" align="inline-control">
        <button type="button" data-anchored-surface-open-modal>
          Open Dialog
        </button>
        <DialogSurface
          label="Field Settings"
          rootAttributes={{ 'data-anchored-surface-modal': '' }}
          footer={
            <button type="button" data-dialog-close>
              Close Dialog
            </button>
          }
        >
          <Text>Dialog content can open interactive anchored help.</Text>
          <button type="button" data-anchored-surface-trigger="modal">
            Explain in Dialog
          </button>
        </DialogSurface>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
