"use client"

import { TweetTranslator } from "@/components/tweet-translator"
import type { TranslationResult } from "@/lib/types"

interface PublishToNotionParams {
  translation: TranslationResult
}

export default function Home() {
  const handlePublishToNotion = async ({ translation }: PublishToNotionParams) => {
    try {
      // Create page using Notion API route
      const response = await fetch("/api/create-notion-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(translation),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "发布到 Notion 失败")
      }

      return {
        success: true,
        url: result.url,
        pageId: result.pageId,
      }
    } catch (error) {
      console.error("Publish to Notion error:", error)
      return { success: false }
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <TweetTranslator onPublishToNotion={handlePublishToNotion} />
    </main>
  )
}
