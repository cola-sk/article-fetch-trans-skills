---
name: article-fetch-trans-skills
description: Extract an arbitrary article URL and translate it into Chinese Markdown using a local OpenAI-compatible service.
---

# Article-to-Markdown Skill

## 目标

将任意文章地址的内容抓取并翻译成中文 Markdown 文件。该技能通过本地 OpenAI 兼容服务完成翻译，并保存到指定输出文件。

## 输入

- `articleUrl`: 任意文章页面 URL
- `outputPath`（可选）：输出 Markdown 文件路径，默认 `translated-article.md`
- `baseUrl`（可选）：本地 OpenAI 服务地址，默认 `http://localhost:3001/v1`
- `model`（可选）：使用模型，默认 `gpt-5-mini`

## 输出

- 生成一个包含文章标题、元信息和翻译后内容的 Markdown 文件。
- 默认保存到项目根目录下的 `translated_articles/` 目录，文件名由文章标题自动生成。
- 必须配合 `browser-harness` 使用，以支持客户端渲染页面的抓取。

## 工作流程

1. 使用浏览器内容抓取（必须 `browser-harness`）获取页面 HTML。
2. 优先提取 `<article>` 内容；若无则回退到 `<main>`、常见内容区块或整体页面文本。
3. 清理 HTML、保持标题、列表、段落结构，并生成 Markdown 友好的文本。
4. 调用本地 OpenAI 兼容接口 `/chat/completions` 进行翻译。
5. 将结果写入输出 Markdown 文件。

## 决策点

- 如果页面中存在 `<article>` 标签，则优先使用该区域。
- 如果没有 `<article>`，则尝试从 `<main>` 或类名/ID 中包含 `article`, `post`, `content`, `blog` 的节点提取。
- 如果仍未获取到可用内容，则回退到页面主体文本。
- 翻译失败时，返回错误并显示完整服务响应摘要。

## 完成标准

- 成功生成文件 `translated-article.md` 或用户指定输出路径。
- 文件内容包含文章标题、基本元信息以及完整的中文翻译文本。
- 输出为 Markdown 格式，不包含额外的说明性文字。

## 使用示例

```bash
node scripts/translate-article-skill.mjs https://x.com/akshay_pachaar/article/2041146899319971922
```

```bash
node scripts/translate-article-skill.mjs https://example.com/blog/post/123 --model=gpt-5-mini
```

输出文件将默认写入 `translated_articles/`，文件名基于文章标题自动生成。

## 自定义扩展

- 增加 `--skipTranslate`，仅输出提取的纯 Markdown 文本。
- 兼容更多本地模型端点，如 `/responses` 或其他 OpenAI API 版本。
- 添加浏览器渲染抓取，以支持客户端 JS 渲染的文章页面。
