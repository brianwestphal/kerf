// KF-R7KXSN: play mode's device presets, orientation, scale, and
// installed-app safe areas (docs/26-ui-editor.md §11.2, §11.3): the preset
// math, the host's presets, the play bar's controls, and the play page's
// safe-area tokens.
import type { ViewDocument } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clampFlexible,
  DEFAULT_PLAY_SETTINGS,
  type DevicePreset,
  emulate,
  FLEXIBLE_MAX,
  FLEXIBLE_MIN,
  parsePlaySettings,
  resolveDevicePresets,
  safeAreaTokens,
  SHIPPED_DEVICE_PRESETS,
  viewportLabel,
} from '../../../src/editor/model/play-device.js';
import { PLAY_SETTINGS_KEY } from '../../../src/editor/play-stage.js';
import {
  PLAY_DOCUMENT,
  PLAY_ENVIRONMENT,
  playPageUrl,
} from '../../../src/editor/player.js';
import { createEditor } from './kerf-catalog.js';

const preset = (id: string) =>
  SHIPPED_DEVICE_PRESETS.find((device) => device.id === id)!;
const settings = (change: Partial<typeof DEFAULT_PLAY_SETTINGS> = {}) => ({
  ...DEFAULT_PLAY_SETTINGS,
  ...change,
});

describe('device presets', () => {
  it('ship each kind, with unique ids, in menu order', () => {
    const ids = SHIPPED_DEVICE_PRESETS.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(resolveDevicePresets().map(({ kind }) => kind)).toEqual([
      'phone',
      'phone',
      'phone',
      'phone',
      'tablet',
      'tablet',
      'tablet',
      'desktop',
      'desktop',
      'desktop',
      'flexible',
    ]);
    // The current iPhone's published size.
    expect(preset('iphone')).toMatchObject({ width: 402, height: 874 });
  });

  it('take a host’s additions and replacements, or its whole list', () => {
    const kiosk: DevicePreset = {
      id: 'kiosk',
      label: 'Kiosk',
      kind: 'tablet',
      width: 600,
      height: 1000,
      frame: 'tablet',
    };
    const se: DevicePreset = { ...preset('iphone-se'), label: 'Small phone' };
    const merged = resolveDevicePresets([kiosk, se]);
    expect(merged.find(({ id }) => id === 'iphone-se')!.label).toBe(
      'Small phone',
    );
    expect(merged.filter(({ id }) => id === 'iphone-se')).toHaveLength(1);
    // An added tablet joins the tablets, before the desktops.
    const kinds = merged.map(({ id }) => id);
    expect(kinds.indexOf('kiosk')).toBeLessThan(
      kinds.indexOf('macbook-air-13'),
    );
    expect(kinds.indexOf('kiosk')).toBeGreaterThan(
      kinds.indexOf('ipad-pro-13'),
    );
    expect(resolveDevicePresets(() => [])).toBe(SHIPPED_DEVICE_PRESETS);
    expect(resolveDevicePresets((shipped) => [shipped[0]!, kiosk])).toEqual([
      SHIPPED_DEVICE_PRESETS[0],
      kiosk,
    ]);
  });
});

