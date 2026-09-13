import type { SafeHtml } from 'kerfjs';

export interface RecipeController {
  render(): SafeHtml;
  action(command: string, element: HTMLElement): void;
  change?(element: HTMLElement): void;
  keydown?(event: KeyboardEvent, element: HTMLElement): void;
  afterShow?(element: HTMLElement): void;
  afterHide?(element: HTMLElement): void;
  resize?(id: string, size: number): void;
}

export type RecipeFactory = (announce: (message: string) => void) => RecipeController;
