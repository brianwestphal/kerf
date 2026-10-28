export function parseArguments(argv: readonly string[]): {
  command: 'generate' | 'check' | 'diff';
  documents: string[];
  options: {
    target: 'ts' | 'js';
    declarationsOnly: boolean;
    props: string[];
    composition: string[];
  };
};
export function run(argv: readonly string[]): { code: number; output: string };
