import { ExtractedItem } from "@/types/extraction";
import { ExtendedProjectInfo } from "@/types/projectData";
import { extractInformation } from "@/utils/informationExtractor";

export interface DialogAgentResponse {
  extractedItems: ExtractedItem[];
  projectInfo: Partial<ExtendedProjectInfo>;
  confidence: number;
  suggestedQuestions?: string[];
}

export class DialogAgent {
  private openaiApiKey: string;

  constructor(apiKey?: string) {
    this.openaiApiKey = apiKey || process.env.OPENAI_API_KEY || "";
  }

  /**
   * ユーザー入力から構造化データを抽出
   */
  async extractFromMessage(
    message: string,
    existingItems: ExtractedItem[] = [],
    existingProjectInfo: Partial<ExtendedProjectInfo> = {}
  ): Promise<DialogAgentResponse> {
    // まず正規表現ベースの抽出を試みる
    const regexExtracted = extractInformation(message);
    
    // LLMを使用して追加の情報抽出と整合性チェック
    const llmExtracted = await this.extractWithLLM(
      message,
      existingItems,
      existingProjectInfo
    );

    // 結果をマージ
    const mergedItems = this.mergeExtractions(
      regexExtracted,
      llmExtracted.extractedItems,
      existingItems
    );

    // ProjectInfo を更新
    const updatedProjectInfo = this.updateProjectInfo(
      existingProjectInfo,
      mergedItems
    );

    // 不足情報に基づく質問を生成
    const suggestedQuestions = this.generateQuestions(mergedItems);

    return {
      extractedItems: mergedItems,
      projectInfo: updatedProjectInfo,
      confidence: this.calculateConfidence(mergedItems),
      suggestedQuestions
    };
  }

