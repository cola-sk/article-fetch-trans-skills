import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { text, baseUrl, model, apiKey } = await request.json()
    
    if (!text) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      )
    }
    
    if (!baseUrl) {
      return NextResponse.json(
        { error: "API base URL is required" },
        { status: 400 }
      )
    }
    
    // Build the API endpoint
    const endpoint = baseUrl.endsWith("/")
      ? `${baseUrl}chat/completions`
      : `${baseUrl}/chat/completions`
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`
    }
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: model || "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `你是一个专业的翻译助手。请将用户提供的推文内容翻译成简体中文。
要求：
1. 保持原文的语气和风格
2. 对于专业术语，可以保留英文并在括号内提供中文解释
3. 对于@提及和#话题标签，保持原样不翻译
4. 对于链接，保持原样
5. 翻译要自然流畅，符合中文表达习惯`,
          },
          {
            role: "user",
            content: text,
          },
        ],
        temperature: 0.3,
      }),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error("Translation API error:", errorText)
      return NextResponse.json(
        { error: `Translation API error: ${response.status}` },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    const translatedText = data.choices?.[0]?.message?.content
    
    if (!translatedText) {
      return NextResponse.json(
        { error: "No translation returned" },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ translatedText })
  } catch (error) {
    console.error("Translation error:", error)
    return NextResponse.json(
      { error: "Failed to translate" },
      { status: 500 }
    )
  }
}
