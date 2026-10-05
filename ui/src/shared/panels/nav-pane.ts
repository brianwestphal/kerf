import type { ListConfig } from '../../components/collections/list/list.js';
import type { PaneConfig } from '../../components/layout/pane/pane.js';
import type { KerfUiContent } from '../content/semantic-content.js';

/** Content and chrome shared by a navigation view and a static workbench panel. */
export interface NavPane<TToolbar, TBottomToolbar> {
  content: KerfUiContent;
  toolbar?: TToolbar;
  header?: KerfUiContent;
  headerList?: ListConfig;
  footer?: KerfUiContent;
  footerList?: ListConfig;
  bottomToolbar?: TBottomToolbar;
  pane?: PaneConfig;
}
