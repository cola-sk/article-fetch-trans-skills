#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'translated_articles');

const USAGE = `Usage: node ${path.basename(__filename)} <article url> [outputFileName] [--baseUrl=http://localhost:3001/v1] [--model=gpt-5-mini]\n\nExample:\n  node ${path.basename(__filename)} https://x.com/akshay_pachaar/article/2041146899319971922\n`;

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  process.stdout.write(USAGE);
  process.exit(0);
}

const url = args[0];
let outputFileName = args[1] && !args[1].startsWith('--') ? args[1] : '';
const options = {};
for (const arg of args.slice(1)) {
  if (arg.startsWith('--baseUrl=')) {
    options.baseUrl = arg.split('=')[1];
  }
  if (arg.startsWith('--model=')) {
    options.model = arg.split('=')[1];
  }
}

const DEFAULT_BASE_URL = 'http://localhost:3001/v1';
const DEFAULT_MODEL = 'gpt-5-mini';
const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
const model = options.model || DEFAULT_MODEL;

function sanitizeFileName(value) {
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, '_') || 'article';
}

function normalizeText(html) {
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, content) => `\n\n# ${stripHtmlTags(content)}\n\n`)
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, content) => `\n\n## ${stripHtmlTags(content)}\n\n`)
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, content) => `\n\n### ${stripHtmlTags(content)}\n\n`)
    .replace(/<\/?div[^>]*>/gi, '\n')
    .replace(/<\/?section[^>]*>/gi, '\n')
    .replace(/<\/?article[^>]*>/gi, '\n')
    .replace(/<\/?header[^>]*>/gi, '\n')
    .replace(/<\/?footer[^>]*>/gi, '\n');
  return stripHtmlTags(text);
}

function stripHtmlTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractHtmlContent(html) {
  const patterns = [
    /<article\b[^>]*>[\s\S]*?<\/article>/i,
    /<main\b[^>]*>[\s\S]*?<\/main>/i,
    /<(section|div)\b[^>]*(?:class|id)=["'][^"']*(?:article|post|content|blog|story|entry)[^"']*["'][^>]*>[\s\S]*?<\/\1>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return match[0];
    }
  }

  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch ? bodyMatch[1] : html;
}

function extractMeta(html) {
  const titleMatch = html.match(/<meta property=["']og:title["'] content=["']([^"']+)["']|<meta name=["']twitter:title["'] content=["']([^"']+)["']|<title>([^<]+)<\/title>/i);
  const authorMatch = html.match(/<meta property=["']article:author["'] content=["']([^"']+)["']|<meta name=["']author["'] content=["']([^"']+)["']/i);
  const descriptionMatch = html.match(/<meta name=["']description["'] content=["']([^"']+)["']|<meta property=["']og:description["'] content=["']([^"']+)["']/i);
  return {
    title: titleMatch?.[1] || titleMatch?.[2] || titleMatch?.[3] || '',
    author: authorMatch?.[1] || authorMatch?.[2] || '',
    description: descriptionMatch?.[1] || descriptionMatch?.[2] || '',
  };
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return await response.text();
}

async function fetchHtmlWithBrowser(url) {
  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    const html = await page.content();
    await browser.close();
    return html;
  } catch (error) {
    console.warn('Browser automation unavailable, falling back to network fetch:', error.message || error);
    return null;
  }
}

async function getArticleHtml(url) {
  const browserHtml = await fetchHtmlWithBrowser(url);
  if (browserHtml) {
    return browserHtml;
  }
  return await fetchHtml(url);
}

function buildMarkdown(html, url) {
  const { title, author, description } = extractMeta(html);
  const contentHtml = extractHtmlContent(html);
  const body = normalizeText(contentHtml);
  const headerLines = ['# ' + (title || url), ''];
  if (author) headerLines.push(`作者：${author}`, '');
  if (description) headerLines.push(description, '');
  headerLines.push('---', '');
  return headerLines.join('\n') + '\n' + body + '\n';
}

function getOutputFilePath(title) {
  const fileName = outputFileName || `${sanitizeFileName(title)}.md`;
  return path.join(OUTPUT_DIR, fileName);
}

async function translateMarkdown(markdown) {
  const payload = {
    model,
    messages: [
      { role: 'system', content: '你是一个精通中英文翻译的专业编辑。' },
      {
        role: 'user',
        content: `请将下面英文文章翻译成中文，并保留原有标题、一级/二级标题、列表和段落结构，输出为 Markdown 格式。仅返回 Markdown 内容，不要添加额外说明。\n\n${markdown}`,
      },
    ],
    max_tokens: 20000,
    temperature: 0.2,
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI provider error: ${response.status} ${response.statusText}\n${body}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.text;
  if (!content) {
    throw new Error(`No valid response from provider: ${JSON.stringify(data)}`);
  }
  return content;
}

async function main() {
  try {
    console.log(`Fetching article from ${url}...`);
    const html = await getArticleHtml(url);
    const { title } = extractMeta(html);
    const markdown = buildMarkdown(html, url);

    console.log('Translating to Chinese using', model, 'at', baseUrl);
    const translated = await translateMarkdown(markdown);

    const outputPath = getOutputFilePath(title || url);
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(outputPath, translated, 'utf-8');
    console.log(`Saved translated markdown to ${outputPath}`);
  } catch (error) {
    console.error('Error:', error.message || error);
    process.exit(1);
  }
}

main();
