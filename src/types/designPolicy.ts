// 設計基準のカテゴリ
export type BasisCategory = "法規" | "設計基準" | "過去実績" | "社内基準";

// 設計基準項目
export interface BasisItem {
  id: string;
  name: string;
  description: string;
  source?: string; // 出典（消防法、建築基準法など）
  link?: string; // 参考リンク
  required: boolean;
}

// 設計基準
export interface DesignBasis {
  category: BasisCategory;
  items: BasisItem[];
}

// 設計方針オプション
export interface DesignOption {
  id: string;
  name: string;
  description: string;
  reasons: string[];
  isRecommended: boolean;
  constraints?: string[]; // 制約条件
}

// 条件分岐項目
export interface ConflictItem {
  id: string;
  question: string;
  options: {
    value: string;
    label: string;
    description?: string;
  }[];
  defaultValue?: string;
  impact: string; // この選択がどう影響するか
}

// 設計方針
export interface DesignPolicy {
  foundationType?: string; // 基礎形式
  seismicLevel?: string; // 耐震レベル
  structureType?: string; // 構造種別
  fireResistance?: string; // 耐火性能
  specialConsiderations?: string[]; // 特別な配慮事項
}

// LLM推定結果
export interface DesignPolicyEstimation {
  designBasis: DesignBasis[];
  foundationOptions: DesignOption[];
  seismicOptions: DesignOption[];
  structureOptions: DesignOption[];
  conflicts: ConflictItem[];
  recommendedPolicy: DesignPolicy;
  confidence: number; // 推定の確信度（0-1）
}

// フェーズ2の状態
export interface Phase2State {
  isLoading: boolean;
  estimation: DesignPolicyEstimation | null;
  userSelections: Record<string, string>; // ユーザーの選択
  currentStep: "loading" | "basis" | "options" | "conflicts" | "confirm";
  completedSteps: string[];
}