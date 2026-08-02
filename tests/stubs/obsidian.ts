/**
 * Test stub for the `obsidian` module (aliased in vitest.config.ts).
 * Only the parts of the API that code under test actually touches are
 * implemented — everything else is a no-op class so imports type-check.
 * `moment` is the real moment library (devDependency) so date logic is
 * tested against real behavior.
 */
import moment from 'moment';

export { moment };

export class Notice {
	constructor(_message: string | DocumentFragment) {}
}

export class Plugin {
	app: unknown;
	settings: unknown;
	async loadData(_key?: string): Promise<unknown> {
		return null;
	}
	async saveData(_data: unknown, _key?: string): Promise<void> {}
	addCommand(): unknown {
		return null;
	}
	addSettingTab(): void {}
	addRibbonIcon(): HTMLElement {
		return document.createElement('div');
	}
	addStatusBarItem(): HTMLElement {
		return document.createElement('div');
	}
	register(): void {}
	registerEvent(): void {}
	registerView(): void {}
}

export class PluginSettingTab {
	app: unknown;
	containerEl: HTMLElement = document.createElement('div');
	constructor(app: unknown) {
		this.app = app;
	}
	display(): void {}
	hide(): void {}
}

export class Setting {
	settingEl: HTMLElement = document.createElement('div');
	infoEl: HTMLElement = document.createElement('div');
	nameEl: HTMLElement = document.createElement('div');
	descEl: HTMLElement = document.createElement('div');
	controlEl: HTMLElement = document.createElement('div');
	constructor(_containerEl: HTMLElement) {}
	setName(_name: string): this {
		return this;
	}
	setDesc(_desc: string): this {
		return this;
	}
	setHeading(): this {
		return this;
	}
	setClass(_cls: string): this {
		return this;
	}
	addText(_cb: (text: TextComponent) => unknown): this {
		return this;
	}
	addToggle(_cb: (toggle: ToggleComponent) => unknown): this {
		return this;
	}
	addButton(_cb: (button: ButtonComponent) => unknown): this {
		return this;
	}
	addDropdown(_cb: (dropdown: DropdownComponent) => unknown): this {
		return this;
	}
	addExtraButton(_cb: (button: ExtraButtonComponent) => unknown): this {
		return this;
	}
}

class TextComponent {
	inputEl: HTMLInputElement = document.createElement('input');
	setPlaceholder(): this {
		return this;
	}
	setValue(_value: string): this {
		return this;
	}
	onChange(_cb: (value: string) => unknown): this {
		return this;
	}
}

class ToggleComponent {
	toggleEl: HTMLElement = document.createElement('div');
	setValue(_value: boolean): this {
		return this;
	}
	onChange(_cb: (value: boolean) => unknown): this {
		return this;
	}
}

class ButtonComponent {
	buttonEl: HTMLButtonElement = document.createElement('button');
	setButtonText(_text: string): this {
		return this;
	}
	setIcon(_icon: string): this {
		return this;
	}
	setTooltip(_tooltip: string): this {
		return this;
	}
	onClick(_cb: () => unknown): this {
		return this;
	}
}

class DropdownComponent {
	selectEl: HTMLSelectElement = document.createElement('select');
	addOption(_value: string, _display: string): this {
		return this;
	}
	setValue(_value: string): this {
		return this;
	}
	onChange(_cb: (value: string) => unknown): this {
		return this;
	}
}

class ExtraButtonComponent {
	extraSettingsEl: HTMLElement = document.createElement('div');
	setIcon(_icon: string): this {
		return this;
	}
	setTooltip(_tooltip: string): this {
		return this;
	}
	onClick(_cb: () => unknown): this {
		return this;
	}
}

export class SuggestModal {
	constructor(_app: unknown) {}
	open(): void {}
	close(): void {}
}

export class TFile {
	path: string;
	extension: string;
	constructor(path: string) {
		this.path = path;
		this.extension = 'md';
	}
}

export interface CachedMetadata {
	headings?: {
		position: { start: { line: number } };
		level: number;
		heading: string;
	}[];
	listItems?: {
		position: { start: { line: number } };
		task?: string | null;
	}[];
}

export class Menu {
	addItem(_cb: (item: unknown) => unknown): this {
		return this;
	}
	addSeparator(): this {
		return this;
	}
	showAtMouseEvent(): void {}
	showAtPosition(): void {}
}

export class ItemView {
	contentEl: HTMLElement = document.createElement('div');
	icon: string = '';
	leaf: unknown;
	constructor(leaf: unknown) {
		this.leaf = leaf;
	}
	getViewType(): string {
		return '';
	}
	getDisplayText(): string {
		return '';
	}
	async onOpen(): Promise<void> {}
	async onClose(): Promise<void> {}
}

export class MarkdownView extends ItemView {}

export class Keymap {
	static isModEvent(): boolean {
		return false;
	}
}

export function setIcon(_el: HTMLElement, _icon: string): void {}
export function setTooltip(): void {}
export const MarkdownRenderer = {
	render(): void {},
};
