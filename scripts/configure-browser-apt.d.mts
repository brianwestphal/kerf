/** Configure Ubuntu APT HTTPS endpoints and bounded acquire settings. */
export declare function configureBrowserApt(root?: string): {
  sources: { path: string; content: string; changed: boolean }[];
  settingsPath: string;
  settings: string;
};
