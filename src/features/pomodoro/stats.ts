import { moment, Notice } from 'obsidian';
import type { I18nKey } from '../../i18n';
import type {
	DayStat,
	PomodoroRecord,
	PomodoroSession,
	TaskStat,
} from './types';
import {
	appendBlock,
	findRecordsBlock,
	formatRecordsBlock,
	parseRecordsContent,
	repairCorruptedBlock,
	replaceBlock,
} from './records-file';

/** 日志容量上限：超过后丢弃最旧的记录（≈1.5MB，个人使用几乎到不了）。 */
const MAX_RECORDS = 10000;

export interface StatsSummary {
	today: number;
	week: number;
	month: number;
	total: number;
}

/** SessionStore 依赖的最小接口（MiyuPlugin + 适配层结构上满足，便于单测）。 */
export interface SessionStoreDeps {
	settings: {
		pomodoro: {
			records: PomodoroRecord[];
			weekStart: number | null;
			recordsFile: string;
		};
	};
	saveSettings(): Promise<void>;
	/** 读取记录文件（null = 文件不存在）。 */
	readFile(path: string): Promise<string | null>;
	/** 写入记录文件（文件不存在则创建）。 */
	writeFile(path: string, content: string): Promise<void>;
	/** 本地化（Notice 文案）。 */
	t(key: I18nKey, vars?: Record<string, string>): string;
	/**
	 * 记录变化回调（文件路径下 UI 刷新通知；data.json 路径
	 * 依赖 saveSettings → onSettingsChanged 链路，无需此回调）。
	 */
	onRecordsChanged?(): void;
}

/**
 * 番茄钟日志与统计。
 * 存储分两种（由 pomodoro.recordsFile 决定）：
 * - ''：写 settings.pomodoro.records（data.json），行为与旧版一致
 * - 文件路径：写该 md 文件的 `%% miyu:records` 嵌入块（Kanban 同款语法），
 *   可读可编辑；损坏时改名为 `miyu:error-records` 保留原文再重建新块。
 * 查询：全部从本地 records 拷贝现算，不存派生缓存。
 */
export class SessionStore {
	private deps: SessionStoreDeps;

	/** 本地持有的记录（data.json 拷贝或从文件加载）。 */
	private records: PomodoroRecord[];

	/** 尚未持久化的新记录（文件写回成功后清空）。 */
	private pending: PomodoroRecord[] = [];

	/** 串行写队列：保证"读-改-写"不会被并发写互相覆盖。 */
	private writeChain: Promise<void> = Promise.resolve();

	constructor(deps: SessionStoreDeps) {
		this.deps = deps;
		this.records = deps.settings.pomodoro.records.map((r) => ({ ...r }));
	}

	/** 是否配置了文件存储。 */
	private get usesFile(): boolean {
		return this.deps.settings.pomodoro.recordsFile.trim() !== '';
	}

	/**
	 * 从配置的存储加载记录（启动/设置变更时调用）。
	 * 文件损坏时自动修复（error 块保留原文）并提示。
	 */
	async load(): Promise<void> {
		if (!this.usesFile) {
			this.records = this.deps.settings.pomodoro.records.map((r) => ({
				...r,
			}));
			return;
		}
		const path = this.deps.settings.pomodoro.recordsFile;
		try {
			const content = await this.deps.readFile(path);
			if (content === null) {
				this.records = [];
				return;
			}
			const parsed = parseRecordsContent(content);
			if (parsed !== null) {
				this.records = parsed;
				return;
			}
			// 损坏：改名 error 块保留原文 + 重建空记录块（下一次写回时填充）
			const block = findRecordsBlock(content);
			if (block) {
				const repaired = repairCorruptedBlock(content, block);
				await this.deps.writeFile(path, repaired);
				new Notice(
					this.deps.t('notice.records-corrupted', {
						marker: 'miyu:error-records',
					}),
				);
			}
			this.records = [];
		} catch (e) {
			console.error('[miyu] records load failed:', e);
			this.records = [];
		}
	}

	/** 追加一条完成记录（只记录完成的 WORK 会话）。 */
	record(session: PomodoroSession, taskName: string): void {
		const record: PomodoroRecord = {
			completedAt: Date.now(),
			task: taskName,
			durationMs: session.actualMs,
		};
		this.records.push(record);
		this.pending.push(record);
		this.pruneRecords();

		if (!this.usesFile) {
			this.deps.settings.pomodoro.records = this.records;
			void this.deps.saveSettings();
		} else {
			// 内存已更新，先同步刷新 UI（不等文件写回）
			this.deps.onRecordsChanged?.();
			void this.persistToFile();
		}
	}

	/** 串行写回：读最新文件 → 合并未持久化的记录 → 写回。 */
	private persistToFile(): void {
		this.writeChain = this.writeChain
			.then(() => this.flushPending())
			.catch((e) => {
				console.error('[miyu] records file write failed:', e);
				new Notice(this.deps.t('notice.records-write-failed'));
			});
	}

	/** 等待所有排队中的写入完成（测试/卸载时保证落盘）。 */
	async flush(): Promise<void> {
		await this.writeChain;
	}

