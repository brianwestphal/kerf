/* global CSS, Element, HTMLElement, Node, document, getComputedStyle, innerHeight, innerWidth, location, window */

import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import process from 'node:process';

import { loadApplicationUiProfile } from '../ai/application-ui-profile.mjs';

export const UI_EVALUATION_SCHEMA_VERSION = 1;

export const UI_EVALUATION_RULES = Object.freeze({
  'KUI-B001': {
    severity: 'error',
    title: 'Browser context could not be evaluated',
  },
  'KUI-B010': { severity: 'error', title: 'Horizontal page overflow' },
  'KUI-B011': { severity: 'error', title: 'Clipped interactive control' },
  'KUI-B012': { severity: 'error', title: 'Obscured interactive control' },
  'KUI-B020': { severity: 'error', title: 'Invalid positive tab order' },
  'KUI-B021': { severity: 'error', title: 'Focused control is not visible' },
  'KUI-B022': {
    severity: 'error',
    title: 'Custom interactive role is not keyboard reachable',
  },
  'KUI-B023': { severity: 'error', title: 'Keyboard action did not operate' },
  'KUI-B030': { severity: 'error', title: 'Interactive control has no name' },
  'KUI-B040': { severity: 'error', title: 'Insufficient text contrast' },
  'KUI-B050': {
    severity: 'error',
    title: 'Interactive hit target is too small',
  },
  'KUI-B060': { severity: 'error', title: 'Competing scroll owners' },
  'KUI-B070': { severity: 'error', title: 'Shared alignment edge drift' },
  'KUI-B080': { severity: 'error', title: 'Runtime geometry ownership drift' },
});

export const SUBJECTIVE_REVIEW_RUBRIC = Object.freeze([
  {
    id: 'hierarchy',
    prompt:
      '0 unclear scope; 1 usable with competing emphasis; 2 clear application, page, and section priority.',
  },
  {
    id: 'rhythm',
    prompt:
      '0 arbitrary or doubled spacing; 1 isolated inconsistencies; 2 one coherent semantic spacing system.',
  },
  {
    id: 'density',
    prompt:
      '0 clipped or undersized controls; 1 usable but uneven; 2 compact and consistently operable.',
  },
  {
    id: 'alignment',
    prompt:
      '0 visibly broken columns or edges; 1 minor drift; 2 shared columns and intentional edges.',
  },
  {
    id: 'scroll-ownership',
    prompt:
      '0 competing or misplaced scroll regions; 1 usable with an awkward boundary; 2 one obvious scroll owner per pane.',
  },
  {
    id: 'aesthetic-fit',
    prompt:
      '0 visually conflicts with the product; 1 broadly coherent with isolated mismatches; 2 intentionally fits the product and Kerf language.',
  },
]);

const baseContexts = [
  { id: 'wide-light', width: 1440, height: 900, zoom: 1, colorScheme: 'light' },
  {
    id: 'intermediate-light',
    width: 900,
    height: 768,
    zoom: 1,
    colorScheme: 'light',
  },
  {
    id: 'narrow-light',
    width: 390,
    height: 844,
    zoom: 1,
    colorScheme: 'light',
  },
  {
    id: 'zoom-200-light',
    width: 720,
    height: 450,
    zoom: 2,
    colorScheme: 'light',
  },
  { id: 'wide-dark', width: 1440, height: 900, zoom: 1, colorScheme: 'dark' },
  {
    id: 'wide-reduced-motion',
    width: 1440,
    height: 900,
    zoom: 1,
    colorScheme: 'light',
    reducedMotion: 'reduce',
  },
];

export function buildEvaluationContexts(overrides) {
  const contexts = overrides ?? baseContexts;
  return contexts.map((context) => ({
    reducedMotion: 'no-preference',
    ...context,
  }));
}

function parseColor(color) {
  const values = color?.match(/[\d.]+/g)?.map(Number);
  if (!values || values.length < 3) return null;
  return [...values.slice(0, 3), values[3] ?? 1];
}

function composite([red, green, blue, alpha = 1], background) {
  return [
    red * alpha + background[0] * (1 - alpha),
    green * alpha + background[1] * (1 - alpha),
    blue * alpha + background[2] * (1 - alpha),
  ];
}

