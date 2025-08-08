import { NextRequest, NextResponse } from "next/server";
import { DesignPolicyEstimation, DesignBasis, DesignOption, ConflictItem } from "@/types/designPolicy";
import { ProjectInfo } from "@/types/extraction";

// 設計方針を推定する関数
async function estimateDesignPolicy(projectInfo: Partial<ProjectInfo>): Promise<DesignPolicyEstimation> {
  // プロジェクト情報に基づいて推定結果を生成
  const isLargeSite = (projectInfo.siteArea || 0) > 10000;
  const hasWeakGround = projectInfo.siteAddress?.includes("埋立") || projectInfo.siteAddress?.includes("沿岸");
  
  const designBasis: DesignBasis[] = [
    {
      category: "法規",
      items: [
        {
          id: "law1",
          name: "建築基準法",
          description: "構造耐力、防火、避難等の基本的要求",
          source: "建築基準法第20条",
          required: true,
        },
        {
          id: "law2",
          name: "消防法",
          description: "危険物貯蔵施設の技術基準",
          source: "消防法第10条",
          link: "https://elaws.e-gov.go.jp/document?lawid=323AC0000000186",
          required: true,
        },
      ],
    },
    {
      category: "設計基準",
      items: [
        {
          id: "std1",
          name: "建築構造設計基準",
          description: "国土交通省大臣官房官庁営繕部監修",
          source: "平成30年版",
          required: true,
        },
        {
          id: "std2",
          name: "危険物施設の技術基準",
          description: "タンク基礎の構造計算基準",
          source: "危険物の規制に関する規則",
          required: true,
        },
      ],
    },
    {
      category: "過去実績",
      items: [
        {
          id: "ref1",
          name: "類似案件A",
          description: "10,000kLタンク基礎（杭基礎採用）",
          source: "2022年竣工",
          required: false,
        },
      ],
    },
  ];

  const foundationOptions: DesignOption[] = [
    {
      id: "foundation1",
      name: "直接基礎",
      description: "地盤改良を併用したべた基礎",
      reasons: [
        "工期が短い",
        "施工が簡易",
        "コストが比較的安価",
      ],
      isRecommended: !hasWeakGround,
      constraints: hasWeakGround ? ["地盤が軟弱なため不適"] : [],
    },
    {
      id: "foundation2",
      name: "杭基礎",
      description: "PHC杭またはSC杭による支持",
      reasons: [
        "支持層まで確実に到達",
        "不同沈下のリスクが低い",
        "地震時の安定性が高い",
      ],
      isRecommended: hasWeakGround,
      constraints: ["工期が長い", "コストが高い"],
    },
  ];

  const seismicOptions: DesignOption[] = [
    {
      id: "seismic1",
      name: "レベル1地震動",
      description: "中規模地震に対する検証",
      reasons: ["法令上の最低要求を満たす"],
      isRecommended: false,
    },
    {
      id: "seismic2",
      name: "レベル2地震動",
      description: "大規模地震に対する検証",
      reasons: [
        "危険物施設として推奨",
        "BCP対応",
        "長期的な安全性確保",
      ],
      isRecommended: true,
    },
  ];

  const conflicts: ConflictItem[] = [
    {
      id: "conflict1",
      question: "基礎形式の選定",
      options: [
        {
          value: "direct",
          label: "直接基礎",
          description: "地盤改良併用",
        },
        {
          value: "pile",
          label: "杭基礎",
          description: "支持層への打設",
        },
      ],
      defaultValue: hasWeakGround ? "pile" : "direct",
      impact: "工期・コスト・構造安定性に大きく影響",
    },
    {
      id: "conflict2",
      question: "耐震設計レベル",
      options: [
        {
          value: "level1",
          label: "レベル1",
          description: "法令要求レベル",
        },
        {
          value: "level2",
          label: "レベル2",
          description: "高度な耐震性能",
        },
      ],
      defaultValue: "level2",
      impact: "構造部材の断面・配筋量に影響",
    },
  ];

  return {
    designBasis,
    foundationOptions,
    seismicOptions,
    structureOptions: [],
    conflicts,
    recommendedPolicy: {
      foundationType: hasWeakGround ? "杭基礎" : "直接基礎",
      seismicLevel: "レベル2",
      structureType: "RC造",
      fireResistance: "耐火構造",
      specialConsiderations: [
        "液状化対策",
        "塩害対策",
      ],
    },
    confidence: 0.85,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectInfo } = body;

    if (!projectInfo) {
      return NextResponse.json(
        { error: "Project information is required" },
        { status: 400 }
      );
    }

    const estimation = await estimateDesignPolicy(projectInfo);

    return NextResponse.json(estimation);
  } catch (error) {
    console.error("Design policy estimation error:", error);
    return NextResponse.json(
      { error: "Failed to estimate design policy" },
      { status: 500 }
    );
  }
}