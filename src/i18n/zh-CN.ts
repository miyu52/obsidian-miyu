/** Chinese (Simplified) locale strings for Miyu plugin. */
export const zhCN: Record<string, string> = {
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
	'settings.work-len.name': '工作时长',
	'settings.work-len.desc': '每个工作会话的分钟数',
	'settings.break-len.name': '休息时长',
	'settings.break-len.desc': '每次休息的分钟数（设为 0 则一直工作不休）',
	'settings.autostart.name': '自动开始下一会话',
	'settings.autostart.desc': '当前会话结束后自动开始下一会话',
	'settings.status-bar-timer.name': '启用状态栏计时器',
	'settings.status-bar-timer.desc':
		'在状态栏显示计时器（左键切换开始/暂停，右键打开菜单）',
	'settings.low-fps.name': '低动画帧率',
	'settings.low-fps.desc':
		'若遇到高 CPU 占用，可开启此选项降低动画帧率以节省 CPU 资源',

	// 设置 — 通知
	'settings.section.notification': '通知',
	'settings.system-notification.name': '使用系统通知',
	'settings.notification-sound.name': '声音通知',
	'settings.custom-sound.name': '自定义通知音效',
	'settings.custom-sound.desc': '库内音频文件的路径',
	'settings.custom-sound.placeholder': 'path/to/sound.mp3',
	'settings.custom-sound.play': '播放',

	// 设置 — 任务
	'settings.section.task': '任务',
	'settings.task-tracking.name': '启用任务追踪',
	'settings.task-tracking.desc':
		'注意：启用此功能后，激活任务时会自动为任务添加块 ID（除非已有块 ID）。',
	'settings.task-progress.name': '显示任务进度背景',
	'settings.task-format.name': '任务格式',
	'settings.task-format.tasks': '任务 Emoji 格式',
	'settings.task-format.dataview': 'Dataview',

	// 设置 — 日志
	'settings.section.log': '日志',
	'settings.log-file.name': '日志文件',
	'settings.log-file.none': '无',
	'settings.log-file.daily': '日记',
	'settings.log-file.weekly': '周记',
	'settings.log-file.file': '文件',
	'settings.log-path.name': '日志文件路径',
	'settings.log-path.desc': '用于记录番茄钟会话的文件',
	'settings.log-level.name': '日志级别',
	'settings.log-level.all': '全部',
	'settings.log-level.work': '工作',
	'settings.log-level.break': '休息',
	'settings.log-format.name': '日志格式',
	'settings.log-format.simple': '简单',
	'settings.log-format.verbose': '详细',
	'settings.log-format.custom': '自定义',
	'settings.log-template.name': '日志模板',
	'settings.log-template.placeholder': '<% templater 脚本写在这里 %>',
	'settings.templater.prefix': '需要启用 ',
	'settings.templater.link': 'Templater',
	'settings.templater.suffix': ' 插件，然后点击刷新按钮',
	'settings.templater.refresh': '刷新',
	'settings.restore-defaults': '恢复默认设置',

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
	'panel.settings.sound': '通知音效',
	'panel.settings.log-focused': '优先保存到任务文件',
	'panel.tasks-count': '{count} 个任务',
	'panel.search': '搜索...',
	'panel.filter.all': '全部',
	'panel.filter.todo': '待办',
	'panel.filter.completed': '已完成',
	'panel.open-task': '打开',

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
	'notice.invalid-template': '无效的模板',

	// 错误
	'error.create-failed': '创建随机笔记失败：{error}',
	'error.max-retries': '尝试 3 次后仍无法生成唯一文件名。',
	'error.no-charset': '必须至少启用一种字符集。',
};
