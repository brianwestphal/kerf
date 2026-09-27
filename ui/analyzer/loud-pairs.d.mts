import type { Declaration, Root } from 'postcss';

export type Rgb = [number, number, number];

export interface LoudScope {
  key: string;
  atScope: string;
  bare: string;
  selector: string;
}

export interface LoudDeclaration {
  decl: Declaration;
  file: string;
  tone: string;
  kind: 'fill-loud' | 'on-loud';
  value: string;
  scope: LoudScope;
}

export declare const LOUD_PAIR_MIN_CONTRAST: number;
export declare const DEFAULT_ON_LOUD: Readonly<Record<string, string>>;

export declare function literalSchemeColors(
  value: string,
): { light: Rgb; dark: Rgb } | undefined;

export declare function contrastRatio(first: Rgb, second: Rgb): number;

export declare function loudPairContrast(
  fillValue: string,
  onLoudValue: string,
): { scheme: 'light' | 'dark'; ratio: number } | undefined;

export declare function collectLoudDeclarations(
  file: string,
  root: Root,
): LoudDeclaration[];

export declare function inspectLoudPairs(
  file: string,
  root: Root,
  report: (
    decl: Declaration,
    message: string,
    evidence: Record<string, unknown>,
  ) => void,
  siblingOnLoud?: readonly LoudDeclaration[],
): void;
