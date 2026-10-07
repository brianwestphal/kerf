import {
  space,
  type UiGapValue,
  type UiSpaceName,
} from '../styles/css-values.js';

const spaceNames: readonly UiSpaceName[] = [
  'none',
  '2xs',
  'xs',
  's',
  'm',
  'l',
  'xl',
];

/** Resolve a public spacing name while preserving a complete typed CSS length. */
export function gapLength(value: UiGapValue): string {
  return spaceNames.includes(value as UiSpaceName)
    ? space(value as UiSpaceName)
    : value;
}
