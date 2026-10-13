import { Scan } from 'lucide';

import {
  ToolbarActionLink,
  ToolbarControlGroup,
} from '../../components/actions/toolbar-control-group/toolbar-control-group.js';
import { LucideIcon } from '../../components/media/lucide-icon/lucide-icon.js';
import type { CatalogEntry, CatalogUxReview } from '../types.js';
import { uxReviewCaptureUrl } from '../ux-review.js';

/**
 * The "Capture region" header link for the active entry. `wireCatalog` adds
 * the page URL to its context when it is followed, since the URL can change
 * after this render (`urlParam`).
 */
export function CatalogUxReviewLink({
  uxReview: { projectDirectory, name },
  entry,
  category,
}: {
  uxReview: CatalogUxReview & { name: string };
  entry: CatalogEntry;
  category: string;
}) {
  return (
    <ToolbarControlGroup
      appearance="borderless"
      single
      size="compact"
      content="mixed"
      buttonAppearance="push"
    >
      <ToolbarActionLink
        href={uxReviewCaptureUrl({
          projectDirectory,
          title: `${name}: ${entry.name}`,
          context: `${name} catalog\nSelected ${category}: ${entry.name} (${entry.id})`,
        })}
        label="Capture Region"
        ariaLabel={`Capture ${entry.name} in UX Review`}
        icon={<LucideIcon icon={Scan} name="scan" />}
      />
    </ToolbarControlGroup>
  );
}
