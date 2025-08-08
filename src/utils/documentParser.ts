import { ExtractedItem, ExtractionPattern, InfoCategory, ProjectInfo, DocumentAnalysisResult } from "@/types/extraction";

// 抽出パターンの定義
const extractionPatterns: ExtractionPattern[] = [
  // 案件名
  {
    key: "projectName",
    patterns: [
      /案件名[:：]\s*(.+?)[\n\r]/,
      /プロジェクト名[:：]\s*(.+?)[\n\r]/,
      /工事名[:：]\s*(.+?)[\n\r]/,
      /件名[:：]\s*(.+?)[\n\r]/,
    ],
    keywords: ["案件名", "プロジェクト名", "工事名"],
    category: "customer",
    processor: (match: string) => match.trim().slice(0, 100),
  },
  // 敷地住所
  {
    key: "siteAddress",
    patterns: [
      /所在地[:：]\s*(.+?)[\n\r]/,
      /敷地[:：]\s*(.+?)[\n\r]/,
      /建設地[:：]\s*(.+?)[\n\r]/,
      /住所[:：]\s*(.+?)[\n\r]/,
    ],
    keywords: ["所在地", "敷地", "建設地", "住所"],
    category: "customer",
  },
  // 敷地面積
  {
    key: "siteArea",
    patterns: [
      /敷地面積[:：]\s*([\d,]+\.?\d*)\s*[㎡平米m2]/,
      /土地面積[:：]\s*([\d,]+\.?\d*)\s*[㎡平米m2]/,
    ],
    keywords: ["敷地面積", "土地面積"],
    category: "customer",
    processor: (match: string) => {
      const num = match.replace(/[^\d.]/g, "");
      return num ? parseFloat(num).toString() : null;
    },
  },
  // 用途地域
  {
    key: "landUse",
    patterns: [
      /用途地域[:：]\s*(.+?)[\n\r]/,
      /(第[一二三１２３]種(低層|中高層|)住居地域|商業地域|工業地域|準工業地域)/,
    ],
    keywords: ["用途地域"],
    category: "general",
  },
  // 建ぺい率
  {
    key: "buildingCoverageRatio",
    patterns: [
      /建ぺい率[:：]\s*([\d]+)\s*[%％]/,
      /建蔽率[:：]\s*([\d]+)\s*[%％]/,
    ],
    keywords: ["建ぺい率", "建蔽率"],
    category: "general",
    processor: (match: string) => {
      const num = match.match(/\d+/);
      return num ? num[0] : null;
    },
  },
  // 容積率
  {
    key: "floorAreaRatio",
    patterns: [
      /容積率[:：]\s*([\d]+)\s*[%％]/,
    ],
    keywords: ["容積率"],
    category: "general",
    processor: (match: string) => {
      const num = match.match(/\d+/);
      return num ? num[0] : null;
    },
  },
  // 延床面積
  {
    key: "requiredFloorArea",
    patterns: [
      /延床面積[:：]\s*([\d,]+\.?\d*)\s*[㎡平米m2]/,
      /延べ床面積[:：]\s*([\d,]+\.?\d*)\s*[㎡平米m2]/,
      /総面積[:：]\s*([\d,]+\.?\d*)\s*[㎡平米m2]/,
    ],
    keywords: ["延床面積", "延べ床面積"],
    category: "customer",
    processor: (match: string) => {
      const num = match.replace(/[^\d.]/g, "");
      return num ? parseFloat(num).toString() : null;
    },
  },
  // 階数
  {
    key: "numberOfFloors",
    patterns: [
      /階数[:：]\s*([\d]+)\s*[階F]/,
      /地上([\d]+)階/,
      /([\d]+)階建て/,
    ],
    keywords: ["階数", "階建て"],
    category: "customer",
    processor: (match: string) => {
      const num = match.match(/\d+/);
      return num ? num[0] : null;
    },
  },
  // 予算
  {
    key: "budgetAmount",
    patterns: [
      /予算[:：]\s*([\d,]+\.?\d*)\s*[億万]?円/,
      /工事費[:：]\s*([\d,]+\.?\d*)\s*[億万]?円/,
    ],
    keywords: ["予算", "工事費"],
    category: "customer",
    processor: (match: string) => {
      const numMatch = match.match(/([\d,]+\.?\d*)\s*([億万])?円/);
      if (!numMatch) return null;
      let num = parseFloat(numMatch[1].replace(/,/g, ""));
      if (numMatch[2] === "億") num *= 100000000;
      else if (numMatch[2] === "万") num *= 10000;
      return num.toString();
    },
  },
];

