import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const floating = vi.hoisted(() => ({
  positions: [] as { anchor: unknown; popup: HTMLElement; placement: string }[],
  stops: 0,
  updates: [] as (() => void)[],
}));

vi.mock('@floating-ui/dom', () => ({
  computePosition: (
    anchor: unknown,
    popup: HTMLElement,
    options: { placement: string },
  ) => {
    floating.positions.push({ anchor, popup, placement: options.placement });
    return Promise.resolve({ x: 10, y: 20, placement: options.placement });
  },
  autoUpdate: (_anchor: unknown, _popup: HTMLElement, update: () => void) => {
    floating.updates.push(update);
    update();
    return () => {
      floating.stops += 1;
    };
  },
  flip: () => ({ name: 'flip', fn: () => ({}) }),
  shift: () => ({ name: 'shift', fn: () => ({}) }),
  size: () => ({ name: 'size', fn: () => ({}) }),
}));

import { ListFilter } from 'lucide';

import {
  installSelects,
  SELECT_TYPEAHEAD_RESET,
} from '../../src/components/forms/select/internal/select-controller.js';
import type { KuiSelectElement } from '../../src/components/forms/select/internal/select-element.js';
import {
  Select,
  type SelectChoice,
  type SelectProps,
} from '../../src/components/forms/select/select.js';
import { LucideIcon } from '../../src/components/media/lucide-icon/lucide-icon.js';
import {
  installPopoverPolyfill,
  isShown,
  resetPopovers,
} from './helpers/popover.js';

beforeAll(() => {
  installPopoverPolyfill();
  installSelects();
  installSelects();
});

beforeEach(() => {
  floating.positions.length = 0;
  floating.updates.length = 0;
  floating.stops = 0;
});

afterEach(() => {
  resetPopovers();
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const flush = () =>
  new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));

const CHOICES: SelectChoice[] = [
  { value: 'fast', label: 'Fast', icon: ListFilter },
  { value: 'balanced', label: 'Balanced' },
  { value: 'slow', label: 'Slow', disabled: true, disabledReason: 'Busy' },
  { value: 'thorough', label: 'Thorough' },
];

function setup(props: Partial<SelectProps> = {}) {
  const host = document.createElement('div');
  host.innerHTML = String(
    Select({
      name: 'speed',
      label: 'Speed',
      value: 'balanced',
      choices: CHOICES,
      ...props,
    } as SelectProps),
  );
  document.body.append(host);
  const root = host.firstElementChild as KuiSelectElement;
  const trigger = root.querySelector<HTMLButtonElement>(
    '.kui-select__trigger',
  )!;
  const popup = root.querySelector<HTMLElement>('.kui-select__popup')!;
  const option = (label: string) =>
    [...root.querySelectorAll<HTMLElement>('.kui-select__option')].find(
      (element) =>
        element.querySelector('.kui-select__option-label')?.textContent ===
        label,
    )!;
  const events: string[] = [];
  root.addEventListener('input', () =>
    events.push(`input:${String(root.value)}`),
  );
  root.addEventListener('change', () =>
    events.push(`change:${String(root.value)}`),
  );
  return { host, root, trigger, popup, option, events };
}

const key = (target: Element, key: string, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
};

const click = (target: Element) =>
  target.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true }),
  );

const press = (target: Element) =>
  target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

describe('Select register: the kui-select element', () => {
  it('reports its name and single value, and sets a value', () => {
    const { root, trigger } = setup();
    expect(root).toBeInstanceOf(customElements.get('kui-select')!);
    expect(root.name).toBe('speed');
    expect(root.multiple).toBe(false);
    expect(root.value).toBe('balanced');
    root.value = 'thorough';
    expect(root.value).toBe('thorough');
    expect(trigger.querySelector('.kui-select__value')?.textContent).toBe(
      'Thorough',
    );
    // A disabled or unknown value chooses nothing.
    root.value = 'slow';
    expect(root.value).toBe('');
    expect(
      trigger
        .querySelector('.kui-select__value')
        ?.hasAttribute('data-placeholder'),
    ).toBe(true);
  });

  it('reports a multiple value in choice order', () => {
    const { root } = setup({
      multiple: true,
      value: ['thorough', 'fast'],
    } as Partial<SelectProps>);
    expect(root.multiple).toBe(true);
    expect(root.value).toEqual(['fast', 'thorough']);
    root.value = ['balanced'];
    expect(root.value).toEqual(['balanced']);
  });

  it('has no form without attachInternals', () => {
    const { root } = setup();
    expect(root.form).toBe(null);
  });

  it('has an empty name when none is rendered', () => {
    const { root } = setup({ name: undefined });
    expect(root.name).toBe('');
  });
});

