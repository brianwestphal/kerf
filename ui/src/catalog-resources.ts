import type { CatalogResource } from './catalog.js';

/**
 * Standard resource labels for a Kerf catalog detail footer. Keep these labels
 * stable across catalogs so people and AI-generated integrations see the same
 * choices in the same vocabulary.
 */
export type CatalogResourceKind =
  | 'demoSource'
  | 'componentSource'
  | 'designTemplate'
  | 'guidance'
  | 'integrationGuidance';

export interface CatalogResourceTarget {
  href: string;
  /** Optional monospace detail, normally the repository-relative source path. */
  detail?: string;
}

export interface CatalogResourcesInput {
  /** Required source for the runnable demonstration. */
  demoSource: CatalogResourceTarget;
  /** Source for the production component; omit for recipes and integrations. */
  componentSource?: CatalogResourceTarget;
  /** Optional design-tool template associated with the component. */
  designTemplate?: CatalogResourceTarget;
  /** Required UI or integration guidance. */
  guidance: CatalogResourceTarget;
  /** Use `integrationGuidance` when the component implementation is upstream. */
  guidanceKind?: 'guidance' | 'integrationGuidance';
}

/**
 * Build the standard catalog resource group in its canonical order: demo,
 * component, optional design template, then guidance.
 */
export function catalogResources(
  input: CatalogResourcesInput,
): CatalogResource[] {
  const resources: CatalogResource[] = [
    { label: 'Demo source', ...input.demoSource },
  ];
  if (input.componentSource)
    resources.push({
      label: 'Component source',
      ...input.componentSource,
    });
  if (input.designTemplate)
    resources.push({ label: 'Design template', ...input.designTemplate });
  resources.push({
    label:
      input.guidanceKind === 'integrationGuidance'
        ? 'Integration guidance'
        : 'Guidance',
    ...input.guidance,
  });
  return resources;
}
