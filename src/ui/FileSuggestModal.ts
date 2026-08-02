import { App, SuggestModal, TFile } from 'obsidian';

/** 文件选择弹窗：从 vault 中搜索 md 文件。 */
export class FileSuggestModal extends SuggestModal<TFile> {
	private onPick: (file: TFile) => void;

	constructor(app: App, onPick: (file: TFile) => void) {
		super(app);
		this.onPick = onPick;
	}

	getSuggestions(query: string): TFile[] {
		const q = query.trim().toLowerCase();
		return this.app.vault
			.getMarkdownFiles()
			.filter((f) => !q || f.path.toLowerCase().includes(q))
			.slice(0, 30);
	}

	renderSuggestion(file: TFile, el: HTMLElement) {
		el.setText(file.path);
	}

	onChooseSuggestion(file: TFile) {
		this.onPick(file);
	}
}
