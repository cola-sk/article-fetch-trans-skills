import { NextRequest, NextResponse } from "next/server"
import { getTweet } from "react-tweet/api"
import type { TweetData, TweetMedia } from "@/lib/types"

interface UrlParseResult {
  type: "tweet" | "article"
  id: string
  username?: string
}

function parseTwitterUrl(url: string): UrlParseResult | null {
  // Support article URLs: x.com/username/article/id
  const articlePattern = /(?:twitter\.com|x\.com)\/(\w+)\/article\/(\d+)/
  const articleMatch = url.match(articlePattern)
  if (articleMatch) {
    return {
      type: "article",
      username: articleMatch[1],
      id: articleMatch[2],
    }
  }

  // Support tweet/status URLs: x.com/username/status/id
  const tweetPatterns = [
    /(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/,
    /^(\d+)$/,
  ]

  for (const pattern of tweetPatterns) {
    const match = url.match(pattern)
    if (match) {
      return {
        type: "tweet",
        username: match[1] !== match[0] ? match[1] : undefined,
        id: match.length > 2 ? match[2] : match[1],
      }
    }
  }

  return null
}

async function fetchArticleContent(url: string, username: string, articleId: string): Promise<TweetData> {
  // Try to fetch via multiple methods
  
  // Method 1: Try xtomd.com API (if available)
  // Method 2: Fetch the page directly and parse
  // Method 3: Use a web scraping approach
  
  const fullUrl = `https://x.com/${username}/article/${articleId}`
  
  try {
    // Try to get the Open Graph data and page content
    const response = await fetch(fullUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch article: ${response.status}`)
    }
    
    const html = await response.text()
    
    // Extract meta tags for basic info
    const ogTitle = html.match(/<meta\s+(?:property|name)="og:title"\s+content="([^"]+)"/)?.[1] ||
                   html.match(/<meta\s+content="([^"]+)"\s+(?:property|name)="og:title"/)?.[1] ||
                   "X Article"
    
    const ogDescription = html.match(/<meta\s+(?:property|name)="og:description"\s+content="([^"]+)"/)?.[1] ||
                         html.match(/<meta\s+content="([^"]+)"\s+(?:property|name)="og:description"/)?.[1] ||
                         ""
    
    const ogImage = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/)?.[1] ||
                   html.match(/<meta\s+content="([^"]+)"\s+(?:property|name)="og:image"/)?.[1]
    
    // Try to extract the author name from page
    const authorName = html.match(/<meta\s+(?:property|name)="author"\s+content="([^"]+)"/)?.[1] ||
                      html.match(/<a[^>]*>@(\w+)<\/a>/)?.[1] ||
                      username
    
    // Try to extract article content from the page
    // Look for article content in various places
    let articleContent = ""
    
    // Try to find JSON-LD data
    const jsonLdMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)
    if (jsonLdMatch) {
      for (const match of jsonLdMatch) {
        try {
          const jsonContent = match.replace(/<script[^>]*>|<\/script>/gi, "")
          const jsonData = JSON.parse(jsonContent)
          if (jsonData.articleBody) {
            articleContent = jsonData.articleBody
            break
          }
          if (jsonData["@graph"]) {
            for (const item of jsonData["@graph"]) {
              if (item.articleBody) {
                articleContent = item.articleBody
                break
              }
            }
          }
        } catch {
          // Continue to next match
        }
      }
    }
    
    // If no JSON-LD, try to extract from meta description or visible content
    if (!articleContent) {
      // Try Twitter cards
      const twitterDescription = html.match(/<meta\s+(?:property|name)="twitter:description"\s+content="([^"]+)"/)?.[1] ||
                                html.match(/<meta\s+content="([^"]+)"\s+(?:property|name)="twitter:description"/)?.[1]
      
      articleContent = twitterDescription || ogDescription || ""
    }
    
    // Extract images from the article
    const media: TweetMedia[] = []
    if (ogImage) {
      media.push({
        type: "photo",
        url: ogImage,
      })
    }
    
    // Also look for additional images in the content
    const imageMatches = html.matchAll(/<img[^>]+src="(https:\/\/pbs\.twimg\.com\/[^"]+)"/gi)
    for (const match of imageMatches) {
      if (!media.some(m => m.url === match[1])) {
        media.push({
          type: "photo",
          url: match[1],
        })
      }
    }
    
    // Decode HTML entities
    const decodeHtml = (text: string) => {
      return text
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
    }
    
    const decodedTitle = decodeHtml(ogTitle)
    const decodedContent = decodeHtml(articleContent)
    
    return {
      id: articleId,
      text: decodedContent || `${decodedTitle}\n\n[Article content could not be fully extracted. Please visit the original URL for full content.]`,
      created_at: new Date().toISOString(),
      author: {
        name: authorName,
        screen_name: username,
        profile_image_url: `https://unavatar.io/twitter/${username}`,
        verified: false,
      },
      media: media.length > 0 ? media : undefined,
      url: fullUrl,
      isArticle: true,
      articleTitle: decodedTitle,
      articleContent: decodedContent,
    }
  } catch (error) {
    console.error("Error fetching article:", error)
    
    // Return minimal data
    return {
      id: articleId,
      text: `[Unable to fetch article content. The article may require authentication or is not publicly accessible.]\n\nOriginal URL: ${fullUrl}`,
      created_at: new Date().toISOString(),
      author: {
        name: username,
        screen_name: username,
        profile_image_url: `https://unavatar.io/twitter/${username}`,
        verified: false,
      },
      url: fullUrl,
      isArticle: true,
      articleTitle: "X Article",
    }
  }
}

async function fetchTweetContent(tweetId: string): Promise<TweetData> {
  const tweet = await getTweet(tweetId)

  if (!tweet) {
    throw new Error("Tweet not found")
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

  return {
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
    isArticle: false,
  }
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

    const parsed = parseTwitterUrl(url)

    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid Twitter/X URL. Supported formats: x.com/user/status/id or x.com/user/article/id" },
        { status: 400 }
      )
    }

    let tweetData: TweetData

    if (parsed.type === "article") {
      tweetData = await fetchArticleContent(url, parsed.username!, parsed.id)
    } else {
      tweetData = await fetchTweetContent(parsed.id)
    }

    return NextResponse.json(tweetData)
  } catch (error) {
    console.error("Error fetching content:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch content" },
      { status: 500 }
    )
  }
}