function luminance(rgb) {
  const channels = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function contrastRatio(foreground, background) {
  const foregroundColor = Array.isArray(foreground)
    ? foreground
    : parseColor(foreground);
  const backgroundRgb = Array.isArray(background)
    ? background
    : parseColor(background);
  if (!foregroundColor || !backgroundRgb) return null;
  const renderedBackground = composite(backgroundRgb, [255, 255, 255]);
  const foregroundRgb = composite(foregroundColor, renderedBackground);
  const values = [luminance(foregroundRgb), luminance(renderedBackground)].sort(
    (left, right) => right - left,
  );
  return (values[0] + 0.05) / (values[1] + 0.05);
}

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function cancellationError() {
  return Object.assign(new Error('Kerf UI evaluation was cancelled.'), {
    name: 'AbortError',
  });
}

function abortable(value, signal) {
  if (!signal) return value;
  if (signal.aborted) return Promise.reject(cancellationError());
  return new Promise((resolvePromise, rejectPromise) => {
    const abort = () => rejectPromise(cancellationError());
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve(value).then(
      (result) => {
        signal.removeEventListener('abort', abort);
        resolvePromise(result);
      },
      (error) => {
        signal.removeEventListener('abort', abort);
        rejectPromise(error);
      },
    );
  });
}

async function loadGeometryContracts(profileResult) {
  const contracts = [];
  for (const catalog of profileResult.profile?.catalogs ?? []) {
    const owner = profileResult.provenance?.[`$catalogs.${catalog.package}`];
    if (!owner) continue;
    try {
      const artifact = JSON.parse(
        await readFile(
          resolve(dirname(owner), catalog.composition.path),
          'utf8',
        ),
      );
      for (const entry of artifact.entries ?? []) {
        const className = entry.boundaries?.rootClass;
        if (className)
          contracts.push({
            key: entry.key ?? `${artifact.package}:${entry.id}`,
            className,
            geometry: entry.layout?.geometry,
          });
      }
    } catch {
      // Profile loading already emits source-located catalog diagnostics.
    }
  }
  return contracts;
}

function reportDiagnostic(code, context, item = {}) {
  const rule = UI_EVALUATION_RULES[code];
  const diagnostic = {
    code,
    severity: rule.severity,
    context,
    message: item.message ?? rule.title,
  };
  for (const property of ['repair', 'selector', 'evidence'])
    if (item[property] !== undefined) diagnostic[property] = item[property];
  return diagnostic;
}

function summarize(diagnostics) {
  return {
    errors: diagnostics.filter((item) => item.severity === 'error').length,
    warnings: diagnostics.filter((item) => item.severity === 'warning').length,
    passed: diagnostics.every((item) => item.severity !== 'error'),
  };
}

async function inspectPage(page, geometryContracts) {
  return page.evaluate((contracts) => {
    const diagnostics = [];
    const repair = {
      overflow:
        'Remove fixed inline sizing or assign horizontal scrolling to one documented owner.',
      clipping:
        'Move the control into the visible flow or make its documented scroll owner reachable.',
      focus:
        'Use native controls in DOM order and retain a visible :focus-visible indicator.',
      name: 'Provide visible text, aria-label, or a valid aria-labelledby relationship.',
      contrast:
        'Use Kerf semantic foreground/background tokens with WCAG AA contrast.',
      target: 'Keep interactive controls at least 44 by 44 CSS pixels.',
      scroll: 'Keep exactly one scroll owner per pane.',
      alignment:
        'Use the shared public layout/content classes so aligned edges use one inset.',
      geometry:
        'Remove geometry from the component root and leave it on the catalog-declared owner.',
    };
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity) !== 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    const selector = (element) => {
      if (element.id) return `#${CSS.escape(element.id)}`;
      const testId = element.getAttribute('data-testid');
      if (testId) return `[data-testid="${CSS.escape(testId)}"]`;
      const classes = [...element.classList].slice(0, 2);
      return `${element.localName}${classes.map((name) => `.${CSS.escape(name)}`).join('')}`;
    };
    const widgetRoles = new Set([
      'button',
      'checkbox',
      'combobox',
      'gridcell',
      'link',
      'menuitem',
      'menuitemcheckbox',
      'menuitemradio',
      'option',
      'radio',
      'scrollbar',
      'searchbox',
      'slider',
      'spinbutton',
      'switch',
      'tab',
      'textbox',
      'treeitem',
    ]);
    const interactives = [
      ...document.querySelectorAll(
        'button, a[href], input:not([type="hidden"]), select, textarea, summary, [role], [tabindex]',
      ),
    ].filter(
      (element) =>
        (element.matches(
          'button, a[href], input:not([type="hidden"]), select, textarea, summary, [tabindex]',
        ) ||
          widgetRoles.has(element.getAttribute('role'))) &&
        visible(element) &&
        !element.matches(':disabled,[aria-disabled="true"],[inert] *'),
    );
    const interactiveEvidence = [];

    if (
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth + 1
    )
      diagnostics.push({
        code: 'KUI-B010',
        selector: 'html',
        message: `Page scrollWidth ${document.documentElement.scrollWidth}px exceeds clientWidth ${document.documentElement.clientWidth}px.`,
        repair: repair.overflow,
        evidence: {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        },
      });

    const clippedBy = (element) => {
      const rect = element.getBoundingClientRect();
      let ancestor = element.parentElement;
      while (ancestor) {
        const style = getComputedStyle(ancestor);
        if (
          /hidden|clip/.test(
            `${style.overflow} ${style.overflowX} ${style.overflowY}`,
          )
        ) {
          const bounds = ancestor.getBoundingClientRect();
          if (
            rect.right > bounds.right + 1 ||
            rect.left < bounds.left - 1 ||
            rect.bottom > bounds.bottom + 1 ||
            rect.top < bounds.top - 1
          )
            return selector(ancestor);
        }
        ancestor = ancestor.parentElement;
      }
      return null;
    };

    const hitExtent = (element, rect) => {
      const root = element.getRootNode();
      const probe = root.elementFromPoint ? root : document;
      const inViewport = (x, y) =>
        x >= 0 && y >= 0 && x < innerWidth && y < innerHeight;
      const owns = (x, y) => {
        const hit = probe.elementFromPoint(x, y);
        return !!hit && (hit === element || element.contains(hit));
      };
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      if (!inViewport(x, y) || !owns(x, y)) return null;
      // Walk out in 1px steps (no further than the 44px goal needs), then
      // refine the last step in quarter pixels; the reach is the last owned
      // sample, so it never overstates the target. A walk stopped by
      // the viewport edge cannot see the rest of the layer, so it is marked
      // and mirrored from the opposite side (hit layers are symmetric insets).
      const reach = (dx, dy) => {
        const at = (distance) => [x + dx * distance, y + dy * distance];
        let owned = 0;
        while (owned < 24) {
          const point = at(owned + 1);
          if (!inViewport(...point)) return { distance: owned, clipped: true };
          if (!owns(...point)) break;
          owned += 1;
        }
        if (owned >= 24) return { distance: owned, clipped: false };
        while (owns(...at(owned + 0.25))) owned += 0.25;
        return { distance: owned, clipped: false };
      };
      const span = (first, second) =>
        first.clipped && second.clipped
          ? first.distance + second.distance
          : first.clipped
            ? 2 * second.distance
            : second.clipped
              ? 2 * first.distance
              : first.distance + second.distance;
      return {
        width: span(reach(-1, 0), reach(1, 0)),
        height: span(reach(0, -1), reach(0, 1)),
      };
    };

    for (const element of interactives) {
      const target = selector(element);
      const rect = element.getBoundingClientRect();
      const clippingOwner = clippedBy(element);
      if (clippingOwner)
        diagnostics.push({
          code: 'KUI-B011',
          selector: target,
          message: `Interactive control is clipped by ${clippingOwner}.`,
          repair: repair.clipping,
          evidence: { clippingOwner },
        });
      const outsideViewport =
        rect.right <= 0 ||
        rect.bottom <= 0 ||
        rect.left >= innerWidth ||
        rect.top >= innerHeight;
      if (outsideViewport)
        diagnostics.push({
          code: 'KUI-B011',
          selector: target,
          message: 'Interactive control is entirely outside the viewport.',
          repair: repair.clipping,
          evidence: {
            viewport: { width: innerWidth, height: innerHeight },
            rect: {
              left: rect.left,
              top: rect.top,
              right: rect.right,
              bottom: rect.bottom,
            },
          },
        });
      if (
        rect.left >= 0 &&
        rect.top >= 0 &&
        rect.right <= innerWidth &&
        rect.bottom <= innerHeight
      ) {
        const center = document.elementFromPoint(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
        );
        if (center && center !== element && !element.contains(center))
          diagnostics.push({
            code: 'KUI-B012',
            selector: target,
            message: `Interactive control center is covered by ${selector(center)}.`,
            repair: repair.clipping,
            evidence: { coveringElement: selector(center) },
          });
      }
      if (element.tabIndex > 0)
        diagnostics.push({
          code: 'KUI-B020',
          selector: target,
          message: `Positive tabindex=${element.tabIndex} overrides DOM focus order.`,
          repair: repair.focus,
          evidence: { tabIndex: element.tabIndex },
        });
      if (
        widgetRoles.has(element.getAttribute('role')) &&
        !element.matches(
          'button,a[href],input:not([type="hidden"]),select,textarea,summary',
        ) &&
        element.tabIndex < 0
      )
        diagnostics.push({
          code: 'KUI-B022',
          selector: target,
          message:
            'Custom interactive role is not in sequential keyboard order.',
          repair: repair.focus,
          evidence: {
            role: element.getAttribute('role'),
            tabIndex: element.tabIndex,
          },
        });
      const visibleText = (root) =>
        [...root.childNodes]
          .map((node) => {
            if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
            if (!(node instanceof Element)) return node.textContent ?? '';
            if (
              node.getAttribute('aria-hidden') === 'true' ||
              getComputedStyle(node).display === 'none' ||
              getComputedStyle(node).visibility === 'hidden'
            )
              return '';
            return visibleText(node);
          })
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      const referencedText = (ids) =>
        ids
          ?.split(/\s+/)
          .map((id) => {
            const reference = document.getElementById(id);
            return reference ? visibleText(reference) : '';
          })
          .join(' ')
          .trim();
      const inputType = element.getAttribute('type')?.toLowerCase();
      const nativeValueName =
        element.localName === 'input' &&
        ['button', 'submit', 'reset'].includes(inputType)
          ? element.value ||
            (inputType === 'submit'
              ? 'Submit'
              : inputType === 'reset'
                ? 'Reset'
                : '')
          : '';
      const name =
        element.getAttribute('aria-label')?.trim() ||
        referencedText(element.getAttribute('aria-labelledby')) ||
        (element.labels
          ? [...element.labels].map(visibleText).join(' ').trim()
          : '') ||
        (inputType === 'image' ? element.getAttribute('alt')?.trim() : '') ||
        nativeValueName ||
        element.getAttribute('alt')?.trim() ||
        visibleText(element) ||
        element.getAttribute('title')?.trim() ||
        '';
      const computed = getComputedStyle(element);
      interactiveEvidence.push({
        selector: target,
        tag: element.localName,
        role: element.getAttribute('role'),
        name,
        rect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
        style: {
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          outline: computed.outline,
          boxShadow: computed.boxShadow,
          overflowX: computed.overflowX,
          overflowY: computed.overflowY,
        },
      });
      if (!name)
        diagnostics.push({
          code: 'KUI-B030',
          selector: target,
          message: 'Interactive control has no computed text alternative.',
          repair: repair.name,
        });
      if (
        element.matches(
          'button,input:not([type="hidden"]),select,textarea,[role]',
        ) &&
        (rect.width < 43.5 || rect.height < 43.5)
      ) {
        // The border box understates a control whose pointer target is
        // extended by a transparent hit layer (a positioned ::before/::after
        // that receives pointer events). Hit-test outward from the center to
        // measure the area the pointer can actually reach; a probe that finds
        // no hit (off-screen, covered center) keeps the border box.
        const hit = hitExtent(element, rect);
        const width = Math.max(rect.width, hit?.width ?? 0);
        const height = Math.max(rect.height, hit?.height ?? 0);
        if (width < 43.5 || height < 43.5)
          diagnostics.push({
            code: 'KUI-B050',
            selector: target,
            message: `Hit target is ${width.toFixed(1)}×${height.toFixed(1)}px; expected at least 44×44px.`,
            repair: repair.target,
            evidence: {
              width,
              height,
              box: { width: rect.width, height: rect.height },
            },
          });
      }
    }

    const parse = (value) => {
      const values = value?.match(/[\d.]+/g)?.map(Number);
      return values?.length >= 3
        ? [...values.slice(0, 3), values[3] ?? 1]
        : null;
    };
    const over = ([red, green, blue, alpha = 1], background) => [
      red * alpha + background[0] * (1 - alpha),
      green * alpha + background[1] * (1 - alpha),
      blue * alpha + background[2] * (1 - alpha),
    ];
    const lum = (rgb) =>
      rgb
        .map((channel) => {
          const value = channel / 255;
          return value <= 0.03928
            ? value / 12.92
            : ((value + 0.055) / 1.055) ** 2.4;
        })
        .reduce(
          (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index],
          0,
        );
    for (const element of interactives) {
      const style = getComputedStyle(element);
      const foreground = parse(style.color);
      const ancestors = [];
      let backgroundElement = element;
      while (backgroundElement) {
        ancestors.push(backgroundElement);
        backgroundElement = backgroundElement.parentElement;
      }
      const background = ancestors
        .reverse()
        .map((owner) => parse(getComputedStyle(owner).backgroundColor))
        .filter(Boolean)
        .reduce((result, color) => over(color, result), [255, 255, 255]);
      if (foreground) {
        const renderedForeground = over(foreground, background);
        const values = [lum(renderedForeground), lum(background)].sort(
          (a, b) => b - a,
        );
        const ratio = (values[0] + 0.05) / (values[1] + 0.05);
        const threshold =
          Number.parseFloat(style.fontSize) >= 24 ||
          (Number.parseFloat(style.fontSize) >= 18.66 &&
            Number(style.fontWeight) >= 700)
            ? 3
            : 4.5;
        if (ratio + 0.01 < threshold)
          diagnostics.push({
            code: 'KUI-B040',
            selector: selector(element),
            message: `Text contrast ${ratio.toFixed(2)}:1 is below ${threshold}:1.`,
            repair: repair.contrast,
            evidence: {
              foreground,
              renderedForeground,
              background,
              ratio,
              threshold,
            },
          });
      }
    }

    const isScrollOwner = (element) => {
      const style = getComputedStyle(element);
      return (
        /auto|scroll/.test(`${style.overflowX} ${style.overflowY}`) &&
        (element.scrollHeight > element.clientHeight + 1 ||
          element.scrollWidth > element.clientWidth + 1)
      );
    };
    for (const scope of document.querySelectorAll(
      '.kui-pane,[data-kui-scroll-scope]',
    )) {
      const owners = [scope, ...scope.querySelectorAll('*')].filter(
        isScrollOwner,
      );
      if (owners.length > 1)
        diagnostics.push({
          code: 'KUI-B060',
          selector: selector(scope),
          message: `Scroll scope contains ${owners.length} active scroll owners.`,
          repair: repair.scroll,
          evidence: { owners: owners.map(selector) },
        });
    }

    for (const group of document.querySelectorAll('[data-kui-align-group]')) {
      const edges = [...group.querySelectorAll('[data-kui-align-edge]')].map(
        (element) => ({ element, left: element.getBoundingClientRect().left }),
      );
      if (edges.length > 1) {
        const drift =
          Math.max(...edges.map(({ left }) => left)) -
          Math.min(...edges.map(({ left }) => left));
        if (drift > 1)
          diagnostics.push({
            code: 'KUI-B070',
            selector: selector(group),
            message: `Declared shared alignment edges drift by ${drift.toFixed(1)}px.`,
            repair: repair.alignment,
            evidence: {
              edges: edges.map(({ element, left }) => ({
                selector: selector(element),
                left,
              })),
            },
          });
      }
    }

    const geometryValue = (style, dimension) => {
      const properties =
        dimension === 'margin'
          ? ['marginTop', 'marginRight', 'marginBottom', 'marginLeft']
          : dimension === 'padding'
            ? ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']
            : [
                'borderTopWidth',
                'borderRightWidth',
                'borderBottomWidth',
                'borderLeftWidth',
              ];
      return properties.reduce(
        (sum, property) => sum + Number.parseFloat(style[property] || '0'),
        0,
      );
    };
    for (const contract of contracts) {
      for (const element of document.getElementsByClassName(
        contract.className,
      )) {
        if (!visible(element)) continue;
        const style = getComputedStyle(element);
        for (const dimension of ['margin', 'border', 'padding']) {
          const owner = contract.geometry?.[dimension];
          const value = geometryValue(style, dimension);
          if (['none', 'parent', 'child'].includes(owner) && value > 0.5)
            diagnostics.push({
              code: 'KUI-B080',
              selector: selector(element),
              message: `${contract.key} declares ${dimension} owner ${owner}, but its root computes ${value.toFixed(1)}px total ${dimension}.`,
              repair: repair.geometry,
              evidence: {
                key: contract.key,
                className: contract.className,
                dimension,
                owner,
                value,
              },
            });
        }
      }
    }

    return {
      diagnostics,
      evidence: {
        url: location.href,
        title: document.title,
        interactiveCount: interactives.length,
        elements: interactiveEvidence,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      },
    };
  }, geometryContracts);
}

