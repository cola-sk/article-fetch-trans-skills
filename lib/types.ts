export interface TweetMedia {
  type: "photo" | "video" | "animated_gif"
  url: string
  preview_image_url?: string
  width?: number
  height?: number
}

export interface TweetAuthor {
  name: string
  screen_name: string
  profile_image_url: string
  verified?: boolean
}

export interface TweetData {
  id: string
  text: string
  created_at: string
  author: TweetAuthor
  media?: TweetMedia[]
  url: string
  favorite_count?: number
  retweet_count?: number
  reply_count?: number
  // Article specific fields
  isArticle?: boolean
  articleTitle?: string
  articleContent?: string // Full article content in HTML or plain text
}

export interface TranslationResult {
  id: string
  originalTweet: TweetData
  translatedText: string
  translatedAt: string
  notionPageId?: string
  notionPageUrl?: string
}

export interface TranslationHistory {
  items: TranslationResult[]
}
