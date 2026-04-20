import { NextRequest, NextResponse } from "next/server"
import type { TweetData, TweetMedia } from "@/lib/types"

interface CDPTarget {
  id: string
  type: string
  title: string
  url: string
  webSocketDebuggerUrl: string
}

interface CDPMessage {
  id: number
  method: string
  params?: Record<string, unknown>
}

interface CDPResponse {
  id: number
  result?: Record<string, unknown>
  error?: { code: number; message: string }
}

// Simple CDP client using fetch for HTTP commands and manual WebSocket for complex operations
async function fetchViaCDP(
  chromeDebugUrl: string,
  targetUrl: string
): Promise<{ html: string; images: string[] }> {
  // Get list of available targets
  const targetsResponse = await fetch(`${chromeDebugUrl}/json/list`)
  if (!targetsResponse.ok) {
    throw new Error(`Cannot connect to Chrome at ${chromeDebugUrl}. Make sure Chrome is running with --remote-debugging-port=9222`)
  }

  const targets: CDPTarget[] = await targetsResponse.json()

  // Find an existing page or create a new one
  let target = targets.find((t) => t.type === "page" && t.url !== "chrome://newtab/")

  if (!target) {
    // Create a new tab
    const newTabResponse = await fetch(`${chromeDebugUrl}/json/new?${encodeURIComponent(targetUrl)}`)
    if (!newTabResponse.ok) {
      throw new Error("Failed to create new Chrome tab")
    }
    target = await newTabResponse.json()
  }

  if (!target?.webSocketDebuggerUrl) {
    throw new Error("No debuggable target found")
  }

  // Use WebSocket to communicate with Chrome
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(target.webSocketDebuggerUrl)
    let messageId = 1
    const pendingMessages = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>()
    let html = ""
    const images: string[] = []

    const sendCommand = (method: string, params?: Record<string, unknown>): Promise<CDPResponse["result"]> => {
      return new Promise((res, rej) => {
        const id = messageId++
        pendingMessages.set(id, { resolve: res, reject: rej })
        const message: CDPMessage = { id, method, params }
        ws.send(JSON.stringify(message))
      })
    }

    ws.onopen = async () => {
      try {
        // Enable necessary domains
        await sendCommand("Page.enable")
        await sendCommand("Network.enable")
        await sendCommand("Runtime.enable")

        // Navigate to the target URL
        await sendCommand("Page.navigate", { url: targetUrl })

        // Wait for page to load
        await new Promise((r) => setTimeout(r, 5000))

        // Get the document
        const docResult = await sendCommand("DOM.getDocument", { depth: -1, pierce: true }) as { root?: { nodeId: number } }
        
        if (docResult?.root?.nodeId) {
          // Get outer HTML
          const htmlResult = await sendCommand("DOM.getOuterHTML", { nodeId: docResult.root.nodeId }) as { outerHTML?: string }
          html = htmlResult?.outerHTML || ""

          // Extract images from the DOM
          const imagesResult = await sendCommand("Runtime.evaluate", {
            expression: `Array.from(document.querySelectorAll('img')).map(img => img.src).filter(src => src && src.includes('twimg.com'))`,
            returnByValue: true,
          }) as { result?: { value?: string[] } }

          if (imagesResult?.result?.value) {
            images.push(...imagesResult.result.value)
          }

          // Also try to get article content directly
          const articleResult = await sendCommand("Runtime.evaluate", {
            expression: `
              (function() {
                // Try to find article content
                const article = document.querySelector('article') || document.querySelector('[data-testid="tweetText"]');
                if (article) return article.innerText;
                
                // Try to find main content area
                const main = document.querySelector('main');
                if (main) return main.innerText;
                
                return document.body.innerText;
              })()
            `,
            returnByValue: true,
          }) as { result?: { value?: string } }

          if (articleResult?.result?.value && articleResult.result.value.length > html.length / 10) {
            // If we got good text content, prefer it
            html = `<body>${articleResult.result.value}</body>`
          }
        }

        ws.close()
        resolve({ html, images })
      } catch (error) {
        ws.close()
        reject(error)
      }
    }

    ws.onmessage = (event) => {
      try {
        const response: CDPResponse = JSON.parse(event.data)
        if (response.id && pendingMessages.has(response.id)) {
          const handler = pendingMessages.get(response.id)!
          pendingMessages.delete(response.id)
          if (response.error) {
            handler.reject(new Error(response.error.message))
          } else {
            handler.resolve(response.result)
          }
        }
      } catch {
        // Ignore parse errors for events
      }
    }

    ws.onerror = (error) => {
      reject(new Error(`WebSocket error: ${error}`))
    }

    // Timeout after 30 seconds
    setTimeout(() => {
      ws.close()
      reject(new Error("Timeout waiting for page to load"))
    }, 30000)
  })
}

