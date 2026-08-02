import { ItemView, MarkdownRenderer, type WorkspaceLeaf } from 'obsidian';
import type MiyuPlugin from '../../main';
import { t } from '../../i18n';
import { TimerPanel } from './ui/TimerPanel';

/**
 * View type ID is intentionally NOT `timer-view` (the old plugin's ID):
 * Obsidian forbids two plugins from registering the same view type, so a
 * shared ID would prevent the old `obsidian-pomodoro-timer` plugin from
 * loading while Miyu is enabled. Saved workspaces using the old type just
 * need the panel reopened once after the old plugin is removed.
 */
export const VIEW_TYPE_TIMER = 'miyu-timer-view';

export class TimerView extends ItemView {
	private plugin: MiyuPlugin;

	private panel: TimerPanel | null = null;

	constructor(plugin: MiyuPlugin, leaf: WorkspaceLeaf) {
		super(leaf);
		this.plugin = plugin;
		this.icon = 'timer';
	}

	getViewType(): string {
		return VIEW_TYPE_TIMER;
	}

	getDisplayText(): string {
		return t('view.timer.title', this.plugin.settings.language);
	}

	async onOpen() {
		this.contentEl.addClass('miyu-timer-view');
		this.panel = new TimerPanel(this.plugin, this.contentEl, this);
	}

	async onClose() {
		this.panel?.destroy();
		this.panel = null;
	}

	/** 渲染任务正文 markdown。 */
	renderMarkdown(content: string, el: HTMLElement) {
		void MarkdownRenderer.render(
			this.plugin.app,
			content,
			el,
			'',
			this,
		);
	}
}
