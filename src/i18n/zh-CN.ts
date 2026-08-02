/** Chinese (Simplified) locale strings for Miyu plugin. */
import type { I18nDictionary } from './en';

export const zhCN: I18nDictionary = {
	// 设置 — 语言
	'settings.language.name': '语言',
	'settings.language.desc': '界面语言。命令名称重载插件后生效。',

	// 设置 — 随机文件名
	'settings.section.random-file': '随机文件名',
	'settings.random-length.name': '长度',
	'settings.random-length.desc': '随机字符串的字符数量（1–64）',
	'settings.random-uppercase.name': '大写字母',
	'settings.random-uppercase.desc': '包含 A–Z',
	'settings.random-lowercase.name': '小写字母',
	'settings.random-lowercase.desc': '包含 a–z',
	'settings.random-numbers.name': '数字',
	'settings.random-numbers.desc': '包含 0–9',
	'settings.random-symbols.name': '符号',
	'settings.random-symbols.desc': '包含 ! @ # $ % ^ & ( ) - _ [ ] { } + =',

	// 设置 — 番茄钟
	'settings.section.pomodoro': '番茄钟',
	'settings.work-minutes.name': '工作时长',
	'settings.work-minutes.desc': '每个工作会话的分钟数',
	'settings.break-minutes.name': '休息时长',
	'settings.break-minutes.desc': '每次休息的分钟数（设为 0 则一直工作不休）',
	'settings.auto-start-next.name': '自动开始下一会话',
	'settings.auto-start-next.desc': '当前会话结束后自动开始下一会话',
	'settings.status-bar-timer.name': '启用状态栏计时器',
	'settings.status-bar-timer.desc':
		'在状态栏显示计时器（左键切换开始/暂停，右键打开菜单）',
	'settings.low-fps.name': '低动画帧率',
	'settings.low-fps.desc':
		'若遇到高 CPU 占用，可开启此选项降低动画帧率以节省 CPU 资源',

	// 设置 — 通知
	'settings.system-notification.name': '使用系统通知',
	'settings.notification-sound.name': '声音通知',
	'settings.custom-sound.name': '自定义通知音效',
	'settings.custom-sound.desc': '库内音频文件的路径',
	'settings.custom-sound.placeholder': 'path/to/sound.mp3',
	'settings.custom-sound.play': '播放',

	// 设置 — 任务
	'settings.task-tracking.name': '启用任务追踪',
	'settings.task-tracking.desc':
		'注意：启用此功能后，激活任务时会自动为任务添加块 ID（除非已有块 ID）。',
	'settings.task-progress.name': '显示任务番茄计数',
	'settings.task-progress.desc':
		'在任务行显示番茄计数（如 2/3）和计划进度渐变背景。关闭后两者都不显示',
	'settings.task-format.name': '任务格式',
	'settings.task-format.tasks': '任务 Emoji 格式',
	'settings.task-format.dataview': 'Dataview',

	// 设置 — 每日目标
	'settings.daily-goal.name': '每日番茄目标',
	'settings.daily-goal.desc': '每天计划完成的工作会话数（0 = 关闭）',
	'settings.week-start.name': '周起始日',
	'settings.week-start.desc':
		'选择每周从哪天开始。选择"跟随语言环境"则使用 moment.js 的语言默认值',
	'settings.week-start.locale': '跟随语言环境（{day}）',
	// 设置 — 番茄钟文件
	'settings.files.name': '任务文件',
	'settings.files.desc':
		'参与番茄钟任务追踪的 md 文件。激活文件在面板下拉框中选择。',
	'settings.files.add': '添加文件…',
	'settings.files.remove': '移除',
	'settings.files.empty': '尚未添加文件',

	// 设置 — 记录文件
	'settings.records-file.name': '记录文件',
	'settings.records-file.desc':
		'将会话记录存入一个 md 文件（%% miyu:records 代码块）而不是 data.json。文件可读可编辑；损坏的内容会保留为 miyu:error-records 块。留空则使用 data.json。',
	'settings.records-file.select': '选择文件…',
	'settings.records-file.unset': '未设置 — 存储于 data.json',

	// 命令名称
	'command.generate-random-note': '生成随机名称笔记',
	'command.toggle-timer': '切换番茄钟',
	'command.toggle-timer-panel': '切换番茄钟面板',
	'command.reset-timer': '重置番茄钟',
	'command.toggle-mode': '切换番茄钟模式',

	// 侧边栏图标
	'ribbon.toggle-timer-panel': '切换番茄钟面板',

	// 番茄钟视图
	'view.timer.title': '番茄钟',

	// 番茄钟模式
	'mode.work': '工作',
	'mode.break': '休息',

	// 番茄钟面板
	'panel.tasks': '任务',
	'panel.start': '开始',
	'panel.pause': '暂停',
	'panel.reset': '重置',
	'panel.settings': '设置',
	'panel.stats': '统计',
	'panel.settings.sound': '通知音效',
	'panel.settings.daily-goal': '每日目标',
	'panel.select-file': '选择文件…',
	'panel.select-file-empty': '未添加文件',
	'panel.open-source': '打开源文件',
	'panel.no-file': '未选择文件',
	'panel.file-missing': '文件不存在',
	'panel.no-tasks': '没有任务',
	'panel.tasks-count': '{count} 个任务',
	'panel.search': '搜索...',
	'panel.filter.all': '全部',
	'panel.filter.todo': '待办',
	'panel.filter.completed': '已完成',
	'panel.filter.prev': '上一个过滤条件',
	'panel.filter.next': '下一个过滤条件',
	'panel.open-task': '打开',
	'panel.complete-task': '完成',
	'panel.uncomplete-task': '取消完成',

	// 统计面板
	'stats.today': '本日',
	'stats.week': '本周',
	'stats.month': '本月',
	'stats.total': '总计',
	'stats.prev-week': '上一周',
	'stats.next-week': '下一周',
	'stats.year-today': '至今',
	'stats.prev-year': '上一年',
	'stats.next-year': '下一年',
	'stats.less': '少',
	'stats.more': '多',
	'stats.weekday.0': '日',
	'stats.weekday.1': '一',
	'stats.weekday.2': '二',
	'stats.weekday.3': '三',
	'stats.weekday.4': '四',
	'stats.weekday.5': '五',
	'stats.weekday.6': '六',
	'stats.day-total': '{count} 个番茄',
	'stats.empty': '暂无记录',
	'stats.no-task': '（无任务）',

	// 状态栏菜单
	'statusbar.start': '开始',
	'statusbar.pause': '暂停',
	'statusbar.resume': '继续',
	'statusbar.reset': '重置',
	'statusbar.switch-mode': '切换到{mode}',
	'statusbar.autostart': '自动开始',
	'statusbar.sound': '声音',

	// 通知
	'notice.note-opened': '已打开新笔记：{name}',
	'notice.timer-reset': '计时器已重置',
	'notice.timer-mode': '计时器模式：{mode}',
	'notice.pomodoro.title': '番茄钟',
	'notice.pomodoro.work': '🍅 你已连续工作 {duration} 分钟。',
	'notice.pomodoro.break': '🥤 你已休息 {duration} 分钟。',
	'notice.records-corrupted':
		'记录文件格式已损坏。原始内容已保留为 {marker} 块，记录已重置。',
	'notice.records-write-failed':
		'记录文件写入失败，记录暂时保存在内存中。',

	// 错误
	'error.create-failed': '创建随机笔记失败：{error}',
	'error.max-retries': '尝试 3 次后仍无法生成唯一文件名。',
	'error.no-charset': '必须至少启用一种字符集。',
};
