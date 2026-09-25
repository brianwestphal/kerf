import './demo-content-item.css';

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
    <div class="kui-content-item demo-content-item" {...rootAttributes}>
      {leading}
      {eyebrow ? (
        <span class="demo-content-item__detail">{eyebrow}</span>
      ) : null}
      <strong class="demo-content-item__title">{title}</strong>
      <span class="demo-content-item__detail">{detail}</span>
    </div>
  );
}
