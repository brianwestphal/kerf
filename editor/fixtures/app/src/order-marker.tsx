import type { SafeHtml } from 'kerfjs';

export interface OrderMarkerProps {
  label: string;
  rootAttributes?: Readonly<Record<`data-${string}`, string | undefined>>;
}

/** An invisible application marker, shown with an icon only in the Library. */
export function OrderMarker({
  label,
  rootAttributes = {},
}: OrderMarkerProps): SafeHtml {
  return <span {...rootAttributes} hidden data-order-marker={label} />;
}