	/** 把 pending 记录合并进文件（读-改-写）。失败时 pending 回填，等待下次重试。 */
	private async flushPending(): Promise<void> {
		if (this.pending.length === 0) {
			return;
		}
		const pending = this.pending;
		this.pending = [];
		const path = this.deps.settings.pomodoro.recordsFile;
		try {
			const content = await this.deps.readFile(path);
			let next: string;
			if (content === null) {
				next = formatRecordsBlock(pending);
			} else {
				const parsed = parseRecordsContent(content);
				const block = findRecordsBlock(content);
				if (parsed !== null) {
					const merged = [...parsed, ...pending].slice(-MAX_RECORDS);
					next = block
						? replaceBlock(content, block, formatRecordsBlock(merged))
						: appendBlock(content, formatRecordsBlock(merged));
					this.records = merged;
				} else if (block) {
					// 文件被改坏：修复（error 块保留原文）+ 末尾追加含 pending 的新块
					const repaired = repairCorruptedBlock(content, block);
					next = appendBlock(repaired, formatRecordsBlock(pending));
					new Notice(
						this.deps.t('notice.records-corrupted', {
							marker: 'miyu:error-records',
						}),
					);
				} else {
					next = appendBlock(content, formatRecordsBlock(pending));
				}
			}
			await this.deps.writeFile(path, next);
			// 写回成功：文件内容（含用户手动编辑）已同步进内存，再刷新一次
			this.deps.onRecordsChanged?.();
		} catch (e) {
			// 写失败：记录回填 pending，下次写回自动重试
			this.pending.unshift(...pending);
			throw e;
		}
	}

	/** 超过容量上限时丢弃最旧的记录。 */
	private pruneRecords(): void {
		if (this.records.length > MAX_RECORDS) {
			this.records.splice(0, this.records.length - MAX_RECORDS);
		}
	}

	/** 周起始日（设置值，null = 跟随语言环境）。 */
	private weekStartDow(): number {
		const custom = this.deps.settings.pomodoro.weekStart;
		return custom ?? moment.localeData().firstDayOfWeek();
	}

	/** 包含 now 的周起点（epoch ms）。 */
	weekStartOf(now: ReturnType<typeof moment> = moment()): number {
		const localeStart = moment(now).startOf('week');
		const shift =
			(this.weekStartDow() - moment.localeData().firstDayOfWeek() + 7) % 7;
		return localeStart.add(shift, 'days').valueOf();
	}

	/** 本日 / 本周 / 本月 / 总计 番茄数。 */
	summary(): StatsSummary {
		const now = moment();
		const dayStart = now.startOf('day').valueOf();
		const weekStart = this.weekStartOf(now);
		const monthStart = now.startOf('month').valueOf();
		let today = 0;
		let week = 0;
		let month = 0;
		for (const r of this.records) {
			if (r.completedAt >= dayStart) today++;
			if (r.completedAt >= weekStart) week++;
			if (r.completedAt >= monthStart) month++;
		}
		return { today, week, month, total: this.records.length };
	}

	/** 今日（本地零点后）完成的番茄数。 */
	todayCompletedCount(): number {
		const start = moment().startOf('day').valueOf();
		return this.records.filter((r) => r.completedAt >= start).length;
	}

	/** 最近 N 天的每日番茄数（含 0 的日期，旧→新）。 */
	countByDay(days: number): DayStat[] {
		const result: DayStat[] = [];
		const today = moment().startOf('day');
		for (let i = days - 1; i >= 0; i--) {
			const day = moment(today).subtract(i, 'days');
			const start = day.valueOf();
			const end = moment(day).add(1, 'day').valueOf();
			const count = this.records.filter(
				(r) => r.completedAt >= start && r.completedAt < end,
			).length;
			result.push({ day: day.format('YYYY-MM-DD'), count });
		}
		return result;
	}

	/**
	 * 单周 7 天分布（周起始日对齐）。weekOffset：0 = 本周，-1 = 上周…
	 */
	weekDayStats(weekOffset: number): DayStat[] {
		const start = moment(this.weekStartOf()).add(weekOffset, 'weeks');
		const result: DayStat[] = [];
		for (let i = 0; i < 7; i++) {
			const day = moment(start).add(i, 'days');
			const next = moment(day).add(1, 'day');
			const count = this.records.filter(
				(r) => r.completedAt >= day.valueOf() && r.completedAt < next.valueOf(),
			).length;
			result.push({ day: day.format('YYYY-MM-DD'), count });
		}
		return result;
	}

	/**
	 * GitHub 风格活跃图数据：weeks 列 × 7 行（列 = 周，行 = 日），按周起始日对齐。
	 * 以 endWeekStart 所在的周为末列；endWeekStart 缺省 = 本周。
	 * 返回的每列为 [7 天]，从最旧的周开始。
	 */
	activityByWeek(weeks: number, endWeekStart?: number): DayStat[][] {
		const end = endWeekStart ?? this.weekStartOf();
		const start = moment(end).add(-(weeks - 1), 'weeks');
		const result: DayStat[][] = [];
		for (let w = 0; w < weeks; w++) {
			const week: DayStat[] = [];
			for (let d = 0; d < 7; d++) {
				const day = moment(start).add(w, 'weeks').add(d, 'days');
				const next = moment(day).add(1, 'day');
				const count = this.records.filter(
					(r) => r.completedAt >= day.valueOf() && r.completedAt < next.valueOf(),
				).length;
				week.push({ day: day.format('YYYY-MM-DD'), count });
			}
			result.push(week);
		}
		return result;
	}

	/** 某天按任务名分组的番茄数（按数量降序）。 */
	tasksByDay(dayKey: string): TaskStat[] {
		const day = moment(dayKey, 'YYYY-MM-DD');
		const start = day.valueOf();
		const end = moment(day).add(1, 'day').valueOf();
		const counts = new Map<string, number>();
		for (const r of this.records) {
			if (r.completedAt >= start && r.completedAt < end) {
				counts.set(r.task, (counts.get(r.task) ?? 0) + 1);
			}
		}
		return [...counts.entries()]
			.map(([name, count]) => ({ name, count }))
			.sort((a, b) => b.count - a.count);
	}
}
