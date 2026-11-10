import type { SafeHtml } from 'kerfjs';
import type { IconNode } from 'lucide';

import type {
  CatalogLibraryPreview,
  CatalogLibraryPreviewJson,
} from '../../ai/component-composition.js';

type ComponentFunctions = Readonly<Record<string, (props: never) => SafeHtml>>;
export interface LibraryPreviewContext<Props> {
  readonly key: string;
  readonly name: string;
  readonly props: Readonly<Props>;
}
export interface LibraryPreview<Props = unknown> {
  sampleProps?(): Partial<Props>;
  render?(context: LibraryPreviewContext<Props>): SafeHtml | undefined;
  readonly icon?: IconNode;
  readonly fit?: 'contain' | 'fill';
}
export type LibraryPreviews = Readonly<Record<string, LibraryPreview>>;
export type LibraryPreviewsFor<C extends ComponentFunctions> = {
  readonly [K in keyof C]?: LibraryPreview<Parameters<C[K]>[0]>;
};
export function defineLibraryPreviews<const C extends ComponentFunctions>(
  components: C,
  previews: LibraryPreviewsFor<NoInfer<C>>,
): LibraryPreviewsFor<C> {
  void components;
  return previews;
}

/** Literal JSON samples; no document bindings or executable values are evaluated. */
export type LibraryPreviewJson = CatalogLibraryPreviewJson;
export type SerializableLibraryPreview = CatalogLibraryPreview;
export type SerializableLibraryPreviews = Readonly<
  Record<string, SerializableLibraryPreview>
>;

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function json(
  value: unknown,
  ancestors = new Set<object>(),
): value is LibraryPreviewJson {
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object' || ancestors.has(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (
    !Array.isArray(value) &&
    prototype !== Object.prototype &&
    prototype !== null
  )
    return false;
  ancestors.add(value);
  const valid =
    Reflect.ownKeys(value).every((key) => typeof key === 'string') &&
    Object.values(value).every((item) => json(item, ancestors));
  ancestors.delete(value);
  return valid;
}

/** Later entries replace the complete earlier registration; {} restores automatic rendering. */
export function mergeLibraryPreviews(
  ...layers: readonly (LibraryPreviews | undefined)[]
): LibraryPreviews {
  const result: Record<string, LibraryPreview> = {};
  for (const layer of layers)
    for (const [key, preview] of Object.entries(layer ?? {})) {
      if (object(preview)) result[key] = preview;
    }
  return result;
}

/** Read only the literal sample grammar from composition catalogs. */
export function libraryPreviewSamples(
  catalogs: readonly unknown[],
): LibraryPreviews {
  const result: Record<string, LibraryPreview> = {};
  for (const catalog of catalogs) {
    if (!object(catalog) || !object(catalog.libraryPreviews)) continue;
    for (const [key, sample] of Object.entries(catalog.libraryPreviews)) {
      if (
        !object(sample) ||
        Object.keys(sample).some((field) => field !== 'props')
      )
        continue;
      if (!Object.hasOwn(sample, 'props')) {
        result[key] = {};
        continue;
      }
      if (!object(sample.props) || !json(sample.props)) continue;
      const text = JSON.stringify(sample.props);
      result[key] = {
        sampleProps: () => JSON.parse(text) as Record<string, unknown>,
      };
    }
  }
  return result;
}
