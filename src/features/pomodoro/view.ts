import { ItemView, WorkspaceLeaf } from 'obsidian';
import type MiyuPlugin from '../../main';

export const POMODORO_VIEW_TYPE = 'miyu-pomodoro-view';

export class PomodoroView extends ItemView {
	private plugin: MiyuPlugin;
	private uiCleanup?: () => void;

	constructor(plugin: MiyuPlugin, leaf: WorkspaceLeaf) {
		super(leaf);
		this.plugin = plugin;
		this.icon = 'timer';
	}

	getViewType(): string {
		return POMODORO_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Pomodoro';
	}

	async onOpen(): Promise<void> {
		const container = this.contentEl;
		container.empty();
		container.addClass('miyu-pomodoro-container');

		const TimerViewComponent = (
			await import('./components/TimerView.svelte')
		).default;

		const component = new TimerViewComponent({
			target: container,
			props: {
				plugin: this.plugin,
				timer: this.plugin.timer!,
			},
		});

		this.uiCleanup = () => {
			component.$destroy();
		};
	}

	async onClose(): Promise<void> {
		this.uiCleanup?.();
	}
}
