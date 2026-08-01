import { Notice } from 'obsidian';
import type MiyuPlugin from '../main';
import { t } from '../i18n';
import { generateRandomString, getRandomOptions } from '../utils';

const MAX_RETRIES = 3;

/**
 * Register the random-file feature.
 * @returns Array of registered command IDs.
 */
export function registerRandomFileFeature(plugin: MiyuPlugin): string[] {
	const locale = plugin.settings.language;

	plugin.addCommand({
		id: 'generate-random-note',
		name: t('command.generate-random-note', locale),
		callback: () => createRandomNote(plugin),
	});

	return ['generate-random-note'];
}

async function createRandomNote(plugin: MiyuPlugin) {
	const locale = plugin.settings.language;
	const opts = getRandomOptions(plugin.settings);

	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		try {
			const randomName = generateRandomString(opts, locale);
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
				t('notice.note-opened', locale, { name: randomName }),
			);
			return;
		} catch (error) {
			if (attempt === MAX_RETRIES - 1) {
				new Notice(
					t('error.create-failed', locale, {
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

	new Notice(t('error.max-retries', locale));
}
