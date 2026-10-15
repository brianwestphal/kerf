type Root = HTMLElement | Document;

const MIXED = 'input[type="checkbox"][data-indeterminate]';

function sync(input: HTMLInputElement) {
  input.indeterminate = input.hasAttribute('data-indeterminate');
}

/**
 * Give every `Checkbox` below root rendered with `indeterminate` its native
 * mixed state, which only script can set, and keep it in step as renders add
 * or remove the marker. A click clears the mixed state natively; the app's
 * next render decides it again. Dispose with the owning application.
 */
export function wireCheckboxes(root: Root): () => void {
  for (const input of root.querySelectorAll<HTMLInputElement>(MIXED))
    sync(input);
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'attributes') {
        const target = record.target as Element;
        if (target.matches('input[type="checkbox"]'))
          sync(target as HTMLInputElement);
        continue;
      }
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches(MIXED)) sync(node as HTMLInputElement);
        for (const input of node.querySelectorAll<HTMLInputElement>(MIXED))
          sync(input);
      }
    }
  });
  observer.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-indeterminate'],
  });
  return () => {
    observer.disconnect();
  };
}