  /**
   * LLMを使用した情報抽出
   */
  private async extractWithLLM(
    message: string,
    existingItems: ExtractedItem[],
    existingProjectInfo: Partial<ExtendedProjectInfo>
  ): Promise<{ extractedItems: ExtractedItem[] }> {
    if (!this.openaiApiKey) {
      return { extractedItems: [] };
    }

    try {
      const existingKeys = existingItems.map(item => item.key);
      
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "system",
            content: `あなたは建築プロジェクトの情報抽出専門家です。
ユーザーのメッセージから以下の情報を抽出してください：
- 敷地情報（住所、地番、面積）
- 建物情報（用途、規模、階数、構造）
- 法規情報（用途地域、建ぺい率、容積率）
- タンク情報（容量、内容物、寸法）

既に抽出済みの項目: ${existingKeys.join(", ")}
これらの項目は無視してください。

JSON形式で回答してください。`
          }, {
            role: "user",
            content: message
          }],
          phase: "extraction"
        })
      });

      if (!response.ok) {
        throw new Error("LLM extraction failed");
      }

      const data = await response.json();
      
      // LLMの回答をパースして ExtractedItem 形式に変換
      return this.parseLLMResponse(data.message);
    } catch (error) {
      console.error("LLM extraction error:", error);
      return { extractedItems: [] };
    }
  }

  /**
   * LLMレスポンスをパース
   */
  private parseLLMResponse(response: string): { extractedItems: ExtractedItem[] } {
    try {
      // JSONブロックを抽出
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
      if (!jsonMatch) {
        return { extractedItems: [] };
      }

      const parsed = JSON.parse(jsonMatch[1]);
      const items: ExtractedItem[] = [];

      // パースした結果を ExtractedItem 形式に変換
      Object.entries(parsed).forEach(([key, value]) => {
        if (value && value !== "") {
          items.push({
            id: crypto.randomUUID(),
            category: this.categorizeKey(key),
            key,
            label: this.getLabelForKey(key),
            value: String(value),
            confidence: 0.8, // LLM抽出は高信頼度
            source: "llm",
            status: "extracted",
            required: this.isRequiredKey(key)
          });
        }
      });

      return { extractedItems: items };
    } catch (error) {
      console.error("Failed to parse LLM response:", error);
      return { extractedItems: [] };
    }
  }

  /**
   * 抽出結果をマージ
   */
  private mergeExtractions(
    regexItems: ExtractedItem[],
    llmItems: ExtractedItem[],
    existingItems: ExtractedItem[]
  ): ExtractedItem[] {
    const merged = new Map<string, ExtractedItem>();

    // 既存アイテムを優先
    existingItems.forEach(item => {
      merged.set(item.key, item);
    });

    // 正規表現抽出を追加
    regexItems.forEach(item => {
      if (!merged.has(item.key)) {
        merged.set(item.key, item);
      }
    });

    // LLM抽出を追加（信頼度が高い場合は上書き）
    llmItems.forEach(item => {
      const existing = merged.get(item.key);
      if (!existing || existing.confidence < item.confidence) {
        merged.set(item.key, item);
      }
    });

    return Array.from(merged.values());
  }

  /**
   * ProjectInfo を更新
   */
  private updateProjectInfo(
    existing: Partial<ExtendedProjectInfo>,
    items: ExtractedItem[]
  ): Partial<ExtendedProjectInfo> {
    const updated = { ...existing };

    items.forEach(item => {
      switch (item.key) {
        case "projectName":
          updated.projectName = item.value || undefined;
          break;
        case "siteAddress":
          updated.siteAddress = item.value || undefined;
          break;
        case "siteName":
          updated.siteName = item.value || undefined;
          break;
        case "siteArea":
          updated.siteArea = parseFloat(item.value || "0") || undefined;
          break;
        case "buildingUse":
          updated.buildingUse = item.value || undefined;
          break;
        case "totalFloorArea":
          updated.totalFloorArea = parseFloat(item.value || "0") || undefined;
          break;
        case "numberOfFloors":
          updated.numberOfFloors = item.value || undefined;
          break;
        case "structureType":
          updated.structureType = item.value || undefined;
          break;
        case "zoningDistrict":
          updated.zoningDistrict = item.value || undefined;
          break;
        case "buildingCoverageRatio":
          updated.buildingCoverageRatio = parseFloat(item.value || "0") || undefined;
          break;
        case "floorAreaRatio":
          updated.floorAreaRatio = parseFloat(item.value || "0") || undefined;
          break;
        // Tank information
        case "tankCapacity":
          // Remove commas from the value before parsing
          updated.tankCapacity = parseFloat((item.value || "0").replace(/,/g, "")) || undefined;
          break;
        case "tankContent":
          updated.tankContent = item.value || undefined;
          break;
        case "tankDiameter":
          updated.tankDiameter = parseFloat((item.value || "0").replace(/,/g, "")) || undefined;
          break;
        case "tankHeight":
          updated.tankHeight = parseFloat((item.value || "0").replace(/,/g, "")) || undefined;
          break;
      }
    });

    return updated;
  }

  /**
   * 質問を生成
   */
  private generateQuestions(items: ExtractedItem[]): string[] {
    const questions: string[] = [];
    const requiredKeys = [
      "siteAddress",
      "buildingUse",
      "totalFloorArea",
      "numberOfFloors"
    ];

    requiredKeys.forEach(key => {
      const item = items.find(i => i.key === key);
      if (!item || item.status === "missing") {
        questions.push(this.getQuestionForKey(key));
      }
    });

    return questions;
  }

  /**
   * キーのカテゴリを判定
   */
  private categorizeKey(key: string): ExtractedItem["category"] {
    if (key.includes("site") || key.includes("address") || key.includes("area")) {
      return "site";
    }
    if (key.includes("building") || key.includes("floor") || key.includes("structure")) {
      return "building";
    }
    if (key.includes("zoning") || key.includes("coverage") || key.includes("ratio")) {
      return "regulation";
    }
    if (key.includes("tank") || key.includes("capacity") || key.includes("content")) {
      return "tank";
    }
    return "other";
  }

  /**
   * キーのラベルを取得
   */
  private getLabelForKey(key: string): string {
    const labels: Record<string, string> = {
      projectName: "プロジェクト名",
      siteAddress: "敷地住所",
      siteName: "敷地名称",
      siteArea: "敷地面積",
      buildingUse: "建物用途",
      totalFloorArea: "延床面積",
      numberOfFloors: "階数",
      structureType: "構造種別",
      zoningDistrict: "用途地域",
      buildingCoverageRatio: "建ぺい率",
      floorAreaRatio: "容積率",
      tankCapacity: "タンク容量",
      tankContent: "内容物",
      tankDiameter: "タンク直径",
      tankHeight: "タンク高さ"
    };
    return labels[key] || key;
  }

  /**
   * 必須項目かどうか判定
   */
  private isRequiredKey(key: string): boolean {
    const required = [
      "siteAddress",
      "buildingUse", 
      "totalFloorArea",
      "numberOfFloors",
      "tankCapacity"
    ];
    return required.includes(key);
  }

  /**
   * キーに対する質問を取得
   */
  private getQuestionForKey(key: string): string {
    const questions: Record<string, string> = {
      siteAddress: "プロジェクトの敷地住所を教えてください。",
      buildingUse: "建物の用途は何ですか？（例：事務所、工場、倉庫）",
      totalFloorArea: "延床面積は何㎡ですか？",
      numberOfFloors: "建物は何階建てですか？",
      tankCapacity: "タンクの容量は何kLですか？",
      tankContent: "タンクの内容物は何ですか？",
      tankDiameter: "タンクの直径は何メートルですか？"
    };
    return questions[key] || `${this.getLabelForKey(key)}を入力してください。`;
  }

  /**
   * 信頼度を計算
   */
  private calculateConfidence(items: ExtractedItem[]): number {
    if (items.length === 0) return 0;
    
    const totalConfidence = items.reduce((sum, item) => sum + item.confidence, 0);
    return totalConfidence / items.length;
  }
}