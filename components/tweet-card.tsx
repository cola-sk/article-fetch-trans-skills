"use client"

import Image from "next/image"
import { ExternalLink, Heart, MessageCircle, Repeat2, BadgeCheck } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import type { TweetData } from "@/lib/types"

interface TweetCardProps {
  tweet: TweetData
  className?: string
}

export function TweetCard({ tweet, className }: TweetCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatCount = (count?: number) => {
    if (count === undefined) return "0"
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Image
            src={tweet.author.profile_image_url}
            alt={tweet.author.name}
            width={48}
            height={48}
            className="rounded-full"
            crossOrigin="anonymous"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-semibold truncate">{tweet.author.name}</span>
              {tweet.author.verified && (
                <BadgeCheck className="size-4 text-blue-500 flex-shrink-0" />
              )}
            </div>
            <span className="text-muted-foreground text-sm">
              @{tweet.author.screen_name}
            </span>
          </div>
          <a
            href={tweet.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="size-4" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="whitespace-pre-wrap text-pretty leading-relaxed">{tweet.text}</p>
        
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
        
        <p className="text-muted-foreground text-xs mt-4">
          {formatDate(tweet.created_at)}
        </p>
      </CardContent>
      <CardFooter className="border-t pt-3">
        <div className="flex items-center gap-6 text-muted-foreground text-sm">
          <div className="flex items-center gap-1.5">
            <MessageCircle className="size-4" />
            <span>{formatCount(tweet.reply_count)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Repeat2 className="size-4" />
            <span>{formatCount(tweet.retweet_count)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Heart className="size-4" />
            <span>{formatCount(tweet.favorite_count)}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