describe('emulation', () => {
  it('subtracts a browser tab’s chrome and gives it no safe areas', () => {
    const tab = emulate(preset('iphone'), settings());
    expect(tab.device).toEqual({ width: 402, height: 874 });
    expect(tab.viewport).toEqual({ width: 402, height: 778 });
    expect(tab.offset).toEqual({ top: 62, left: 0 });
    expect(tab.safeArea).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    expect(viewportLabel(tab)).toBe('402 × 778');
  });

  it('runs an installed app on the whole screen, under its safe areas', () => {
    const app = emulate(preset('iphone'), settings({ installed: true }));
    expect(app.viewport).toEqual({ width: 402, height: 874 });
    expect(app.offset).toEqual({ top: 0, left: 0 });
    expect(app.safeArea).toEqual({ top: 62, right: 0, bottom: 34, left: 0 });
  });

  it('swaps the sides and the safe areas in landscape', () => {
    const tab = emulate(
      preset('iphone'),
      settings({ orientation: 'landscape' }),
    );
    expect(tab.device).toEqual({ width: 874, height: 402 });
    expect(tab.viewport).toEqual({ width: 750, height: 381 });
    expect(tab.offset).toEqual({ top: 0, left: 62 });
    const app = emulate(
      preset('iphone'),
      settings({ orientation: 'landscape', installed: true }),
    );
    expect(app.safeArea).toEqual({ top: 0, right: 62, bottom: 21, left: 62 });
  });

  it('never rotates or installs a desktop', () => {
    const laptop = emulate(
      preset('macbook-air-13'),
      settings({ orientation: 'landscape', installed: true }),
    );
    expect(laptop.orientation).toBe('portrait');
    expect(laptop.installed).toBe(false);
    expect(laptop.viewport).toEqual({ width: 1470, height: 956 });
  });

  it('takes a preset’s own browser chrome over its safe areas', () => {
    const phone: DevicePreset = {
      ...preset('android-compact'),
      browserChrome: {
        portrait: { top: 106, right: 0, bottom: 0, left: 0 },
        landscape: { top: 56, right: 50, bottom: 0, left: 0 },
      },
    };
    expect(emulate(phone, settings()).viewport).toEqual({
      width: 412,
      height: 809,
    });
  });

  it('sizes Flexible from its own fields, whichever way it faces', () => {
    const wide = emulate(
      preset('flexible'),
      settings({ flexible: { width: 900, height: 500 }, installed: true }),
    );
    expect(wide.viewport).toEqual({ width: 900, height: 500 });
    expect(wide.orientation).toBe('landscape');
    expect(wide.installed).toBe(false);
    expect(
      emulate(
        preset('flexible'),
        settings({ flexible: { width: 500, height: 900 } }),
      ).orientation,
    ).toBe('portrait');
  });

  it('maps safe areas onto the logical tokens, mirrored right to left', () => {
    const insets = { top: 1, right: 2, bottom: 3, left: 4 };
    expect(safeAreaTokens(insets)).toEqual({
      '--kui-safe-area-block-start': '1px',
      '--kui-safe-area-block-end': '3px',
      '--kui-safe-area-inline-start': '4px',
      '--kui-safe-area-inline-end': '2px',
    });
    expect(safeAreaTokens(insets, 'rtl')).toMatchObject({
      '--kui-safe-area-inline-start': '2px',
      '--kui-safe-area-inline-end': '4px',
    });
  });

  it('reads stored choices leniently', () => {
    const presets = resolveDevicePresets();
    expect(parsePlaySettings(undefined, presets)).toEqual(
      DEFAULT_PLAY_SETTINGS,
    );
    expect(
      parsePlaySettings(
        {
          device: 'ipad-mini',
          orientation: 'landscape',
          installed: true,
          scale: '0.5',
          flexible: { width: 50, height: 99999 },
        },
        presets,
      ),
    ).toEqual({
      device: 'ipad-mini',
      orientation: 'landscape',
      installed: true,
      scale: '0.5',
      flexible: { width: FLEXIBLE_MIN, height: FLEXIBLE_MAX },
    });
    expect(
      parsePlaySettings(
        { device: 'gone', scale: '3', installed: 'yes', flexible: 1 },
        presets,
      ),
    ).toEqual(DEFAULT_PLAY_SETTINGS);
    // Without the default device, the first one; without any, the default id.
    expect(parsePlaySettings({}, [preset('ipad-mini')]).device).toBe(
      'ipad-mini',
    );
    expect(parsePlaySettings({}, []).device).toBe('iphone');
    expect(clampFlexible(640.4)).toBe(640);
  });
});

