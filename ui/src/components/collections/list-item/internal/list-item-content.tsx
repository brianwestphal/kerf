// ListItem's row content (icon, labels, trailing), shared by ListItem,
// ListItemLink, and ListItem's treeitem form (KF-ECR4XG). Internal: the
// `@kerfjs/ui/list-item` facade does not re-export it.
import type { SafeHtml } from 'kerfjs';

import type { ListIconTilePresentation } from '../../../../shared/content/list-icon-tile.js';
import type { KerfUiContent } from '../../../../shared/content/semantic-content.js';
import { em, remify } from '../../../../shared/styles/css-values.js';
import { withWordBreaks } from '../../../../shared/text/word-breaks.js';
import { LoadingSpinner } from '../../../feedback/loading-spinner/loading-spinner.js';
import { Skeleton } from '../../../feedback/skeleton/skeleton.js';

export interface ListItemContentProps {
  label: string | SafeHtml;
  description?: string | SafeHtml;
  icon?: SafeHtml;
  trailing?: KerfUiContent;
  status?: string | SafeHtml;
  busy?: boolean;
  multiline?: boolean;
  placeholder?: boolean;
}

export function listItemContent({
  label,
  description,
  icon,
  tile,
  trailing,
  status,
  busy = false,
  multiline = false,
  placeholder = false,
}: Pick<
  ListItemContentProps,
  | 'label'
  | 'description'
  | 'icon'
  | 'trailing'
  | 'status'
  | 'busy'
  | 'multiline'
  | 'placeholder'
> & { tile: ListIconTilePresentation | null }) {
  const tileSize = tile?.tile ? 32 : 18;
  return (
    <>
      {icon && (
        <span
          class="kui-list-item__icon"
          style={placeholder ? undefined : tile?.style}
        >
          {placeholder ? (
            <Skeleton
              block
              width={remify(tileSize)}
              height={remify(tileSize)}
            />
          ) : (
            icon
          )}
        </span>
      )}
      <span class="kui-list-item__label">
        <span class="kui-list-item__primary-label">
          {placeholder ? (
            <Skeleton width={em(9)} />
          ) : multiline ? (
            withWordBreaks(label)
          ) : (
            label
          )}
        </span>
        {description && (
          <span class="kui-list-item__description">
            {placeholder ? <Skeleton width={em(11)} /> : description}
          </span>
        )}
      </span>
      {(busy || status || trailing) && (
        <span class="kui-list-item__trailing">
          {/* The busy spinner is component-owned chrome drawn from a known
              prop, so a placeholder keeps it live. Status text and
              author-supplied trailing content are values: skeletons. */}
          {busy && <LoadingSpinner />}
          {status && (
            <span class="kui-list-item__status">
              {placeholder ? <Skeleton width={em(3.5)} /> : status}
            </span>
          )}
          {trailing && (placeholder ? <Skeleton width={em(1.5)} /> : trailing)}
        </span>
      )}
    </>
  );
}
