import type { KerfCustomElement } from 'kerfjs/jsx-runtime';

declare module 'kerfjs/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      'wa-select': KerfCustomElement & {
        class?: string;
        name?: string;
        label?: string;
        'aria-label'?: string;
        value?: string;
        placeholder?: string;
        disabled?: boolean;
      };
      'wa-option': KerfCustomElement & { value?: string };
      'wa-divider': KerfCustomElement;
    }
  }
}
