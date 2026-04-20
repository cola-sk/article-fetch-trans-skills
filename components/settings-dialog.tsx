"use client"

import { useState, useEffect } from "react"
import { Settings as SettingsIcon, RefreshCw, Check, ChevronsUpDown } from "lucide-react"
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { Settings } from "@/hooks/use-settings"

interface Model {
  id: string
  name: string
  owned_by: string
}

interface SettingsDialogProps {
  settings: Settings
  onSave: (settings: Partial<Settings>) => void
}

export function SettingsDialog({ settings, onSave }: SettingsDialogProps) {
  const [open, setOpen] = useState(false)
  const [localSettings, setLocalSettings] = useState<Settings>(settings)
  const [models, setModels] = useState<Model[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)
  const [modelSelectOpen, setModelSelectOpen] = useState(false)

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  // 当对话框打开且有 API 地址时，自动获取模型列表
  useEffect(() => {
    if (open && localSettings.aiBaseUrl && models.length === 0) {
      fetchModels()
    }
  }, [open, localSettings.aiBaseUrl])

  const fetchModels = async () => {
    if (!localSettings.aiBaseUrl) {
      setModelError("请先填写 API 地址")
      return
    }

    setIsLoadingModels(true)
    setModelError(null)

    try {
      const response = await fetch("/api/fetch-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: localSettings.aiBaseUrl,
          apiKey: localSettings.aiApiKey,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "获取模型列表失败")
      }

      setModels(data.models)
      
      // 如果当前模型不在列表中，且列表不为空，自动选择第一个
      if (data.models.length > 0) {
        const currentModelExists = data.models.some(
          (m: Model) => m.id === localSettings.aiModel
        )
        if (!currentModelExists && !localSettings.aiModel) {
          setLocalSettings((prev) => ({
            ...prev,
            aiModel: data.models[0].id,
          }))
        }
      }
    } catch (error) {
      setModelError(error instanceof Error ? error.message : "获取模型列表失败")
      setModels([])
    } finally {
      setIsLoadingModels(false)
    }
  }

  const handleSave = () => {
    onSave(localSettings)
    setOpen(false)
  }

  const handleBaseUrlChange = (value: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      aiBaseUrl: value,
    }))
    // 清空模型列表，让用户重新获取
    setModels([])
    setModelError(null)
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
              onChange={(e) => handleBaseUrlChange(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              例如: http://localhost:11434/v1 (Ollama)
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

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>模型选择</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchModels}
                disabled={isLoadingModels || !localSettings.aiBaseUrl}
                className="h-7 px-2 text-xs"
              >
                <RefreshCw
                  className={cn("mr-1 size-3", isLoadingModels && "animate-spin")}
                />
                {isLoadingModels ? "获取中..." : "获取模型列表"}
              </Button>
            </div>

            {modelError && (
              <p className="text-destructive text-xs">{modelError}</p>
            )}

            {models.length > 0 ? (
              <Popover open={modelSelectOpen} onOpenChange={setModelSelectOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={modelSelectOpen}
                    className="w-full justify-between font-normal"
                  >
                    {localSettings.aiModel || "选择模型..."}
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[350px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="搜索模型..." />
                    <CommandList>
                      <CommandEmpty>未找到匹配的模型</CommandEmpty>
                      <CommandGroup>
                        {models.map((model) => (
                          <CommandItem
                            key={model.id}
                            value={model.id}
                            onSelect={(value) => {
                              setLocalSettings((prev) => ({
                                ...prev,
                                aiModel: value,
                              }))
                              setModelSelectOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 size-4",
                                localSettings.aiModel === model.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{model.name}</span>
                              {model.owned_by && model.owned_by !== "unknown" && (
                                <span className="text-muted-foreground text-xs">
                                  {model.owned_by}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            ) : (
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
            )}

            <p className="text-muted-foreground text-xs">
              点击「获取模型列表」从 API 获取可用模型，或直接输入模型名称
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
