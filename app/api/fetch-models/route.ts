import { NextRequest, NextResponse } from "next/server"

interface OpenAIModel {
  id: string
  object: string
  created?: number
  owned_by?: string
}

interface OpenAIModelsResponse {
  object: string
  data: OpenAIModel[]
}

export async function POST(request: NextRequest) {
  try {
    const { baseUrl, apiKey } = await request.json()

    if (!baseUrl) {
      return NextResponse.json(
        { error: "请先配置 API 地址" },
        { status: 400 }
      )
    }

    // 构建模型列表请求 URL
    const modelsUrl = baseUrl.replace(/\/+$/, "") + "/models"

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`
    }

    const response = await fetch(modelsUrl, {
      method: "GET",
      headers,
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `获取模型列表失败: ${response.status} - ${errorText}` },
        { status: response.status }
      )
    }

    const data: OpenAIModelsResponse = await response.json()

    // 提取模型 ID 列表
    const models = data.data.map((model) => ({
      id: model.id,
      name: model.id,
      owned_by: model.owned_by || "unknown",
    }))

    // 按名称排序
    models.sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({ models })
  } catch (error) {
    console.error("Fetch models error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取模型列表失败" },
      { status: 500 }
    )
  }
}
