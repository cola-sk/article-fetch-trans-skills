import { NextRequest, NextResponse } from "next/server"
import type { TranslationResult } from "@/lib/types"

// This API route prepares the data for Notion page creation
// The actual Notion MCP integration will be triggered by the client
// when users click "发布到 Notion" button

export async function POST(request: NextRequest) {
  try {
    const translation: TranslationResult = await request.json()
    
    if (!translation || !translation.originalTweet || !translation.translatedText) {
      return NextResponse.json(
        { error: "无效的翻译数据" },
        { status: 400 }
      )
    }
    
    const { originalTweet, translatedText, translatedAt } = translation
    const author = originalTweet.author
    
    // Format date
    const tweetDate = new Date(originalTweet.created_at).toLocaleString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    
    // Build content sections in Markdown
    let content = `## 原文\n\n`
    content += `> ${originalTweet.text.replace(/\n/g, "\n> ")}\n\n`
    content += `**作者**: [@${author.screen_name}](https://x.com/${author.screen_name}) (${author.name})\n`
    content += `**发布时间**: ${tweetDate}\n`
    content += `**原文链接**: [查看原推](${originalTweet.url})\n\n`
    
    content += `---\n\n`
    content += `## 中文翻译\n\n`
    content += `${translatedText}\n\n`
    
    // Add media section if present
    if (originalTweet.media && originalTweet.media.length > 0) {
      content += `---\n\n`
      content += `## 媒体附件\n\n`
      
      originalTweet.media.forEach((media, index) => {
        if (media.type === "photo") {
          content += `![图片 ${index + 1}](${media.url})\n\n`
        } else if (media.type === "video") {
          content += `[视频链接](${media.url})\n\n`
          if (media.preview_image_url) {
            content += `![视频预览](${media.preview_image_url})\n\n`
          }
        }
      })
    }
    
    // Add stats
    content += `---\n\n`
    content += `**互动数据**: `
    const stats = []
    if (originalTweet.favorite_count !== undefined) {
      stats.push(`${originalTweet.favorite_count} 点赞`)
    }
    if (originalTweet.retweet_count !== undefined) {
      stats.push(`${originalTweet.retweet_count} 转发`)
    }
    if (originalTweet.reply_count !== undefined) {
      stats.push(`${originalTweet.reply_count} 回复`)
    }
    content += stats.join(" · ") || "无"
    content += `\n\n`
    content += `**翻译时间**: ${new Date(translatedAt).toLocaleString("zh-CN")}\n`
    
    // Generate a title (truncate if too long)
    const titleText = originalTweet.text.slice(0, 50)
    const title = `[翻译] @${author.screen_name}: ${titleText}${originalTweet.text.length > 50 ? "..." : ""}`
    
    // Return the prepared page data
    // The client will use this to create the Notion page via MCP
    return NextResponse.json({
      success: true,
      pageData: {
        title,
        content,
        icon: "📝",
        properties: {
          title,
        },
      },
      // For demo purposes, return a placeholder URL
      // In production, this would be the actual Notion page URL
      url: `https://notion.so/Tweet-Translation-${translation.id}`,
      pageId: translation.id,
    })
  } catch (error) {
    console.error("Error preparing Notion page:", error)
    return NextResponse.json(
      { error: "准备 Notion 页面失败" },
      { status: 500 }
    )
  }
}
