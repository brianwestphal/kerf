export interface OwnershipCatalogEntry {
  key: string;
  package: string;
  id: string;
  name: string;
  source?: string;
  boundaries?: {
    rootClass?: string | null;
    publicClasses?: string[];
    publicTokens?: string[];
  };
  cssValueProps?: Array<{ path: string; examples?: string[] }>;
}

export interface ComponentOwnershipFacts {
  classOwners: Map<string, OwnershipCatalogEntry>;
  dataComponentOwners: Map<string, OwnershipCatalogEntry>;
  tagOwners: Map<string, OwnershipCatalogEntry>;
  privatePrefixes: Array<{ prefix: string; entry: OwnershipCatalogEntry }>;
  typedTokens: Map<string, { entry: OwnershipCatalogEntry; path: string }>;
}

export interface RestyledComponent {
  entry: OwnershipCatalogEntry;
  via: 'class' | 'data-component' | 'tag' | 'descendant';
  name: string;
}

export function componentOwnershipFacts(
  entries: Iterable<OwnershipCatalogEntry>,
): ComponentOwnershipFacts;
export function restyledComponents(
  selectorList: string,
  facts: ComponentOwnershipFacts,
  isForeign: (entry: OwnershipCatalogEntry) => boolean,
): RestyledComponent[];
export function privateVariableOwner(
  property: string,
  facts: ComponentOwnershipFacts,
): OwnershipCatalogEntry | null | undefined;
export function typedPropForToken(
  token: string,
  facts: ComponentOwnershipFacts,
): { entry: OwnershipCatalogEntry; path: string } | undefined;
export function configurationFor(
  entry: OwnershipCatalogEntry | null | undefined,
): string;
export function reportGap(
  entry: OwnershipCatalogEntry | null | undefined,
): string;
export function componentName(
  entry: OwnershipCatalogEntry | null | undefined,
): string;
export function componentLabel(
  entry: OwnershipCatalogEntry | null | undefined,
): string;
