import type { SafeHtml } from 'kerfjs';

export type OrderStatus = 'open' | 'shipped';

/** When an order ships: its first and last day. */
export interface ShippingWindow {
  /** The first day. */
  from: string;
  /** The last day. */
  to: string;
}

export interface OrderCardProps {
  /** The order's title. */
  title: string;
  /** The total, in cents. */
  total?: number;
  /** Where the order is (default `open`). */
  status?: OrderStatus;
  /** When the order ships, edited by the app's own field editor. */
  shipping?: ShippingWindow;
  rootAttributes?: Readonly<Record<`data-${string}`, string | undefined>>;
}

/** One order, as an app-owned component that lives in app source. */
export function OrderCard({
  title,
  total,
  status = 'open',
  shipping,
  rootAttributes = {},
}: OrderCardProps): SafeHtml {
  return (
    <article {...rootAttributes} data-status={status}>
      <h3>{title}</h3>
      {total === undefined ? null : <p>{total}</p>}
      {shipping ? (
        <p data-shipping>
          {shipping.from}–{shipping.to}
        </p>
      ) : null}
    </article>
  );
}