async function inspectFocus(page, limit = 40) {
  const diagnostics = [];
  const sequence = [];
  await page.evaluate(() => {
    const properties = [
      'outlineColor',
      'outlineStyle',
      'outlineWidth',
      'outlineOffset',
      'boxShadow',
      'backgroundColor',
      'color',
      'borderTopColor',
      'borderRightColor',
      'borderBottomColor',
      'borderLeftColor',
      'borderTopWidth',
      'borderRightWidth',
      'borderBottomWidth',
      'borderLeftWidth',
      'textDecorationColor',
      'textDecorationLine',
      'textDecorationThickness',
    ];
    window.__kerfEvaluatorFocusBaseline = {};
    for (const [index, element] of [
      ...document.querySelectorAll(
        'button, a[href], input:not([type="hidden"]), select, textarea, summary, [role], [tabindex]',
      ),
    ].entries()) {
      const id = `kui-focus-${index}`;
      element.setAttribute('data-kui-evaluator-focus-id', id);
      const style = getComputedStyle(element);
      window.__kerfEvaluatorFocusBaseline[id] = Object.fromEntries(
        properties.map((property) => [property, style[property]]),
      );
    }
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
  });
  try {
    for (let index = 0; index < limit; index += 1) {
      await page.keyboard.press('Tab');
      const state = await page.evaluate(() => {
        const element = document.activeElement;
        if (!(element instanceof HTMLElement) || element === document.body)
          return null;
        const identity = element.getAttribute('data-kui-evaluator-focus-id');
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const baseline = window.__kerfEvaluatorFocusBaseline?.[identity] ?? {};
        const focused = Object.fromEntries(
          Object.keys(baseline).map((property) => [property, style[property]]),
        );
        const changedProperties = Object.keys(baseline).filter(
          (property) => baseline[property] !== focused[property],
        );
        const visualChange =
          (Number.parseFloat(focused.outlineWidth) > 0 &&
            changedProperties.some((property) =>
              property.startsWith('outline'),
            )) ||
          (focused.boxShadow !== 'none' &&
            changedProperties.includes('boxShadow')) ||
          changedProperties.includes('backgroundColor') ||
          changedProperties.includes('color') ||
          ['Top', 'Right', 'Bottom', 'Left'].some(
            (side) =>
              Number.parseFloat(focused[`border${side}Width`]) > 0 &&
              (changedProperties.includes(`border${side}Color`) ||
                changedProperties.includes(`border${side}Width`)),
          ) ||
          (focused.textDecorationLine !== 'none' &&
            changedProperties.some((property) =>
              property.startsWith('textDecoration'),
            ));
        const centerVisible =
          rect.left < innerWidth &&
          rect.top < innerHeight &&
          rect.right > 0 &&
          rect.bottom > 0;
        return {
          identity,
          selector: element.id
            ? `#${CSS.escape(element.id)}`
            : `${element.localName}${[...element.classList]
                .slice(0, 2)
                .map((name) => `.${CSS.escape(name)}`)
                .join('')}`,
          visible:
            rect.width > 0 &&
            rect.height > 0 &&
            centerVisible &&
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            Number(style.opacity) !== 0,
          focusVisible: element.matches(':focus-visible') && visualChange,
          changedProperties,
        };
      });
      if (!state || sequence.some((item) => item.identity === state.identity))
        break;
      sequence.push({ identity: state.identity, selector: state.selector });
      if (!state.visible || !state.focusVisible)
        diagnostics.push({
          code: 'KUI-B021',
          selector: state.selector,
          message: !state.visible
            ? 'Sequential focus reached a control outside the visible viewport.'
            : 'Sequential focus has no visual style change from its unfocused state.',
          repair:
            'Keep focusable controls visible and retain a visible keyboard-focus style change.',
          evidence: state,
        });
    }
  } finally {
    await page.evaluate(() => {
      for (const element of document.querySelectorAll(
        '[data-kui-evaluator-focus-id]',
      ))
        element.removeAttribute('data-kui-evaluator-focus-id');
      delete window.__kerfEvaluatorFocusBaseline;
    });
  }
  return { diagnostics, sequence };
}

