import { moment } from 'obsidian';
import type MiyuPlugin from '../../main';
import type { DayStat, PomodoroSession, TaskStat } from './types';

/** 日志容量上限：超过后丢弃最旧的记录（≈1.5MB，个人使用几乎到不了）。 */
const MAX_RECORDS = 10000;

export interface StatsSummary {
	today: number;
	week: number;
	month: number;
	total: number;
}

/**
 * 番茄钟日志与统计。
 * 记录：会话完成时追加一条 PomodoroRecord 到 settings.pomodoro.records（data.json）。
 * 查询：全部从 records 现算，不存派生缓存。
 */
export class SessionStore {
	private plugin: MiyuPlugin;

	constructor(plugin: MiyuPlugin) {
		this.plugin = plugin;
	}

	private get records() {
		return this.plugin.settings.pomodoro.records;
	}

	/** 追加一条完成记录（只记录完成的 WORK 会话）。 */
	record(session: PomodoroSession, taskName: string): void {
		const records = this.records;
		records.push({
			completedAt: Date.now(),
			task: taskName,
			durationMs: session.actualMs,
		});
		if (records.length > MAX_RECORDS) {
			records.splice(0, records.length - MAX_RECORDS);
		}
		void this.plugin.saveSettings();
	}

	/** 周起始日（设置值，null = 跟随语言环境）。 */
	private weekStartDow(): number {
		const custom = this.plugin.settings.pomodoro.weekStart;
		return custom ?? moment.localeData().firstDayOfWeek();
	}

	/** 包含 now 的周起点（epoch ms）。 */
	weekStartOf(now: ReturnType<typeof moment> = moment()): number {
		const localeStart = moment(now).startOf('week');
		const shift = (this.weekStartDow() - moment.localeData().firstDayOfWeek() + 7) % 7;
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

	/** 某天按任务名分组的番茄数（按数量降序）。 */	tasksByDay(dayKey: string): TaskStat[] {
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
