import type { ViewDocument } from '@kerfjs/ui/view';
import { isSafeHtml, raw, type SafeHtml } from 'kerfjs';

import { canvasRenderer } from './canvas-renderer.js';
import type { EditorCatalog } from './catalog.js';
import type { LibraryPreviews } from './library-previews.js';

const record = (value: unknown): value is Record<string, unknown> =>
  Object.prototype.toString.call(value) === '[object Object]';

/** Static Library-only output; canonical catalog functions and insertion nodes are never changed. */
export function createLibraryThumbnails(
  catalog: EditorCatalog,
  previews: LibraryPreviews,
  documentOf: (key: string) => ViewDocument,
) {
  const cache = new Map<string, string>();
  const htmlOf = (key: string): string | undefined => {
    if (!catalog.propsByKey.has(key)) return undefined;
    if (!cache.has(key)) {
      const preview = previews[key];
      const component = catalog.components[key];
      const render = (props: Record<string, unknown>): SafeHtml => {
        let sampled = props;
        try {
          const values = preview?.sampleProps?.();
          if (record(values)) sampled = { ...props, ...values };
        } catch {
          // A failed sample factory leaves ordinary seeded props intact.
        }
        try {
          const result = preview?.render?.({
            key,
            name: catalog.componentNames.get(key) ?? key,
            props: sampled,
          });
          if (isSafeHtml(result) && result.toString().trim()) return result;
        } catch {
          // Invalid custom output falls back to the ordinary component.
        }
        if (component) {
          try {
            const result = component(sampled as never);
            if (isSafeHtml(result)) return result;
          } catch {
            // An incompatible sample cannot turn the Library into an error screen.
          }
          if (sampled !== props) {
            try {
              const result = component(props as never);
              if (isSafeHtml(result)) return result;
            } catch {
              // Empty output lets the thumbnail owner show its fallback icon.
            }
          }
        }
        return raw('');
      };
      const renderer = canvasRenderer({
        ...catalog,
        components: { ...catalog.components, [key]: render },
      });
      cache.set(
        key,
        renderer(documentOf(key), [], undefined, undefined, true).toString(),
      );
    }
    return cache.get(key);
  };
  const fitOf = (key: string) =>
    previews[key]?.fit === 'fill' ? ('fill' as const) : ('contain' as const);
  return { htmlOf, fitOf };
}
