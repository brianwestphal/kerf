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
