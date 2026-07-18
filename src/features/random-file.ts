import { Notice } from 'obsidian';
import type MiyuPlugin from '../main';
import { generateRandomString, getRandomOptions } from '../utils';

const MAX_RETRIES = 3;

export function registerRandomFileFeature(plugin: MiyuPlugin) {
	plugin.addCommand({
		id: 'generate-random-note',
		name: 'Generate note with random name',
		callback: () => createRandomNote(plugin),
	});
}

async function createRandomNote(plugin: MiyuPlugin) {
	const opts = getRandomOptions(plugin.settings);

	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		try {
			const randomName = generateRandomString(opts);
			const parentFolder = plugin.app.fileManager.getNewFileParent('');
			const filePath = `${parentFolder.path}/${randomName}.md`;

			const existing = plugin.app.vault.getAbstractFileByPath(filePath);
			if (existing) {
				// Name collision — retry with a new random string
				continue;
			}

			const file = await plugin.app.vault.create(filePath, '');
			const leaf = plugin.app.workspace.getLeaf();
			await leaf.openFile(file);
			new Notice(`Opened new note: ${randomName}.md`);
			return;
		} catch (error) {
			if (attempt === MAX_RETRIES - 1) {
				new Notice(
					`Failed to create random note: ${error instanceof Error ? error.message : 'Unknown error'}`,
				);
				return;
			}
		}
	}

	new Notice('Failed to generate a unique file name after 3 attempts.');
}
