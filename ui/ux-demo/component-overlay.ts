/**
 * Debug overlay for non-composition (single-component) demos. For each
 * top-level component specimen it draws, devtools-style:
 *  - a semi-transparent gray outline at the component's outer bound (so a
 *    fully transparent component is visible on the transparency grid), and
 *  - semi-transparent orange bands over any non-zero default margin.
 * Demo-only tooling; nothing here ships in the package.
 */

export interface ComponentOverlayHandle {
  /** Recompute the overlay. `active` gates it to component demos. */
  update(active: boolean): void;
  dispose(): void;
}

function px(value: string): number {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return 0;
  // Custom properties are returned unresolved; the demo authors lengths in `rem`
  // against a fixed 16px baseline (docs/22), so convert those. Standard box
  // properties (margins) already come back from getComputedStyle in px.
  return value.trim().endsWith('rem') ? n * 16 : n;
}

function isTransparent(color: string): boolean {
  const normalized = color.replace(/\s+/g, '');
  return normalized === 'transparent' || /,0\)$/.test(normalized);
}

/**
 * A MenuHeader used as an example LABEL (chrome), not a demoed component: the
 * first element child of a labeled example. A MenuHeader that is itself the
 * demoed component lives in an unlabeled `.demo-stack` and is NOT a label.
 */
function isExampleLabel(el: Element): boolean {
  const parent = el.parentElement;
  return (
    el.classList.contains('kui-menu-header') &&
    parent?.classList.contains('demo-example') === true &&
    parent.closest('.demo-stack--labeled') !== null &&
    el === parent.firstElementChild
  );
}

/**
 * The demoed specimens to outline: the actual component in each example (not
 * its MenuHeader label or note text), plus the top-level component of any demo
 * that isn't wrapped in `.demo-example` (toolbar, panel-header, resize). A
 * specimen may be a bare `<svg>` (a LucideIcon) with no `data-component`, so
 * selection is positional, not attribute-based.
 */
function specimens(root: HTMLElement): Element[] {
  const seen = new Set<Element>();
  const result: Element[] = [];
  const push = (el: Element): void => {
    if (seen.has(el)) return;
    seen.add(el);
    result.push(el);
  };
  for (const example of root.querySelectorAll<HTMLElement>('.demo-example')) {
    if (example.closest('[data-demo-overlay]') || example.closest('[data-demo-overlay-skip]')) continue;
    for (const child of example.children) {
      if (child.classList.contains('demo-example__note') || isExampleLabel(child)) continue;
      push(child);
    }
  }
  for (const element of root.querySelectorAll<HTMLElement>('[data-component]')) {
    if (element.closest('[data-demo-overlay]') || element.closest('[data-demo-overlay-skip]') || element.closest('.demo-example')) continue;
    const parent = element.parentElement?.closest<HTMLElement>('[data-component]');
    if (parent && root.contains(parent)) continue;
    push(element);
  }
  return result;
}

function box(className: string, left: number, top: number, width: number, height: number): HTMLElement {
  const element = document.createElement('div');
  element.className = className;
  element.style.transform = `translate(${left}px, ${top}px)`;
  element.style.width = `${Math.max(0, width)}px`;
  element.style.height = `${Math.max(0, height)}px`;
  return element;
}

export function createComponentOverlay(canvas: HTMLElement, layer: HTMLElement): ComponentOverlayHandle {
  let active = false;

  const render = (): void => {
    layer.textContent = '';
    if (!active) return;
    const base = canvas.getBoundingClientRect();
    for (const element of specimens(canvas)) {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      // Exclude the demo-only alignment inset (declared as --demo-align-inset and
      // applied as the leading margin) so it is not drawn as intrinsic margin.
      const alignInset = px(style.getPropertyValue('--demo-align-inset'));
      const mt = px(style.marginTop);
      const mr = px(style.marginRight);
      const mb = px(style.marginBottom);
      const ml = Math.max(0, px(style.marginLeft) - alignInset);
      const x = rect.left - base.left + canvas.scrollLeft;
      const y = rect.top - base.top + canvas.scrollTop;

      if (isTransparent(style.backgroundColor)) {
        layer.append(box('demo-overlay__bound', x, y, rect.width, rect.height));
      }
      if (mt > 0) layer.append(box('demo-overlay__margin', x - ml, y - mt, rect.width + ml + mr, mt));
      if (mb > 0) layer.append(box('demo-overlay__margin', x - ml, y + rect.height, rect.width + ml + mr, mb));
      if (ml > 0) layer.append(box('demo-overlay__margin', x - ml, y, ml, rect.height));
      if (mr > 0) layer.append(box('demo-overlay__margin', x + rect.width, y, mr, rect.height));
    }
  };

  const observer = new ResizeObserver(() => render());
  observer.observe(canvas);
  const onResize = (): void => render();
  window.addEventListener('resize', onResize);

  return {
    update(next: boolean): void {
      active = next;
      render();
    },
    dispose(): void {
      observer.disconnect();
      window.removeEventListener('resize', onResize);
      layer.textContent = '';
    },
  };
}
