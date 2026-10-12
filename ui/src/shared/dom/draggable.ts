/**
 * The native `draggable` attribute value for a component root: omitted unless
 * the author set it, and never `"true"` on an inert loading placeholder.
 */
export function nativeDraggable(
  draggable: boolean | undefined,
  placeholder: boolean,
): 'true' | 'false' | undefined {
  if (draggable === undefined) return undefined;
  return draggable && !placeholder ? 'true' : 'false';
}
