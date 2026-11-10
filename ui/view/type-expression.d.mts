import type { ViewDocument, ViewType } from './index.mjs';

/** Lexical containment only; the project compiler owns syntax and semantics. */
export function containedTypeExpression(text: unknown): boolean;
export function typeSourcePath(value: unknown): value is string;
export function validTypeExpression(
  type: unknown,
): type is ViewType & { typescript: NonNullable<ViewType['typescript']> };
export function typeExpressionText(
  type: Pick<ViewType, 'typescript'>,
  source?: string,
): string;
export function hasTypeExpressions(
  document: Pick<ViewDocument, 'params'>,
): boolean;