// テキストから情報を抽出
export function extractProjectInfo(text: string): {
  extractedItems: ExtractedItem[];
  projectInfo: Partial<ProjectInfo>;
} {
  const extractedItems: ExtractedItem[] = [];
  const projectInfo: Partial<ProjectInfo> = {};

  extractionPatterns.forEach((pattern) => {
    let found = false;
    let bestMatch: { value: string; confidence: number } | null = null;

    // 正規表現で検索
    for (const regex of pattern.patterns) {
      const matches = text.match(regex);
      if (matches && matches[1]) {
        const value = pattern.processor ? pattern.processor(matches[1]) : matches[1].trim();
        if (value) {
          bestMatch = { value, confidence: 0.9 };
          found = true;
          break;
        }
      }
    }

    // キーワード検索（正規表現で見つからなかった場合）
    if (!found) {
      for (const keyword of pattern.keywords) {
        const keywordIndex = text.indexOf(keyword);
        if (keywordIndex !== -1) {
          // キーワードの後の内容を抽出（簡易的な実装）
          const afterKeyword = text.slice(keywordIndex + keyword.length, keywordIndex + keyword.length + 100);
          const valueMatch = afterKeyword.match(/[:：]?\s*([^\n\r]+)/);
          if (valueMatch) {
            const value = pattern.processor ? pattern.processor(valueMatch[1]) : valueMatch[1].trim();
            if (value) {
              bestMatch = { value, confidence: 0.7 };
              found = true;
              break;
            }
          }
        }
      }
    }

    // 抽出結果を保存
    const item: ExtractedItem = {
      id: crypto.randomUUID(),
      category: pattern.category,
      key: pattern.key,
      label: getLabel(pattern.key),
      value: bestMatch?.value || null,
      confidence: bestMatch?.confidence || 0,
      source: "uploaded_document",
      status: bestMatch ? "extracted" : "missing",
      required: isRequired(pattern.key),
    };

    extractedItems.push(item);

    // ProjectInfoに値を設定
    if (bestMatch?.value) {
      setProjectInfoValue(projectInfo, pattern.key, bestMatch.value);
    }
  });

  return { extractedItems, projectInfo };
}

// キーからラベルを取得
function getLabel(key: string): string {
  const labels: Record<string, string> = {
    projectName: "案件名",
    siteAddress: "敷地住所",
    siteArea: "敷地面積",
    landUse: "用途地域",
    buildingCoverageRatio: "建ぺい率",
    floorAreaRatio: "容積率",
    requiredFloorArea: "延床面積",
    numberOfFloors: "階数",
    budgetAmount: "予算",
  };
  return labels[key] || key;
}

// 必須項目かどうか
function isRequired(key: string): boolean {
  const requiredKeys = ["projectName", "siteAddress", "requiredFloorArea", "numberOfFloors"];
  return requiredKeys.includes(key);
}

// ProjectInfoに値を設定
function setProjectInfoValue(projectInfo: Partial<ProjectInfo>, key: string, value: string): void {
  switch (key) {
    case "projectName":
      projectInfo.projectName = value;
      break;
    case "siteAddress":
      projectInfo.siteAddress = value;
      break;
    case "siteArea":
      projectInfo.siteArea = parseFloat(value);
      break;
    case "landUse":
      projectInfo.landUse = value;
      break;
    case "buildingCoverageRatio":
      projectInfo.buildingCoverageRatio = parseFloat(value);
      break;
    case "floorAreaRatio":
      projectInfo.floorAreaRatio = parseFloat(value);
      break;
    case "requiredFloorArea":
      projectInfo.requiredFloorArea = parseFloat(value);
      break;
    case "numberOfFloors":
      projectInfo.numberOfFloors = parseInt(value);
      break;
    case "budgetAmount":
      projectInfo.budgetAmount = parseFloat(value);
      break;
  }
}

// ドキュメントを解析
export async function analyzeDocument(
  file: File,
  onProgress?: (progress: number) => void
): Promise<DocumentAnalysisResult> {
  const result: DocumentAnalysisResult = {
    documentId: crypto.randomUUID(),
    fileName: file.name,
    uploadedAt: new Date().toISOString(),
    fileType: file.type,
    extractedItems: [],
    projectInfo: {},
    processingStatus: "processing",
  };

  try {
    onProgress?.(10);

    // ファイルをテキストに変換（簡易実装）
    let text = "";
    if (file.type === "text/plain") {
      text = await file.text();
    } else if (file.type === "application/pdf") {
      // PDF処理は実際にはPDF.jsなどのライブラリが必要
      // ここではデモとして簡易的に実装
      text = await file.text();
    } else {
      throw new Error(`Unsupported file type: ${file.type}`);
    }

    onProgress?.(50);

    // テキストから情報を抽出
    const { extractedItems, projectInfo } = extractProjectInfo(text);
    
    result.extractedItems = extractedItems;
    result.projectInfo = projectInfo;
    result.rawText = text.slice(0, 1000); // プライバシー配慮のため一部のみ
    result.processingStatus = "completed";

    onProgress?.(100);
  } catch (error) {
    result.processingStatus = "failed";
    result.errorMessage = error instanceof Error ? error.message : "Unknown error";
  }

  return result;
}

// 抽出結果の完了率を計算
export function calculateCompletionPercentage(items: ExtractedItem[]): number {
  const requiredItems = items.filter(item => item.required);
  if (requiredItems.length === 0) return 100;

  const completedItems = requiredItems.filter(
    item => item.status === "confirmed" || (item.status === "extracted" && item.value)
  );

  return Math.round((completedItems.length / requiredItems.length) * 100);
}