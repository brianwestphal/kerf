import './library-previews.css';

import { defineLibraryPreviews } from '@kerfjs/ui/editor';

import previewBadge from './order-preview-badge.svg';
import previewBadgeUrl from './order-preview-badge.svg?no-inline';
import { OrderWorkspace } from './order-workspace.js';

// This package/catalog module draws a schematic instead of running the real
// workspace in its thumbnail. It does not replace the component registry.
export default defineLibraryPreviews(
  { 'orders-app:order-workspace': OrderWorkspace },
  {
    'orders-app:order-workspace': {
      fit: 'fill',
      render: () => (
        <svg
          class="orders-library-schematic"
          data-order-schematic
          viewBox="0 0 96 72"
          width="100%"
          height="100%"
          aria-hidden="true"
        >
          <rect
            x="4"
            y="4"
            width="88"
            height="64"
            rx="5"
            fill="none"
            stroke="currentColor"
          />
          <path d="M28 4v64M28 20h64" fill="none" stroke="currentColor" />
          <rect
            x="5"
            y="5"
            width="22"
            height="62"
            rx="4"
            fill="currentColor"
            opacity=".14"
          />
          <image
            data-order-asset="inline"
            href={previewBadge}
            x="78"
            y="9"
            width="8"
            height="8"
          />
          <image
            data-order-asset="uri"
            href={previewBadgeUrl}
            x="36"
            y="55"
            width="8"
            height="8"
          />
          <path
            d="M10 15h12M10 25h12M10 35h9M36 12h38M36 30h46M36 39h38M36 48h42"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
          />
        </svg>
      ),
    },
  },
);
