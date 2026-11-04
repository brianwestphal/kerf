import type { KerfBaseAttrs } from 'kerfjs/jsx-runtime';

export type FieldLabelProps = Omit<
  KerfBaseAttrs,
  'children' | 'class' | 'className' | 'id'
> & {
  children: string;
  /**
   * The label's id: what a group's `labelledBy` (a ChoiceChips or a preview
   * group's `aria-labelledby`) names, so the label is that group's name.
   */
  id?: string;
  class?: string;
  className?: string;
};

/** Visible field heading for a read-only preview; use its id with aria-labelledby on the preview group. */
export function FieldLabel({
  children,
  id,
  class: classValue = '',
  className = '',
  ...attributes
}: FieldLabelProps) {
  const classes = ['kui-text__field-label', classValue, className]
    .filter(Boolean)
    .join(' ');
  return (
    <div {...attributes} id={id} class={classes} data-component="field-label">
      {children}
    </div>
  );
}
