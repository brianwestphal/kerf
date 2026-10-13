import '@kerfjs/ui/foundation.css';
import '@kerfjs/ui/document.css';
import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/pane.css';
import '@kerfjs/ui/toolbar.css';
import '@kerfjs/ui/toolbar-control-group.css';
import '@kerfjs/ui/toolbar-text.css';
import '@kerfjs/ui/nav-stack.css';

import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { NavStack, type NavStackView } from '@kerfjs/ui/nav-stack';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { mount, type SafeHtml } from 'kerfjs';
import { Pencil, Share, Star } from 'lucide';

/**
 * NavStack top toolbars for the centered-title rule: with a back control the
 * title centers on the bar, shifts away from a wider side, and truncates
 * before it reaches a control; at the root it leads, left-aligned.
 */

function trailing(count: number): SafeHtml {
  const icons = [Share, Star, Pencil].slice(0, count);
  return (
    <ToolbarControlGroup label="Actions">
      {icons.map((icon) => (
        <button type="button" aria-label="Action">
          <LucideIcon icon={icon} name="action" />
        </button>
      ))}
    </ToolbarControlGroup>
  );
}

function stack(name: string, views: NavStackView[]): SafeHtml {
  return (
    <div data-case={name} style="display: grid; height: 140px">
      <NavStack id={`stack-${name}`} label={name} views={views} />
    </div>
  );
}

const root: NavStackView = {
  key: 'root',
  toolbar: { title: 'Library', trailing: trailing(1) },
  content: <div />,
};

function render(): SafeHtml {
  return (
    <div>
      {stack('root', [root])}
      {stack('short', [
        root,
        {
          key: 'short',
          toolbar: { title: 'Atlas', trailing: trailing(1) },
          content: <div />,
        },
      ])}
      {stack('wide-side', [
        root,
        {
          key: 'wide',
          toolbar: { title: 'Project Atlas', trailing: trailing(3) },
          content: <div />,
        },
      ])}
      {stack('long', [
        root,
        {
          key: 'long',
          toolbar: {
            title:
              'Project Atlas quarterly planning roadmap and delivery review',
            trailing: trailing(2),
          },
          content: <div />,
        },
      ])}
    </div>
  );
}

mount(document.querySelector<HTMLElement>('[data-fixture-root]')!, render);
