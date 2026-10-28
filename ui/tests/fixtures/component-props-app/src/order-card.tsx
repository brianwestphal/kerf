import type { SafeHtml } from 'kerfjs';

export type OrderStatus = 'open' | 'shipped';

export interface OrderCardProps {
  /** The order's title. */
  title: string;
  /** The total, in cents. */
  total?: number;
  /** Where the order is (default `open`). */
  status?: OrderStatus;
  rootAttributes?: Readonly<Record<`data-${string}`, string | undefined>>;
}

/** One order, as an app-owned component that lives in app source. */
export function OrderCard({
  title,
  total,
  status = 'open',
  rootAttributes = {},
}: OrderCardProps): SafeHtml {
  return (
    <article {...rootAttributes} data-status={status}>
      <h3>{title}</h3>
      {total === undefined ? null : <p>{total}</p>}
    </article>
  );
}
