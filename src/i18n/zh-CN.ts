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

	// 命令名称
	'command.generate-random-note': '生成随机名称笔记',

	// 通知
	'notice.note-opened': '已打开新笔记：{name}',
	'error.create-failed': '创建随机笔记失败：{error}',
	'error.max-retries': '尝试 3 次后仍无法生成唯一文件名。',
	'error.no-charset': '必须至少启用一种字符集。',
};
