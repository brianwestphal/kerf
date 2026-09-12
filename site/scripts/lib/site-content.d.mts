export interface SitePageData {
  description: string;
  html: string;
  path: string;
  source: string;
  title: string;
  toc: Array<{ depth: number; id: string; label: string }>;
}

export const BASE_PATH: string;
export const LEGACY_REDIRECTS: Record<string, string>;
export const NAVIGATION: Array<{ label: string; items: Array<[string, string]> }>;
export function loadPages(siteRoot: string): Promise<SitePageData[]>;
export function pageOutputPath(distDir: string, path: string): string;
export function parseFrontmatter(source: string): { attributes: { title: string; description: string }; body: string };
export function routeFromRelative(file: string): string;