/** Changes a Select the way its popup does: a new value, then `change`. */
function choose(select: HTMLElement, value: string) {
  select.setAttribute('value', value);
  Object.defineProperty(select, 'value', { configurable: true, value });
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('the play bar', () => {
  let cleanup: (() => void) | undefined;
  beforeEach(() => {
    // happy-dom reports that it loads no frame page.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    globalThis.localStorage.clear();
  });
  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    document.body.replaceChildren();
    vi.restoreAllMocks();
    globalThis.localStorage.clear();
  });

  const play = (options: Parameters<typeof createEditor>[0] = {}) => {
    const root = document.createElement('div');
    document.body.append(root);
    const editor = createEditor(options);
    mount(root, editor.render);
    cleanup = editor.wire(root);
    (root.querySelector('[data-action="editor-play"]') as HTMLElement).click();
    const frame = () =>
      root.querySelector<HTMLIFrameElement>('[data-editor-play-frame]')!;
    const stand = { postMessage: vi.fn() };
    Object.defineProperty(frame(), 'contentWindow', { value: stand });
    const control = (selector: string) =>
      root.querySelector<HTMLElement>(selector)!;
    const size = () => [frame().width, frame().height];
    return { root, editor, frame, control, size, post: stand.postMessage };
  };
  const stored = () =>
    JSON.parse(globalThis.localStorage.getItem(PLAY_SETTINGS_KEY)!);

  it('switches devices, rotates, and installs, telling the view its safe areas', () => {
    const { control, size, post, frame } = play();
    expect(size()).toEqual(['402', '778']);
    choose(control('[data-editor-play="device"]'), 'ipad-mini');
    expect(size()).toEqual(['756', '1114']);
    control('[data-action="editor-play-rotate"]').click();
    expect(size()).toEqual(['1158', '712']);
    expect(
      control('[data-action="editor-play-rotate"]').getAttribute(
        'aria-pressed',
      ),
    ).toBe('true');
    expect(post).not.toHaveBeenCalled();
    // Back and forth.
    control('[data-action="editor-play-rotate"]').click();
    expect(size()).toEqual(['756', '1114']);
    control('[data-action="editor-play-rotate"]').click();
    control('[data-action="editor-play-installed"]').click();
    expect(size()).toEqual(['1158', '756']);
    expect(post).toHaveBeenLastCalledWith(
      {
        type: PLAY_ENVIRONMENT,
        safeArea: { top: 24, right: 0, bottom: 20, left: 0 },
      },
      location.origin,
    );
    expect(frame().style.top).toBe('0px');
    // An unknown device is ignored.
    choose(control('[data-editor-play="device"]'), 'nothing');
    expect(stored()).toMatchObject({
      device: 'ipad-mini',
      orientation: 'landscape',
      installed: true,
    });
  });

  it('disables rotation and installing on a desktop', () => {
    const { control, size } = play();
    choose(control('[data-editor-play="device"]'), 'macbook-pro-16');
    expect(size()).toEqual(['1728', '1117']);
    for (const action of ['editor-play-rotate', 'editor-play-installed'])
      expect(
        control(`[data-action="${action}"]`).hasAttribute('disabled'),
      ).toBe(true);
  });

  it('scales by a fixed factor, and back to Fit', () => {
    const { control } = play();
    const box = control('.kui-editor__device-box');
    choose(control('[data-editor-play="scale"]'), '0.5');
    expect(box.dataset.scale).toBe('0.5');
    choose(control('[data-editor-play="scale"]'), '9');
    expect(box.dataset.scale).toBe('0.5');
    choose(control('[data-editor-play="scale"]'), 'fit');
    // happy-dom lays nothing out, so an unmeasured device fits at 1.
    expect(box.dataset.scale).toBe('1');
  });

  it('resizes Flexible from its fields and its handles', () => {
    const { control, size } = play();
    const handles = () =>
      [
        ...control('.kui-editor__device-box').querySelectorAll<HTMLElement>(
          '.kui-editor__resize',
        ),
      ] as [HTMLElement, HTMLElement];
    expect(handles().every((handle) => handle.hidden)).toBe(true);
    choose(control('[data-editor-play="device"]'), 'flexible');
    expect(size()).toEqual(['800', '600']);
    expect(handles().some((handle) => handle.hidden)).toBe(false);
    const field = (side: string) =>
      control(`[data-editor-play-size="${side}"] input`) as HTMLInputElement;
    field('width').value = '640';
    field('width').dispatchEvent(new Event('change', { bubbles: true }));
    field('height').value = 'tall';
    field('height').dispatchEvent(new Event('change', { bubbles: true }));
    expect(size()).toEqual(['640', '600']);
    const [width, height] = handles();
    expect(width.getAttribute('aria-valuenow')).toBe('640');
    for (const [key, shiftKey] of [
      ['ArrowRight', false],
      ['ArrowDown', true],
      ['ArrowLeft', false],
      ['Tab', false],
    ] as const)
      width.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey }));
    height.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(size()).toEqual(['690', '590']);
    // A drag adds the pointer's travel; another button does nothing.
    height.dispatchEvent(
      new PointerEvent('pointerdown', { button: 2, clientY: 0 }),
    );
    height.dispatchEvent(
      new PointerEvent('pointerdown', { button: 0, clientY: 100 }),
    );
    expect(height.dataset.dragging).toBe('true');
    height.dispatchEvent(new PointerEvent('pointermove', { clientY: 160 }));
    height.dispatchEvent(new PointerEvent('pointerup', { clientY: 160 }));
    height.dispatchEvent(new PointerEvent('pointermove', { clientY: 400 }));
    expect(size()).toEqual(['690', '650']);
    expect(height.dataset.dragging).toBeUndefined();
    width.dispatchEvent(
      new PointerEvent('pointerdown', { button: 0, clientX: 10 }),
    );
    width.dispatchEvent(new PointerEvent('pointermove', { clientX: 0 }));
    width.dispatchEvent(new PointerEvent('pointercancel'));
    expect(size()).toEqual(['680', '650']);
    expect(stored().flexible).toEqual({ width: 680, height: 650 });
  });

  it('remembers the choice per browser, and survives blocked storage', () => {
    globalThis.localStorage.setItem(
      PLAY_SETTINGS_KEY,
      JSON.stringify({ device: 'android-compact', installed: true }),
    );
    const first = play();
    expect(first.size()).toEqual(['412', '915']);
    cleanup?.();
    document.body.replaceChildren();
    vi.spyOn(globalThis.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(globalThis.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const blocked = play();
    expect(blocked.size()).toEqual(['402', '778']);
    choose(blocked.control('[data-editor-play="device"]'), 'iphone-se');
    expect(blocked.size()).toEqual(['375', '647']);
  });

  it('takes a host’s presets', () => {
    const { control, size } = play({
      devicePresets: [
        {
          id: 'kiosk',
          label: 'Kiosk',
          kind: 'tablet',
          width: 600,
          height: 1000,
          frame: 'tablet',
        },
      ],
    });
    choose(control('[data-editor-play="device"]'), 'kiosk');
    expect(size()).toEqual(['600', '1000']);
  });
});

