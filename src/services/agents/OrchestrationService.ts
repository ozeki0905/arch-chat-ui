import { DialogAgent, DialogAgentResponse } from "./DialogAgent";
import { ProgressAgent, ProgressStatus } from "./ProgressAgent";
import { DataAgent } from "./DataAgent";
import { ExtractedItem } from "@/types/extraction";
import { ExtendedProjectInfo } from "@/types/projectData";
import { TankFoundationDesignInput } from "@/types/tankFoundationDesign";
import { ChatMessage } from "@/types/chat";

export interface OrchestrationResult {
  // 抽出された情報
  extractedItems: ExtractedItem[];
  projectInfo: Partial<ExtendedProjectInfo>;
  
  // 進捗状況
  progressStatus: ProgressStatus;
  
  // UIへの指示
  actions: Array<{
    type: "update_status" | "show_form" | "proceed_phase" | "show_message";
    payload: any;
  }>;
  
  // 返信メッセージ
  responseMessage: string;
  
  // フォームの初期値
  formDefaults?: Partial<TankFoundationDesignInput>;
}

export class OrchestrationService {
  private dialogAgent: DialogAgent;
  private progressAgent: ProgressAgent;
  private dataAgent: DataAgent;

  constructor(openaiApiKey?: string) {
    this.dialogAgent = new DialogAgent(openaiApiKey);
    this.progressAgent = new ProgressAgent();
    this.dataAgent = new DataAgent();
  }

  /**
   * ユーザー入力を処理し、適切なアクションを決定
   */
  async processUserInput(
    message: string,
    currentPhase: string,
    extractedItems: ExtractedItem[],
    projectInfo: Partial<ExtendedProjectInfo>,
    projectId?: string
  ): Promise<OrchestrationResult> {
    const actions: OrchestrationResult["actions"] = [];
    
    try {
      // 1. Dialog Agent: メッセージから情報を抽出
      const dialogResult = await this.dialogAgent.extractFromMessage(
        message,
        extractedItems,
        projectInfo
      );

      // 2. Progress Agent: 進捗を評価
      const progressStatus = this.progressAgent.evaluateProgress(
        currentPhase,
        dialogResult.extractedItems,
        dialogResult.projectInfo
      );

      // 3. Data Agent: 必要に応じてデータを保存
      if (this.shouldSaveData(dialogResult, extractedItems)) {
        const saveResult = await this.dataAgent.saveProjectData(
          projectId || null,
          dialogResult.extractedItems,
          dialogResult.projectInfo
        );

        if (saveResult.success && !projectId) {
          // 新規プロジェクトが作成された場合
          actions.push({
            type: "update_status",
            payload: { projectId: saveResult.projectId }
          });
        }
      }

      // 4. 応答メッセージを生成
      const responseMessage = await this.generateResponse(
        dialogResult,
        progressStatus,
        currentPhase
      );

      // 5. UIアクションを決定
      if (progressStatus.canProceed && currentPhase === "p1") {
        // Phase 1が完了し、Phase 2に進める場合
        actions.push({
          type: "proceed_phase",
          payload: { nextPhase: "p2" }
        });
      }

      // 6. フォームを表示すべきか判定
      if (this.shouldShowForm(progressStatus, currentPhase)) {
        const formDefaults = this.progressAgent.generateFormDefaults(
          currentPhase,
          dialogResult.extractedItems,
          dialogResult.projectInfo
        );

        actions.push({
          type: "show_form",
          payload: { 
            phase: currentPhase,
            defaults: formDefaults
          }
        });
      }

      // 7. 状態を更新
      actions.push({
        type: "update_status",
        payload: {
          extractedItems: dialogResult.extractedItems,
          projectInfo: dialogResult.projectInfo,
          progressStatus
        }
      });

      return {
        extractedItems: dialogResult.extractedItems,
        projectInfo: dialogResult.projectInfo,
        progressStatus,
        actions,
        responseMessage,
        formDefaults: this.progressAgent.generateFormDefaults(
          currentPhase,
          dialogResult.extractedItems,
          dialogResult.projectInfo
        )
      };
    } catch (error) {
      console.error("Orchestration error:", error);
      
      return {
        extractedItems,
        projectInfo,
        progressStatus: this.progressAgent.evaluateProgress(
          currentPhase,
          extractedItems,
          projectInfo
        ),
        actions: [{
          type: "show_message",
          payload: { 
            message: "処理中にエラーが発生しました。もう一度お試しください。",
            type: "error"
          }
        }],
        responseMessage: "申し訳ございません。処理中にエラーが発生しました。"
      };
    }
  }

