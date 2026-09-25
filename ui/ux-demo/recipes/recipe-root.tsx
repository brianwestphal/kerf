import './recipe-root.css';

import type { KerfUiContent } from '@kerfjs/ui';
import type { TextContent } from '@kerfjs/ui/text';

type RecipeRootElement = 'aside' | 'form' | 'section';
type RecipeRootMeasure = 'form' | 'full' | 'inspector' | 'sidebar' | 'stack';
type RecipeDataAttributes = Readonly<
  Record<`data-${string}`, string | undefined>
>;

interface RecipeRootProps {
  element?: RecipeRootElement;
  recipe: string;
  measure?: RecipeRootMeasure;
  contentLayout?: boolean;
  surface?: boolean;
  dataAttributes?: RecipeDataAttributes;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  noValidate?: boolean;
  children: KerfUiContent;
}

export function RecipeRoot({
  element = 'section',
  recipe,
  measure = 'full',
  contentLayout = false,
  surface = true,
  dataAttributes = {},
  ariaLabelledBy,
  ariaDescribedBy,
  noValidate = false,
  children,
}: RecipeRootProps) {
  const attributes = {
    ...dataAttributes,
    class: `recipe-root recipe-component${surface ? ' recipe-root--surface recipe-component__surface' : ''}${contentLayout ? ' kui-content' : ''}`,
    'data-recipe': recipe,
    'data-measure': measure,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
  };
  if (element === 'aside') return <aside {...attributes}>{children}</aside>;
  if (element === 'form')
    return (
      <form {...attributes} noValidate={noValidate || undefined}>
        {children}
      </form>
    );
  return <section {...attributes}>{children}</section>;
}

export function RecipeMutedText({ children }: { children: TextContent }) {
  return <span class="recipe-muted-text">{children}</span>;
}

export function RecipeOwnershipNote({
  children,
  contentItem = true,
}: {
  children: TextContent;
  contentItem?: boolean;
}) {
  return (
    <p
      class={`recipe-ownership-note recipe-component__ownership${contentItem ? ' kui-content-item' : ''}`}
    >
      {children}
    </p>
  );
}

export function RecipeHeadingSummary({
  id,
  children,
}: {
  id?: string;
  children: TextContent;
}) {
  return (
    <p id={id} class="recipe-heading-summary recipe-component__heading-summary">
      {children}
    </p>
  );
}
