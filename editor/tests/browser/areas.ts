import type { Page } from '@playwright/test';

/**
 * KF-MHY1GB: shows one of a rail's areas (Outline, Components, Problems in
 * the Document rail; Properties, Flow, Children in the Inspector).
 */
export const area = (page: Page, name: string) =>
  page.getByRole('tab', { name: new RegExp(`^${name}`) }).click();
