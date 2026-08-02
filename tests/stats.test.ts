import { describe, expect, it } from 'vitest';
import { moment } from 'obsidian';
import {
	SessionStore,
	type SessionStoreDeps,
} from '../src/features/pomodoro/stats';
import { formatRecordsBlock } from '../src/features/pomodoro/records-file';
import type { PomodoroRecord } from '../src/features/pomodoro/types';

function makeDeps(records: PomodoroRecord[] = []): {
	deps: SessionStoreDeps;
	settings: {
		pomodoro: { records: PomodoroRecord[]; weekStart: number | null };
	};
} {
	const settings = {
		pomodoro: {
			records,
			weekStart: 0 as number | null,
			recordsFile: '' as string,
		},
	};
	return {
		settings,
		deps: {
			settings,
			saveSettings: async () => {},
			readFile: async () => null,
			writeFile: async () => {},
			t: (key) => key,
		},
	};
}

/** 内存文件系统 mock：recordsFile 场景。 */
function makeFileDeps(initial: string | null = null): {
	deps: SessionStoreDeps;
	files: Map<string, string>;
} {
	const files = new Map<string, string>();
	if (initial !== null) {
		files.set('records.md', initial);
	}
	const settings = {
		records: [] as PomodoroRecord[],
		weekStart: 0 as number | null,
		recordsFile: 'records.md',
	};
	const deps: SessionStoreDeps = {
		settings: { pomodoro: settings },
		saveSettings: async () => {},
		readFile: async (p) => files.get(p) ?? null,
		writeFile: async (p, c) => {
			files.set(p, c);
		},
		t: (key) => key,
	};
	return { deps, files };
}

function session(actualMs = 1500000) {
	return { id: 's1', mode: 'WORK' as const, startedAt: 0, plannedMinutes: 25, actualMs };
}

const day = (offsetDays: number, hour = 12) =>
	moment()
		.startOf('day')
		.add(offsetDays, 'days')
		.add(hour, 'hours')
		.valueOf();

describe('SessionStore.record', () => {
	it('appends a record and writes the whole array back to settings', () => {
		const { deps, settings } = makeDeps();
		const store = new SessionStore(deps);
		store.record(session(), 'task A');
		expect(settings.pomodoro.records).toHaveLength(1);
		expect(settings.pomodoro.records[0]?.task).toBe('task A');
		expect(settings.pomodoro.records[0]?.durationMs).toBe(1500000);
	});

	it('prunes the oldest records past the cap', () => {
		const { deps, settings } = makeDeps();
		const store = new SessionStore(deps);
		for (let i = 0; i < 10002; i++) {
			store.record(session(1000), '');
		}
		expect(settings.pomodoro.records).toHaveLength(10000);
		const first = settings.pomodoro.records[0]!.completedAt;
		const last = settings.pomodoro.records[9999]!.completedAt;
		expect(first).toBeLessThanOrEqual(last);
	});

	it('initializes from the settings records without sharing the array', () => {
		const existing: PomodoroRecord[] = [{ completedAt: 1, task: 'old', durationMs: 1000 }];
		const { deps } = makeDeps(existing);
		const store = new SessionStore(deps);
		store.record(session(1000), 'new');
		expect(existing).toHaveLength(1); // original array untouched
		expect(deps.settings.pomodoro.records).toHaveLength(2); // replaced wholesale
	});
});

describe('SessionStore queries', () => {
	it('todayCompletedCount counts only records since midnight', () => {
		const { deps } = makeDeps([
			{ completedAt: day(0, 1), task: '', durationMs: 1000 }, // today
			{ completedAt: day(-1, 23), task: '', durationMs: 1000 }, // yesterday 23:00
			{ completedAt: day(0, 23), task: '', durationMs: 1000 }, // today late
		]);
		const store = new SessionStore(deps);
		expect(store.todayCompletedCount()).toBe(2);
	});

	it('countByDay returns the requested window with zero-filled days', () => {
		const { deps } = makeDeps([
			{ completedAt: day(-1, 12), task: '', durationMs: 1000 },
			{ completedAt: day(-3, 12), task: '', durationMs: 1000 },
		]);
		const store = new SessionStore(deps);
		const stats = store.countByDay(5);
		expect(stats).toHaveLength(5);
		expect(stats[4]?.day).toBe(moment().format('YYYY-MM-DD'));
		expect(stats[4]?.count).toBe(0);
		expect(stats[3]?.day).toBe(
			moment().subtract(1, 'days').format('YYYY-MM-DD'),
		);
		expect(stats[3]?.count).toBe(1);
		expect(stats[1]?.count).toBe(1);
	});

	it('weekStartOf shifts the week start according to the setting', () => {
		const { deps } = makeDeps();
		const store = new SessionStore(deps);
		deps.settings.pomodoro.weekStart = 1; // Monday
		const wednesday = moment().startOf('week').add(2, 'days'); // Wed of locale week
		const start = store.weekStartOf(wednesday);
		expect(moment(start).day()).toBe(1);
	});

	it('tasksByDay groups and sorts by count', () => {
		const dayKey = moment().format('YYYY-MM-DD');
		const { deps } = makeDeps([
			{ completedAt: day(0, 9), task: 'a', durationMs: 1000 },
			{ completedAt: day(0, 10), task: 'b', durationMs: 1000 },
			{ completedAt: day(0, 11), task: 'a', durationMs: 1000 },
		]);
		const store = new SessionStore(deps);
		expect(store.tasksByDay(dayKey)).toEqual([
			{ name: 'a', count: 2 },
			{ name: 'b', count: 1 },
		]);
	});
});

