"use client"

import { useState, useEffect } from "react"
import { Settings as SettingsIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Settings } from "@/hooks/use-settings"

interface SettingsDialogProps {
  settings: Settings
  onSave: (settings: Partial<Settings>) => void
}

export function SettingsDialog({ settings, onSave }: SettingsDialogProps) {
  const [open, setOpen] = useState(false)
  const [localSettings, setLocalSettings] = useState<Settings>(settings)

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const handleSave = () => {
    onSave(localSettings)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <SettingsIcon className="size-4" />
          <span className="sr-only">设置</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>AI 设置</DialogTitle>
          <DialogDescription>
            配置本地 OpenAI 兼容 API 的连接信息
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="baseUrl">API 地址</Label>
            <Input
              id="baseUrl"
              placeholder="http://localhost:11434/v1"
              value={localSettings.aiBaseUrl}
              onChange={(e) =>
                setLocalSettings((prev) => ({
                  ...prev,
                  aiBaseUrl: e.target.value,
                }))
              }
            />
            <p className="text-muted-foreground text-xs">
              例如: http://localhost:11434/v1 (Ollama)
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="model">模型名称</Label>
            <Input
              id="model"
              placeholder="qwen2.5:7b"
              value={localSettings.aiModel}
              onChange={(e) =>
                setLocalSettings((prev) => ({
                  ...prev,
                  aiModel: e.target.value,
                }))
              }
            />
            <p className="text-muted-foreground text-xs">
              例如: qwen2.5:7b, llama3.2, gpt-3.5-turbo
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="apiKey">API Key (可选)</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="sk-..."
              value={localSettings.aiApiKey}
              onChange={(e) =>
                setLocalSettings((prev) => ({
                  ...prev,
                  aiApiKey: e.target.value,
                }))
              }
            />
            <p className="text-muted-foreground text-xs">
              本地 Ollama 通常不需要 API Key
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
