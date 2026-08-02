import type MiyuPlugin from '../main';
import type { PluginSettingTab } from 'obsidian';

/**
 * 功能模块契约：每个 feature 导出一个 MiyuFeature 对象，
 * main.ts 以注册表驱动的方式调用，代替分散的手工注册。
 *
 * 生命周期：init（插件加载一次）→ registerCommands（每次加载/语言切换，
 * 返回命令 ID 供 reloadFeatures 先注销）→ destroy（插件卸载）。
 */
export interface MiyuFeature {
	/** 稳定的功能 ID（调试/日志用，不影响命令 ID）。 */
	id: string;
	/** 首次加载调用一次：创建单例（视图/状态栏/事件/设置订阅）。 */
	init?(plugin: MiyuPlugin): void;
	/** 每次注册调用：注册命令，返回命令 ID（语言切换时重新执行）。 */
	registerCommands(plugin: MiyuPlugin): string[];
	/** 卸载时清理单例。 */
	destroy?(plugin: MiyuPlugin): void;
	/** 向统一设置页渲染本功能的设置小节（含标题）。 */
	renderSettings?(
		plugin: MiyuPlugin,
		containerEl: HTMLElement,
		tab: PluginSettingTab,
	): void;
}
