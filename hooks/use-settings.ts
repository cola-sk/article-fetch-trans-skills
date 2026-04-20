"use client"

import { useState, useEffect, useCallback } from "react"

export interface Settings {
  aiBaseUrl: string
  aiModel: string
  aiApiKey: string
  // Chrome CDP settings for fetching content requiring authentication
  chromeDebugUrl: string
  useChromeForArticles: boolean
}

const STORAGE_KEY = "twitter-translator-settings"

const defaultSettings: Settings = {
  aiBaseUrl: "http://localhost:11434/v1",
  aiModel: "qwen2.5:7b",
  aiApiKey: "",
  chromeDebugUrl: "http://localhost:9222",
  useChromeForArticles: true,
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load settings from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setSettings({ ...defaultSettings, ...parsed })
      }
    } catch (error) {
      console.error("Failed to load settings:", error)
    }
    setIsLoaded(true)
  }, [])

  // Save settings
  const saveSettings = useCallback((newSettings: Partial<Settings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (error) {
        console.error("Failed to save settings:", error)
      }
      return updated
    })
  }, [])

  // Reset settings to default
  const resetSettings = useCallback(() => {
    setSettings(defaultSettings)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return {
    settings,
    isLoaded,
    saveSettings,
    resetSettings,
  }
}
