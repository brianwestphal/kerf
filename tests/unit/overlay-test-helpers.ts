export function clickBtn(selector: string): void {
  document.querySelector<HTMLElement>(selector)?.click();
}

export const rectFn = (rect: Partial<DOMRect>) => () =>
  ({
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    toJSON() {},
    ...rect,
  }) as DOMRect;

export function setViewport(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: height, configurable: true });
}

export function anchorAt(rect: Partial<DOMRect>): HTMLElement {
  const anchor = document.createElement('button');
  document.body.appendChild(anchor);
  anchor.getBoundingClientRect = rectFn(rect);
  return anchor;
}
