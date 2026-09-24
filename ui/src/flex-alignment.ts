export type HorizontalAlignment =
  | 'left'
  | 'l'
  | 'flex-start'
  | 'center'
  | 'c'
  | 'space-around'
  | 'right'
  | 'r'
  | 'flex-end'
  | 'full'
  | 'f'
  | 'space-between';

export type VerticalAlignment =
  | 'top'
  | 't'
  | 'flex-start'
  | 'middle'
  | 'm'
  | 'c'
  | 'space-around'
  | 'bottom'
  | 'b'
  | 'flex-end'
  | 'full'
  | 'f'
  | 'space-between'
  | 'baseline';

export type ListVerticalAlignment = Exclude<VerticalAlignment, 'baseline'>;

export type CanonicalHorizontalAlignment = 'left' | 'center' | 'right' | 'full';
export type CanonicalVerticalAlignment =
  'top' | 'middle' | 'bottom' | 'full' | 'baseline';

export function horizontalAlignment(
  value: HorizontalAlignment,
): CanonicalHorizontalAlignment {
  switch (value) {
    case 'left':
    case 'l':
    case 'flex-start':
      return 'left';
    case 'center':
    case 'c':
    case 'space-around':
      return 'center';
    case 'right':
    case 'r':
    case 'flex-end':
      return 'right';
    case 'full':
    case 'f':
    case 'space-between':
      return 'full';
  }
}

export function verticalAlignment(
  value: VerticalAlignment,
): CanonicalVerticalAlignment {
  switch (value) {
    case 'top':
    case 't':
    case 'flex-start':
      return 'top';
    case 'middle':
    case 'm':
    case 'c':
    case 'space-around':
      return 'middle';
    case 'bottom':
    case 'b':
    case 'flex-end':
      return 'bottom';
    case 'full':
    case 'f':
    case 'space-between':
      return 'full';
    case 'baseline':
      return 'baseline';
  }
}
