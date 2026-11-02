// Play mode's play bar and stage (KF-60BEEJ: play mode core; KF-R7KXSN:
// device presets, orientation, scale, installed-app safe areas;
// docs/26-ui-editor.md §11.1–§11.3). The play bar picks the device the
// played view runs on; the stage lays the frame out at that device's
// viewport and scales it. The frame's sizes are set here, outside the
// morph, so a device change resizes the running view instead of reloading it.
import { delegate, effect, type SafeHtml, signal } from 'kerfjs';
import { HousePlus, RotateCwSquare } from 'lucide';

import { Button } from '../components/actions/button/button.js';
import { Toolbar } from '../components/actions/toolbar/toolbar.js';
import {
  ToolbarButton,
  ToolbarControlGroup,
} from '../components/actions/toolbar-control-group/toolbar-control-group.js';
import { Select } from '../components/forms/select/select.js';
import { TextField } from '../components/forms/text-field/text-field.js';
import { LucideIcon } from '../components/media/lucide-icon/lucide-icon.js';
import { Text } from '../components/typography/text/text.js';
import {
  clampFlexible,
  DEVICE_KIND_LABELS,
  type DeviceEmulation,
  type DevicePreset,
  emulate,
  installs,
  parsePlaySettings,
  PLAY_SCALES,
  type PlayScale,
  type PlaySettings,
  rotates,
  viewportLabel,
} from './model/play-device.js';
import { fitScale, scaledBox } from './model/play-fit.js';
import { playPageUrl } from './player.js';

/** Where the play bar's choices are remembered, per browser. */
export const PLAY_SETTINGS_KEY = 'kerf-ui-editor:play';
const ROTATE_ACTION = 'editor-play-rotate';
const INSTALLED_ACTION = 'editor-play-installed';

/** Adds a listener and returns its disposer. */
function on<Type extends keyof HTMLElementEventMap>(
  target: HTMLElement,
  type: Type,
  listener: (event: HTMLElementEventMap[Type]) => void,
): () => void {
  target.addEventListener(type, listener);
  return () => target.removeEventListener(type, listener);
}

/** The stored choices, or none when storage is unavailable or unreadable. */
function loadSettings(): unknown {
  try {
    const text = globalThis.localStorage?.getItem(PLAY_SETTINGS_KEY);
    return text ? JSON.parse(text) : undefined;
  } catch {
    return undefined;
  }
}

function saveSettings(settings: PlaySettings): void {
  try {
    globalThis.localStorage?.setItem(
      PLAY_SETTINGS_KEY,
      JSON.stringify(settings),
    );
  } catch {
    // Private windows and blocked storage only lose the memory.
  }
}

export interface PlayStageOptions {
  /** The device menu's presets, grouped by kind (resolveDevicePresets). */
  readonly presets: readonly DevicePreset[];
  /** Done's `data-action`. */
  readonly doneAction: string;
}

