import { InfoCategory, ExtractedItem } from "@/types/extraction";

// キーワード辞書
const KEYWORD_PATTERNS: Record<string, { keywords: string[]; patterns: RegExp[]; category: InfoCategory }> = {
  projectName: {
    keywords: ["プロジェクト名", "案件名", "工事名", "計画名", "プロジェクト"],
    patterns: [
      /(?:プロジェクト名|案件名|工事名|計画名)[：:]\s*(.+?)(?:\n|$)/,
      /「(.+?)」(?:プロジェクト|計画|工事)/,
      /(.+?)(?:プロジェクト|計画|工事)(?:\s|$)/
    ],
    category: "siteInfo"
  },
  siteName: {
    keywords: ["敷地名称", "施設名", "建物名"],
    patterns: [
      /(?:敷地名称|施設名|建物名)[：:]\s*(.+?)(?:\n|$)/,
    ],
    category: "siteInfo"
  },
  siteAddress: {
    keywords: ["住所", "所在地", "建設地", "敷地"],
    patterns: [
      /(?:住所|所在地|建設地)[：:]\s*(.+?)(?:\n|$)/,
      /(?:〒\d{3}-?\d{4}\s*)?((?:東京都|北海道|(?:京都|大阪)府|(?:神奈川|埼玉|千葉|愛知|兵庫|福岡)県).+?(?:市|区|町|村).+?)(?:\n|$)/,
    ],
    category: "siteInfo"
  },
  siteArea: {
    keywords: ["敷地面積", "敷地", "土地面積"],
    patterns: [
      /敷地面積[：:]\s*([\d,]+\.?\d*)\s*(?:㎡|m2|平米)/,
      /敷地[：:]\s*([\d,]+\.?\d*)\s*(?:㎡|m2|平米)/,
    ],
    category: "siteInfo"
  },
  landUse: {
    keywords: ["用途地域", "都市計画"],
    patterns: [
      /用途地域[：:]\s*(.+?)(?:\n|$)/,
      /(第[一二三]種(?:低層|中高層)?住居(?:専用)?地域|(?:近隣)?商業地域|準?工業地域|工業専用地域)/,
    ],
    category: "regulations"
  },
  buildingCoverageRatio: {
    keywords: ["建ぺい率", "建蔽率"],
    patterns: [
      /建[ぺ蔽]い率[：:]\s*([\d]+)\s*[%％]/,
      /建[ぺ蔽]い率[：:]\s*([\d]+)\/(\d+)/,
    ],
    category: "regulations"
  },
  floorAreaRatio: {
    keywords: ["容積率"],
    patterns: [
      /容積率[：:]\s*([\d]+)\s*[%％]/,
      /容積率[：:]\s*([\d]+)\/(\d+)/,
    ],
    category: "regulations"
  },
  buildingUse: {
    keywords: ["建物用途", "用途", "施設用途", "建築用途"],
    patterns: [
      /(?:建物|施設|建築)?用途[：:]\s*(.+?)(?:\n|$)/,
      /(?:事務所|店舗|工場|倉庫|住宅|ホテル|病院|学校)(?:ビル|建築|建物)?/
    ],
    category: "program"
  },
  totalFloorArea: {
    keywords: ["延床面積", "延べ床面積", "総床面積", "建築面積"],
    patterns: [
      /(?:延べ?床|総床|建築)面積[：:]\s*([\d,]+\.?\d*)\s*(?:㎡|m2|平米)/,
      /(?:延べ?床|総床)[：:]\s*([\d,]+\.?\d*)\s*(?:㎡|m2|平米)/,
    ],
    category: "program"
  },
  numberOfFloors: {
    keywords: ["階数", "階建", "地上", "地下"],
    patterns: [
      /地上(\d+)階(?:.*?地下(\d+)階)?/,
      /(\d+)階建/,
      /(\d+)[Ff]/,
    ],
    category: "program"
  },
  structureType: {
    keywords: ["構造", "構造種別", "S造", "RC造", "SRC造", "木造"],
    patterns: [
      /構造[：:]\s*(S造|RC造|SRC造|木造|鉄骨造|鉄筋コンクリート造|鉄骨鉄筋コンクリート造)/,
      /(S造|RC造|SRC造|木造|鉄骨造|鉄筋コンクリート造|鉄骨鉄筋コンクリート造)(?:を?希望|で?検討|を?想定)/,
    ],
    category: "program"
  },
  groundInfo: {
    keywords: ["地盤", "N値", "支持層", "液状化"],
    patterns: [
      /(?:地盤|支持層)[：:]\s*(.+?)(?:\n|$)/,
      /N値[：:]\s*([\d]+)/,
      /(液状化(?:の)?(?:可能性|リスク|懸念)(?:が)?(?:ある|高い|低い))/,
    ],
    category: "siteInfo"
  },
  tankCapacity: {
    keywords: ["タンク容量", "貯蔵量", "容量", "kL", "キロリットル"],
    patterns: [
      /(?:タンク)?容量[：:]\s*([\d,]+)\s*(?:kL|キロリットル)/,
      /(\d+)\s*kL(?:タンク|型)/,
    ],
    category: "tank"
  },
  tankContent: {
    keywords: ["内容物", "貯蔵物", "危険物", "油種"],
    patterns: [
      /(?:内容物|貯蔵物)[：:]\s*(.+?)(?:\n|$)/,
      /(?:ガソリン|軽油|重油|灯油|原油|アルコール|化学薬品)/
    ],
    category: "tank"
  },
  tankDiameter: {
    keywords: ["タンク直径", "直径", "内径"],
    patterns: [
      /(?:タンク)?直径[：:]\s*([\d,]+\.?\d*)\s*(?:m|メートル)/,
      /内径[：:]\s*([\d,]+\.?\d*)\s*(?:m|メートル)/,
    ],
    category: "tank"
  },
  tankHeight: {
    keywords: ["タンク高さ", "高さ", "タンク高"],
    patterns: [
      /(?:タンク)?高さ[：:]\s*([\d,]+\.?\d*)\s*(?:m|メートル)/,
      /タンク高[：:]\s*([\d,]+\.?\d*)\s*(?:m|メートル)/,
    ],
    category: "tank"
  },
};

