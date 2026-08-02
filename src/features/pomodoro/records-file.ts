import type { PomodoroRecord } from './types';

/**
 * records 文件的嵌入代码块格式（Kanban 插件同款语法：
 * `%%` 注释包裹，JSON 用 ```json 代码块包裹便于高亮/编辑）：
 *
 *     %% miyu:records
 *     ```json
 *     [{"completedAt":1,"task":"","durationMs":1000},
 *     {"completedAt":2,"task":"","durationMs":1000}]
 *     ```
 *     %%
 *
 * 解析失败（JSON 损坏）时不会重建丢数据：损坏块改名为
 * `miyu:error-records`（原文保留，用户可手动修复/找回），
 * 新记录从文件末尾新追加的 records 块开始。
 */

const BLOCK_MARKER = 'miyu:records';
const ERROR_MARKER = 'miyu:error-records';

/** 一个 records/error 块在文件中的位置。 */
export interface FoundBlock {
	/** 块起始偏移（含 `%% marker`）。 */
	start: number;
	/** 块结束偏移（含结尾 `%%`）。 */
	end: number;
	/** 块内 JSON 文本（原样，未解析）。 */
	json: string;
}

/** 匹配 `%% miyu:records\n...\n%%`（内容任意，可能不闭合结尾则匹配不到）。 */
const RECORDS_BLOCK_RE = /%% miyu:records\n([\s\S]*?)\n%%/g;

/** 匹配 error 块（我们生成的总是闭合的；不闭合的残留无害）。 */
const ERROR_BLOCK_RE = /%% miyu:error-records\n[\s\S]*?\n%%/g;

/** 匹配 ```json 代码块包裹（Kanban 同款；无包裹的旧格式直接按原样解析）。 */
const JSON_FENCE_RE = /^```(?:json)?\s*\n([\s\S]*?)\n```\s*$/;

/** 剥离 ```json 代码块包裹。 */
function stripFence(json: string): string {
	const match = json.match(JSON_FENCE_RE);
	return match ? (match[1] ?? '') : json;
}

/** 查找文件中最后一个 records 块（取最新的）。 */
export function findRecordsBlock(content: string): FoundBlock | null {
	RECORDS_BLOCK_RE.lastIndex = 0;
	let last: FoundBlock | null = null;
	for (
		let match = RECORDS_BLOCK_RE.exec(content);
		match !== null;
		match = RECORDS_BLOCK_RE.exec(content)
	) {
		last = {
			start: match.index,
			end: match.index + match[0].length,
			json: match[1] ?? '',
		};
	}
	return last;
}

/** 记录形状校验（宽松：形状不合法的条目被丢弃，而不是整个块判损坏）。 */
function isValidRecord(value: unknown): value is PomodoroRecord {
	if (typeof value !== 'object' || value === null) {
		return false;
	}
	const r = value as Record<string, unknown>;
	return (
		typeof r.completedAt === 'number' &&
		typeof r.task === 'string' &&
		typeof r.durationMs === 'number'
	);
}

/**
 * 解析文件内容为记录。
 * - 没有 records 块 → []（空记录）
 * - 块存在但 JSON 解析失败或不是数组 → null（损坏，调用方走修复流程）
 * - 形状不合法的条目被丢弃
 */
export function parseRecordsContent(content: string): PomodoroRecord[] | null {
	const block = findRecordsBlock(content);
	if (block === null) {
		return [];
	}
	const json = stripFence(block.json).trim();
	if (json === '') {
		return [];
	}
	try {
		const parsed: unknown = JSON.parse(json);
		if (!Array.isArray(parsed)) {
			return null;
		}
		return parsed.filter(isValidRecord);
	} catch {
		return null;
	}
}

/** 生成 records 块文本（```json 代码块包裹，每条记录一行，便于人工编辑）。 */
export function formatRecordsBlock(records: PomodoroRecord[]): string {
	const body = records.map((r) => JSON.stringify(r)).join(',\n');
	return `%% ${BLOCK_MARKER}\n\`\`\`json\n[${body}]\n\`\`\`\n%%`;
}

/** 生成 error 块文本（损坏原文原样保留）。 */
export function formatErrorBlock(json: string): string {
	return `%% ${ERROR_MARKER}\n${json}\n%%`;
}

/**
 * 修复损坏：用 error 块替换损坏的 records 块（原文保留），
 * 同时移除文件中已有的旧 error 块（保持唯一，不无限堆积）。
 */
export function repairCorruptedBlock(
	content: string,
	block: FoundBlock,
): string {
	const before = content.slice(0, block.start).replace(ERROR_BLOCK_RE, '');
	const after = content.slice(block.end).replace(ERROR_BLOCK_RE, '');
	return before + formatErrorBlock(block.json) + after;
}

/** 用新块替换文件中的已有块。 */
export function replaceBlock(
	content: string,
	block: FoundBlock,
	newBlock: string,
): string {
	return content.slice(0, block.start) + newBlock + content.slice(block.end);
}

/** 在文件末尾追加一个块（保证块前后有空行分隔）。 */
export function appendBlock(content: string, block: string): string {
	const trimmed = content.replace(/\s+$/, '');
	return trimmed.length > 0 ? `${trimmed}\n\n${block}` : block;
}