async function inspectKeyboardActions(page) {
  const actions = await page.locator('[data-kui-evaluator-action]').count();
  const diagnostics = [];
  const evidence = [];
  for (let index = 0; index < actions; index += 1) {
    const action = page.locator('[data-kui-evaluator-action]').nth(index);
    await action.focus();
    const before = await action.evaluate((element) => ({
      expanded: element.getAttribute('aria-expanded'),
      pressed: element.getAttribute('aria-pressed'),
      checked: element.getAttribute('aria-checked'),
      value: 'value' in element ? element.value : undefined,
    }));
    await action.evaluate((element) => {
      window.__kerfEvaluatorActivation = 0;
      element.addEventListener(
        'click',
        () => {
          window.__kerfEvaluatorActivation += 1;
        },
        { once: true },
      );
    });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(0);
    const after = await action.evaluate((element) => ({
      activations: window.__kerfEvaluatorActivation ?? 0,
      expanded: element.getAttribute('aria-expanded'),
      pressed: element.getAttribute('aria-pressed'),
      checked: element.getAttribute('aria-checked'),
      value: 'value' in element ? element.value : undefined,
    }));
    const selector = await action.evaluate((element) =>
      element.id ? `#${CSS.escape(element.id)}` : element.localName,
    );
    evidence.push({ selector, before, after });
    if (
      after.activations === 0 &&
      before.expanded === after.expanded &&
      before.pressed === after.pressed &&
      before.checked === after.checked &&
      before.value === after.value
    )
      diagnostics.push({
        code: 'KUI-B023',
        selector,
        message: 'Representative action did not activate with Enter.',
        repair:
          'Use a native control or implement Enter/Space activation and controlled state updates.',
        evidence: { before, after },
      });
  }
  return { diagnostics, evidence };
}

