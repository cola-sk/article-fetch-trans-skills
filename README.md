# article-fetch-trans-skill

本仓库为一个本地文章抓取与翻译 Skill，目标是从指定文章页面提取正文并生成中文 Markdown 文件。

## 核心功能

- 抓取任意文章页面的 HTML 内容
- 优先提取 `<article>`、`<main>` 或常见文章内容区块
- 将 HTML 转换为 Markdown 友好的文本结构
- 调用本地 OpenAI 兼容接口进行中译中生成
- 默认输出为 `translated_articles/` 目录下的 Markdown 文件

## 目录说明

- `scripts/translate-article-skill.mjs`：核心运行脚本
- `SKILL.md`：本地 Skill 的说明与输入输出规范
- `translated_articles/`：默认翻译结果存放目录（执行后自动创建）

## 快速使用

```bash
node scripts/translate-article-skill.mjs <article-url>
```

示例：

```bash
node scripts/translate-article-skill.mjs https://x.com/akshay_pachaar/article/2041146899319971922
```

## 参数说明

```bash
node scripts/translate-article-skill.mjs <article-url> [outputFileName] [--baseUrl=http://localhost:3001/v1] [--model=gpt-5-mini]
```

- `article-url`：要抓取的文章页面地址
- `outputFileName`：可选输出文件名，若不指定则根据文章标题自动生成
- `--baseUrl`：本地 OpenAI 兼容服务地址，默认 `http://localhost:3001/v1`
- `--model`：调用的模型名，默认 `gpt-5-mini`

## 输出结果

- 默认保存到 `translated_articles/` 目录
- 文件名由文章标题生成，包含 `.md` 后缀
- 输出内容为纯 Markdown，不带额外说明文本

## 本地 Skill 安装（可选）

如果你使用 `skills` CLI，可以将当前仓库作为本地 Skill 安装：

```bash
cd article-fetch-trans-skill
npx skills add . -g -y
```

也可以从 Git 仓库直接安装：

```bash
npx skills add git@github.com:cola-sk/article-fetch-trans-skills.git -g -y
```

安装完成后，可通过 Skill 运行或直接执行脚本。

## 依赖说明

- Node.js 18+
- 本地 OpenAI 兼容服务（例如 `http://localhost:3001/v1`）
- 必须安装 `browser-harness`：https://github.com/browser-use/browser-harness
- 可选：`playwright`，用于更可靠的浏览器渲染抓取

## 工作流程

1. 获取文章页面 HTML
2. 优先提取 `<article>` 内容
3. 处理 HTML 为 Markdown 友好文本
4. 调用本地 OpenAI 兼容接口翻译成中文
5. 写入 `translated_articles/` 目录

## 常见问题

- 如果页面内容未提取成功，请检查目标页面是否由前端渲染并确认已安装 `browser-harness`，也可搭配 `playwright` 使用
- 翻译失败时，请确认 `--baseUrl` 指向可用的本地服务
- 输出文件名若包含非法字符，会被自动清理为合法文件名

## 贡献与扩展

欢迎在 `scripts/translate-article-skill.mjs` 中扩展：

- 支持更多 HTML 内容提取策略
- 增加 `--skipTranslate` 选项，仅导出提取后的 Markdown
- 兼容更多 OpenAI API 版本或本地模型服务
