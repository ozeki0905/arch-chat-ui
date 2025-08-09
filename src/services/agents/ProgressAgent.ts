import { ExtractedItem } from "@/types/extraction";
import { ExtendedProjectInfo } from "@/types/projectData";
import { TankFoundationDesignInput } from "@/types/tankFoundationDesign";

export interface PhaseRequirement {
  phase: string;
  requiredFields: string[];
  optionalFields: string[];
  completionThreshold: number; // 必須項目の何%が揃えば次に進めるか
}

export interface ProgressStatus {
  currentPhase: string;
  completedFields: string[];
  missingFields: string[];
  progress: number; // 0-100
  canProceed: boolean;
  nextPhase?: string;
  suggestions: string[];
}

export class ProgressAgent {
  private phaseRequirements: PhaseRequirement[] = [
    {
      phase: "p1",
      requiredFields: [
        "projectName",
        "siteAddress",
        "buildingUse",
        "totalFloorArea"
      ],
      optionalFields: [
        "siteName",
        "siteArea",
        "numberOfFloors",
        "structureType",
        "zoningDistrict"
      ],
      completionThreshold: 0.75
    },
    {
      phase: "p2",
      requiredFields: [
        "tankCapacity",
        "tankContent",
        "tankDiameter",
        "tankHeight",
        "seismicLevel",
        "soilType"
      ],
      optionalFields: [
        "roofType",
        "groundwaterLevel",
        "allowableStress"
      ],
      completionThreshold: 0.8
    },
    {
      phase: "p3",
      requiredFields: [
        "designCriteria",
        "loadCases",
        "safetyFactors"
      ],
      optionalFields: [
        "specialConsiderations",
        "environmentalFactors"
      ],
      completionThreshold: 0.9
    }
  ];

  /**
   * 現在の進捗状況を評価
   */
  evaluateProgress(
    currentPhase: string,
    extractedItems: ExtractedItem[],
    projectInfo: Partial<ExtendedProjectInfo>
  ): ProgressStatus {
    const phaseReq = this.phaseRequirements.find(p => p.phase === currentPhase);
    if (!phaseReq) {
      throw new Error(`Unknown phase: ${currentPhase}`);
    }

    // 抽出済みフィールドを取得
    const completedFields = extractedItems
      .filter(item => item.status === "extracted" || item.status === "confirmed")
      .map(item => item.key);

    // 不足フィールドを特定
    const missingFields = phaseReq.requiredFields.filter(
      field => !completedFields.includes(field)
    );

    // 進捗率を計算
    const progress = this.calculateProgress(
      phaseReq.requiredFields,
      completedFields
    );

    // 次のフェーズに進めるか判定
    const canProceed = progress >= phaseReq.completionThreshold * 100;

    // 次のフェーズを決定
    const nextPhase = this.getNextPhase(currentPhase);

    // 提案を生成
    const suggestions = this.generateSuggestions(
      missingFields,
      phaseReq.optionalFields,
      completedFields
    );

    return {
      currentPhase,
      completedFields,
      missingFields,
      progress,
      canProceed,
      nextPhase,
      suggestions
    };
  }

  /**
   * フォームの初期値を生成
   */
  generateFormDefaults(
    phase: string,
    extractedItems: ExtractedItem[],
    projectInfo: Partial<ExtendedProjectInfo>
  ): Partial<TankFoundationDesignInput> {
    const defaults: Partial<TankFoundationDesignInput> = {};

    // Phase 1 の情報をマッピング
    if (projectInfo.projectName) {
      defaults.project = {
        ...defaults.project,
        name: projectInfo.projectName,
        project_id: `TF-${Date.now()}`
      };
    }

    if (projectInfo.siteAddress || projectInfo.siteName) {
      defaults.site = {
        site_name: projectInfo.siteName || "",
        location: projectInfo.siteAddress || ""
      };
    }

    // 抽出アイテムから追加情報を取得
    extractedItems.forEach(item => {
      if (item.status !== "extracted" && item.status !== "confirmed") return;

      switch (item.key) {
        case "tankCapacity":
          defaults.tank = {
            ...defaults.tank,
            capacity_kl: parseFloat(item.value || "0")
          };
          break;
        case "tankContent":
          defaults.tank = {
            ...defaults.tank,
            content_type: item.value || ""
          };
          break;
        case "tankDiameter":
          defaults.tank = {
            ...defaults.tank,
            diameter_m: parseFloat(item.value || "0")
          };
          break;
        case "tankHeight":
          defaults.tank = {
            ...defaults.tank,
            height_m: parseFloat(item.value || "0")
          };
          break;
        case "seismicLevel":
          defaults.criteria = {
            ...defaults.criteria,
            seismic_level: item.value as "L2" || "L2"
          };
          break;
      }
    });

    return defaults;
  }

