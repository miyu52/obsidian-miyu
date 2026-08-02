import type { PomodoroCount } from './types';

/**
 * 匹配任务行正文里的番茄计数 `🍅:: X[/Y]`，可选包裹在 [..] 或 (..) 内
 * （兼容 TASKS 与 DATAVIEW 的内联字段写法）。从字符串末尾向前匹配。
 */
export const POMODORO_REGEX = new RegExp(
	'(?:(?=[^\\]]+\\])\\[|(?=[^)]+\\))\\() *🍅:: *(\\d* *\\/? *\\d*) *[)\\]](?: *,)?',
);

/** 计数本体（不含包裹符号）——写回时用它替换以保留 [..]/(..) 包裹。 */
const POMODORO_INNER = /🍅:: *(\d* *\/? *\d* *)/;

/**
 * 解析 `X` / `X/Y` / `/Y` 形式的计数文本。
 * 空串或未匹配 → null（"没有计数"与"0 个"不同）。
 */
export function parsePomodoroCount(text: string): PomodoroCount | null {
	const match = text.match(/^\s*(\d*)\s*\/?\s*(\d*)\s*$/);
	if (match === null || (match[1] === '' && match[2] === '')) {
		return null;
	}
	const actual = match[1] === '' ? 0 : parseInt(match[1] ?? '0');
	const expected = match[2] === '' ? null : parseInt(match[2] ?? '0');
	return { actual, expected };
}

/** 序列化计数为任务行里的文本（`🍅:: X` 或 `🍅:: X/Y`）。 */
export function formatPomodoroCount(count: PomodoroCount): string {
	return count.expected !== null
		? `🍅:: ${count.actual}/${count.expected}`
		: `🍅:: ${count.actual}`;
}

/**
 * 任务正文中已存在番茄计数时：实际数 +1 并写回（保留 [..]/(..) 包裹）。
 * 正文中没有计数 → 原样返回（调用方负责追加新字段）。
 */
export function incrementPomodoroText(body: string): string {
	const match = body.match(POMODORO_REGEX);
	if (match === null) {
		return body;
	}
	const count = parsePomodoroCount(match[1] ?? '') ?? {
		actual: 0,
		expected: null,
	};
	const next = formatPomodoroCount({ ...count, actual: count.actual + 1 });
	return body.replace(POMODORO_INNER, next);
}