// 信頼度を計算する関数
function calculateConfidence(matchedKeywords: number, totalKeywords: number, hasPattern: boolean): number {
  const keywordScore = matchedKeywords / totalKeywords;
  const patternBonus = hasPattern ? 0.3 : 0;
  return Math.min(keywordScore + patternBonus, 1.0);
}

// 値を正規化する関数
function normalizeValue(key: string, rawValue: string): string | null {
  if (!rawValue) return null;
  
  switch (key) {
    case "siteArea":
    case "requiredFloorArea":
      // 数値とカンマを処理
      return rawValue.replace(/,/g, "") + "㎡";
    
    case "buildingCoverageRatio":
    case "floorAreaRatio":
      // パーセンテージの処理
      if (rawValue.includes("/")) {
        const [num, den] = rawValue.split("/").map(s => parseInt(s.trim()));
        return `${Math.round((num / den) * 100)}%`;
      }
      return rawValue + "%";
    
    case "numberOfFloors":
      // 階数の処理
      const matches = rawValue.match(/\d+/g);
      if (matches) {
        const above = matches[0];
        const below = matches[1] || "0";
        return below !== "0" ? `地上${above}階/地下${below}階` : `地上${above}階`;
      }
      return rawValue;
    
    case "tankCapacity":
    case "tankDiameter":
    case "tankHeight":
      // タンク関連の数値はカンマを除去
      return rawValue.replace(/,/g, "");
    
    default:
      return rawValue.trim();
  }
}

