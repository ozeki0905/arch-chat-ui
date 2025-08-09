"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  AlertTriangle,
  Cylinder,
  MapPin,
  Book,
  Layers,
  Settings,
  Package,
  Calculator,
  FileText
} from "lucide-react";
import {
  TankFoundationDesignInput,
  ValidationResponse
} from "@/types/tankFoundationDesign";

interface ReviewStepProps {
  data: Partial<TankFoundationDesignInput>;
  onUpdate: (data: Partial<TankFoundationDesignInput>) => void;
  validation?: ValidationResponse;
  onRunCalculation: () => void;
}

export function ReviewStep({ 
  data, 
  onUpdate, 
  validation,
  onRunCalculation 
}: ReviewStepProps) {
  const sections = [
    {
      key: "project",
      icon: FileText,
      title: "プロジェクト情報",
      items: [
        { label: "プロジェクト名", value: data.project?.name },
        { label: "プロジェクトID", value: data.project?.project_id },
        { label: "作成者", value: data.project?.created_by || "未設定" }
      ]
    },
    {
      key: "site",
      icon: MapPin,
      title: "サイト情報",
      items: [
        { label: "サイト名", value: data.site?.site_name },
        { label: "所在地", value: data.site?.location },
        { label: "座標", value: data.site?.lat && data.site?.lng ? `${data.site.lat}, ${data.site.lng}` : "未設定" }
      ]
    },
    {
      key: "tank",
      icon: Cylinder,
      title: "タンク仕様",
      items: [
        { label: "公称容量", value: data.tank?.capacity_kl ? `${data.tank.capacity_kl} kL` : undefined },
        { label: "内容物", value: data.tank?.content_type },
        { label: "寸法", value: data.tank?.diameter_m && data.tank?.height_m ? `φ${data.tank.diameter_m}m × H${data.tank.height_m}m` : undefined },
        { label: "屋根形式", value: data.tank?.roof_type }
      ]
    },
    {
      key: "regulations",
      icon: Book,
      title: "適用法規",
      items: [
        { label: "法的分類", value: data.regulations?.legal_classification },
        { label: "適用法令", value: data.regulations?.applied_codes?.join(", ") }
      ]
    },
    {
      key: "soil",
      icon: Layers,
      title: "地盤データ",
      items: [
        { label: "地下水位", value: data.soil_profile?.gw_level_m ? `GL-${data.soil_profile.gw_level_m}m` : "未設定" },
        { label: "地層数", value: data.soil_profile?.layers?.length ? `${data.soil_profile.layers.length}層` : undefined }
      ]
    },
    {
      key: "criteria",
      icon: Settings,
      title: "設計条件",
      items: [
        { label: "耐震レベル", value: data.criteria?.seismic_level },
        { label: "震度", value: data.criteria?.kh && data.criteria?.kv ? `kh=${data.criteria.kh}, kv=${data.criteria.kv}` : undefined },
        { label: "支持力安全率", value: data.criteria?.sf_bearing },
        { label: "許容沈下", value: data.criteria?.total_settlement_limit_mm ? `${data.criteria.total_settlement_limit_mm}mm` : undefined },
        { label: "特別考慮", value: [
          data.criteria?.consider_liquefaction && "液状化",
          data.criteria?.consider_negative_friction && "負の摩擦力"
        ].filter(Boolean).join(", ") || "なし" }
      ]
    },
    {
      key: "piles",
      icon: Package,
      title: "杭カタログ",
      items: [
        { label: "選択数", value: data.pile_catalog?.length ? `${data.pile_catalog.length}種類` : undefined }
      ]
    }
  ];

  // Check completeness
  const incompleteSteps = sections.filter(section => {
    return section.items.some(item => !item.value || item.value === "未設定");
  });

  const isComplete = incompleteSteps.length === 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {sections.map(section => {
        const Icon = section.icon;
        const hasIssues = section.items.some(item => !item.value || item.value === "未設定");
        
        return (
          <Card key={section.key} className={hasIssues ? "border-yellow-500" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                {section.title}
                {hasIssues && (
                  <Badge variant="outline" className="ml-auto text-yellow-600">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    要確認
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {section.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}:</span>
                    <span className={item.value && item.value !== "未設定" ? "font-medium" : "text-yellow-600"}>
                      {item.value || "未設定"}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Validation Summary */}
      {!isComplete && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-2">以下の項目を確認してください:</p>
            <ul className="list-disc pl-5 space-y-1">
              {incompleteSteps.map(section => (
                <li key={section.key} className="text-sm">
                  {section.title}: {
                    section.items
                      .filter(item => !item.value || item.value === "未設定")
                      .map(item => item.label)
                      .join(", ")
                  }
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Load Cases (Auto-generated) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            荷重ケース（自動生成）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>常時</span>
              <Badge variant="secondary">自重のみ</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>満載時</span>
              <Badge variant="secondary">自重 + 内容物</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>地震時L2</span>
              <Badge variant="secondary">満載時 + L2地震力</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calculation Options */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">計算準備完了</p>
                <p className="text-sm text-muted-foreground mt-1">
                  入力データの検証が完了しました。
                  計算実行ボタンをクリックして設計計算を開始してください。
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">計算内容:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>施設分類の判定</li>
                <li>タンク形状の検証</li>
                <li>地盤の適合性確認</li>
                <li>直接基礎の検討</li>
                <li>杭基礎の設計（必要な場合）</li>
                <li>液状化判定（指定時）</li>
              </ul>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>計算時間の目安: 30秒〜2分</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={onRunCalculation}
          disabled={!isComplete}
          className="min-w-[200px]"
        >
          <Calculator className="h-5 w-5 mr-2" />
          計算実行
        </Button>
      </div>
    </div>
  );
}