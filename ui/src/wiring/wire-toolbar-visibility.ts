type Root = HTMLElement | Document;

const HIDE_BELOW = 'data-hide-below';
const SHOW_BELOW = 'data-show-below';
const HIDDEN = 'data-toolbar-width-hidden';
const PROBE = 'data-toolbar-visibility-probe';
const STATE = 'data-toolbar-visibility-state';
const LENGTH = '--kui-toolbar-visibility-length';
const ITEM = `[data-component="toolbar-control-group"][${HIDE_BELOW}], [data-component="toolbar-control-group"][${SHOW_BELOW}], [data-component="toolbar-text"][${HIDE_BELOW}], [data-component="toolbar-text"][${SHOW_BELOW}]`;

interface Measurement {
  toolbar: HTMLElement;
  box: HTMLDivElement;
  hide: HTMLDivElement;
  show: HTMLDivElement;
}

interface WrittenAttribute {
  original: string | null;
  value: string | null;
  state: HTMLSpanElement;
}

const controllers = new WeakMap<Document, (root: Root) => () => void>();

/**
 * Wire ToolbarText and ToolbarControlGroup width thresholds below root.
 * Below is strict: hideBelow hides at width < threshold; showBelow hides at
 * width >= threshold. Percentages use the closest Toolbar's content box;
 * em and custom properties use the item's own inherited context. Invalid,
 * negative, unresolved, or contradictory thresholds leave the item visible.
 * This helper changes only a component-owned visibility marker. Existing
 * CSS visibility policies still apply. Dispose with the owning application.
 */
export function wireToolbarVisibility(root: Root): () => void {
  const document =
    root.nodeType === 9 ? (root as Document) : root.ownerDocument!;
  let register = controllers.get(document);
  if (!register) {
    register = createController(document);
    controllers.set(document, register);
  }
  return register(root);
}

