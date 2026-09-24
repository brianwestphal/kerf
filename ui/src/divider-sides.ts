/** Canonical physical edge combinations in top/right/bottom/left order. */
export type Sides =
  | ''
  | 't'
  | 'r'
  | 'b'
  | 'l'
  | 'tr'
  | 'tb'
  | 'tl'
  | 'rb'
  | 'rl'
  | 'bl'
  | 'trb'
  | 'trl'
  | 'tbl'
  | 'rbl'
  | 'trbl';

/** @deprecated Use the general `Sides` type. */
export type DividerSides = Sides;
