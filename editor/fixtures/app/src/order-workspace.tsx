import { List } from '@kerfjs/ui/list';
import { Text } from '@kerfjs/ui/text';
import { Workbench } from '@kerfjs/ui/workbench';
import type { SafeHtml } from 'kerfjs';

export interface OrderWorkspaceProps {
  id: string;
  /** The real workspace heading, independent of its Library schematic. */
  title: string;
  rootAttributes?: Readonly<Record<`data-${string}`, string | undefined>>;
}

/** An application composition with navigation and a work area. */
export function OrderWorkspace({
  id,
  title,
  rootAttributes = {},
}: OrderWorkspaceProps): SafeHtml {
  return (
    <Workbench
      id={id}
      label={title}
      rootAttributes={{ ...rootAttributes, 'data-order-workspace': '' }}
      leftRail={{
        content: (
          <List textInsets="trbl">
            <Text>Open orders</Text>
            <Text>Shipped</Text>
          </List>
        ),
        size: 180,
      }}
      main={
        <List textInsets="trbl">
          <Text variant="h3">{title}</Text>
          <Text>Select an order to review it.</Text>
        </List>
      }
    />
  );
}
