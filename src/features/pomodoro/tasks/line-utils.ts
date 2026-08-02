import {
	TaskRegularExpressions,
	type TaskComponents,
} from './serializer/TaskModels';

const HASH_TAGS_REG_EXP = /(^|\s)#[^ !@#$%^&*(),.?":{}|<>]+/g;

export function extractHashtags(description: string): string[] {
	return (
		description.match(HASH_TAGS_REG_EXP)?.map((tag) => tag.trim()) ?? []
	);
}

/** 解析一行 markdown 任务行，返回 checkbox 之后的各组成部分。 */
export function extractTaskComponents(line: string): TaskComponents | null {
	// Check the line to see if it is a markdown task.
	const regexMatch = line.match(TaskRegularExpressions.taskRegex);
	if (regexMatch === null) {
		return null;
	}

	const indentation = regexMatch[1] ?? '';
	const listMarker = regexMatch[2] ?? '';

	// Get the status of the task.
	const status = regexMatch[3] ?? '';

	// match[4] includes the whole body of the task after the brackets.
	let body = (regexMatch[4] ?? '').trim();

	// Match for block link and remove if found. Always expected to be
	// at the end of the line.
	const blockLinkMatch = body.match(TaskRegularExpressions.blockLinkRegex);
	const blockLink = blockLinkMatch !== null ? blockLinkMatch[0] : '';

	if (blockLink !== '') {
		body = body.replace(TaskRegularExpressions.blockLinkRegex, '').trim();
	}
	return { indentation, listMarker, status, body, blockLink };
}

/**
 * Takes a regex of the form 'key:: value' and turns it into a regex that can
 * parse Dataview inline fields, i.e either:
 *     * (key:: value)
 *     * [key:: value]
 *
 * There can be an arbitrary amount of horizontal whitespace around the key
 * value pair, and after the '::'.
 */
export function toInlineFieldRegex(innerFieldRegex: RegExp): RegExp {
	const fieldRegex = (
		[
			'(?:',
			/*     */ /(?=[^\]]+\])\[/, // Try to match '[' if there's a ']' later in the string
			/*    */ '|',
			/*     */ /(?=[^)]+\))\(/, // Otherwise, match '(' if there's a ')' later in the string
			')',
			/ */,
			innerFieldRegex,
			/ */,
			/[)\]]/,
			/(?: *,)?/, // Allow trailing comma, enables workaround from #1913 for rendering issue
			/$/, // Regexes are matched from the end of the string forwards
		] as const
	)
		.map((val) => (val instanceof RegExp ? val.source : val))
		.join('');
	return new RegExp(fieldRegex, innerFieldRegex.flags);
}
