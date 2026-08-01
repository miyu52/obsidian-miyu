import { TFile } from 'obsidian';
import type { PomodoroTask, TaskHeading } from '../../types';

/** Regex to find [🍅 actual/expected] at end of task line. */
const POMODORO_RE = /\[🍅 (\d+)\/(\d+)\]\s*$/;

interface ParsedTask {
	description: string;
	line: number;
	checked: boolean;
	actual: number;
	expected: number;
	headingPath: string[];
}

interface ParsedHeading {
	text: string;
	level: number;
	startLine: number;
}

/**
 * Parse a single markdown file into headings and tasks for the pomodoro panel.
 */
export function parseTaskFile(content: string): {
	headings: TaskHeading[];
	tasks: PomodoroTask[];
} {
	const lines = content.split('\n');
	const parsedHeadings: ParsedHeading[] = [];
	const parsedTasks: ParsedTask[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (!line) continue;

		const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
		if (headingMatch) {
			const level = headingMatch[1]!.length;
			if (level <= 3) {
				parsedHeadings.push({
					text: headingMatch[2]!.trim(),
					level,
					startLine: i,
				});
			}
			continue;
		}

		const taskMatch = line.match(
			/^(\s*)[-*+]\s+\[(.)\]\s+(.+)/,
		);
		if (taskMatch) {
			const body = taskMatch[3]!;
			const pomoMatch = body.match(POMODORO_RE);
			const description = pomoMatch
				? body.slice(0, pomoMatch.index).trim()
				: body.trim();

			// Determine heading path — find all parent headings
			const headingPath: string[] = [];
			const parents: ParsedHeading[] = [];
			const minLevels: number[] = [];

			for (const h of parsedHeadings) {
				if (h.startLine >= i) break;

				// Pop headings of equal or higher level
				while (
					minLevels.length > 0 &&
					minLevels[minLevels.length - 1]! >= h.level
				) {
					minLevels.pop();
					parents.pop();
				}
				parents.push(h);
				minLevels.push(h.level);
			}

			for (const p of parents) {
				headingPath.push(p.text);
			}

			parsedTasks.push({
				description,
				line: i,
				checked: taskMatch[2] !== ' ',
				actual: pomoMatch ? parseInt(pomoMatch[1]!, 10) : 0,
				expected: pomoMatch ? parseInt(pomoMatch[2]!, 10) : 0,
				headingPath,
			});
		}
	}

	const headingTree = buildHeadingTree(
		parsedHeadings,
		parsedTasks,
	);

	return {
		headings: headingTree,
		tasks: parsedTasks.map((t) => ({
			description: t.description,
			line: t.line,
			checked: t.checked,
			actual: t.actual,
			expected: t.expected,
			headingPath: t.headingPath,
		})),
	};
}

function buildHeadingTree(
	headings: ParsedHeading[],
	tasks: ParsedTask[],
): TaskHeading[] {
	if (headings.length === 0) return [];

	const root: TaskHeading[] = [];
	const stack: TaskHeading[] = [];

	for (const h of headings) {
		const heading: TaskHeading = {
			text: h.text,
			level: h.level,
			collapsed: false,
			taskCount: 0,
			actualTotal: 0,
			expectedTotal: 0,
			children: [],
		};

		while (
			stack.length > 0 &&
			stack[stack.length - 1]!.level >= h.level
		) {
			stack.pop();
		}

		if (stack.length === 0) {
			root.push(heading);
		} else {
			stack[stack.length - 1]!.children.push(heading);
		}
		stack.push(heading);
	}

	// Assign tasks to headings
	for (const task of tasks) {
		if (task.headingPath.length === 0) continue;

		let currentList = root;
		let matched: TaskHeading | null = null;

		for (let i = 0; i < task.headingPath.length; i++) {
			const segment = task.headingPath[i]!;
			const found = currentList.find((h) => h.text === segment);
			if (found) {
				if (i === task.headingPath.length - 1) {
					matched = found;
				}
				currentList = found.children;
			} else {
				break;
			}
		}

		if (matched) {
			matched.taskCount++;
			matched.actualTotal += task.actual;
			matched.expectedTotal += task.expected;
		}
	}

	bubbleCounts(root);
	return root;
}

function bubbleCounts(headings: TaskHeading[]): void {
	for (const h of headings) {
		bubbleCounts(h.children);
		for (const child of h.children) {
			h.taskCount += child.taskCount;
			h.actualTotal += child.actualTotal;
			h.expectedTotal += child.expectedTotal;
		}
	}
}

/**
 * Update the [🍅 actual/expected] counter in a task line.
 */
export function updatePomodoroTag(
	line: string,
	newActual: number,
): string {
	const match = line.match(POMODORO_RE);
	if (match) {
		return line.replace(
			POMODORO_RE,
			`[🍅 ${newActual}/${match[2]}]`,
		);
	}
	return `${line.trimEnd()} [🍅 ${newActual}/${newActual}]`;
}

/**
 * Read and modify the task file to update pomodoro actual count.
 */
export async function writePomodoroCount(
	file: TFile,
	lineNumber: number,
	newActual: number,
	expected: number,
	vault: { read: (file: TFile) => Promise<string>; modify: (file: TFile, data: string) => Promise<void> },
): Promise<void> {
	const content = await vault.read(file);
	const lines = content.split('\n');
	if (lineNumber < lines.length) {
		const line = lines[lineNumber];
		if (line) {
			lines[lineNumber] = POMODORO_RE.test(line)
				? updatePomodoroTag(line, newActual)
				: `${line.trimEnd()} [🍅 ${newActual}/${expected}]`;
		}
	}
	await vault.modify(file, lines.join('\n'));
}
