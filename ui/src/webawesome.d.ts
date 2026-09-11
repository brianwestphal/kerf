import type { KerfCustomElement } from 'kerfjs/jsx-runtime';

declare module 'kerfjs/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      'wa-accordion': KerfCustomElement;
      'wa-accordion-item': KerfCustomElement;
      'wa-animated-image': KerfCustomElement;
      'wa-animation': KerfCustomElement;
      'wa-avatar': KerfCustomElement;
      'wa-badge': KerfCustomElement;
      'wa-breadcrumb': KerfCustomElement;
      'wa-breadcrumb-item': KerfCustomElement;
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
      'wa-button-group': KerfCustomElement;
      'wa-callout': KerfCustomElement;
      'wa-card': KerfCustomElement;
      'wa-carousel': KerfCustomElement;
      'wa-carousel-item': KerfCustomElement;
      'wa-checkbox': KerfCustomElement;
      'wa-checkbox-group': KerfCustomElement;
      'wa-color-picker': KerfCustomElement;
      'wa-comparison': KerfCustomElement;
      'wa-copy-button': KerfCustomElement;
      'wa-details': KerfCustomElement;
      'wa-divider': KerfCustomElement;
      'wa-dialog': KerfCustomElement;
      'wa-drawer': KerfCustomElement;
      'wa-button': KerfCustomElement & {
        slot?: string;
        appearance?: string;
        'with-caret'?: boolean;
        'aria-label'?: string;
      };
      'wa-dropdown': KerfCustomElement & { placement?: string };
      'wa-dropdown-item': KerfCustomElement;
      'wa-format-bytes': KerfCustomElement;
      'wa-format-date': KerfCustomElement;
      'wa-format-number': KerfCustomElement;
      'wa-icon': KerfCustomElement;
      'wa-include': KerfCustomElement;
      'wa-input': KerfCustomElement;
      'wa-intersection-observer': KerfCustomElement;
      'wa-known-date': KerfCustomElement;
      'wa-markdown': KerfCustomElement;
      'wa-mutation-observer': KerfCustomElement;
      'wa-number-input': KerfCustomElement;
      'wa-otp-input': KerfCustomElement;
      'wa-page': KerfCustomElement;
      'wa-pagination': KerfCustomElement;
      'wa-popover': KerfCustomElement;
      'wa-popup': KerfCustomElement;
      'wa-progress-bar': KerfCustomElement;
      'wa-progress-ring': KerfCustomElement;
      'wa-qr-code': KerfCustomElement;
      'wa-radio': KerfCustomElement;
      'wa-radio-group': KerfCustomElement;
      'wa-random-content': KerfCustomElement;
      'wa-rating': KerfCustomElement;
      'wa-relative-time': KerfCustomElement;
      'wa-resize-observer': KerfCustomElement;
      'wa-scroller': KerfCustomElement;
      'wa-skeleton': KerfCustomElement;
      'wa-slider': KerfCustomElement;
      'wa-spinner': KerfCustomElement;
      'wa-split-panel': KerfCustomElement;
      'wa-switch': KerfCustomElement;
      'wa-tab': KerfCustomElement;
      'wa-tab-group': KerfCustomElement;
      'wa-tab-panel': KerfCustomElement;
      'wa-tag': KerfCustomElement;
      'wa-textarea': KerfCustomElement;
      'wa-time-input': KerfCustomElement;
      'wa-toast': KerfCustomElement;
      'wa-toast-item': KerfCustomElement;
      'wa-tooltip': KerfCustomElement;
      'wa-tree': KerfCustomElement;
      'wa-tree-item': KerfCustomElement;
      'wa-zoomable-frame': KerfCustomElement;
    }
  }
}
