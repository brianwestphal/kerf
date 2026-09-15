export type DemoTheme = 'light' | 'dark';

export function preferredDemoTheme(prefersDark: boolean): DemoTheme {
  return prefersDark ? 'dark' : 'light';
}

export function oppositeDemoTheme(theme: DemoTheme): DemoTheme {
  return theme === 'dark' ? 'light' : 'dark';
}

export function applyDemoTheme(root: HTMLElement, theme: DemoTheme): void {
  root.classList.toggle('demo-light', theme === 'light');
  root.classList.toggle('demo-dark', theme === 'dark');
}
