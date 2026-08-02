import { Notice, Setting } from 'obsidian';
import type MiyuPlugin from '../main';
import { type I18nKey } from '../i18n';
import type { MiyuFeature } from './types';
import { generateRandomString, getRandomOptions } from '../utils';
import {
	addNumberInput,
	addToggleSetting,
} from '../ui/settings-helpers';

const MAX_RETRIES = 3;

/** 随机笔记功能（无单例，只有命令）。 */
export const randomFileFeature: MiyuFeature = {
	id: 'random-file',
	registerCommands(plugin: MiyuPlugin): string[] {
		plugin.addCommand({
			id: 'generate-random-note',
			name: plugin.t('command.generate-random-note'),
			callback: () => createRandomNote(plugin),
		});

		return ['generate-random-note'];
	},

	renderSettings(plugin: MiyuPlugin, containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName(plugin.t('settings.section.random-file'))
			.setHeading();

		const lengthSetting = new Setting(containerEl)
			.setName(plugin.t('settings.random-length.name'))
			.setDesc(plugin.t('settings.random-length.desc'));
		addNumberInput(
			lengthSetting,
			() => plugin.settings.randomFile.length,
			1,
			64,
			(value) => {
				plugin.settings.randomFile.length = value;
				void plugin.saveSettings();
			},
		);

		const toggles: Array<{
			nameKey: I18nKey;
			descKey: I18nKey;
			field: 'uppercase' | 'lowercase' | 'numbers' | 'symbols';
		}> = [
			{
				nameKey: 'settings.random-uppercase.name',
				descKey: 'settings.random-uppercase.desc',
				field: 'uppercase',
			},
			{
				nameKey: 'settings.random-lowercase.name',
				descKey: 'settings.random-lowercase.desc',
				field: 'lowercase',
			},
			{
				nameKey: 'settings.random-numbers.name',
				descKey: 'settings.random-numbers.desc',
				field: 'numbers',
			},
			{
				nameKey: 'settings.random-symbols.name',
				descKey: 'settings.random-symbols.desc',
				field: 'symbols',
			},
		];
		for (const { nameKey, descKey, field } of toggles) {
			const setting = new Setting(containerEl)
				.setName(plugin.t(nameKey))
				.setDesc(plugin.t(descKey));
			addToggleSetting(
				setting,
				() => plugin.settings.randomFile[field],
				(value) => {
					plugin.settings.randomFile[field] = value;
					void plugin.saveSettings();
				},
			);
		}
	},
};

async function createRandomNote(plugin: MiyuPlugin) {
	const opts = getRandomOptions(plugin.settings.randomFile);

	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		try {
			const randomName = generateRandomString(
				opts,
				plugin.settings.language,
			);
			const parentFolder =
				plugin.app.fileManager.getNewFileParent('');
			const filePath = `${parentFolder.path}/${randomName}.md`;

			const existing =
				plugin.app.vault.getAbstractFileByPath(filePath);
			if (existing) {
				// Name collision — retry with a new random string
				continue;
			}

			const file = await plugin.app.vault.create(filePath, '');
			const leaf = plugin.app.workspace.getLeaf();
			await leaf.openFile(file);
			new Notice(
				plugin.t('notice.note-opened', { name: randomName }),
			);
			return;
		} catch (error) {
			if (attempt === MAX_RETRIES - 1) {
				new Notice(
					plugin.t('error.create-failed', {
						error:
							error instanceof Error
								? error.message
								: String(error),
					}),
				);
				return;
			}
		}
	}

	new Notice(plugin.t('error.max-retries'));
}
