import type { CatalogExampleViewport } from '@kerfjs/ui/catalog';
import type { SafeHtml } from 'kerfjs';

export interface RecipeController {
  render(): SafeHtml;
  action(command: string, element: HTMLElement): void;
  change?(element: HTMLElement): void;
  afterHide?(element: HTMLElement): void;
  resize?(id: string, size: number): void;
  /**
   * Install any imperative wiring the recipe owns on its mounted root (e.g.
   * `wireSidebar` for a collapsible rail/drawer), returning a disposer. The
   * application boundary calls it once per mount and disposes it on teardown.
   */
  wire?(root: HTMLElement): () => void;
}

export type RecipeFactory = (
  announce: (message: string) => void,
) => RecipeController;

/**
 * Catalog-only presentation for one recipe. The UX catalog frames the recipe in
 * a `CatalogExample` viewport and shows `note` when recipe notes are toggled on;
 * an application that copies the recipe ignores this export and mounts the
 * controller into its own container.
 */
export interface RecipePresentation {
  /** Catalog-owned specimen frame: width, height, surface, and border. */
  viewport?: CatalogExampleViewport;
  /** Ownership note: what the recipe owns versus what the application owns. */
  note: string;
}
