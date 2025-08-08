import { ExtractedItem, ProjectInfo } from "@/types/extraction";
import { DesignPolicy, ConflictItem } from "@/types/designPolicy";
import { ChatMessage } from "@/types/chat";
import { 
  extractInformation, 
  mergeExtractedItems, 
  identifyMissingInfo,
  generateAgentResponse 
} from "@/utils/informationExtractor";

export interface AgentContext {
  phase: string;
  extractedItems: ExtractedItem[];
  projectInfo: Partial<ProjectInfo>;
  designPolicy?: Partial<DesignPolicy>;
  messages: ChatMessage[];
}

export interface AgentAction {
  type: "update_status" | "show_form" | "ask_question" | "proceed_phase" | "show_conflicts";
  payload: any;
}

export interface AgentResponse {
  message: string;
  actions: AgentAction[];
  suggestedForm?: "site_info" | "building_overview" | "dynamic" | "conflicts";
  formData?: any;
}

export class AIAgent {
  private context: AgentContext;

  constructor(initialContext?: Partial<AgentContext>) {
    this.context = {
      phase: "p1",
      extractedItems: [],
      projectInfo: {},
      messages: [],
      ...initialContext
    };
  }

  // テキスト入力を処理
  async processTextInput(text: string): Promise<AgentResponse> {
    // 情報抽出
    const newItems = extractInformation(text);
    this.context.extractedItems = mergeExtractedItems(
      this.context.extractedItems,
      newItems
    );

    // プロジェクト情報を更新
    this.updateProjectInfo();

    // 不足情報を特定
    const missingInfo = identifyMissingInfo(this.context.extractedItems);

    // レスポンスを生成
    const message = generateAgentResponse(this.context.extractedItems, this.context.phase);
    const actions: AgentAction[] = [];

    // ステータス更新アクション
    actions.push({
      type: "update_status",
      payload: {
        extractedItems: this.context.extractedItems,
        projectInfo: this.context.projectInfo
      }
    });

    // フォーム表示の判断
    let suggestedForm: AgentResponse["suggestedForm"];
    let formData: any;

    if (this.context.phase === "p1") {
      if (missingInfo.length > 0) {
        // 不足情報が多い場合は専用フォームを提案
        if (missingInfo.includes("敷地住所") && missingInfo.includes("敷地面積")) {
          suggestedForm = "site_info";
        } else if (missingInfo.includes("延床面積") || missingInfo.includes("階数")) {
          suggestedForm = "building_overview";
        } else {
          suggestedForm = "dynamic";
          formData = { missingInfo };
        }
      } else {
        // フェーズ1完了
        actions.push({
          type: "proceed_phase",
          payload: { nextPhase: "p2" }
        });
      }
    }

    return {
      message,
      actions,
      suggestedForm,
      formData
    };
  }

  // フォーム入力を処理
  async processFormInput(formData: Record<string, string>): Promise<AgentResponse> {
    // フォームデータをテキストに変換して処理
    const text = Object.entries(formData)
      .map(([key, value]) => {
        const labelMap: Record<string, string> = {
          siteAddress: "住所",
          siteArea: "敷地面積",
          landUse: "用途地域",
          requiredFloorArea: "延床面積",
          numberOfFloors: "階数",
          structureType: "構造種別"
        };
        return `${labelMap[key] || key}: ${value}`;
      })
      .join("\n");

    return this.processTextInput(text);
  }

  // ファイルを処理
  async processFile(file: File): Promise<AgentResponse> {
    // ファイル処理のモック実装
    // 実際にはPDFパーサーやOCRを使用
    const mockText = `
    建設予定地: 東京都港区六本木1-1-1
    敷地面積: 1,500㎡
    用途地域: 商業地域
    建ぺい率: 80%
    容積率: 600%
    `;

    return this.processTextInput(mockText);
  }

  // 設計方針の競合を処理
  async processConflictResolution(
    conflicts: ConflictItem[],
    selections: Record<string, string>
  ): Promise<AgentResponse> {
    // 選択結果を設計方針に反映
    this.context.designPolicy = {
      ...this.context.designPolicy,
      foundationType: selections.conflict1 === "pile" ? "杭基礎" : "直接基礎",
      seismicLevel: selections.conflict2 === "level2" ? "レベル2" : "レベル1",
    };

    const message = `設計方針を確定しました:\n\n` +
      `基礎形式: ${this.context.designPolicy.foundationType}\n` +
      `耐震レベル: ${this.context.designPolicy.seismicLevel}\n\n` +
      `次のフェーズで詳細な設計条件を設定します。`;

    return {
      message,
      actions: [
        {
          type: "update_status",
          payload: {
            designPolicy: this.context.designPolicy
          }
        },
        {
          type: "proceed_phase",
          payload: { nextPhase: "p3" }
        }
      ]
    };
  }

  // プロジェクト情報を更新
  private updateProjectInfo() {
    const info: Partial<ProjectInfo> = {};
    
    for (const item of this.context.extractedItems) {
      if (item.value) {
        switch (item.key) {
          case "siteAddress":
            info.siteAddress = item.value;
            break;
          case "siteArea":
            info.siteArea = parseFloat(item.value.replace(/[^\d.]/g, ""));
            break;
          case "landUse":
            info.landUse = item.value;
            break;
          case "requiredFloorArea":
            info.totalFloorArea = parseFloat(item.value.replace(/[^\d.]/g, ""));
            break;
          case "numberOfFloors":
            info.floors = item.value;
            break;
        }
      }
    }

    this.context.projectInfo = { ...this.context.projectInfo, ...info };
  }

  // 現在のコンテキストを取得
  getContext(): AgentContext {
    return { ...this.context };
  }

  // コンテキストを更新
  updateContext(updates: Partial<AgentContext>) {
    this.context = { ...this.context, ...updates };
  }
}