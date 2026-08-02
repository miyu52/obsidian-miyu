import { moment } from 'obsidian';
import type MiyuPlugin from '../../../main';
import { WEEKDAY_KEYS, type I18nKey } from '../../../i18n';
import type { Unsubscriber } from '../../../core/store';
import type { TaskStat } from '../types';
import type { SessionStore } from '../stats';
import { pomodoroSettings } from '../settings';

const ACTIVITY_WEEKS = 52;

/**
 * 统计面板：
 * - 顶部：本日 / 本周 / 本月 / 总计 四个数字卡片
 * - 中部：单周 7 天分布条形图（左右切换周）
 * - 底部：GitHub 风格 52 周活跃图
 * - 点击任意一天 → 下方显示该天任务明细
 */
export class StatsPanel {
	private plugin: MiyuPlugin;

	private stats: SessionStore;

	private root: HTMLElement;

	private weekOffset = 0;

	/**
	 * 活跃图年份偏移：0 = 至今（锚点），+1 = 今年，+2 = 明年…
	 * -1 = 去年，-2 = 前年…。从今年左切一步回到"至今"。
	 */
	private activityOffset = 0;

	/** 默认选中今天，明细区初始即有内容。 */
	private selectedDay: string | null = moment().format('YYYY-MM-DD');

	private unsubscribers: Unsubscriber[] = [];

	constructor(plugin: MiyuPlugin, container: HTMLElement) {
		this.plugin = plugin;
		this.stats = plugin.pomodoro!.stats;

		this.root = container.createDiv({ cls: 'miyu-stats' });

		this.unsubscribers.push(
			pomodoroSettings.subscribe(() => {
				this.render();
			}),
		);

		this.render();
	}

	refresh() {
		this.render();
	}

	private render() {
		this.root.querySelector('.miyu-stats-body')?.remove();
		const body = this.root.createDiv({ cls: 'miyu-stats-body' });

		this.renderSummary(body);
		this.renderWeekView(body);
		this.renderActivity(body);
		this.renderDetail(body);
	}

	// ---------- 顶部：四个数字卡片 ----------

	private renderSummary(container: HTMLElement) {

		const summary = this.stats.summary();
		const cards: Array<{ key: I18nKey; value: number }> = [
			{ key: 'stats.today', value: summary.today },
			{ key: 'stats.week', value: summary.week },
			{ key: 'stats.month', value: summary.month },
			{ key: 'stats.total', value: summary.total },
		];
		const row = container.createDiv({ cls: 'miyu-stats-summary' });
		for (const card of cards) {
			const el = row.createDiv({ cls: 'miyu-stats-card' });
			el.createDiv({
				cls: 'miyu-stats-card-label',
				text: this.plugin.t(card.key),
			});
			el.createDiv({
				cls: 'miyu-stats-card-value',
				text: String(card.value),
			});
		}
	}

	// ---------- 中部：单周天分布 + 左右切换 ----------

	private renderWeekView(container: HTMLElement) {

		const days = this.stats.weekDayStats(this.weekOffset);

		const section = container.createDiv({ cls: 'miyu-stats-section' });

		const header = section.createDiv({ cls: 'miyu-stats-week-header' });
		const prev = header.createEl('button', {
			cls: 'miyu-stats-nav',
			attr: { 'aria-label': this.plugin.t('stats.prev-week') },
		});
		prev.setText('◀');
		prev.addEventListener('click', () => {
			this.weekOffset -= 1;
			this.render();
		});

		const start = moment(days[0]?.day, 'YYYY-MM-DD');
		const end = moment(days[6]?.day, 'YYYY-MM-DD');
		header.createSpan({
			cls: 'miyu-stats-week-range',
			text: `${start.format('MM-DD')} ~ ${end.format('MM-DD')}`,
		});

		const next = header.createEl('button', {
			cls: 'miyu-stats-nav',
			attr: { 'aria-label': this.plugin.t('stats.next-week') },
		});
		next.setText('▶');
		next.addEventListener('click', () => {
			this.weekOffset += 1;
			this.render();
		});

		const max = Math.max(1, ...days.map((d) => d.count));
		const cellsRow = section.createDiv({ cls: 'miyu-stats-week-grid' });
		for (let i = 0; i < 7; i++) {
			const day = days[i];
			if (!day) continue;
			const cell = cellsRow.createDiv({
				cls: `miyu-stats-week-cell${day.day === this.selectedDay ? ' is-selected' : ''}`,
			});
			cell.setAttribute('title', `${day.day} · ${day.count}`);
			cell.addEventListener('click', () => {
				this.selectedDay =
					this.selectedDay === day.day ? null : day.day;
				this.render();
			});
			const fill = cell.createDiv({ cls: 'miyu-stats-week-bar-fill' });
			fill.setCssProps({
				height: day.count > 0 ? `${(day.count / max) * 100}%` : '8%',
			});
		}

		const labelsRow = section.createDiv({
			cls: 'miyu-stats-week-grid',
		});
		for (const label of this.weekDayLabels()) {
			labelsRow.createDiv({
				cls: 'miyu-stats-week-label',
				text: label,
			});
		}
	}