async function fileArtifact(path, root) {
  const bytes = await readFile(path);
  return {
    path: relative(root, path).replaceAll('\\', '/'),
    sha256: sha256(bytes),
  };
}

async function clearEvaluatorScreenshots(outputDirectory) {
  for (const entry of await readdir(outputDirectory, { withFileTypes: true }))
    if (
      entry.isFile() &&
      /^(chromium|firefox|webkit)-[a-z0-9-]+\.png$/.test(entry.name)
    )
      await rm(resolve(outputDirectory, entry.name), { force: true });
}

export function createEvaluationReport({
  target,
  profileFiles,
  contexts,
  diagnostics,
  artifacts,
  recordedAt,
  retention,
}) {
  return {
    schemaVersion: UI_EVALUATION_SCHEMA_VERSION,
    tool: { name: '@kerfjs/ui/evaluator', reportVersion: 1 },
    target,
    recordedAt,
    profileFiles,
    contexts,
    diagnostics,
    summary: summarize(diagnostics),
    artifacts: { retention, files: artifacts },
    subjectiveReview: {
      status: 'not-recorded',
      rubric: SUBJECTIVE_REVIEW_RUBRIC,
      ratings: [],
      note: 'These aesthetic judgments require a named reviewer and are never inferred from objective browser checks.',
    },
  };
}

