# x-blog-trans

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_WftW79wWDBiw85KCWPb3Ta2W9Cjt)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Agent Mode: Chrome Skill To Markdown

如果你不想走 Web API，可以直接在本地用 agent + chrome-cdp-skill：

1. 安装技能（已安装可跳过）

```bash
npx skills add pasky/chrome-cdp-skill -g -y
```

2. 在 Chrome 打开 `chrome://inspect/#remote-debugging` 并开启开关
3. 打开任意一个 x.com 页面，首次执行命令时在 Chrome 弹窗点击一次 `Allow debugging`
4. 执行：

```bash
pnpm agent:article "https://x.com/<user>/article/<id>"
```

可选参数：

```bash
pnpm agent:article "https://x.com/<user>/article/<id>" out/my-article.md --target 77134FAF
pnpm agent:article "https://x.com/<user>/article/<id>" --skip-translate
pnpm agent:article "https://x.com/<user>/article/<id>" --baseUrl http://localhost:11434/v1 --model qwen2.5:7b
```

默认输出到 `exports/*.md`。

## 本地 Agent Skill

已在 `scripts/` 目录下新增本地 agent skill：`scripts/translate-article-skill.mjs`，并提供根目录级别的技能规范 `SKILL.md`。

### 安装 Skill

如果你使用 `skills` CLI，可以通过 `npx` 安装本地技能：

```bash
cd /Users/liuzhe.x/coding/x-blog-trans
npx skills add . -g -y
```

如果你希望直接从 Git 仓库安装，请使用你提供的仓库地址：

```bash
npx skills add git@github.com:cola-sk/article-fetch-trans-skills.git -g -y
```

### 运行 Skill

安装后，可直接运行脚本方式使用：

```bash
node scripts/translate-article-skill.mjs https://x.com/akshay_pachaar/article/2041146899319971922
```

该技能会使用浏览器自动化（若安装了 Playwright / browser-use skill）获取文章内容，并调用本地 OpenAI 兼容接口（默认 `http://localhost:3001/v1`）进行翻译。翻译结果默认保存到 `translated_articles/` 目录，文件名根据文章标题生成。

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.

<a href="https://v0.app/chat/api/kiro/clone/cola-sk/x-blog-trans" alt="Open in Kiro"><img src="https://pdgvvgmkdvyeydso.public.blob.vercel-storage.com/open%20in%20kiro.svg?sanitize=true" /></a>
