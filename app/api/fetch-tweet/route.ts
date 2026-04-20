import { NextRequest, NextResponse } from "next/server"
import { getTweet } from "react-tweet/api"
import type { TweetData, TweetMedia } from "@/lib/types"

function extractTweetId(url: string): string | null {
  // Support various Twitter/X URL formats
  const patterns = [
    /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/,
    /^(\d+)$/,
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      )
    }
    
    const tweetId = extractTweetId(url)
    
    if (!tweetId) {
      return NextResponse.json(
        { error: "Invalid Twitter/X URL" },
        { status: 400 }
      )
    }
    
    const tweet = await getTweet(tweetId)
    
    if (!tweet) {
      return NextResponse.json(
        { error: "Tweet not found" },
        { status: 404 }
      )
    }
    
    // Extract media from tweet
    const media: TweetMedia[] = []
    
    if (tweet.photos) {
      tweet.photos.forEach((photo) => {
        media.push({
          type: "photo",
          url: photo.url,
          width: photo.width,
          height: photo.height,
        })
      })
    }
    
    if (tweet.video) {
      const variant = tweet.video.variants
        .filter((v) => v.type === "video/mp4")
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0]
      
      if (variant) {
        media.push({
          type: "video",
          url: variant.src,
          preview_image_url: tweet.video.poster,
        })
      }
    }
    
    const tweetData: TweetData = {
      id: tweet.id_str,
      text: tweet.text,
      created_at: tweet.created_at,
      author: {
        name: tweet.user.name,
        screen_name: tweet.user.screen_name,
        profile_image_url: tweet.user.profile_image_url_https.replace("_normal", "_400x400"),
        verified: tweet.user.verified || tweet.user.is_blue_verified,
      },
      media: media.length > 0 ? media : undefined,
      url: `https://x.com/${tweet.user.screen_name}/status/${tweet.id_str}`,
      favorite_count: tweet.favorite_count,
      retweet_count: tweet.retweet_count,
      reply_count: tweet.reply_count,
    }
    
    return NextResponse.json(tweetData)
  } catch (error) {
    console.error("Error fetching tweet:", error)
    return NextResponse.json(
      { error: "Failed to fetch tweet" },
      { status: 500 }
    )
  }
}
