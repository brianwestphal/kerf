/**
 * What clear (fully transparent) chrome shows once content scrolls beneath it:
 * `none` stays transparent; `material` fades in the translucent chrome
 * material (opacity only) while the scroll state wiring reports content
 * beneath the chrome, and fades it out at rest.
 */
export type ScrollEdge = 'none' | 'material';