  /**
   * フェーズ完了時の処理
   */
  async completePhase(
    phase: string,
    extractedItems: ExtractedItem[],
    projectInfo: Partial<ExtendedProjectInfo>
  ): Promise<{
    nextPhase: string;
    message: string;
    shouldShowForm: boolean;
  }> {
    const nextPhase = this.getNextPhase(phase);
    
    // 完了メッセージを生成
    const message = this.generateCompletionMessage(phase, extractedItems);

    // 次のフェーズで必要な情報が既にある程度揃っているかチェック
    const nextPhaseReq = this.phaseRequirements.find(p => p.phase === nextPhase);
    const shouldShowForm = nextPhaseReq ? 
      this.shouldShowFormForPhase(nextPhase, extractedItems) : 
      false;

    return {
      nextPhase,
      message,
      shouldShowForm
    };
  }

  /**
   * 進捗率を計算
   */
  private calculateProgress(
    requiredFields: string[],
    completedFields: string[]
  ): number {
    if (requiredFields.length === 0) return 100;
    
    const completed = requiredFields.filter(field => 
      completedFields.includes(field)
    ).length;
    
    return Math.round((completed / requiredFields.length) * 100);
  }

  /**
   * 次のフェーズを取得
   */
  private getNextPhase(currentPhase: string): string {
    const phases = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"];
    const currentIndex = phases.indexOf(currentPhase);
    
    if (currentIndex === -1 || currentIndex === phases.length - 1) {
      return currentPhase;
    }
    
    return phases[currentIndex + 1];
  }

  /**
   * 提案を生成
   */
  private generateSuggestions(
    missingFields: string[],
    optionalFields: string[],
    completedFields: string[]
  ): string[] {
    const suggestions: string[] = [];

    // 不足している必須項目について
    if (missingFields.length > 0) {
      suggestions.push(
        `次の必須項目が不足しています: ${missingFields.join(", ")}`
      );
    }

    // 任意項目について
    const missingOptional = optionalFields.filter(
      field => !completedFields.includes(field)
    );
    
    if (missingOptional.length > 0 && missingFields.length === 0) {
      suggestions.push(
        `以下の項目も入力すると、より正確な設計が可能です: ${missingOptional.slice(0, 3).join(", ")}`
      );
    }

    return suggestions;
  }

  /**
   * 完了メッセージを生成
   */
  private generateCompletionMessage(
    phase: string,
    extractedItems: ExtractedItem[]
  ): string {
    const messages: Record<string, string> = {
      p1: "プロジェクトの基本情報を確認しました。次は設計方針を決定します。",
      p2: "タンク仕様と設計条件を確認しました。設計計算を開始できます。",
      p3: "設計条件の設定が完了しました。計算を実行します。"
    };

    const itemCount = extractedItems.filter(
      item => item.status === "extracted" || item.status === "confirmed"
    ).length;

    return messages[phase] || `フェーズ${phase}が完了しました（${itemCount}項目を確認）。`;
  }

  /**
   * フォーム表示が必要かどうか判定
   */
  private shouldShowFormForPhase(
    phase: string,
    extractedItems: ExtractedItem[]
  ): boolean {
    const phaseReq = this.phaseRequirements.find(p => p.phase === phase);
    if (!phaseReq) return true;

    const completedFields = extractedItems
      .filter(item => item.status === "extracted" || item.status === "confirmed")
      .map(item => item.key);

    const missingRequired = phaseReq.requiredFields.filter(
      field => !completedFields.includes(field)
    );

    // 必須項目の半分以上が不足していればフォームを表示
    return missingRequired.length > phaseReq.requiredFields.length * 0.5;
  }

  /**
   * 右カラムの進捗情報を生成
   */
  generateProgressDisplay(status: ProgressStatus): {
    requirements: Array<{
      key: string;
      label: string;
      status: "complete" | "missing" | "optional";
    }>;
    overallProgress: number;
    nextSteps: string[];
  } {
    const phaseReq = this.phaseRequirements.find(
      p => p.phase === status.currentPhase
    );
    
    if (!phaseReq) {
      return {
        requirements: [],
        overallProgress: 0,
        nextSteps: []
      };
    }

    // 要件リストを生成
    const requirements = [
      ...phaseReq.requiredFields.map(field => ({
        key: field,
        label: this.getFieldLabel(field),
        status: status.completedFields.includes(field) ? 
          "complete" as const : "missing" as const
      })),
      ...phaseReq.optionalFields.map(field => ({
        key: field,
        label: this.getFieldLabel(field),
        status: "optional" as const
      }))
    ];

    // 次のステップを生成
    const nextSteps = [];
    if (status.missingFields.length > 0) {
      nextSteps.push(`残り${status.missingFields.length}項目の情報を入力`);
    }
    if (status.canProceed) {
      nextSteps.push("次のフェーズに進む準備ができています");
    }

    return {
      requirements,
      overallProgress: status.progress,
      nextSteps
    };
  }

  /**
   * フィールドのラベルを取得
   */
  private getFieldLabel(field: string): string {
    const labels: Record<string, string> = {
      projectName: "プロジェクト名",
      siteAddress: "敷地住所",
      buildingUse: "建物用途",
      totalFloorArea: "延床面積",
      tankCapacity: "タンク容量",
      tankContent: "内容物",
      tankDiameter: "タンク直径",
      tankHeight: "タンク高さ",
      seismicLevel: "耐震レベル",
      soilType: "地盤種別",
      designCriteria: "設計基準",
      loadCases: "荷重ケース",
      safetyFactors: "安全率"
    };
    
    return labels[field] || field;
  }
}