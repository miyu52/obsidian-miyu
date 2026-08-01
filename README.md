# Miyu

个人 Obsidian 工具集，为自己的工作流定制。

## 功能

### 随机文件名

生成随机文件名的笔记，适合草稿、速记、不想想名字的时候。

- **命令：** `生成随机名称笔记`（`generate-random-note`）
- 创建空 `.md` 文件并以随机名称打开
- 可配置字符集：大写字母、小写字母、数字、符号
- 长度可调（1–64 字符）
- 文件名冲突自动重试（最多 3 次）

### 国际化

可在设置中切换界面语言，目前支持：

| 语言 | 代码 |
|------|------|
| 简体中文 | `zh-CN` |
| English | `en` |

切换语言后，命令名称、通知和设置界面即时生效。

## 设置

| 设置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| 语言 | 下拉 | 简体中文 | 界面语言 |
| 长度 | 滑块 1–64 | 8 | 随机字符串字符数 |
| 大写字母 | 开关 | 开 | 包含 A–Z |
| 小写字母 | 开关 | 关 | 包含 a–z |
| 数字 | 开关 | 开 | 包含 0–9 |
| 符号 | 开关 | 关 | 包含 `!@#$%^&()-_[]{}+=` |

## 安装

### 源码安装

```bash
git clone https://github.com/miyu52/obsidian-miyu.git
cd obsidian-miyu
npm install
npm run build
```

将 `main.js`、`manifest.json`、`styles.css` 复制到仓库的 `.obsidian/plugins/obsidian-miyu/`。

### Obsidian 社区插件

_暂未上架。_

## 开发

```bash
npm install      # 安装依赖
npm run dev      # 监听模式
npm run build    # 生产构建（类型检查 + 压缩）
npm run lint     # 代码检查
```

需要 Node.js ≥18，Obsidian ≥1.7.2。

## 许可

0-BSD
