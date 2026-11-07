// Where an Inspector control writes (KF-YF1PDR: split out of editor.tsx): a
// prop, or a field inside one, and the keys the Inspector derives from it.
import { type FieldContainer, type FieldPath } from './model/fields.js';

/** Where an inspector control writes: a prop, or a field inside one. */
export interface FieldPlace {
  readonly prop: string;
  readonly path: FieldPath;
}

/** An open field editor (KF-Z9S029): a place in the selected node's prop. */
export interface OpenField extends FieldPlace {
  readonly node: string;
  readonly container: FieldContainer;
}

/** A place's key for its error and Custom size state: `gap`, `mainPane.gap`. */
export const placeKey = (place: FieldPlace) =>
  [place.prop, ...place.path].join('.');

/**
 * A control's morph key (KF-QCBJ4F): rows come and go above the controls
 * (a node's problems), and an unkeyed morph then turned one prop's input
 * into another's, which in WebKit swallowed the next edit's change event.
 */
export const controlKey = (place: FieldPlace) =>
  `editor-control:${placeKey(place)}`;
