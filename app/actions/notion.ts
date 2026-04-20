"use server"

interface PageData {
  title: string
  content: string
  icon: string
}

interface CreatePageResult {
  success: boolean
  url?: string
  pageId?: string
  error?: string
}

export async function createNotionPage(pageData: PageData): Promise<CreatePageResult> {
  // This action will be called from the client
  // The actual Notion page creation will be handled by the MCP tool
  // which is invoked separately through the v0 interface
  
  // For now, we return a message indicating the user should use the
  // "发布到 Notion" button which will trigger the MCP workflow
  
  return {
    success: false,
    error: "请使用 Notion MCP 工具发布页面。点击发布按钮后，将自动调用 Notion API 创建页面。",
  }
}

// Helper function to format the page content for Notion
export function formatNotionContent(
  originalText: string,
  translatedText: string,
  authorName: string,
  authorHandle: string,
  tweetUrl: string,
  tweetDate: string,
  mediaUrls: string[],
  stats: { likes?: number; retweets?: number; replies?: number }
): string {
  let content = `## 原文\n\n`
  content += `> ${originalText.replace(/\n/g, "\n> ")}\n\n`
  content += `**作者**: [@${authorHandle}](https://x.com/${authorHandle}) (${authorName})\n`
  content += `**发布时间**: ${tweetDate}\n`
  content += `**原文链接**: [查看原推](${tweetUrl})\n\n`
  
  content += `---\n\n`
  content += `## 中文翻译\n\n`
  content += `${translatedText}\n\n`
  
  if (mediaUrls.length > 0) {
    content += `---\n\n`
    content += `## 媒体附件\n\n`
    mediaUrls.forEach((url, index) => {
      content += `![图片 ${index + 1}](${url})\n\n`
    })
  }
  
  content += `---\n\n`
  content += `**互动数据**: `
  const statParts = []
  if (stats.likes !== undefined) statParts.push(`${stats.likes} 点赞`)
  if (stats.retweets !== undefined) statParts.push(`${stats.retweets} 转发`)
  if (stats.replies !== undefined) statParts.push(`${stats.replies} 回复`)
  content += statParts.join(" · ") || "无"
  
  return content
}