  /**
   * フォーム送信を処理
   */
  async processFormSubmission(
    formData: any,
    formType: string,
    currentPhase: string,
    extractedItems: ExtractedItem[],
    projectInfo: Partial<ExtendedProjectInfo>,
    projectId?: string
  ): Promise<OrchestrationResult> {
    // フォームデータを ExtractedItem に変換
    const formExtractedItems = this.convertFormDataToExtractedItems(
      formData,
      formType
    );

    // 既存のアイテムとマージ
    const mergedItems = this.mergeExtractedItems(
      extractedItems,
      formExtractedItems
    );

    // ProjectInfo を更新
    const updatedProjectInfo = this.updateProjectInfoFromForm(
      projectInfo,
      formData,
      formType
    );

    // 進捗を再評価
    const progressStatus = this.progressAgent.evaluateProgress(
      currentPhase,
      mergedItems,
      updatedProjectInfo
    );

    // データを保存
    const saveResult = await this.dataAgent.saveProjectData(
      projectId || null,
      mergedItems,
      updatedProjectInfo
    );

    // レスポンスを生成
    const actions: OrchestrationResult["actions"] = [];

    if (progressStatus.canProceed) {
      const completion = await this.progressAgent.completePhase(
        currentPhase,
        mergedItems,
        updatedProjectInfo
      );

      actions.push({
        type: "proceed_phase",
        payload: { 
          nextPhase: completion.nextPhase,
          showForm: completion.shouldShowForm
        }
      });
    }

    actions.push({
      type: "update_status",
      payload: {
        extractedItems: mergedItems,
        projectInfo: updatedProjectInfo,
        progressStatus,
        projectId: saveResult.projectId
      }
    });

    return {
      extractedItems: mergedItems,
      projectInfo: updatedProjectInfo,
      progressStatus,
      actions,
      responseMessage: this.generateFormSubmissionResponse(formType, progressStatus)
    };
  }

  /**
   * 計算実行をオーケストレーション
   */
  async runCalculation(
    projectId: string,
    designInput: TankFoundationDesignInput
  ): Promise<{
    runId: string;
    success: boolean;
    message: string;
  }> {
    try {
      // 計算を実行
      const result = await this.dataAgent.runCalculation(projectId, designInput);
      
      if (result.success) {
        return {
          runId: result.runId,
          success: true,
          message: "計算が開始されました。結果が出るまでしばらくお待ちください。"
        };
      } else {
        return {
          runId: "",
          success: false,
          message: "計算の開始に失敗しました。入力内容を確認してください。"
        };
      }
    } catch (error) {
      console.error("Calculation error:", error);
      return {
        runId: "",
        success: false,
        message: "計算中にエラーが発生しました。"
      };
    }
  }

  /**
   * データ保存が必要かどうか判定
   */
  private shouldSaveData(
    dialogResult: DialogAgentResponse,
    existingItems: ExtractedItem[]
  ): boolean {
    // 新しい情報が抽出された場合は保存
    const newItems = dialogResult.extractedItems.filter(
      item => !existingItems.find(existing => existing.key === item.key)
    );
    
    return newItems.length > 0;
  }

  /**
   * フォーム表示が必要かどうか判定
   */
  private shouldShowForm(
    progressStatus: ProgressStatus,
    currentPhase: string
  ): boolean {
    // 不足項目が多い場合はフォームを表示
    return progressStatus.missingFields.length > 3;
  }

  /**
   * 応答メッセージを生成
   */
  private async generateResponse(
    dialogResult: DialogAgentResponse,
    progressStatus: ProgressStatus,
    currentPhase: string
  ): Promise<string> {
    const parts: string[] = [];

    // 抽出された情報を確認
    if (dialogResult.extractedItems.length > 0) {
      const newItems = dialogResult.extractedItems
        .filter(item => item.status === "extracted")
        .map(item => `${item.label}: ${item.value}`);
      
      if (newItems.length > 0) {
        parts.push(`以下の情報を確認しました:\n${newItems.join("\n")}`);
      }
    }

    // 進捗状況を報告
    if (progressStatus.progress < 100) {
      parts.push(`\n現在の進捗: ${progressStatus.progress}%`);
    }

    // 不足情報について案内
    if (progressStatus.missingFields.length > 0) {
      const missingLabels = progressStatus.missingFields
        .slice(0, 3)
        .map(field => this.getFieldLabel(field));
      
      parts.push(`\n以下の情報が必要です: ${missingLabels.join("、")}`);
    }

    // 次のアクションを提案
    if (progressStatus.canProceed) {
      parts.push("\n必要な情報が揃いました。次のステップに進めます。");
    } else if (dialogResult.suggestedQuestions && dialogResult.suggestedQuestions.length > 0) {
      parts.push(`\n${dialogResult.suggestedQuestions[0]}`);
    }

    return parts.join("\n");
  }

