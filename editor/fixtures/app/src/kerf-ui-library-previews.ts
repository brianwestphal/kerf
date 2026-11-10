import { defineLibraryPreviews } from '@kerfjs/ui/editor';
import { MapPin } from 'lucide';

import { OrderMarker } from './order-marker.js';

// The host's default preview module adds its icon without changing the marker.
export default defineLibraryPreviews(
  { 'orders-app:order-marker': OrderMarker },
  {
    'orders-app:order-marker': { icon: MapPin },
  },
);
