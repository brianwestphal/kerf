// Web Awesome's multiple select keeps its popup open while choices toggle and
// closes on an outside press, Escape, or focus leaving; Kerf keeps that
// behavior. This boundary adapts the rest to Kerf's rendering model, only for
// Kerf Selects (`data-component="select"`):
// - the closed control summarizes the chosen labels instead of drawing a
//   removable tag per choice or a "N options selected" count; an icon-only
//   trigger (whose value text is hidden) ends its accessible name with that
//   summary instead;
// - the rendered `selected` attributes are the controlled value, so a
//   re-render that changes them updates the selection (Web Awesome otherwise
//   reads them only until the first interaction).

interface MultipleOption extends HTMLElement {
  value: string;
  label: string;
  selected: boolean;
  defaultSelected: boolean;
}

interface MultipleSelectHost extends HTMLElement {
  multiple: boolean;
  hasUpdated: boolean;
  displayLabel: string;
  value: string | string[] | null;
  selectedOptions: MultipleOption[];
  getAllOptions(): MultipleOption[];
  selectionChanged(): void;
}

interface SelectPrototype {
  selectionChanged(this: MultipleSelectHost): void;
}

interface OptionPrototype {
  syncDefaultSelected(this: MultipleOption): void;
}

function kerfMultiple(host: Element | null): host is MultipleSelectHost {
  return (
    host instanceof HTMLElement &&
    host.dataset.component === 'select' &&
    (host as MultipleSelectHost).multiple
  );
}

function listLocale(host: HTMLElement): string | undefined {
  const lang = host.closest<HTMLElement>('[lang]')?.lang;
  return lang || undefined;
}

/** The closed-control text: chosen labels in choice order, as a short list. */
function summarizeSelection(
  labels: readonly string[],
  locale?: string,
): string {
  if (labels.length === 0) return '';
  try {
    return new Intl.ListFormat(locale, {
      type: 'unit',
      style: 'short',
    }).format(labels);
  } catch {
    return labels.join(', ');
  }
}

/** Install once at the explicit registration boundary, only for Kerf Selects. */
export function installSelectMultiple(
  selectPrototype: object,
  optionPrototype: object,
): void {
  const installed = Symbol.for('@kerfjs/ui/select-multiple');
  if (Object.prototype.hasOwnProperty.call(selectPrototype, installed)) return;
  Object.defineProperty(selectPrototype, installed, { value: true });

  const select = selectPrototype as SelectPrototype;
  const selectionChanged = select.selectionChanged;
  select.selectionChanged = function () {
    selectionChanged.call(this);
    if (!kerfMultiple(this)) return;
    const chosen = new Set(this.selectedOptions);
    const summary = summarizeSelection(
      this.getAllOptions()
        .filter((option) => chosen.has(option))
        .map((option) => option.label),
      listLocale(this),
    );
    const nameSummary = this.querySelector(
      ':scope > [slot="label"] > .kui-select__name-summary',
    );
    if (this.dataset.selectedPresentation === 'icon-only' && nameSummary) {
      // An icon-only trigger carries the summary in its accessible name, so
      // the (visually hidden) value stays empty rather than repeating it.
      nameSummary.textContent = summary ? `: ${summary}` : '';
      this.displayLabel = '';
      return;
    }
    this.displayLabel = summary;
  };

  // The summary replaces Web Awesome's per-choice tags.
  const tags = Object.getOwnPropertyDescriptor(selectPrototype, 'tags');
  if (tags?.get) {
    const getTags = tags.get;
    Object.defineProperty(selectPrototype, 'tags', {
      configurable: true,
      get(this: MultipleSelectHost) {
        return kerfMultiple(this) ? [] : getTags.call(this);
      },
    });
  }

  const option = optionPrototype as OptionPrototype;
  const syncDefaultSelected = option.syncDefaultSelected;
  option.syncDefaultSelected = function () {
    const host: Element | null = this.closest('[data-component="select"]');
    if (!kerfMultiple(host) || !host.hasUpdated) {
      syncDefaultSelected.call(this);
      return;
    }
    // A re-render changed which options carry `selected`: that is the new
    // controlled value, whether or not the person has interacted.
    host.value = host
      .getAllOptions()
      .filter((candidate) => candidate.hasAttribute('selected'))
      .map((candidate) => candidate.value);
  };
}