describe('Select register: edges', () => {
  it('defines the element once across documents sharing a registry', () => {
    const listeners: string[] = [];
    const define = vi.spyOn(customElements, 'define');
    installSelects({
      defaultView: window,
      addEventListener: (type: string) => listeners.push(type),
    } as unknown as Document);
    expect(define).not.toHaveBeenCalled();
    expect(listeners).toContain('click');
  });

  it('focuses the listbox when it has no options', () => {
    const { trigger, popup } = setup({ choices: [], value: undefined });
    click(trigger);
    expect(document.activeElement).toBe(popup);
    expect(key(popup, 'ArrowDown').defaultPrevented).toBe(true);
  });

  it('scrolls the least amount that shows the focused option', () => {
    const { trigger, popup, option } = setup();
    click(trigger);
    Object.defineProperty(popup, 'scrollHeight', { value: 200 });
    Object.defineProperty(popup, 'clientHeight', { value: 50 });
    vi.spyOn(popup, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 100, 100, 50),
    );
    const at = (element: HTMLElement, top: number) =>
      vi
        .spyOn(element, 'getBoundingClientRect')
        .mockReturnValue(new DOMRect(0, top, 100, 20));
    at(option('Thorough'), 160);
    popup.scrollTop = 0;
    key(option('Balanced'), 'End');
    expect(popup.scrollTop).toBe(30);
    at(option('Fast'), 90);
    popup.scrollTop = 40;
    key(option('Thorough'), 'Home');
    expect(popup.scrollTop).toBe(30);
    // An option already in view leaves the scroll alone.
    at(option('Balanced'), 110);
    key(option('Fast'), 'ArrowDown');
    expect(popup.scrollTop).toBe(30);
  });

  it('stops placing and resets a Select removed while open', async () => {
    const { host, root, trigger } = setup();
    click(trigger);
    await flush();
    host.remove();
    floating.updates.at(-1)!();
    expect(floating.stops).toBe(1);
    expect(root.hasAttribute('open')).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('restores the open state and placement a re-render morphed away', async () => {
    const { trigger, popup } = setup();
    click(trigger);
    await flush();
    const placed = floating.positions.length;
    expect(popup.style.top).toBe('20px');
    // A morph back to the rendered markup: closed trigger, no inline style.
    trigger.setAttribute('aria-expanded', 'false');
    popup.removeAttribute('style');
    await flush();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(floating.positions.length).toBe(placed + 1);
    expect(popup.style.top).toBe('20px');
    // Its own writes, and unrelated style changes, change nothing more.
    popup.style.color = 'red';
    await flush();
    expect(floating.positions.length).toBe(placed + 1);
    // Once closed it no longer restores.
    click(trigger);
    trigger.setAttribute('aria-expanded', 'false');
    popup.removeAttribute('style');
    await flush();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes when disabled while open', async () => {
    const { root, trigger, popup, option, events } = setup();
    click(trigger);
    trigger.disabled = true;
    await flush();
    expect(isShown(popup)).toBe(false);
    expect(root.hasAttribute('open')).toBe(false);
    click(option('Fast'));
    expect(events).toEqual([]);
  });

  it('ignores a click in the listbox off any option', () => {
    const { trigger, popup, events } = setup({
      choices: [
        { value: 'a', label: 'A', group: 'Letters' },
        { value: 'b', label: 'B', group: 'Letters' },
      ],
      value: 'a',
    });
    click(trigger);
    click(popup.querySelector('.kui-select__group-title')!);
    expect(isShown(popup)).toBe(true);
    expect(events).toEqual([]);
  });

  it('ignores keys inside a Select off its trigger and open listbox', () => {
    const { root, popup, option } = setup();
    const label = root.querySelector('.kui-select__label')!;
    expect(key(label, 'ArrowDown').defaultPrevented).toBe(false);
    expect(key(option('Fast'), 'ArrowDown').defaultPrevented).toBe(false);
    expect(isShown(popup)).toBe(false);
  });

  it('leaves other popovers to themselves', () => {
    const other = document.createElement('div');
    other.setAttribute('popover', 'manual');
    document.body.append(other);
    other.showPopover();
    other.hidePopover();
    expect(isShown(other)).toBe(false);
  });
});

describe('Select register: opening and closing', () => {
  it('opens from the trigger on the chosen option and places the listbox below it', async () => {
    const { root, trigger, popup, option } = setup();
    click(trigger);
    expect(isShown(popup)).toBe(true);
    expect(root.hasAttribute('open')).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(option('Balanced'));
    await flush();
    expect(floating.positions[0]).toMatchObject({
      anchor: trigger,
      popup,
      placement: 'bottom',
    });
    click(trigger);
    expect(isShown(popup)).toBe(false);
    expect(root.hasAttribute('open')).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(floating.stops).toBe(1);
  });

  it('opens on the first option when nothing is chosen', () => {
    const { trigger, option } = setup({
      value: 'none',
    } as Partial<SelectProps>);
    click(trigger);
    expect(document.activeElement).toBe(option('Fast'));
  });

  it('opens from the keyboard and finds a typed choice', () => {
    const { trigger, popup, option } = setup();
    for (const opening of ['Enter', ' ', 'ArrowDown', 'ArrowUp']) {
      expect(key(trigger, opening).defaultPrevented).toBe(true);
      expect(isShown(popup)).toBe(true);
      popup.hidePopover();
    }
    key(trigger, 'Home');
    expect(document.activeElement).toBe(option('Fast'));
    popup.hidePopover();
    key(trigger, 'End');
    expect(document.activeElement).toBe(option('Thorough'));
    popup.hidePopover();
    key(trigger, 't');
    expect(document.activeElement).toBe(option('Thorough'));
    popup.hidePopover();
    // Other keys are left alone, and a modified key never opens it.
    expect(key(trigger, 'F2').defaultPrevented).toBe(false);
    expect(key(trigger, 'a', { metaKey: true }).defaultPrevented).toBe(false);
    expect(isShown(popup)).toBe(false);
    // Keys on an open trigger are left to the open listbox.
    click(trigger);
    expect(key(trigger, 'ArrowDown').defaultPrevented).toBe(false);
  });

  it('keeps a disabled Select closed', () => {
    const { trigger, popup } = setup({ disabled: true });
    click(trigger);
    key(trigger, 'Enter');
    expect(isShown(popup)).toBe(false);
  });

  it('matches the trigger width with fitMenu', async () => {
    const { trigger, popup } = setup({ fitMenu: true });
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 180, 44),
    );
    click(trigger);
    await flush();
    expect(popup.style.width).toBe('180px');
  });

  it('closes on a press outside, not on a press inside', () => {
    const outside = document.createElement('button');
    document.body.append(outside);
    const { trigger, popup, option } = setup();
    click(trigger);
    press(option('Fast'));
    expect(isShown(popup)).toBe(true);
    press(outside);
    expect(isShown(popup)).toBe(false);
    // A Select that left the document is forgotten on the next press.
    click(trigger);
    trigger.closest('kui-select')!.remove();
    resetPopovers();
    press(outside);
  });

  it('closes with Escape (claiming it) and Tab, returning to the trigger', () => {
    const { trigger, popup } = setup();
    click(trigger);
    const escape = key(document.activeElement!, 'Escape');
    expect(escape.defaultPrevented).toBe(true);
    expect(isShown(popup)).toBe(false);
    expect(document.activeElement).toBe(trigger);
    click(trigger);
    expect(key(document.activeElement!, 'Tab').defaultPrevented).toBe(false);
    expect(isShown(popup)).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('focuses the trigger from its label', () => {
    const { root, trigger } = setup();
    click(root.querySelector('.kui-select__label')!);
    expect(document.activeElement).toBe(trigger);
  });
});

describe('Select register: choosing', () => {
  it('chooses with a click: updates the trigger, announces input then change, and closes', () => {
    const { root, trigger, popup, option, events } = setup();
    click(trigger);
    click(option('Fast'));
    expect(root.value).toBe('fast');
    expect(events).toEqual(['input:fast', 'change:fast']);
    expect(isShown(popup)).toBe(false);
    expect(document.activeElement).toBe(trigger);
    expect(trigger.querySelector('.kui-select__value')?.textContent).toBe(
      'Fast',
    );
    // The chosen icon leads the trigger.
    expect(
      trigger.querySelector(':scope > .kui-select__icon--selected svg'),
    ).not.toBe(null);
    click(trigger);
    click(option('Balanced'));
    expect(trigger.querySelector(':scope > .kui-select__icon--selected')).toBe(
      null,
    );
    // Choosing the current value again announces nothing.
    click(trigger);
    click(option('Balanced'));
    expect(events).toEqual([
      'input:fast',
      'change:fast',
      'input:balanced',
      'change:balanced',
    ]);
  });

  it('never chooses a disabled option', () => {
    const { root, trigger, popup, option } = setup();
    click(trigger);
    click(option('Slow'));
    expect(root.value).toBe('balanced');
    expect(isShown(popup)).toBe(true);
  });

  it('moves with the arrows and chooses with Enter or Space', () => {
    vi.useFakeTimers();
    const { root, trigger, option } = setup();
    click(trigger);
    const at = () => document.activeElement!;
    key(at(), 'ArrowDown');
    expect(at()).toBe(option('Slow'));
    key(at(), 'ArrowDown');
    expect(at()).toBe(option('Thorough'));
    key(at(), 'ArrowDown');
    expect(at()).toBe(option('Fast'));
    key(at(), 'ArrowUp');
    expect(at()).toBe(option('Thorough'));
    key(at(), 'Home');
    expect(at()).toBe(option('Fast'));
    key(at(), 'End');
    expect(at()).toBe(option('Thorough'));
    key(at(), 'Enter');
    expect(root.value).toBe('thorough');
    click(trigger);
    key(at(), 'ArrowUp');
    key(at(), ' ');
    // Space on the disabled Slow option chooses nothing.
    expect(root.value).toBe('thorough');
    // Typing finds a choice; Space continues a query underway.
    key(at(), 'f');
    expect(at()).toBe(option('Fast'));
    expect(key(at(), 'z').defaultPrevented).toBe(false);
    vi.advanceTimersByTime(SELECT_TYPEAHEAD_RESET);
    key(at(), 'b');
    key(at(), 'a');
    key(at(), 'Backspace');
    expect(at()).toBe(option('Balanced'));
    expect(key(at(), ' ').defaultPrevented).toBe(true);
    expect(root.value).toBe('thorough');
    // A modified key is ignored.
    expect(key(at(), 'a', { ctrlKey: true }).defaultPrevented).toBe(false);
  });

  it('toggles multiple choices and stays open', () => {
    const { root, trigger, popup, option, events } = setup({
      multiple: true,
      value: ['fast'],
    } as Partial<SelectProps>);
    expect(trigger.querySelector('.kui-select__value')?.textContent).toBe(
      'Fast',
    );
    click(trigger);
    click(option('Thorough'));
    expect(root.value).toEqual(['fast', 'thorough']);
    expect(isShown(popup)).toBe(true);
    key(option('Thorough'), 'Enter');
    expect(root.value).toEqual(['fast']);
    click(option('Fast'));
    expect(root.value).toEqual([]);
    expect(
      trigger
        .querySelector('.kui-select__value')
        ?.hasAttribute('data-placeholder'),
    ).toBe(true);
    expect(events).toEqual([
      'input:fast,thorough',
      'change:fast,thorough',
      'input:fast',
      'change:fast',
      'input:',
      'change:',
    ]);
  });

  it('runs the select-all and clear actions, which announce only a change', () => {
    const { root, trigger, popup, events } = setup({
      multiple: true,
      value: [],
      selectAllLabel: 'All',
      clearLabel: 'None',
    } as Partial<SelectProps>);
    click(trigger);
    const [all, none] = popup.querySelectorAll<HTMLButtonElement>(
      '[data-select-action]',
    );
    click(all!);
    expect(root.value).toEqual(['fast', 'balanced', 'thorough']);
    click(all!);
    click(none!);
    expect(root.value).toEqual([]);
    expect(events).toEqual([
      'input:fast,balanced,thorough',
      'change:fast,balanced,thorough',
      'input:',
      'change:',
    ]);
    // Enter and Space on an action are the button's own.
    expect(key(all!, 'Enter').defaultPrevented).toBe(false);
    expect(key(all!, ' ').defaultPrevented).toBe(false);
    expect(key(all!, 'x').defaultPrevented).toBe(false);
  });

  it('names an icon-only multiple trigger with its chosen labels', () => {
    const { trigger, option } = setup({
      multiple: true,
      value: ['fast'],
      selectedPresentation: 'icon-only',
      triggerIcon: <LucideIcon icon={ListFilter} name="filter" />,
      label: undefined,
      ariaLabel: 'Filter',
    } as Partial<SelectProps>);
    expect(trigger.getAttribute('aria-label')).toBe('Filter: Fast');
    click(trigger);
    click(option('Balanced'));
    expect(trigger.getAttribute('aria-label')).toBe('Filter: Fast, Balanced');
    click(option('Fast'));
    click(option('Balanced'));
    expect(trigger.getAttribute('aria-label')).toBe('Filter');
    expect(trigger.querySelector('.kui-select__value')?.textContent).toBe('');
  });

  it('leaves a custom selected rendering to the application', () => {
    const { trigger, option } = setup({
      renderSelected: (choice: SelectChoice) => <b>{choice.label}!</b>,
    } as Partial<SelectProps>);
    click(trigger);
    click(option('Fast'));
    expect(
      trigger.querySelector('.kui-select__custom-selected b')?.textContent,
    ).toBe('Balanced!');
  });

  it('ignores clicks and keys outside Selects and on non-elements', () => {
    setup();
    const plain = document.createElement('button');
    const text = document.createTextNode('x');
    document.body.append(plain, text);
    click(plain);
    key(plain, 'Enter');
    for (const type of ['click', 'keydown', 'pointerdown'])
      text.dispatchEvent(new Event(type, { bubbles: true }));
  });
});

describe('Select register: forms', () => {
  it('submits and resets through ElementInternals', async () => {
    const values: unknown[] = [];
    const internals = {
      form: null as HTMLFormElement | null,
      setFormValue: (value: unknown) => values.push(value),
    };
    Object.defineProperty(HTMLElement.prototype, 'attachInternals', {
      configurable: true,
      value: () => internals,
    });
    const form = document.createElement('form');
    document.body.append(form);
    internals.form = form;
    form.innerHTML = String(
      Select({
        name: 'labels',
        label: 'Labels',
        multiple: true,
        value: ['fast'],
        choices: CHOICES,
      }),
    );
    const root = form.firstElementChild as KuiSelectElement;
    await flush();
    expect(root.form).toBe(form);
    const data = values.at(-1) as FormData;
    expect(data.getAll('labels')).toEqual(['fast']);
    root.value = ['fast', 'thorough'];
    expect((values.at(-1) as FormData).getAll('labels')).toEqual([
      'fast',
      'thorough',
    ]);
    root.formResetCallback();
    expect(root.value).toEqual(['fast']);
    const single = document.createElement('div');
    single.innerHTML = String(
      Select({
        name: 'speed',
        label: 'Speed',
        value: 'none',
        choices: CHOICES,
      }),
    );
    const before = values.length;
    form.append(single);
    // An empty single Select submits nothing.
    expect(values[before]).toBe(null);
    delete (HTMLElement.prototype as { attachInternals?: unknown })
      .attachInternals;
  });
});
