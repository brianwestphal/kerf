import type { NativeAttributes } from '../native.js';

declare class SafeHtml {
  private readonly html;
  toString(): string;
}
type KerfUiContent = SafeHtml | string | number | null | undefined | boolean;
/** The tone: `neutral` (default) or `brand`. */
type FixtureTone = 'neutral' | 'brand';
interface FixturePanel {
  /** The panel title. */
  title: string;
  nested?: FixturePanel;
}
type FixtureCommon = {
  tone?: FixtureTone;
  /** Draw it compact (default `false`). */
  compact?: boolean;
  /** How many. @default 3 */
  count?: number;
  /**
   * The width.
   * @default 'auto'
   */
  width?: string;
  panel?: FixturePanel;
  inline?: { label: string };
  header?: KerfUiContent;
  /** @deprecated Use tone. */
  legacy?: string;
  tabIndex?: number;
};
type FixtureMode =
  | { mode: 'text'; children: string; icon?: undefined }
  | { mode: 'icon'; children?: never; icon: KerfUiContent };
type FixtureProps = FixtureCommon & FixtureMode & NativeAttributes;
/** A fixture component. */
declare function Fixture(props: FixtureProps): SafeHtml;
declare function Plain(): SafeHtml;
declare function Generic<Value extends string>(props: {
  value: NoInfer<Value>;
  choices: readonly Value[];
}): SafeHtml;
declare function helper(): void;
declare function NotAComponent(): string;
export { Fixture, Generic, helper, NotAComponent, Plain };
