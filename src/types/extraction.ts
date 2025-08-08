// 情報カテゴリの定義
export type InfoCategory = "customer" | "general" | "internal";

// 抽出項目の定義
export interface ExtractedItem {
  id: string;
  category: InfoCategory;
  key: string;
  label: string;
  value: string | null;
  confidence: number; // 0-1の確信度
  source: string; // 抽出元のドキュメント名やページ
  status: "extracted" | "missing" | "confirmed" | "edited";
  required: boolean;
  note?: string;
}

// 建築計画の基本情報
export interface ProjectInfo {
  // 案件情報
  projectName: string;
  projectCode?: string;
  clientName?: string;
  
  // 事業目的・背景
  purpose: string;
  background?: string;
  challenges?: string[];
  
  // 敷地情報
  siteAddress: string;
  siteArea?: number; // 平米
  landUse?: string; // 用途地域
  buildingCoverageRatio?: number; // 建ぺい率 (%)
  floorAreaRatio?: number; // 容積率 (%)
  heightRestrictions?: {
    type: string; // 斜線制限の種類
    details: string;
  }[];
  
  // 要求規模情報
  requiredFloorArea?: number; // 延床面積（平米）
  numberOfFloors?: number; // 階数
  roomRequirements?: {
    name: string;
    area?: number;
    quantity?: number;
    note?: string;
  }[];
  
  // スケジュール・予算
  targetCompletionDate?: string;
  budgetAmount?: number;
  budgetNote?: string;
}

// ドキュメント解析結果
export interface DocumentAnalysisResult {
  documentId: string;
  fileName: string;
  uploadedAt: string;
  fileType: string;
  extractedItems: ExtractedItem[];
  projectInfo: Partial<ProjectInfo>;
  rawText?: string; // プライバシー配慮が必要
  processingStatus: "pending" | "processing" | "completed" | "failed";
  errorMessage?: string;
}

// 抽出テンプレート（正規表現やキーワード）
export interface ExtractionPattern {
  key: string;
  patterns: RegExp[];
  keywords: string[];
  category: InfoCategory;
  processor?: (match: string) => string | null;
}

// フェーズ1の状態管理
export interface Phase1State {
  documents: DocumentAnalysisResult[];
  extractedItems: ExtractedItem[];
  projectInfo: Partial<ProjectInfo>;
  validationErrors: {
    field: string;
    message: string;
  }[];
  completionPercentage: number;
}