function parseArticleFromHtml(
  html: string,
  images: string[],
  url: string,
  username: string,
  articleId: string
): TweetData {
  // Extract title from various sources
  const titleMatch =
    html.match(/<title[^>]*>([^<]+)<\/title>/i) ||
    html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i) ||
    html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:title"/i)
  
  const title = titleMatch?.[1]?.replace(/\s*[|\-–—]\s*X.*$/i, "").trim() || "X Article"

  // Extract description/content
  const descMatch =
    html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i) ||
    html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:description"/i) ||
    html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)
  
  // Try to extract body text content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  let bodyText = ""
  
  if (bodyMatch) {
    // Remove script and style tags
    bodyText = bodyMatch[1]
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  }

  // Use the longest content we found
  let content = bodyText
  const desc = descMatch?.[1] || ""
  
  if (desc.length > content.length) {
    content = desc
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
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, "/")
  }

  const decodedTitle = decodeHtml(title)
  const decodedContent = decodeHtml(content)

  // Build media array from extracted images
  const media: TweetMedia[] = []
  const uniqueImages = [...new Set(images)]
  
  for (const imgUrl of uniqueImages) {
    if (imgUrl.includes("twimg.com") && !imgUrl.includes("profile_image")) {
      media.push({
        type: "photo",
        url: imgUrl,
      })
    }
  }

  // Also extract og:image
  const ogImageMatch =
    html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i) ||
    html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i)
  
  if (ogImageMatch?.[1] && !media.some((m) => m.url === ogImageMatch[1])) {
    media.unshift({
      type: "photo",
      url: ogImageMatch[1],
    })
  }

  return {
    id: articleId,
    text: decodedContent || `[Article content extracted via Chrome]\n\n${decodedTitle}`,
    created_at: new Date().toISOString(),
    author: {
      name: username,
      screen_name: username,
      profile_image_url: `https://unavatar.io/twitter/${username}`,
      verified: false,
    },
    media: media.length > 0 ? media : undefined,
    url,
    isArticle: true,
    articleTitle: decodedTitle,
    articleContent: decodedContent,
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url, chromeDebugUrl } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    if (!chromeDebugUrl) {
      return NextResponse.json(
        { error: "Chrome debug URL is required" },
        { status: 400 }
      )
    }

    // Parse the URL to get username and article ID
    const articlePattern = /(?:twitter\.com|x\.com)\/(\w+)\/article\/(\d+)/
    const match = url.match(articlePattern)

    if (!match) {
      return NextResponse.json(
        { error: "Invalid article URL format" },
        { status: 400 }
      )
    }

    const username = match[1]
    const articleId = match[2]

    // Fetch via Chrome
    const { html, images } = await fetchViaCDP(chromeDebugUrl, url)

    // Parse the HTML to extract article data
    const articleData = parseArticleFromHtml(html, images, url, username, articleId)

    return NextResponse.json(articleData)
  } catch (error) {
    console.error("Error fetching via Chrome:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch via Chrome",
        hint: "Make sure Chrome is running with: chrome --remote-debugging-port=9222",
      },
      { status: 500 }
    )
  }
}
