/**
 * KF-100 + KF-123: declaration-merging a custom element into
 * `JSX.IntrinsicElements` must continue to work against the published
 * `dist/jsx-runtime.d.ts`. If KF-123 ever regresses, the merge target's
 * built-in tag set goes empty and `<button>` here fails — separate from
 * the consumer.tsx gate so a localised failure tells us which surface
 * broke.
 */

import { mount } from 'kerfjs';
import type { KerfCustomElement } from 'kerfjs/jsx-runtime';

declare module 'kerfjs/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      'kf-widget': KerfCustomElement & { greeting?: string; count?: number };
    }
  }
}

declare const root: HTMLElement;

mount(root, () => (
  <div>
    <kf-widget greeting="hi" count={3} data-test="merged" />
    <button type="button">native still resolves</button>
  </div>
));
