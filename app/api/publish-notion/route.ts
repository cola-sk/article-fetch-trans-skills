import { NextRequest, NextResponse } from "next/server"
import type { TranslationResult } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    const translation: TranslationResult = await request.json()
    
    if (!translation || !translation.originalTweet || !translation.translatedText) {
      return NextResponse.json(
        { error: "Invalid translation data" },
        { status: 400 }
      )
    }
    
    // Build the page content in Markdown format
    const { originalTweet, translatedText } = translation
    const author = originalTweet.author
    
    // Format date
    const tweetDate = new Date(originalTweet.created_at).toLocaleString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    
    // Build content sections
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
    content += `**翻译时间**: ${new Date(translation.translatedAt).toLocaleString("zh-CN")}\n`
    
    // Return the prepared content for MCP to create
    // The actual Notion page creation will be done via the MCP tool
    return NextResponse.json({
      success: true,
      pageData: {
        title: `[翻译] @${author.screen_name}: ${originalTweet.text.slice(0, 50)}...`,
        content,
        icon: "📝",
      },
    })
  } catch (error) {
    console.error("Error preparing Notion page:", error)
    return NextResponse.json(
      { error: "Failed to prepare Notion page" },
      { status: 500 }
    )
  }
}