function createController(document: Document) {
  const view = document.defaultView;
  const registrations = new Set<{ root: Root }>();
  const measurements = new Map<HTMLElement, Measurement>();
  const written = new Map<HTMLElement, WrittenAttribute>();
  const observed = new Set<Element>();
  let disposed = false;
  let refreshing = false;
  const normalizedStyle = document.createElement('div').style;

  function setStyle(element: HTMLElement, property: string, value: string) {
    // CSSOM can normalize computed font/token values on assignment. Compare
    // that serialization, preserving meaningful blank custom-property tokens.
    normalizedStyle.removeProperty(property);
    normalizedStyle.setProperty(property, value);
    const normalized = normalizedStyle.getPropertyValue(property);
    if (
      element.style.getPropertyValue(property) === normalized &&
      element.style.getPropertyPriority(property) === ''
    )
      return;
    if (normalized === '') element.style.removeProperty(property);
    else element.style.setProperty(property, normalized);
  }

  function write(element: HTMLElement, hidden: boolean) {
    let previous = written.get(element);
    if (!previous) {
      const state = document.createElement('span');
      state.setAttribute(STATE, '');
      state.setAttribute('data-morph-preserve', '');
      state.setAttribute('aria-hidden', 'true');
      state.hidden = true;
      previous = { original: element.getAttribute(HIDDEN), value: null, state };
      written.set(element, previous);
    }
    if (previous.state.parentElement !== element)
      element.append(previous.state);
    const value = hidden ? 'true' : null;
    if (previous.state.getAttribute(HIDDEN) !== value) {
      if (value === null) previous.state.removeAttribute(HIDDEN);
      else previous.state.setAttribute(HIDDEN, value);
    }
    if (element.getAttribute(HIDDEN) !== value) {
      if (value === null) element.removeAttribute(HIDDEN);
      else element.setAttribute(HIDDEN, value);
    }
    previous.value = value;
  }

  function restore(element: HTMLElement) {
    const previous = written.get(element)!;
    previous.state.remove();
    if (element.getAttribute(HIDDEN) === previous.value) {
      if (previous.original === null) element.removeAttribute(HIDDEN);
      else element.setAttribute(HIDDEN, previous.original);
    }
    written.delete(element);
  }

  function contentWidth(toolbar: HTMLElement) {
    const style = view!.getComputedStyle(toolbar);
    const inset = (property: string) =>
      parseFloat(style.getPropertyValue(property)) || 0;
    const padding = inset('padding-left') + inset('padding-right');
    const border = inset('border-left-width') + inset('border-right-width');
    const width = parseFloat(style.width);
    return Math.max(
      0,
      Number.isFinite(width)
        ? width - (style.boxSizing === 'border-box' ? padding + border : 0)
        : toolbar.getBoundingClientRect().width - padding - border,
    );
  }

  function createMeasurement(toolbar: HTMLElement): Measurement {
    const box = document.createElement('div');
    box.setAttribute(PROBE, '');
    // Kerf's render template never owns these injected measurements. Keep
    // them across morphs instead of recreating probes and observers each pass.
    box.setAttribute('data-morph-preserve', '');
    box.setAttribute('aria-hidden', 'true');
    // An out-of-flow clipped box never participates in the toolbar's grid,
    // intrinsic size or scroll overflow. Its explicit width defines % lengths.
    const hide = document.createElement('div');
    const show = document.createElement('div');
    box.append(hide, show);
    toolbar.append(box);
    return { toolbar, box, hide, show };
  }

  function resolveLength(
    probe: HTMLElement,
    value: string | null,
  ): number | null {
    if (value === null) return null;
    // The typed private property uses -1px as its invalid/unresolved sentinel.
    // Absolute left's used-value CSSOM alone turns invalid auto into 0px.
    setStyle(probe, LENGTH, value);
    const left = view!.getComputedStyle(probe).left;
    if (!/^-?(?:\d+(?:\.\d+)?|\.\d+)px$/.test(left)) return null;
    const pixels = parseFloat(left);
    return Number.isFinite(pixels) && pixels >= 0 ? pixels : null;
  }

  function copyContext(
    item: HTMLElement,
    measurement: Measurement,
    width: number,
  ) {
    const style = view!.getComputedStyle(item);
    const { box } = measurement;
    setStyle(box, 'width', `${width}px`);
    for (const property of [
      'font-size',
      'font-family',
      'font-weight',
      'font-style',
      'font-stretch',
      'font-variant',
      'font-feature-settings',
      'font-variation-settings',
      'font-size-adjust',
      'font-kerning',
      'line-height',
    ])
      setStyle(box, property, style.getPropertyValue(property));
    // The box remains outside a hidden item, but resolves tokens from that
    // item, including tokens declared on its root rather than the toolbar.
    const properties = new Set<string>();
    for (let index = 0; index < style.length; index++) {
      const name = style.item(index);
      if (!name.startsWith('--')) continue;
      properties.add(name);
      setStyle(box, name, style.getPropertyValue(name));
    }
    for (let index = box.style.length - 1; index >= 0; index--) {
      const name = box.style.item(index);
      if (name.startsWith('--') && !properties.has(name))
        box.style.removeProperty(name);
    }
  }

  function refresh() {
    if (disposed || refreshing || !view) return;
    refreshing = true;
    try {
      const items = new Set<HTMLElement>();
      for (const { root } of registrations) {
        root
          .querySelectorAll<HTMLElement>(ITEM)
          .forEach((item) => items.add(item));
        if (root.nodeType === 1 && (root as HTMLElement).matches(ITEM))
          items.add(root as HTMLElement);
      }
      const wanted = new Set<Element>();
      const marked = new Set<HTMLElement>();
      for (const item of items) {
        const toolbar = item.closest<HTMLElement>('[data-component="toolbar"]');
        if (!toolbar) continue;
        let measurement = measurements.get(item);
        if (
          measurement?.toolbar !== toolbar ||
          measurement.box.parentElement !== toolbar
        ) {
          measurement?.box.remove();
          measurement = createMeasurement(toolbar);
          measurements.set(item, measurement);
        }
        const width = contentWidth(toolbar);
        copyContext(item, measurement, width);
        const hideValue = item.getAttribute(HIDE_BELOW);
        const showValue = item.getAttribute(SHOW_BELOW);
        const hide = resolveLength(measurement.hide, hideValue);
        const show = resolveLength(measurement.show, showValue);
        const valid =
          (hideValue === null || hide !== null) &&
          (showValue === null || show !== null) &&
          !(hide !== null && show !== null && hide >= show);
        const hidden =
          valid &&
          ((hide !== null && width < hide) || (show !== null && width >= show));
        write(item, hidden);
        marked.add(item);
        const status = item.nextElementSibling;
        if (
          status instanceof view.HTMLElement &&
          item.matches(
            '[data-component="toolbar-control-group"][data-busy="true"]',
          ) &&
          status.matches(
            '.kui-toolbar-control-group__busy-status[role="status"]',
          )
        ) {
          write(
            status,
            hidden || view.getComputedStyle(item).display === 'none',
          );
          marked.add(status);
        }
        wanted.add(toolbar);
        wanted.add(measurement.hide);
        wanted.add(measurement.show);
      }
      for (const [item, measurement] of measurements)
        if (
          !items.has(item) ||
          item.closest('[data-component="toolbar"]') !== measurement.toolbar
        ) {
          measurement.box.remove();
          measurements.delete(item);
        }
      for (const element of written.keys())
        if (!marked.has(element)) restore(element);
      for (const element of observed)
        if (!wanted.has(element)) {
          resizeObserver?.unobserve(element);
          observed.delete(element);
        }
      for (const element of wanted)
        if (!observed.has(element)) {
          resizeObserver?.observe(element);
          observed.add(element);
        }
    } finally {
      refreshing = false;
    }
  }

  const resizeObserver = view?.ResizeObserver
    ? new view.ResizeObserver(refresh)
    : null;
  const mutationObserver = view?.MutationObserver
    ? new view.MutationObserver((records) => {
        const internal = (node: Node) =>
          node.nodeType === 1 &&
          ((node as Element).hasAttribute(PROBE) ||
            (node as Element).hasAttribute(STATE) ||
            Boolean((node as Element).closest(`[${PROBE}], [${STATE}]`)));
        if (
          records.some(
            (record) =>
              (record.type === 'childList' &&
                [...record.removedNodes].some(
                  (node) =>
                    node.nodeType === 1 &&
                    ((node as Element).hasAttribute(PROBE) ||
                      (node as Element).hasAttribute(STATE)),
                )) ||
              (!internal(record.target) &&
                (record.type !== 'childList' ||
                  [...record.addedNodes, ...record.removedNodes].some(
                    (node) => !internal(node),
                  ))),
          )
        )
          refresh();
      })
    : null;
  // Ancestor theme/font changes must refresh even outside the wired subtree.
  mutationObserver?.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: [
      HIDE_BELOW,
      SHOW_BELOW,
      HIDDEN,
      'class',
      'style',
      'data-component',
      'data-busy',
      'data-expanded',
      'data-visibility',
      'data-size',
      'data-tone',
    ],
  });
  // Preference media can change inherited tokens at a fixed viewport width.
  const media = [
    '(prefers-color-scheme: dark)',
    '(prefers-contrast: more)',
    '(prefers-contrast: less)',
    '(forced-colors: active)',
    '(prefers-reduced-motion: reduce)',
    '(pointer: coarse)',
    '(hover: hover)',
  ].flatMap((query) => (view?.matchMedia ? [view.matchMedia(query)] : []));
  for (const preference of media)
    preference.addEventListener('change', refresh);
  document.fonts?.addEventListener('loadingdone', refresh);
  view?.addEventListener('resize', refresh);

  return (root: Root) => {
    const registration = { root };
    registrations.add(registration);
    refresh();
    return () => {
      if (!registrations.delete(registration)) return;
      if (registrations.size) refresh();
      else {
        disposed = true;
        mutationObserver?.disconnect();
        resizeObserver?.disconnect();
        for (const preference of media)
          preference.removeEventListener('change', refresh);
        document.fonts?.removeEventListener('loadingdone', refresh);
        view?.removeEventListener('resize', refresh);
        for (const measurement of measurements.values())
          measurement.box.remove();
        for (const element of written.keys()) restore(element);
        measurements.clear();
        observed.clear();
        controllers.delete(document);
      }
    };
  };
}
