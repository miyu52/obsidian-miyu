import { Setting } from 'obsidian';

/** 数字输入设置项（Obsidian 官方风格）：输入即保存，越界自动回退。 */
export function addNumberInput(
	setting: Setting,
	get: () => number,
	min: number,
	max: number,
	set: (value: number) => void,
) {
	setting.addText((text) => {
		text.inputEl.type = 'number';
		text.inputEl.min = String(min);
		text.inputEl.max = String(max);
		text.inputEl.addClass('miyu-setting-input');
		text.setValue(String(get()));
		text.onChange(() => {
			const num = parseInt(text.getValue());
			if (!isNaN(num) && num >= min && num <= max) {
				set(num);
			}
			text.setValue(String(get()));
		});
	});
}

/** 开关设置项：变更即保存。 */
export function addToggleSetting(
	setting: Setting,
	get: () => boolean,
	onCommit: (value: boolean) => void,
) {
	setting.addToggle((toggle) =>
		toggle.setValue(get()).onChange((value) => {
			onCommit(value);
		}),
	);
}
