/** Configure Ubuntu APT for browser dependencies on hosted CI runners. */
export declare function configureBrowserApt(root?: string): {
  sources: { path: string; content: string; changed: boolean }[];
  settingsPath: string;
  settings: string;
};