describe('the play page’s environment', () => {
  afterEach(() => {
    document.body.replaceChildren();
    document.documentElement.removeAttribute('style');
    document.documentElement.removeAttribute('dir');
    window.history.replaceState(null, '', '/');
  });

  it('sets the safe-area tokens on :root and names its device class', () => {
    window.history.replaceState(null, '', playPageUrl(location.href));
    const root = document.createElement('div');
    document.body.append(root);
    const player = createEditor();
    mount(root, player.render);
    const unwire = player.wire(root);
    const send = (data: unknown) =>
      window.dispatchEvent(
        new MessageEvent('message', {
          data,
          origin: location.origin,
          source: window,
        }),
      );
    const html = document.documentElement;
    expect(html.dataset.kerfPlayDevice).toMatch(/ (portrait|landscape)$/);
    send({
      type: PLAY_ENVIRONMENT,
      safeArea: { top: 62, right: 0, bottom: 34, left: 8 },
    });
    expect(html.style.getPropertyValue('--kui-safe-area-block-start')).toBe(
      '62px',
    );
    expect(html.style.getPropertyValue('--kui-safe-area-inline-start')).toBe(
      '8px',
    );
    html.dir = 'rtl';
    send({
      type: PLAY_ENVIRONMENT,
      safeArea: { top: 0, right: 0, bottom: 0, left: 8 },
    });
    expect(html.style.getPropertyValue('--kui-safe-area-inline-end')).toBe(
      '8px',
    );
    // An environment without insets is ignored, and the document still plays.
    send({ type: PLAY_ENVIRONMENT });
    send({
      type: PLAY_DOCUMENT,
      document: player.document.value as ViewDocument,
    });
    unwire();
  });
});
