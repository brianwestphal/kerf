/**
 * What clear (fully transparent) chrome fades in as content scrolls beneath
 * it: `none` stays clear; `material` fades in the translucent chrome
 * material; `surface` fades in the opaque surface. The fade tracks the scroll
 * over `scrollEdgeDistance` (opacity only), from the scroll state
 * `wireScrollDividers` reports; unwired, the chrome stays clear.
 */
export type ScrollEdge = 'none' | 'material' | 'surface';

/** The default scroll distance, in CSS pixels, a scroll edge fades in over. */
export const DEFAULT_SCROLL_EDGE_DISTANCE = 60;

/** The root attributes a component with a scroll edge renders. */
export function scrollEdgeAttributes(
  edge: ScrollEdge,
  distance: number | undefined,
  enabled: boolean,
): {
  'data-scroll-edge': 'material' | 'surface' | undefined;
  'data-scroll-edge-distance': string | undefined;
} {
  if (!enabled || edge === 'none')
    return {
      'data-scroll-edge': undefined,
      'data-scroll-edge-distance': undefined,
    };
  return {
    'data-scroll-edge': edge,
    'data-scroll-edge-distance':
      distance === undefined || !(distance > 0) ? undefined : String(distance),
  };
}
