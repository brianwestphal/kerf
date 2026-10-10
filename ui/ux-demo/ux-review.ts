import type { CatalogEntry } from './catalog.js';

export function uxReviewCaptureUrl(
  projectDirectory: string,
  entry: CatalogEntry,
  pageUrl: string,
): string {
  const url = new URL('uxreview://capture');
  url.searchParams.set('kind', 'screenshot');
  url.searchParams.set('target', 'region');
  url.searchParams.set('project', projectDirectory);
  url.searchParams.set('title', `Kerf UI: ${entry.name}`);
  url.searchParams.set(
    'context',
    `Kerf UI UX demo\nSelected ${entry.kind}: ${entry.name} (${entry.id})\nDemo: ${pageUrl}`,
  );
  return url.href;
}
