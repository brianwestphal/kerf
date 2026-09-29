export interface SelectorCompound {
  combinator: '' | ' ' | '>' | '+' | '~';
  compound: string;
}

export function ownsClass(rootClass: string, candidate: string): boolean;
export function complexSelectorParts(
  selectorList: string,
): SelectorCompound[][];
export function complexSelectors(selectorList: string): string[][];
export function kuiClasses(selector: string): string[];
export function classNames(selector: string): string[];
export function dataComponents(selector: string): string[];
export function withoutPseudoArguments(
  compound: string,
  names: string[],
): string;
export function withoutRelationalArguments(compound: string): string;
export function pseudoArguments(compound: string, name: string): string[];
export function splitTopLevel(list: string): string[];
export function subjectTypes(compound: string): string[] | null;