export async function evaluateUi({
  url,
  workspaceRoot = process.cwd(),
  startDirectory = workspaceRoot,
  packageProfile,
  outputDirectory = resolve(workspaceRoot, 'kerf-ui-evidence'),
  reportPath = resolve(outputDirectory, 'report.json'),
  browsers = ['chromium', 'firefox', 'webkit'],
  contexts: contextOverrides,
  timeoutMs = 15_000,
  settleMs = 100,
  retention = 'on-failure',
  recordedAt = new Date().toISOString(),
  playwright: suppliedPlaywright,
  signal,
} = {}) {
  if (signal?.aborted) throw cancellationError();
  if (!url) throw new Error('evaluateUi requires a running app URL.');
  if (!['always', 'on-failure', 'never'].includes(retention))
    throw new Error('retention must be always, on-failure, or never.');
  const profileResult = await loadApplicationUiProfile({
    workspaceRoot,
    startDirectory,
    packageProfile,
    knownRules: Object.keys(UI_EVALUATION_RULES),
  });
  if (profileResult.diagnostics.length)
    throw new Error(
      `Application UI profile is invalid:\n${profileResult.diagnostics
        .map(
          (item) => `${item.code} ${item.source} ${item.path}: ${item.message}`,
        )
        .join('\n')}`,
    );
  const geometryContracts = await loadGeometryContracts(profileResult);
  const playwright = suppliedPlaywright ?? (await import('playwright'));
  const matrix = buildEvaluationContexts(contextOverrides);
  const contextReports = [];
  const diagnostics = [];
  const screenshotPaths = [];
  await mkdir(outputDirectory, { recursive: true });
  await clearEvaluatorScreenshots(outputDirectory);
  const evaluationTarget = relative(workspaceRoot, startDirectory).replaceAll(
    '\\',
    '/',
  );
  const exceptedRules = new Set(
    (profileResult.profile.exceptions ?? [])
      .filter((exception) => exception.target === evaluationTarget)
      .flatMap((exception) => exception.rules),
  );
  const includeDiagnostic = (item) => !exceptedRules.has(item.code);
  let activeBrowser;
  const closeForCancellation = () => {
    void activeBrowser?.close();
  };
  signal?.addEventListener('abort', closeForCancellation);

  try {
    for (const browserName of browsers) {
      if (signal?.aborted) throw cancellationError();
      const browserType = playwright[browserName];
      if (!browserType)
        throw new Error(`Unknown Playwright browser ${browserName}.`);
      let browser;
      try {
        try {
          const launch = browserType.launch();
          void launch.then(
            (candidate) => {
              if (signal?.aborted) void candidate.close();
            },
            () => {},
          );
          browser = await abortable(launch, signal);
          activeBrowser = browser;
        } catch (error) {
          if (signal?.aborted) throw cancellationError();
          for (const matrixContext of matrix) {
            const contextId = `${browserName}:${matrixContext.id}`;
            const item = reportDiagnostic('KUI-B001', contextId, {
              message: `Could not launch ${browserName}: ${error.message}`,
              repair:
                'Install the requested Playwright browser and confirm the CI runner can launch it.',
            });
            if (includeDiagnostic(item)) diagnostics.push(item);
            contextReports.push({
              ...matrixContext,
              id: contextId,
              browser: browserName,
              evidence: {},
              summary: summarize(includeDiagnostic(item) ? [item] : []),
            });
          }
          continue;
        }
        for (const matrixContext of matrix) {
          if (signal?.aborted) throw cancellationError();
          const contextId = `${browserName}:${matrixContext.id}`;
          let browserContext;
          const contextDiagnostics = [];
          let evidence = {};
          try {
            browserContext = await browser.newContext({
              viewport: {
                width: matrixContext.width,
                height: matrixContext.height,
              },
              colorScheme: matrixContext.colorScheme,
              reducedMotion: matrixContext.reducedMotion,
            });
            const page = await browserContext.newPage();
            page.setDefaultTimeout(timeoutMs);
            page.setDefaultNavigationTimeout(timeoutMs);
            await page.goto(url, {
              waitUntil: 'domcontentloaded',
              timeout: timeoutMs,
            });
            await page.emulateMedia({
              colorScheme: matrixContext.colorScheme,
              reducedMotion: matrixContext.reducedMotion,
            });
            await page.waitForTimeout(settleMs);
            const dom = await inspectPage(page, geometryContracts);
            const focus = await inspectFocus(page);
            const keyboard = await inspectKeyboardActions(page);
            for (const item of [
              ...dom.diagnostics,
              ...focus.diagnostics,
              ...keyboard.diagnostics,
            ]) {
              if (!includeDiagnostic(item)) continue;
              contextDiagnostics.push(
                reportDiagnostic(item.code, contextId, item),
              );
            }
            evidence = {
              ...dom.evidence,
              focusSequence: focus.sequence,
              keyboardActions: keyboard.evidence,
            };
            const screenshotPath = resolve(
              outputDirectory,
              `${browserName}-${matrixContext.id}.png`,
            );
            await page.screenshot({ path: screenshotPath, fullPage: true });
            screenshotPaths.push(screenshotPath);
          } catch (error) {
            if (signal?.aborted) throw cancellationError();
            const item = reportDiagnostic('KUI-B001', contextId, {
              message: error.message,
              repair:
                'Confirm the app is running, the URL is reachable, and it settles within the configured timeout.',
            });
            if (includeDiagnostic(item)) contextDiagnostics.push(item);
          } finally {
            await browserContext?.close();
          }
          diagnostics.push(...contextDiagnostics);
          contextReports.push({
            ...matrixContext,
            id: contextId,
            browser: browserName,
            evidence,
            summary: summarize(contextDiagnostics),
          });
        }
      } finally {
        await browser?.close();
        activeBrowser = undefined;
      }
    }
  } catch (error) {
    if (signal?.aborted) {
      await clearEvaluatorScreenshots(outputDirectory);
      throw cancellationError();
    }
    throw error;
  } finally {
    signal?.removeEventListener('abort', closeForCancellation);
  }

  const ensureActive = async () => {
    if (!signal?.aborted) return;
    await clearEvaluatorScreenshots(outputDirectory);
    throw cancellationError();
  };
  await ensureActive();
  if (
    retention === 'never' ||
    (retention === 'on-failure' &&
      !diagnostics.some((item) => item.severity === 'error'))
  ) {
    for (const path of screenshotPaths) await rm(path, { force: true });
    screenshotPaths.length = 0;
  }
  const artifacts = [];
  for (const path of screenshotPaths) {
    await ensureActive();
    artifacts.push(await fileArtifact(path, outputDirectory));
  }
  const report = createEvaluationReport({
    target: { url },
    profileFiles: profileResult.files.map((path) =>
      relative(workspaceRoot, path).replaceAll('\\', '/'),
    ),
    contexts: contextReports,
    diagnostics,
    artifacts,
    recordedAt,
    retention,
  });
  await ensureActive();
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

export function formatUiEvaluationText(report) {
  const lines = [
    `Kerf UI browser evaluation: ${report.summary.passed ? 'PASS' : 'FAIL'}`,
    `${report.contexts.length} contexts; ${report.summary.errors} errors; ${report.summary.warnings} warnings`,
  ];
  for (const diagnostic of report.diagnostics)
    lines.push(
      `${diagnostic.code} [${diagnostic.context}] ${diagnostic.selector ?? '<page>'}: ${diagnostic.message}\n  Repair: ${diagnostic.repair}`,
    );
  lines.push(
    'Human visual review: not recorded (use the report rubric with a named reviewer).',
  );
  return lines.join('\n');
}
