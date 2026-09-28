import { afterEach, describe, expect, it, vi } from 'vitest';

import { installSelectMultiple } from '../../src/install-select-multiple.js';

// Fakes of the Web Awesome members the multiple boundary adapts. The browser
// suite (tests/browser/select-multiple.spec.ts) covers the real elements.
interface FakeOption extends HTMLElement {
  value: string;
  label: string;
  selected: boolean;
  defaultSelected: boolean;
  syncDefaultSelected(): void;
}

interface FakeSelect extends HTMLElement {
  multiple: boolean;
  hasUpdated: boolean;
  displayLabel: string;
  value: string | string[] | null;
  selectedOptions: FakeOption[];
  readonly tags: unknown[];
  getAllOptions(): FakeOption[];
  selectionChanged(): void;
}

function prototypes() {
  const originalSync = vi.fn();
  const originalSelectionChanged = vi.fn(function (this: FakeSelect) {
    this.displayLabel = `${this.selectedOptions.length} options selected`;
  });
  const select = {
    selectionChanged: originalSelectionChanged,
    get tags() {
      return ['native-tag'];
    },
  };
  const option = { syncDefaultSelected: originalSync };
  return { select, option, originalSync, originalSelectionChanged };
}

function build(
  proto: ReturnType<typeof prototypes>,
  {
    kerf = true,
    multiple = true,
    hasUpdated = true,
    lang,
  }: {
    kerf?: boolean;
    multiple?: boolean;
    hasUpdated?: boolean;
    lang?: string;
  } = {},
) {
  const host = document.createElement('div') as unknown as FakeSelect;
  Object.setPrototypeOf(proto.select, HTMLDivElement.prototype);
  Object.setPrototypeOf(host, proto.select);
  if (kerf) host.dataset.component = 'select';
  if (lang) host.setAttribute('lang', lang);
  Object.assign(host, {
    multiple,
    hasUpdated,
    displayLabel: '',
    value: null,
    selectedOptions: [],
  });
  const options = [
    ['bug', 'Bug'],
    ['docs', 'Docs'],
    ['design', 'Design'],
  ].map(([value, label]) => {
    const option = document.createElement('span') as unknown as FakeOption;
    Object.setPrototypeOf(proto.option, HTMLSpanElement.prototype);
    Object.setPrototypeOf(option, proto.option);
    Object.assign(option, {
      value,
      label,
      selected: false,
      defaultSelected: false,
    });
    host.append(option);
    return option;
  });
  host.getAllOptions = () => options;
  document.body.append(host);
  return { host, options };
}

describe('Select multiple boundary', () => {
  afterEach(() => document.body.replaceChildren());

  it('installs once per prototype', () => {
    const proto = prototypes();
    installSelectMultiple(proto.select, proto.option);
    const installed = proto.select.selectionChanged;
    installSelectMultiple(proto.select, proto.option);
    expect(proto.select.selectionChanged).toBe(installed);
  });

  it('summarizes chosen labels in choice order, not selection order', () => {
    const proto = prototypes();
    installSelectMultiple(proto.select, proto.option);
    const { host, options } = build(proto);
    host.selectedOptions = [options[2]!, options[0]!];
    host.selectionChanged();
    expect(proto.originalSelectionChanged).toHaveBeenCalledOnce();
    expect(host.displayLabel).toBe('Bug, Design');
    host.selectedOptions = [options[1]!];
    host.selectionChanged();
    expect(host.displayLabel).toBe('Docs');
    // Nothing chosen: empty, so the placeholder text shows.
    host.selectedOptions = [];
    host.selectionChanged();
    expect(host.displayLabel).toBe('');
  });

  it('formats the summary for the nearest language', () => {
    const proto = prototypes();
    installSelectMultiple(proto.select, proto.option);
    const { host, options } = build(proto, { lang: 'de' });
    host.selectedOptions = [...options];
    host.selectionChanged();
    expect(host.displayLabel).toBe(
      new Intl.ListFormat('de', { type: 'unit', style: 'short' }).format([
        'Bug',
        'Docs',
        'Design',
      ]),
    );
  });

  it('falls back to a comma list when the language tag is invalid', () => {
    const proto = prototypes();
    installSelectMultiple(proto.select, proto.option);
    const { host, options } = build(proto, { lang: 'not a language!' });
    host.selectedOptions = [options[0]!, options[1]!];
    host.selectionChanged();
    expect(host.displayLabel).toBe('Bug, Docs');
  });

  it('replaces the per-choice tags with the summary only for Kerf multiple Selects', () => {
    const proto = prototypes();
    installSelectMultiple(proto.select, proto.option);
    expect(build(proto).host.tags).toEqual([]);
    expect(build(proto, { multiple: false }).host.tags).toEqual(['native-tag']);
    expect(build(proto, { kerf: false }).host.tags).toEqual(['native-tag']);
  });

  it('leaves single and raw Web Awesome selects on their native summary', () => {
    const proto = prototypes();
    installSelectMultiple(proto.select, proto.option);
    for (const options of [{ multiple: false }, { kerf: false }]) {
      const { host, options: choices } = build(proto, options);
      host.selectedOptions = [choices[0]!];
      host.selectionChanged();
      expect(host.displayLabel).toBe('1 options selected');
    }
  });

  it('treats rendered selected attributes as the controlled value once the Select has rendered', () => {
    const proto = prototypes();
    installSelectMultiple(proto.select, proto.option);
    const { host, options } = build(proto);
    options[0]!.setAttribute('selected', '');
    options[2]!.setAttribute('selected', '');
    options[2]!.syncDefaultSelected();
    expect(host.value).toEqual(['bug', 'design']);
    expect(proto.originalSync).not.toHaveBeenCalled();
    // Removing every selected attribute clears the value, even after the
    // person interacted (Web Awesome's own sync stops at that point).
    options[0]!.removeAttribute('selected');
    options[2]!.removeAttribute('selected');
    options[0]!.syncDefaultSelected();
    expect(host.value).toEqual([]);
  });

  it('keeps Web Awesome default-selection sync before the first render and outside Kerf multiple Selects', () => {
    const proto = prototypes();
    installSelectMultiple(proto.select, proto.option);
    for (const options of [
      { hasUpdated: false },
      { multiple: false },
      { kerf: false },
    ]) {
      proto.originalSync.mockClear();
      const { host, options: choices } = build(proto, options);
      choices[0]!.setAttribute('selected', '');
      choices[0]!.syncDefaultSelected();
      expect(proto.originalSync).toHaveBeenCalledOnce();
      expect(host.value).toBe(null);
    }
    // An option outside any Select keeps the native sync too.
    const loose = document.createElement('span') as unknown as FakeOption;
    Object.setPrototypeOf(loose, proto.option);
    proto.originalSync.mockClear();
    loose.syncDefaultSelected();
    expect(proto.originalSync).toHaveBeenCalledOnce();
  });
});
