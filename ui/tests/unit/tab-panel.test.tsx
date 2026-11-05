// KF-RE1EBK: TabPanel is the application-owned tabpanel a TabBarItem
// controls, named by its tab, hidden while another tab is selected, and busy
// while its content loads.
import { afterEach, describe, expect, it } from 'vitest';

import { TabBar } from '../../src/components/navigation/tab-bar/tab-bar.js';
import { TabBarItem } from '../../src/components/navigation/tab-bar-item/tab-bar-item.js';
import { TabPanel } from '../../src/components/navigation/tab-panel/tab-panel.js';
import { Text } from '../../src/components/typography/text/text.js';

const render = (html: unknown) => {
  const host = document.createElement('div');
  host.innerHTML = String(html);
  document.body.append(host);
  return host;
};

afterEach(() => document.body.replaceChildren());

describe('TabPanel', () => {
  it('renders a visible tabpanel named by its tab', () => {
    const host = render(
      TabPanel({
        id: 'notes-panel',
        tabId: 'notes-tab',
        children: Text({ children: 'Notes' }),
      }),
    );
    const panel = host.firstElementChild as HTMLElement;
    expect(panel.tagName).toBe('DIV');
    expect(panel.className).toBe('kui-tab-panel');
    expect(panel.dataset.component).toBe('tab-panel');
    expect(panel.getAttribute('role')).toBe('tabpanel');
    expect(panel.id).toBe('notes-panel');
    expect(panel.getAttribute('aria-labelledby')).toBe('notes-tab');
    expect(panel.hidden).toBe(false);
    expect(panel.hasAttribute('hidden')).toBe(false);
    expect(panel.hasAttribute('aria-busy')).toBe(false);
    expect(panel.querySelector('.kui-text')?.textContent).toBe('Notes');
  });

  it('writes hidden and aria-busy only when set', () => {
    const host = render(
      <>
        {TabPanel({ id: 'a', tabId: 'ta', hidden: true })}
        {TabPanel({ id: 'b', tabId: 'tb', busy: true })}
        {TabPanel({ id: 'c', tabId: 'tc', hidden: false, busy: false })}
      </>,
    );
    const [hidden, busy, plain] = [...host.children] as HTMLElement[];
    expect(hidden!.hidden).toBe(true);
    expect(hidden!.hasAttribute('aria-busy')).toBe(false);
    expect(busy!.hidden).toBe(false);
    expect(busy!.getAttribute('aria-busy')).toBe('true');
    expect(plain!.hasAttribute('hidden')).toBe(false);
    expect(plain!.hasAttribute('aria-busy')).toBe(false);
  });

  it('keeps its own markers over rootAttributes and adds a class', () => {
    const host = render(
      TabPanel({
        id: 'p',
        tabId: 't',
        className: 'app-panel',
        rootAttributes: {
          'data-component': 'spoofed',
          'data-panel-hook': 'notes',
        },
      }),
    );
    const panel = host.firstElementChild as HTMLElement;
    expect(panel.className).toBe('kui-tab-panel app-panel');
    expect(panel.dataset.component).toBe('tab-panel');
    expect(panel.dataset.panelHook).toBe('notes');
  });

  it('pairs with the TabBarItem that controls it', () => {
    const host = render(
      <>
        {TabBar({
          id: 'sections',
          label: 'Sections',
          children: [
            TabBarItem({
              id: 'notes',
              name: 'Notes',
              selected: true,
              tabId: 'notes-tab',
              panelId: 'notes-panel',
            }),
            TabBarItem({
              id: 'activity',
              name: 'Activity',
              tabId: 'activity-tab',
              panelId: 'activity-panel',
            }),
          ],
        })}
        {TabPanel({
          id: 'notes-panel',
          tabId: 'notes-tab',
          children: Text({ children: 'Notes' }),
        })}
        {TabPanel({
          id: 'activity-panel',
          tabId: 'activity-tab',
          hidden: true,
          children: Text({ children: 'Activity' }),
        })}
      </>,
    );
    for (const tab of host.querySelectorAll<HTMLElement>('[role="tab"]')) {
      const panel = document.getElementById(tab.getAttribute('aria-controls')!);
      expect(panel?.getAttribute('role')).toBe('tabpanel');
      expect(panel?.getAttribute('aria-labelledby')).toBe(tab.id);
      // The selected tab's panel is the one visible panel.
      expect(panel?.hidden).toBe(tab.getAttribute('aria-selected') !== 'true');
    }
    const visible = [
      ...host.querySelectorAll<HTMLElement>('[role="tabpanel"]'),
    ].filter((panel) => !panel.hidden);
    expect(visible.map((panel) => panel.id)).toEqual(['notes-panel']);
  });
});
