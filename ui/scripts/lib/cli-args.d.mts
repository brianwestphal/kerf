export declare const CLI_USAGE_EXIT: 2;
export declare function wantsHelp(argv: readonly string[]): boolean;
export declare function parseCliArguments(
  argv: readonly string[],
  spec?: {
    values?: Record<string, string>;
    repeatable?: readonly string[];
    flags?: Record<string, string>;
    positionals?: boolean;
  },
): { options: Record<string, unknown>; positionals: string[] };
export declare function readJsonFile(path: string, label?: string): unknown;
export declare function isMainModule(moduleUrl: string): boolean;
