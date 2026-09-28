import { ContentItem, type ContentItemProps } from '@kerfjs/ui/content-item';
import { List } from '@kerfjs/ui/list';
import { Text } from '@kerfjs/ui/text';
import type { SafeHtml } from 'kerfjs';

interface DemoContentItemProps {
  title: string;
  detail: string;
  leading?: SafeHtml;
  eyebrow?: string;
  ariaLabel?: string;
  focusTarget?: boolean;
  rootAttributes?: ContentItemProps['rootAttributes'];
}

export function DemoContentItem({
  title,
  detail,
  leading,
  eyebrow,
  ariaLabel,
  focusTarget,
  rootAttributes,
}: DemoContentItemProps) {
  return (
    <ContentItem
      ariaLabel={ariaLabel}
      focusTarget={focusTarget}
      rootAttributes={rootAttributes}
    >
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
    </ContentItem>
  );
}