  /**
   * フォームデータを ExtractedItem に変換
   */
  private convertFormDataToExtractedItems(
    formData: any,
    formType: string
  ): ExtractedItem[] {
    const items: ExtractedItem[] = [];
    
    Object.entries(formData).forEach(([key, value]) => {
      if (value && value !== "") {
        items.push({
          id: crypto.randomUUID(),
          category: this.categorizeFormField(key, formType),
          key,
          label: this.getFieldLabel(key),
          value: String(value),
          confidence: 1.0, // フォーム入力は確実
          source: "form",
          status: "confirmed",
          required: true
        });
      }
    });

    return items;
  }

  /**
   * ExtractedItem をマージ
   */
  private mergeExtractedItems(
    existing: ExtractedItem[],
    newItems: ExtractedItem[]
  ): ExtractedItem[] {
    const merged = new Map<string, ExtractedItem>();

    existing.forEach(item => merged.set(item.key, item));
    
    newItems.forEach(item => {
      const existingItem = merged.get(item.key);
      if (!existingItem || item.status === "confirmed") {
        merged.set(item.key, item);
      }
    });

    return Array.from(merged.values());
  }

  /**
   * フォームデータから ProjectInfo を更新
   */
  private updateProjectInfoFromForm(
    existing: Partial<ExtendedProjectInfo>,
    formData: any,
    formType: string
  ): Partial<ExtendedProjectInfo> {
    const updated = { ...existing };

    if (formType === "site_info") {
      if (formData.address) updated.siteAddress = formData.address;
      if (formData.siteName) updated.siteName = formData.siteName;
      if (formData.siteArea) updated.siteArea = parseFloat(formData.siteArea);
    }

    if (formType === "building_overview") {
      if (formData.buildingUse) updated.buildingUse = formData.buildingUse;
      if (formData.totalFloorArea) updated.totalFloorArea = parseFloat(formData.totalFloorArea);
      if (formData.numberOfFloors) updated.numberOfFloors = formData.numberOfFloors;
    }

    return updated;
  }

  /**
   * フォーム送信のレスポンスを生成
   */
  private generateFormSubmissionResponse(
    formType: string,
    progressStatus: ProgressStatus
  ): string {
    const responses: Record<string, string> = {
      site_info: "敷地情報を登録しました。",
      building_overview: "建物概要を登録しました。",
      tank_spec: "タンク仕様を登録しました。"
    };

    let response = responses[formType] || "情報を登録しました。";

    if (progressStatus.canProceed) {
      response += " 次のステップに進む準備ができました。";
    } else if (progressStatus.missingFields.length > 0) {
      response += ` あと${progressStatus.missingFields.length}項目の情報が必要です。`;
    }

    return response;
  }

  /**
   * フォームフィールドのカテゴリを判定
   */
  private categorizeFormField(
    field: string,
    formType: string
  ): ExtractedItem["category"] {
    if (formType === "site_info") return "site";
    if (formType === "building_overview") return "building";
    if (formType === "tank_spec") return "tank";
    return "other";
  }

  /**
   * フィールドのラベルを取得
   */
  private getFieldLabel(field: string): string {
    const labels: Record<string, string> = {
      projectName: "プロジェクト名",
      siteAddress: "敷地住所",
      siteName: "敷地名称",
      siteArea: "敷地面積",
      buildingUse: "建物用途",
      totalFloorArea: "延床面積",
      numberOfFloors: "階数",
      structureType: "構造種別",
      tankCapacity: "タンク容量",
      tankContent: "内容物",
      tankDiameter: "タンク直径",
      tankHeight: "タンク高さ"
    };
    
    return labels[field] || field;
  }
}