import { List } from '@kerfjs/ui/list';
import { Text } from '@kerfjs/ui/text';
import type { SafeHtml } from 'kerfjs';

interface DemoContentItemProps {
  title: string;
  detail: string;
  leading?: SafeHtml;
  eyebrow?: string;
  rootAttributes?: Record<string, string>;
}

export function DemoContentItem({
  title,
  detail,
  leading,
  eyebrow,
  rootAttributes,
}: DemoContentItemProps) {
  return (
    <div class="kui-content-item" {...rootAttributes}>
      {leading}
      <List gap="2xs">
        {eyebrow ? (
          <Text variant="span" tone="quiet" size="compact">
            {eyebrow}
          </Text>
        ) : null}
        <Text variant="span">
          <strong>{title}</strong>
        </Text>
        <Text variant="span" tone="quiet" size="compact">
          {detail}
        </Text>
      </List>
    </div>
  );
}