// メインの情報抽出関数
export function extractInformation(text: string): ExtractedItem[] {
  const extracted: ExtractedItem[] = [];
  const processedText = text.toLowerCase();
  
  for (const [key, config] of Object.entries(KEYWORD_PATTERNS)) {
    let value: string | null = null;
    let source = "";
    let matchedKeywords = 0;
    
    // キーワードマッチング
    for (const keyword of config.keywords) {
      if (processedText.includes(keyword)) {
        matchedKeywords++;
      }
    }
    
    // パターンマッチング
    for (const pattern of config.patterns) {
      const match = text.match(pattern);
      if (match) {
        value = match[1] || match[0];
        source = match[0];
        break;
      }
    }
    
    // 信頼度計算
    const confidence = calculateConfidence(
      matchedKeywords,
      config.keywords.length,
      value !== null
    );
    
    // 抽出結果を追加
    if (matchedKeywords > 0 || value) {
      extracted.push({
        id: crypto.randomUUID(),
        category: config.category,
        key,
        label: getLabel(key),
        value: normalizeValue(key, value || ""),
        confidence,
        source: source || `キーワード: ${config.keywords.filter(k => processedText.includes(k)).join(", ")}`,
        status: value ? "extracted" : "missing",
        required: isRequired(key),
      });
    }
  }
  
  return extracted;
}

// ラベルを取得する関数
function getLabel(key: string): string {
  const labels: Record<string, string> = {
    siteAddress: "敷地住所",
    siteArea: "敷地面積",
    landUse: "用途地域",
    buildingCoverageRatio: "建ぺい率",
    floorAreaRatio: "容積率",
    requiredFloorArea: "延床面積",
    numberOfFloors: "階数",
    structureType: "構造種別",
    groundInfo: "地盤情報",
    tankCapacity: "タンク容量",
  };
  return labels[key] || key;
}

// 必須項目かどうかを判定する関数
function isRequired(key: string): boolean {
  const required = [
    "siteAddress",
    "siteArea",
    "landUse",
    "requiredFloorArea",
    "numberOfFloors"
  ];
  return required.includes(key);
}

// 複数の抽出結果をマージする関数
export function mergeExtractedItems(
  existing: ExtractedItem[],
  newItems: ExtractedItem[]
): ExtractedItem[] {
  const merged = [...existing];
  
  for (const newItem of newItems) {
    const existingIndex = merged.findIndex(item => item.key === newItem.key);
    
    if (existingIndex >= 0) {
      // 既存のアイテムがある場合、信頼度が高い方を優先
      if (newItem.confidence > merged[existingIndex].confidence) {
        merged[existingIndex] = newItem;
      }
    } else {
      // 新規アイテムを追加
      merged.push(newItem);
    }
  }
  
  return merged;
}

// 不足情報を特定する関数
export function identifyMissingInfo(extracted: ExtractedItem[]): string[] {
  const required = [
    { key: "siteAddress", label: "敷地住所" },
    { key: "siteArea", label: "敷地面積" },
    { key: "landUse", label: "用途地域" },
    { key: "requiredFloorArea", label: "延床面積" },
    { key: "numberOfFloors", label: "階数" },
  ];
  
  const missing: string[] = [];
  for (const req of required) {
    const item = extracted.find(e => e.key === req.key);
    if (!item || item.status === "missing") {
      missing.push(req.label);
    }
  }
  
  return missing;
}

// AIエージェントのレスポンスを生成する関数
export function generateAgentResponse(
  extracted: ExtractedItem[],
  phase: string
): string {
  const missing = identifyMissingInfo(extracted);
  
  if (phase === "p1") {
    if (missing.length === 0) {
      return "必要な情報がすべて揃いました。次のフェーズ「設計方針の決定」に進みます。";
    } else if (extracted.length > 0) {
      const extractedLabels = extracted
        .filter(e => e.value)
        .map(e => `${e.label}: ${e.value}`)
        .join("\n");
      
      return `以下の情報を確認しました:\n\n${extractedLabels}\n\nまだ以下の情報が不足しています:\n${missing.join("、")}\n\n不足情報を入力してください。`;
    } else {
      return "プロジェクトの基本情報を入力してください。必要な情報:\n" + missing.join("、");
    }
  }
  
  return "情報を処理中です...";
}