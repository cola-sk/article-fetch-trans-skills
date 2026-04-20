"use client"

import { useState, useEffect, useCallback } from "react"
import type { TranslationResult, TranslationHistory } from "@/lib/types"

const STORAGE_KEY = "twitter-translation-history"
const MAX_HISTORY_ITEMS = 50

export function useTranslationHistory() {
  const [history, setHistory] = useState<TranslationResult[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: TranslationHistory = JSON.parse(stored)
        setHistory(parsed.items || [])
      }
    } catch (error) {
      console.error("Failed to load translation history:", error)
    }
    setIsLoaded(true)
  }, [])

  // Save history to localStorage
  const saveHistory = useCallback((items: TranslationResult[]) => {
    try {
      const data: TranslationHistory = { items }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error("Failed to save translation history:", error)
    }
  }, [])

  // Add a new translation
  const addTranslation = useCallback((translation: TranslationResult) => {
    setHistory((prev) => {
      // Check if this tweet was already translated
      const existingIndex = prev.findIndex(
        (item) => item.originalTweet.id === translation.originalTweet.id
      )
      
      let newHistory: TranslationResult[]
      
      if (existingIndex >= 0) {
        // Update existing entry
        newHistory = [...prev]
        newHistory[existingIndex] = translation
      } else {
        // Add new entry at the beginning
        newHistory = [translation, ...prev]
      }
      
      // Limit history size
      if (newHistory.length > MAX_HISTORY_ITEMS) {
        newHistory = newHistory.slice(0, MAX_HISTORY_ITEMS)
      }
      
      saveHistory(newHistory)
      return newHistory
    })
  }, [saveHistory])

  // Update a translation (e.g., add Notion page info)
  const updateTranslation = useCallback((id: string, updates: Partial<TranslationResult>) => {
    setHistory((prev) => {
      const newHistory = prev.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
      saveHistory(newHistory)
      return newHistory
    })
  }, [saveHistory])

  // Remove a translation
  const removeTranslation = useCallback((id: string) => {
    setHistory((prev) => {
      const newHistory = prev.filter((item) => item.id !== id)
      saveHistory(newHistory)
      return newHistory
    })
  }, [saveHistory])

  // Clear all history
  const clearHistory = useCallback(() => {
    setHistory([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  // Get a specific translation
  const getTranslation = useCallback((tweetId: string) => {
    return history.find((item) => item.originalTweet.id === tweetId)
  }, [history])

  return {
    history,
    isLoaded,
    addTranslation,
    updateTranslation,
    removeTranslation,
    clearHistory,
    getTranslation,
  }
}
