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
  return Number.isFinite(n) ? n : 0;
}

function isTransparent(color: string): boolean {
  const normalized = color.replace(/\s+/g, '');
  return normalized === 'transparent' || /,0\)$/.test(normalized);
}

function topLevelComponents(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-component]')).filter((element) => {
    if (element.closest('[data-demo-overlay]')) return false;
    const parent = element.parentElement?.closest<HTMLElement>('[data-component]');
    return !parent || !root.contains(parent);
  });
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
    for (const element of topLevelComponents(canvas)) {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const mt = px(style.marginTop);
      const mr = px(style.marginRight);
      const mb = px(style.marginBottom);
      const ml = px(style.marginLeft);
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
