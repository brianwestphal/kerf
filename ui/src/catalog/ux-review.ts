/**
 * Browser helpers for UX Review region captures from a catalog. The local
 * project directory comes from `uxReviewPlugin` (`@kerfjs/ui/vite-ux-review`),
 * which serves it to the catalog page on a Vite dev or preview server; static
 * hosting has no such endpoint, so a catalog there shows no capture link.
 */

/** Where `uxReviewPlugin` serves `{ projectDirectory }`, relative to the catalog page. */
export const UX_REVIEW_PROJECT_PATH = '__ux-review/project.json';

/** What a UX Review region capture is preset with. */
export interface UxReviewCapture {
  /** The absolute project directory UX Review files the review under. */
  projectDirectory: string;
  /** The review title. */
  title: string;
  /** Review context: what was selected and where. */
  context: string;
}

/** A `uxreview://capture` link that starts a region screenshot for a project. */
export function uxReviewCaptureUrl({
  projectDirectory,
  title,
  context,
}: UxReviewCapture): string {
  const url = new URL('uxreview://capture');
  url.searchParams.set('kind', 'screenshot');
  url.searchParams.set('target', 'region');
  url.searchParams.set('project', projectDirectory);
  url.searchParams.set('title', title);
  url.searchParams.set('context', context);
  return url.href;
}

/** POSIX (`/…`) or Windows drive (`C:\…`, `C:/…`) absolute path. */
const ABSOLUTE_PATH = /^(?:\/|[A-Za-z]:[\\/])/;

/**
 * Ask the server that served `pageUrl` for its UX Review project directory.
 * Resolves `null` when there is none (static hosting, a server without the
 * plugin, a malformed answer, or a network failure); never rejects.
 */
export async function loadUxReviewProject(
  pageUrl: string | URL,
  fetchImpl: typeof globalThis.fetch = globalThis.fetch,
): Promise<string | null> {
  try {
    const response = await fetchImpl(new URL(UX_REVIEW_PROJECT_PATH, pageUrl));
    if (!response.ok) return null;
    const data: unknown = await response.json();
    const directory =
      typeof data === 'object' && data !== null && 'projectDirectory' in data
        ? data.projectDirectory
        : undefined;
    return typeof directory === 'string' && ABSOLUTE_PATH.test(directory)
      ? directory
      : null;
  } catch {
    return null;
  }
}
