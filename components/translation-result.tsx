"use client"

import { useState } from "react"
import Image from "next/image"
import { Copy, Check, FileText, ExternalLink, Loader2 } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { TweetData } from "@/lib/types"

interface TranslationResultProps {
  tweet: TweetData
  translatedText: string
  onPublishToNotion: () => Promise<{ success: boolean; url?: string }>
  notionUrl?: string
  className?: string
}

export function TranslationResult({
  tweet,
  translatedText,
  onPublishToNotion,
  notionUrl,
  className,
}: TranslationResultProps) {
  const [copied, setCopied] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishedUrl, setPublishedUrl] = useState(notionUrl)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(translatedText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePublish = async () => {
    setIsPublishing(true)
    try {
      const result = await onPublishToNotion()
      if (result.success && result.url) {
        setPublishedUrl(result.url)
      }
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="size-5" />
          中文翻译
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="whitespace-pre-wrap text-pretty leading-relaxed">
          {translatedText}
        </p>
        
        {/* Show media in translation view too */}
        {tweet.media && tweet.media.length > 0 && (
          <div className="mt-4 grid gap-2">
            {tweet.media.map((media, index) => (
              <div key={index} className="overflow-hidden rounded-lg">
                {media.type === "photo" ? (
                  <Image
                    src={media.url}
                    alt={`图片 ${index + 1}`}
                    width={media.width || 600}
                    height={media.height || 400}
                    className="w-full h-auto object-cover"
                    crossOrigin="anonymous"
                  />
                ) : media.type === "video" ? (
                  <video
                    src={media.url}
                    poster={media.preview_image_url}
                    controls
                    className="w-full h-auto"
                    crossOrigin="anonymous"
                  />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t pt-3 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="gap-1.5"
        >
          {copied ? (
            <>
              <Check className="size-4" />
              已复制
            </>
          ) : (
            <>
              <Copy className="size-4" />
              复制翻译
            </>
          )}
        </Button>
        
        {publishedUrl ? (
          <Button
            variant="outline"
            size="sm"
            asChild
            className="gap-1.5"
          >
            <a href={publishedUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              在 Notion 中查看
            </a>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handlePublish}
            disabled={isPublishing}
            className="gap-1.5"
          >
            {isPublishing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                发布中...
              </>
            ) : (
              <>
                <FileText className="size-4" />
                发布到 Notion
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
