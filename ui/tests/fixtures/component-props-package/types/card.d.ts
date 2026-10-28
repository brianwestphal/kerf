declare class SafeHtml {
  private readonly html;
  toString(): string;
}
type KerfUiContent = SafeHtml | null | undefined | boolean;
/** How loudly the card stands out: `quiet` (default) or `raised`. */
type CardElevation = 'quiet' | 'raised';
interface CardProps {
  /** The card's heading. */
  title: string;
  elevation?: CardElevation;
  children?: KerfUiContent;
  footer?: KerfUiContent;
  rootAttributes?: Readonly<Record<`data-${string}`, string | undefined>>;
}
/** A titled card for grouped content. */
declare function Card(props: CardProps): SafeHtml;
declare function createCardModel(): { open: boolean };
export { Card, type CardProps, createCardModel };
