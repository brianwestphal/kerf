import type { KerfBaseAttrs } from 'kerfjs/jsx-runtime';

export type FieldLabelProps = Omit<
  KerfBaseAttrs,
  'children' | 'class' | 'className'
> & {
  children: string;
  class?: string;
  className?: string;
};

/** Visible field heading for a read-only preview; use its id with aria-labelledby on the preview group. */
export function FieldLabel({
  children,
  class: classValue = '',
  className = '',
  ...attributes
}: FieldLabelProps) {
  const classes = ['kui-text__field-label', classValue, className]
    .filter(Boolean)
    .join(' ');
  return (
    <div {...attributes} class={classes} data-component="field-label">
      {children}
    </div>
  );
}