	/** 按周起始日排序的星期短名（来自插件 i18n，不依赖 moment 全局 locale）。 */
	private weekDayLabels(): string[] {
		const all = WEEKDAY_KEYS.map((key) => this.plugin.t(key));
		const dow =
			this.plugin.settings.pomodoro.weekStart ??
			moment.localeData().firstDayOfWeek();
		return [...all.slice(dow), ...all.slice(0, dow)];
	}

	// ---------- 底部：GitHub 风格活跃图（居中 ◀ 年份 ▶ 切换） ----------

	private renderActivity(container: HTMLElement) {


		const section = container.createDiv({ cls: 'miyu-stats-section' });

		// 与周视图同款居中导航：◀ [至今 / 年份] ▶
		const nav = section.createDiv({ cls: 'miyu-stats-week-header' });
		const prevBtn = nav.createEl('button', {
			cls: 'miyu-stats-nav',
			attr: { 'aria-label': this.plugin.t('stats.prev-year') },
		});
		prevBtn.setText('◀');
		prevBtn.addEventListener('click', () => {
			this.activityOffset -= 1;
			this.render();
		});
		nav.createSpan({
			cls: 'miyu-stats-year-label',
			text: this.activityLabel(),
		});
		const nextBtn = nav.createEl('button', {
			cls: 'miyu-stats-nav',
			attr: { 'aria-label': this.plugin.t('stats.next-year') },
		});
		nextBtn.setText('▶');
		nextBtn.addEventListener('click', () => {
			this.activityOffset += 1;
			this.render();
		});

		// 至今 → 以本周为末；具体年份 → 以该年最后一周为末
		const endWeekStart = this.activityEndWeekStart();
		const weeks = this.stats.activityByWeek(ACTIVITY_WEEKS, endWeekStart);

		const grid = section.createDiv({ cls: 'miyu-heat-grid' });
		for (const week of weeks) {
			const col = grid.createDiv({ cls: 'miyu-heat-col' });
			for (const day of week) {
				const cell = col.createDiv({
					cls: `miyu-heat-cell level-${activityLevel(day.count)}${day.day === this.selectedDay ? ' is-selected' : ''}`,
				});
				cell.setAttribute('title', `${day.day} · ${day.count}`);
				cell.addEventListener('click', () => {
					this.selectedDay =
						this.selectedDay === day.day ? null : day.day;
					this.render();
				});
			}
		}

		// 色阶说明
		const legend = section.createDiv({ cls: 'miyu-heat-legend' });
		legend.createSpan({
			cls: 'miyu-heat-legend-text',
			text: this.plugin.t('stats.less'),
		});
		for (let level = 0; level <= 4; level++) {
			legend.createDiv({ cls: `miyu-heat-cell level-${level}` });
		}
		legend.createSpan({
			cls: 'miyu-heat-legend-text',
			text: this.plugin.t('stats.more'),
		});
	}

	/** 年份导航标签：偏移 0 = 至今；+n = 今年+n-1；-n = 今年-n。 */
	private activityLabel(): string {
		if (this.activityOffset === 0) {
			return this.plugin.t('stats.year-today');
		}
		return String(this.activityYear());
	}

	/** 当前偏移对应的年份。 */
	private activityYear(): number {
		const currentYear = moment().year();
		return this.activityOffset > 0
			? currentYear + this.activityOffset - 1
			: currentYear + this.activityOffset;
	}

	/** 活跃图末列锚点：至今 = 本周；年份 = 该年最后一周。 */
	private activityEndWeekStart(): number {
		if (this.activityOffset === 0) {
			return this.stats.weekStartOf();
		}
		return this.stats.weekStartOf(moment([this.activityYear(), 11, 31]));
	}

	// ---------- 明细 ----------

	private renderDetail(container: HTMLElement) {

		const detail = container.createDiv({ cls: 'miyu-stats-detail' });
		if (!this.selectedDay) {
			return;
		}

		const tasks: TaskStat[] = this.stats.tasksByDay(this.selectedDay);
		const total = tasks.reduce((sum, task) => sum + task.count, 0);
		detail.createDiv({
			cls: 'miyu-stats-detail-header',
			text: `${this.selectedDay} · ${this.plugin.t('stats.day-total', {
				count: String(total),
			})}`,
		});

		if (tasks.length === 0) {
			detail.createDiv({
				cls: 'miyu-stats-detail-empty',
				text: this.plugin.t('stats.empty'),
			});
			return;
		}

		const max = Math.max(10, ...tasks.map((task) => task.count));
		for (const task of tasks) {
			const row = detail.createDiv({ cls: 'miyu-stats-task' });
			row.createSpan({
				cls: 'miyu-stats-task-name',
				text: task.name || this.plugin.t('stats.no-task'),
			});
			row.createDiv({
				cls: 'miyu-stats-task-count',
				text: `🍅 x ${task.count}`,
			});
			const bar = row.createDiv({ cls: 'miyu-stats-task-bar' });
			const fill = bar.createDiv({ cls: 'miyu-stats-task-bar-fill' });
			fill.setCssProps({ width: `${(task.count / max) * 100}%` });
		}
	}

	destroy() {
		for (const unsub of this.unsubscribers) {
			unsub();
		}
		this.root.remove();
	}
}

/** 活跃图色阶：0 / 1-2 / 3-4 / 5-7 / 8+ */
function activityLevel(count: number): number {
	if (count === 0) return 0;
	if (count <= 2) return 1;
	if (count <= 4) return 2;
	if (count <= 7) return 3;
	return 4;
}
