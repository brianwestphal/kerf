// First-party Library registrations use the public extension contract.
import { raw } from 'kerfjs';
import {
  Activity,
  BadgeCheck,
  FaceSlightlySmiling,
  LoaderCircle,
} from 'lucide';

import { LucideIcon } from '../components/media/lucide-icon/lucide-icon.js';
import type { LibraryPreviews } from './library-previews.js';
import { paletteSketches } from './palette-schematics.js';

export const KERF_UI_LIBRARY_PREVIEWS: LibraryPreviews = {
  ...Object.fromEntries(
    Object.entries(paletteSketches()).map(([key, drawing]) => [
      key,
      { render: () => raw(drawing), fit: 'fill' },
    ]),
  ),
  ...Object.fromEntries(
    Object.entries({
      '@kerfjs/ui:lucide-icon': FaceSlightlySmiling,
      '@kerfjs/ui:loading-spinner': LoaderCircle,
      '@kerfjs/ui:corner-status': BadgeCheck,
      '@kerfjs/ui:edge-activity-indicator': Activity,
    }).map(([key, icon]) => [
      key,
      {
        render: () => LucideIcon({ icon, name: 'component' }),
        icon,
        fit: 'fill',
      },
    ]),
  ),
};