/** The play bar, the stage, and their wiring, for one editor. */
export function createPlayStage({ presets, doneAction }: PlayStageOptions) {
  const settings = signal<PlaySettings>(
    parsePlaySettings(loadSettings(), presets),
  );
  const presetOf = (id: string) => presets.find((preset) => preset.id === id)!;
  const emulation = (): DeviceEmulation =>
    emulate(presetOf(settings.value.device), settings.value);
  const update = (change: Partial<PlaySettings>) => {
    settings.value = { ...settings.value, ...change };
    saveSettings(settings.value);
  };

  /** The play bar: device, its options, scale, and Done. */
  const playBar = () => {
    const current = settings.value;
    const preset = presetOf(current.device);
    const emulated = emulation();
    const flexible = preset.kind === 'flexible';
    return (
      <Toolbar
        label="Play"
        rootAttributes={{ 'data-key': 'editor-play-bar' }}
        safeAreaEdges={['block-start', 'inline-start', 'inline-end']}
        dividerSides="b"
        responsive="wrap"
        leading={
          <>
            <ToolbarControlGroup single focusRing="outline">
              <Select<string>
                name="editor-play-device"
                ariaLabel="Device"
                value={preset.id}
                presentation="toolbar-borderless"
                focusRingOwner="group"
                choices={presets.map((choice) => ({
                  value: choice.id,
                  label: choice.label,
                  group: DEVICE_KIND_LABELS[choice.kind],
                }))}
                // The viewport's size beside the device; Flexible's own
                // fields show it.
                renderSelected={(choice) =>
                  flexible ? (
                    <>{choice.label}</>
                  ) : (
                    <>
                      {choice.label}{' '}
                      <Text variant="span" tone="quiet">
                        {viewportLabel(emulated)}
                      </Text>
                    </>
                  )
                }
                rootAttributes={{ 'data-editor-play': 'device' }}
              />
            </ToolbarControlGroup>
            {flexible ? (
              <>
                <TextField
                  ariaLabel="Width"
                  type="number"
                  size="compact"
                  min={200}
                  max={3840}
                  value={String(current.flexible.width)}
                  rootAttributes={{ 'data-editor-play-size': 'width' }}
                />
                <TextField
                  ariaLabel="Height"
                  type="number"
                  size="compact"
                  min={200}
                  max={3840}
                  value={String(current.flexible.height)}
                  rootAttributes={{ 'data-editor-play-size': 'height' }}
                />
              </>
            ) : undefined}
            <ToolbarControlGroup label="Device options">
              <ToolbarButton
                ariaLabel="Landscape"
                title={
                  rotates(preset.kind)
                    ? 'Rotate to landscape'
                    : 'Only phones and tablets rotate'
                }
                action={ROTATE_ACTION}
                pressed={
                  rotates(preset.kind) && emulated.orientation === 'landscape'
                }
                disabled={!rotates(preset.kind)}
                icon={
                  <LucideIcon icon={RotateCwSquare} name="rotate-cw-square" />
                }
              />
              <ToolbarButton
                ariaLabel="Installed app"
                title={
                  installs(preset.kind)
                    ? 'Run as an installed web app, under the device’s safe areas, instead of in a browser tab'
                    : 'Only phones and tablets install web apps'
                }
                action={INSTALLED_ACTION}
                pressed={emulated.installed}
                disabled={!installs(preset.kind)}
                icon={<LucideIcon icon={HousePlus} name="house-plus" />}
              />
            </ToolbarControlGroup>
            <ToolbarControlGroup single focusRing="outline">
              <Select<PlayScale>
                name="editor-play-scale"
                ariaLabel="Scale"
                value={current.scale}
                presentation="toolbar-borderless"
                // The widest scale, "150%", fits without the form default's
                // long value box.
                labelMaxWidth={48}
                focusRingOwner="group"
                choices={PLAY_SCALES}
                rootAttributes={{ 'data-editor-play': 'scale' }}
              />
            </ToolbarControlGroup>
          </>
        }
        trailing={
          <Button tone="brand" emphasis="plain" action={doneAction}>
            Done
          </Button>
        }
      />
    );
  };

  /**
   * The stage. Its device box is outside the morph: `apply` sizes the
   * screen, places the frame in it, and scales both to the stage.
   */
  const stage = (title: string) => {
    const emulated = emulation();
    return (
      <div class="kui-editor__stage" data-key="editor-stage" data-editor-stage>
        <div class="kui-editor__device-box" data-morph-skip>
          <div class="kui-editor__device-scaler">
            <div class="kui-editor__device" data-editor-play-device>
              <iframe
                class="kui-editor__device-frame"
                title={title}
                src={playPageUrl(globalThis.location.href)}
                width={String(emulated.viewport.width)}
                height={String(emulated.viewport.height)}
                data-editor-play-frame
              />
            </div>
          </div>
          {/* Flexible's resize handles, on the device's trailing and
              bottom edges. */}
          <div
            class="kui-editor__resize"
            data-edge="inline-end"
            role="separator"
            aria-orientation="vertical"
            aria-label="Width"
            tabindex={0}
            hidden
          />
          <div
            class="kui-editor__resize"
            data-edge="block-end"
            role="separator"
            aria-orientation="horizontal"
            aria-label="Height"
            tabindex={0}
            hidden
          />
        </div>
      </div>
    );
  };

  /** The play bar and stage, for the editor's render. */
  const render = (title: string): SafeHtml => (
    <>
      {playBar()}
      {stage(title)}
    </>
  );

  /** The physical safe areas the played view gets now. */
  const safeArea = () => emulation().safeArea;

  /**
   * Wires the play bar and stage while playing: lays the device out now,
   * whenever the choices change, and whenever the stage resizes, and calls
   * `onEnvironment` when the played view's safe areas may have changed.
   */
  const start = (root: HTMLElement, onEnvironment: () => void) => {
    const view = root.ownerDocument.defaultView!;
    const stageEl = root.querySelector<HTMLElement>('[data-editor-stage]')!;
    const box = stageEl.querySelector<HTMLElement>('.kui-editor__device-box')!;
    const scaler = box.querySelector<HTMLElement>(
      '.kui-editor__device-scaler',
    )!;
    const screen = box.querySelector<HTMLElement>('[data-editor-play-device]')!;
    const frame = box.querySelector<HTMLIFrameElement>(
      '[data-editor-play-frame]',
    )!;
    const handles = [
      ...box.querySelectorAll<HTMLElement>('.kui-editor__resize'),
    ];
    let scale = 1;

    const apply = () => {
      const emulated = emulation();
      const { device, viewport, offset } = emulated;
      screen.style.width = `${device.width}px`;
      screen.style.height = `${device.height}px`;
      frame.width = String(viewport.width);
      frame.height = String(viewport.height);
      frame.style.top = `${offset.top}px`;
      frame.style.left = `${offset.left}px`;
      screen.dataset.orientation = emulated.orientation;
      screen.dataset.installed = String(emulated.installed);
      const style = view.getComputedStyle(stageEl);
      const outer = { width: screen.offsetWidth, height: screen.offsetHeight };
      const chosen = settings.value.scale;
      scale =
        chosen === 'fit'
          ? fitScale(
              {
                width:
                  stageEl.clientWidth -
                  parseFloat(style.paddingLeft) -
                  parseFloat(style.paddingRight),
                height:
                  stageEl.clientHeight -
                  parseFloat(style.paddingTop) -
                  parseFloat(style.paddingBottom),
              },
              outer,
            )
          : Number(chosen);
      const reserved = scaledBox(outer, scale);
      box.style.width = `${reserved.width}px`;
      box.style.height = `${reserved.height}px`;
      scaler.style.transform = `scale(${scale})`;
      box.dataset.scale = String(scale);
      const flexible = presetOf(settings.value.device).kind === 'flexible';
      for (const handle of handles) {
        handle.hidden = !flexible;
        const side = handle.dataset.edge === 'inline-end' ? 'width' : 'height';
        handle.setAttribute('aria-valuenow', String(viewport[side]));
      }
    };

    /** Resizes Flexible's viewport, from a handle or a field. */
    const resize = (side: 'width' | 'height', value: number) => {
      update({
        flexible: { ...settings.value.flexible, [side]: clampFlexible(value) },
      });
    };

    let lastSafeArea = JSON.stringify(safeArea());
    const stopApply = effect(() => {
      void settings.value;
      apply();
      const next = JSON.stringify(safeArea());
      if (next !== lastSafeArea) {
        lastSafeArea = next;
        onEnvironment();
      }
    });
    const observer = new ResizeObserver(apply);
    observer.observe(stageEl);

    /** A handle drag: the pointer's travel, unscaled, resizes the viewport. */
    const onPointerDown = (event: PointerEvent, handle: HTMLElement) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const side = handle.dataset.edge === 'inline-end' ? 'width' : 'height';
      const from = side === 'width' ? event.clientX : event.clientY;
      const start = settings.value.flexible[side];
      handle.setPointerCapture?.(event.pointerId);
      handle.dataset.dragging = 'true';
      const move = (moved: PointerEvent) => {
        const at = side === 'width' ? moved.clientX : moved.clientY;
        resize(side, start + (at - from) / Math.max(scale, 0.05));
      };
      const end = () => {
        delete handle.dataset.dragging;
        stopMove();
        stopUp();
        stopCancel();
      };
      const stopMove = on(handle, 'pointermove', move);
      const stopUp = on(handle, 'pointerup', end);
      const stopCancel = on(handle, 'pointercancel', end);
    };

    const stops = [
      stopApply,
      () => observer.disconnect(),
      delegate<HTMLElement>(
        root,
        'change',
        '[data-editor-play="device"]',
        (_event, field) => {
          const id = (field as HTMLElement & { value: string }).value;
          if (presets.some((preset) => preset.id === id))
            update({ device: id });
        },
      ),
      delegate<HTMLElement>(
        root,
        'change',
        '[data-editor-play="scale"]',
        (_event, field) => {
          const scaleValue = (field as HTMLElement & { value: string }).value;
          if (PLAY_SCALES.some(({ value }) => value === scaleValue))
            update({ scale: scaleValue as PlayScale });
        },
      ),
      delegate<HTMLElement>(
        root,
        'change',
        '[data-editor-play-size] input',
        (_event, input) => {
          const side = input.closest<HTMLElement>('[data-editor-play-size]')!
            .dataset.editorPlaySize as 'width' | 'height';
          // A cleared or unreadable number field changes nothing.
          const { value } = input as HTMLInputElement;
          if (value.trim()) resize(side, Number(value));
        },
      ),
      delegate<HTMLElement>(
        root,
        'click',
        `[data-action="${ROTATE_ACTION}"]`,
        () =>
          update({
            orientation:
              settings.value.orientation === 'landscape'
                ? 'portrait'
                : 'landscape',
          }),
      ),
      delegate<HTMLElement>(
        root,
        'click',
        `[data-action="${INSTALLED_ACTION}"]`,
        () => update({ installed: !settings.value.installed }),
      ),
      ...handles.map((handle) =>
        on(handle, 'pointerdown', (event) => onPointerDown(event, handle)),
      ),
      ...handles.map((handle) =>
        on(handle, 'keydown', (event) => {
          const { key } = event;
          const side =
            handle.dataset.edge === 'inline-end' ? 'width' : 'height';
          const step = event.shiftKey ? 50 : 10;
          const delta =
            key === 'ArrowRight' || key === 'ArrowDown'
              ? step
              : key === 'ArrowLeft' || key === 'ArrowUp'
                ? -step
                : 0;
          if (!delta) return;
          event.preventDefault();
          resize(side, settings.value.flexible[side] + delta);
        }),
      ),
    ];
    return () => {
      for (const stop of stops) stop();
    };
  };

  return { render, start, safeArea, settings };
}