describe('SessionStore with recordsFile storage', () => {
	it('writes new records to the file block', async () => {
		const { deps, files } = makeFileDeps('# my records file\n');
		const store = new SessionStore(deps);
		store.record(session(), 'task A');
		await store.flush();
		const content = files.get('records.md')!;
		expect(content).toContain('%% miyu:records');
		expect(content).toContain('"task":"task A"');
		expect(content).toMatch(/^# my records file\n/);
	});

	it('creates the file from scratch when it does not exist', async () => {
		const { deps, files } = makeFileDeps(null);
		const store = new SessionStore(deps);
		store.record(session(), 'task A');
		await store.flush();
		const content = files.get('records.md');
		expect(content).toBeDefined();
		expect(content).toContain('%% miyu:records');
	});

	it('loads records from the file', async () => {
		const records = [
			{ completedAt: day(-1, 12), task: 'old', durationMs: 1000 },
		];
		const { deps } = makeFileDeps(formatRecordsBlock(records));
		const store = new SessionStore(deps);
		await store.load();
		expect(store.todayCompletedCount()).toBe(0);
		expect(store.summary().total).toBe(1);
	});

	it('treats a missing file as empty records', async () => {
		const { deps } = makeFileDeps(null);
		const store = new SessionStore(deps);
		await store.load();
		expect(store.summary().total).toBe(0);
	});

	it('merges user edits in the file instead of overwriting them', async () => {
		const { deps, files } = makeFileDeps(formatRecordsBlock([]));
		const store = new SessionStore(deps);
		await store.load();

		// 用户手动往文件里加了一条记录
		const userRecord = {
			completedAt: day(0, 8),
			task: 'manual',
			durationMs: 1000,
		};
		files.set(
			'records.md',
			formatRecordsBlock([userRecord]),
		);

		store.record(session(), 'session');
		await store.flush();
		const content = files.get('records.md')!;
		expect(content).toContain('"task":"manual"');
		expect(content).toContain('"task":"session"');
		// 内存与文件同步（用户编辑对统计可见）
		expect(store.todayCompletedCount()).toBe(2);
	});

	it('keeps pending records and retries when the write fails', async () => {
		const { deps, files } = makeFileDeps(null);
		let fail = true;
		deps.writeFile = async (p, c) => {
			if (fail) {
				throw new Error('disk error');
			}
			files.set(p, c);
		};
		const store = new SessionStore(deps);
		store.record(session(), 'task A');
		await store.flush();
		expect(files.has('records.md')).toBe(false); // 写失败，文件未生成

		fail = false;
		store.record(session(), 'task B');
		await store.flush();
		const content = files.get('records.md')!;
		expect(content).toContain('"task":"task A"'); // 重试补写成功
		expect(content).toContain('"task":"task B"');
	});

	it('notifies onRecordsChanged on record and after successful write-back', async () => {
		const { deps } = makeFileDeps(formatRecordsBlock([]));
		let notifications = 0;
		deps.onRecordsChanged = () => {
			notifications++;
		};
		const store = new SessionStore(deps);
		store.record(session(), 'task A');
		// 同步通知（内存已更新）
		expect(notifications).toBe(1);
		await store.flush();
		// 写回成功后（内存与文件同步）再通知一次
		expect(notifications).toBe(2);

		// 写失败时：内存已通知，但不等待写回通知
		deps.writeFile = async () => {
			throw new Error('disk error');
		};
		store.record(session(), 'task B');
		expect(notifications).toBe(3);
		await store.flush();
		expect(notifications).toBe(3);
	});

	it('repairs a corrupted file on load and keeps the original as error block', async () => {
		const { deps, files } = makeFileDeps(
			'%% miyu:records\n[{broken json]\n%%',
		);
		const store = new SessionStore(deps);
		await store.load();
		expect(store.summary().total).toBe(0);
		const content = files.get('records.md')!;
		expect(content).toContain('%% miyu:error-records');
		expect(content).toContain('[{broken json]');
		expect(content).not.toContain('%% miyu:records\n');
	});
});
