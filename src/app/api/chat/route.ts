import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, phase, projectInfo } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    // フェーズに応じたシステムプロンプトを生成
    let systemPrompt = "あなたは建築設計の専門家アシスタントです。";
    
    if (phase === "p1") {
      systemPrompt += "現在は「対象の確認」フェーズです。アップロードされたドキュメントから必要な情報を抽出し、不足している情報について質問してください。";
    } else if (phase === "p2") {
      systemPrompt += "現在は「設計方針の決定」フェーズです。プロジェクトの要件に基づいて、最適な設計方針を提案してください。";
    } else if (phase === "p3") {
      systemPrompt += "現在は「設計条件設定」フェーズです。具体的な設計条件を確認し、詳細な仕様を決定してください。";
    }

    // プロジェクト情報がある場合は追加
    if (projectInfo) {
      systemPrompt += `\n\nプロジェクト情報:\n${JSON.stringify(projectInfo, null, 2)}`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-5-2025-08-07",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const responseMessage = completion.choices[0].message;

    return NextResponse.json({
      message: responseMessage.content,
      role: "assistant",
    });
  } catch (error) {
    console.error("Chat API error:", error);
    
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: `OpenAI API error: ${error.message}` },
        { status: error.status || 500 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}