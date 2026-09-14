import { delegate } from 'kerfjs';

export interface TokenSearchSubmit {
  id: string;
  editor: HTMLElement;
}

export interface WireTokenSearchFieldsOptions {
  onSubmit: (submission: TokenSearchSubmit) => void;
}

/** Keep TokenSearchField visually wrapping while Enter submits instead of inserting a line break. */
export function wireTokenSearchFields(root: HTMLElement, { onSubmit }: WireTokenSearchFieldsOptions) {
  return delegate(root, 'keydown', '[data-token-search-editor]', (event, element) => {
    const keyboardEvent = event as KeyboardEvent;
    const editor = element as HTMLElement;
    const field = editor.closest<HTMLElement>('[data-component="token-search-field"]');
    const id = field?.dataset.tokenSearchId;
    if (keyboardEvent.key !== 'Enter' || keyboardEvent.isComposing || !id || field?.dataset.disabled === 'true') return;
    keyboardEvent.preventDefault();
    onSubmit({ id, editor });
  });
}
