export type ApplicationUiProfileScope = 'package' | 'workspace' | 'directory';
export type QualifiedCatalogKey = `${string}:${string}`;

export interface ApplicationUiCatalogLocation {
  path: string;
  schemaVersion: number;
}

export interface ApplicationUiProfile {
  $schema?: string;
  schemaVersion: 1;
  scope: ApplicationUiProfileScope;
  catalogs?: Array<{
    package: string;
    /** Required for @kerfjs/ui; composition-only consumer packages omit it. */
    selection?: ApplicationUiCatalogLocation;
    composition: ApplicationUiCatalogLocation;
  }>;
  preferences?: Record<
    string,
    {
      preferred: QualifiedCatalogKey;
      avoid?: QualifiedCatalogKey[];
      rationale?: string;
    }
  >;
  theme?: {
    colorScheme?: 'light' | 'dark' | 'invert' | 'system';
    allowedColorSchemes?: Array<'light' | 'dark' | 'invert' | 'system'>;
    density?: 'standard' | 'compact';
    allowedDensities?: Array<'standard' | 'compact'>;
  };
  tokens?: Record<`--kui-${string}`, string>;
  layout?: {
    shell?: QualifiedCatalogKey;
    pane?: QualifiedCatalogKey;
    responsiveStrategy?: 'device-class' | 'container' | 'application';
    compactNavigation?: 'nav-stack' | 'tab-scaffold' | 'application';
    scrollOwnership?: 'one-per-pane' | 'application';
    spacingScale?: 'kerf-five-step' | 'application';
  };
  exceptions?: Array<{
    id: string;
    rules: string[];
    target: string;
    rationale: string;
  }>;
}

export interface ApplicationUiProfileLayer {
  source: string;
  profile: ApplicationUiProfile;
}

export interface ApplicationUiProfileDiagnostic {
  code: string;
  source: string;
  path: string;
  message: string;
}

export interface ResolvedApplicationUiProfile {
  profile: ApplicationUiProfile;
  provenance: Record<string, string>;
}

export const APPLICATION_UI_PROFILE_FILENAME: '.kerf-ui-profile.json';
export function discoverApplicationUiProfileFiles(options: {
  workspaceRoot: string;
  startDirectory: string;
  packageProfile?: string;
}): Promise<string[]>;
export function readApplicationUiProfile(
  source: string,
): Promise<ApplicationUiProfileLayer>;
export function mergeApplicationUiProfiles(
  layers: ApplicationUiProfileLayer[],
): ResolvedApplicationUiProfile;
export function validateApplicationUiProfileLayers(
  layers: ApplicationUiProfileLayer[],
): ApplicationUiProfileDiagnostic[];
export function validateApplicationUiProfile(
  profile: ApplicationUiProfile,
  options?: {
    source?: string;
    knownComponents?: Iterable<string>;
    knownTokens?: Iterable<string>;
    knownRules?: Iterable<string>;
  },
): ApplicationUiProfileDiagnostic[];
export function loadApplicationUiProfile(options: {
  workspaceRoot: string;
  startDirectory: string;
  packageProfile?: string;
  knownRules?: Iterable<string>;
}): Promise<{
  files: string[];
  layers: ApplicationUiProfileLayer[];
  profile?: ApplicationUiProfile;
  provenance?: Record<string, string>;
  diagnostics: ApplicationUiProfileDiagnostic[];
}>;
