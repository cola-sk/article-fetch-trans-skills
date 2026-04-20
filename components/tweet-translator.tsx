"use client"

import { useState, useCallback } from "react"
import { Search, Loader2, AlertCircle, Twitter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SettingsDialog } from "@/components/settings-dialog"
import { TweetCard } from "@/components/tweet-card"
import { TranslationResult } from "@/components/translation-result"
import { HistoryList } from "@/components/history-list"
import { useSettings } from "@/hooks/use-settings"
import { useTranslationHistory } from "@/hooks/use-translation-history"
import type { TweetData, TranslationResult as TranslationResultType } from "@/lib/types"

interface PublishToNotionParams {
  translation: TranslationResultType
}

interface TweetTranslatorProps {
  onPublishToNotion?: (params: PublishToNotionParams) => Promise<{ success: boolean; url?: string; pageId?: string }>
}

export function TweetTranslator({ onPublishToNotion }: TweetTranslatorProps) {
  const { settings, saveSettings, isLoaded: settingsLoaded } = useSettings()
  const {
    history,
    isLoaded: historyLoaded,
    addTranslation,
    updateTranslation,
    removeTranslation,
    clearHistory,
  } = useTranslationHistory()

  const [url, setUrl] = useState("")
  const [tweet, setTweet] = useState<TweetData | null>(null)
  const [translatedText, setTranslatedText] = useState<string | null>(null)
  const [currentTranslationId, setCurrentTranslationId] = useState<string | null>(null)
  const [notionUrl, setNotionUrl] = useState<string | undefined>(undefined)
  
  const [isFetching, setIsFetching] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTweet = useCallback(async () => {
    if (!url.trim()) {
      setError("请输入 Twitter/X 链接")
      return
    }

    setIsFetching(true)
    setError(null)
    setTweet(null)
    setTranslatedText(null)
    setNotionUrl(undefined)

    try {
      const response = await fetch("/api/fetch-tweet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "获取推文失败")
      }

      setTweet(data)
      
      // Auto-translate after fetching
      await translateTweet(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取推文失败")
    } finally {
      setIsFetching(false)
    }
  }, [url])

  const translateTweet = useCallback(async (tweetData: TweetData) => {
    if (!settings.aiBaseUrl) {
      setError("请先配置 AI API 地址")
      return
    }

    setIsTranslating(true)
    setError(null)

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: tweetData.text,
          baseUrl: settings.aiBaseUrl,
          model: settings.aiModel,
          apiKey: settings.aiApiKey,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "翻译失败")
      }

      setTranslatedText(data.translatedText)

      // Save to history
      const translationId = `${tweetData.id}-${Date.now()}`
      const translationResult: TranslationResultType = {
        id: translationId,
        originalTweet: tweetData,
        translatedText: data.translatedText,
        translatedAt: new Date().toISOString(),
      }
      addTranslation(translationResult)
      setCurrentTranslationId(translationId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "翻译失败")
    } finally {
      setIsTranslating(false)
    }
  }, [settings, addTranslation])

  const handlePublishToNotion = useCallback(async () => {
    if (!tweet || !translatedText || !currentTranslationId || !onPublishToNotion) {
      return { success: false }
    }

    const translation: TranslationResultType = {
      id: currentTranslationId,
      originalTweet: tweet,
      translatedText,
      translatedAt: new Date().toISOString(),
    }

    const result = await onPublishToNotion({ translation })
    
    if (result.success && result.url) {
      setNotionUrl(result.url)
      updateTranslation(currentTranslationId, {
        notionPageId: result.pageId,
        notionPageUrl: result.url,
      })
    }

    return result
  }, [tweet, translatedText, currentTranslationId, onPublishToNotion, updateTranslation])

  const handleSelectHistory = useCallback((item: TranslationResultType) => {
    setTweet(item.originalTweet)
    setTranslatedText(item.translatedText)
    setCurrentTranslationId(item.id)
    setNotionUrl(item.notionPageUrl)
    setUrl(item.originalTweet.url)
    setError(null)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isFetching && !isTranslating) {
      fetchTweet()
    }
  }

  if (!settingsLoaded || !historyLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Twitter className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">推文翻译器</h1>
            <p className="text-sm text-muted-foreground">
              输入 Twitter/X 链接，自动翻译成中文
            </p>
          </div>
        </div>
        <SettingsDialog settings={settings} onSave={saveSettings} />
      </div>

      {/* Input */}
      <div className="flex gap-2 mb-6">
        <Input
          placeholder="粘贴 Twitter/X 链接，例如: https://x.com/user/status/123456"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button
          onClick={fetchTweet}
          disabled={isFetching || isTranslating}
          className="gap-2"
        >
          {isFetching || isTranslating ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {isFetching ? "获取中..." : "翻译中..."}
            </>
          ) : (
            <>
              <Search className="size-4" />
              翻译
            </>
          )}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {tweet && (
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">原文</h2>
            <TweetCard tweet={tweet} />
          </div>
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">翻译</h2>
            {isTranslating ? (
              <div className="flex flex-col items-center justify-center h-[300px] border rounded-lg bg-muted/20">
                <Loader2 className="size-8 animate-spin text-muted-foreground mb-3" />
                <p className="text-muted-foreground">正在翻译...</p>
              </div>
            ) : translatedText ? (
              <TranslationResult
                tweet={tweet}
                translatedText={translatedText}
                onPublishToNotion={handlePublishToNotion}
                notionUrl={notionUrl}
              />
            ) : null}
          </div>
        </div>
      )}

      {/* History */}
      <HistoryList
        history={history}
        onSelect={handleSelectHistory}
        onRemove={removeTranslation}
        onClear={clearHistory}
      />
    </div>
  )
}
