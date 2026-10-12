type Root = HTMLElement | Document;

const HOST = '[data-component="corner-status"][popover]';

function open(host: Element) {
  if (
    !(host instanceof HTMLElement) ||
    !host.isConnected ||
    typeof host.showPopover !== 'function' ||
    host.matches(':popover-open')
  )
    return;
  host.showPopover();
}

function openWithin(node: Node) {
  if (!(node instanceof Element)) return;
  if (node.matches(HOST)) open(node);
  for (const host of node.querySelectorAll(HOST)) open(host);
}

/**
 * Open every overlay `CornerStatus` below root in the top layer, now and as
 * renders insert them. Opening never moves focus, and a manual popover has no
 * light dismiss or Escape, so the status stays until the application removes
 * it. Where the Popover API is missing the host stays a fixed-position
 * element. Dispose with the owning application.
 */
export function wireCornerStatus(root: Root): () => void {
  openWithin(root.nodeType === 9 ? (root as Document).documentElement : root);
  const observer = new MutationObserver((records) => {
    for (const record of records)
      for (const node of record.addedNodes) openWithin(node);
  });
  observer.observe(root, { childList: true, subtree: true });
  return () => observer.disconnect();
}
