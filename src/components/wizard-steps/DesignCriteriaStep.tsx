"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Zap,
  Shield,
  TrendingDown,
  AlertTriangle,
  Info
} from "lucide-react";
import {
  TankFoundationDesignInput,
  ValidationResponse
} from "@/types/tankFoundationDesign";

interface DesignCriteriaStepProps {
  data: Partial<TankFoundationDesignInput>;
  onUpdate: (data: Partial<TankFoundationDesignInput>) => void;
  validation?: ValidationResponse;
}

const SEISMIC_LEVELS = [
  {
    value: "L2",
    label: "レベル2地震動",
    description: "極めて稀に発生する地震動（供用期間中に1〜2回）",
    kh_default: 0.3,
    kv_default: 0.15
  }
];

const SAFETY_FACTORS = [
  {
    category: "支持力",
    key: "sf_bearing",
    label: "支持力安全率",
    default: 3.0,
    min: 2.5,
    max: 4.0,
    description: "常時の支持力に対する安全率"
  }
];

const SETTLEMENT_LIMITS = [
  {
    key: "total_settlement_limit_mm",
    label: "許容全沈下量 (mm)",
    default: 50,
    description: "タンク全体の許容沈下量"
  },
  {
    key: "diff_settlement_ratio",
    label: "許容不同沈下率",
    default: "1/300",
    options: ["1/200", "1/300", "1/500"],
    description: "タンク直径に対する傾斜の限界値"
  }
];

export function DesignCriteriaStep({ 
  data, 
  onUpdate, 
  validation 
}: DesignCriteriaStepProps) {
  const handleCriteriaChange = (field: string, value: any) => {
    onUpdate({
      criteria: {
        ...data.criteria!,
        [field]: value
      }
    });
  };

  const handleSeismicLevelChange = (value: string) => {
    const level = SEISMIC_LEVELS.find(l => l.value === value);
    if (level) {
      handleCriteriaChange("seismic_level", value);
      handleCriteriaChange("kh", level.kh_default);
      handleCriteriaChange("kv", level.kv_default);
    }
  };

  return (
    <div className="space-y-6">
      {/* Seismic Design */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">耐震設計</h3>
        </div>
        
        <div className="space-y-4">
          <div className="grid gap-3">
            <Label>耐震設計レベル</Label>
            <RadioGroup
              value={data.criteria?.seismic_level || "L2"}
              onValueChange={handleSeismicLevelChange}
            >
              {SEISMIC_LEVELS.map(level => (
                <div key={level.value} className="flex items-start space-x-3">
                  <RadioGroupItem value={level.value} id={level.value} />
                  <div className="grid gap-1">
                    <Label htmlFor={level.value} className="font-normal cursor-pointer">
                      {level.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {level.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="kh">水平震度 kh</Label>
              <Input
                id="kh"
                type="number"
                step="0.01"
                value={data.criteria?.kh || ""}
                onChange={(e) => handleCriteriaChange("kh", parseFloat(e.target.value))}
                placeholder="例: 0.30"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="kv">鉛直震度 kv</Label>
              <Input
                id="kv"
                type="number"
                step="0.01"
                value={data.criteria?.kv || ""}
                onChange={(e) => handleCriteriaChange("kv", parseFloat(e.target.value))}
                placeholder="例: 0.15"
              />
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              震度は地域や重要度に応じて調整してください。
              デフォルト値は一般的な値です。
            </AlertDescription>
          </Alert>
        </div>
      </Card>

      {/* Safety Factors */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">安全率</h3>
        </div>
        
        <div className="space-y-4">
          {SAFETY_FACTORS.map(factor => (
            <div key={factor.key} className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={factor.key}>{factor.label}</Label>
                <span className="text-sm text-muted-foreground">
                  推奨: {factor.default}
                </span>
              </div>
              <Input
                id={factor.key}
                type="number"
                step="0.1"
                min={factor.min}
                max={factor.max}
                value={data.criteria?.[factor.key as keyof typeof data.criteria] || factor.default}
                onChange={(e) => handleCriteriaChange(factor.key, parseFloat(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                {factor.description}（範囲: {factor.min} - {factor.max}）
              </p>
            </div>
          ))}

          <div className="grid gap-2">
            <Label htmlFor="allowable_stress">杭材の許容応力度 (MPa)</Label>
            <Input
              id="allowable_stress"
              type="number"
              value={data.criteria?.allowable_stress_pile_mpa || ""}
              onChange={(e) => handleCriteriaChange("allowable_stress_pile_mpa", parseFloat(e.target.value))}
              placeholder="例: 200"
            />
            <p className="text-xs text-muted-foreground">
              杭材料の長期許容応力度
            </p>
          </div>
        </div>
      </Card>

      {/* Settlement Limits */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">沈下制限</h3>
        </div>
        
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="total_settlement">許容全沈下量 (mm)</Label>
            <Input
              id="total_settlement"
              type="number"
              value={data.criteria?.total_settlement_limit_mm || 50}
              onChange={(e) => handleCriteriaChange("total_settlement_limit_mm", parseInt(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              タンク全体の許容沈下量
            </p>
          </div>

          <div className="grid gap-2">
            <Label>許容不同沈下率</Label>
            <RadioGroup
              value={data.criteria?.diff_settlement_ratio || "1/300"}
              onValueChange={(value) => handleCriteriaChange("diff_settlement_ratio", value)}
            >
              {["1/200", "1/300", "1/500"].map(ratio => (
                <div key={ratio} className="flex items-center space-x-2">
                  <RadioGroupItem value={ratio} id={`ratio-${ratio}`} />
                  <Label htmlFor={`ratio-${ratio}`} className="font-normal">
                    {ratio}
                    {ratio === "1/300" && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        標準
                      </Badge>
                    )}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              タンク直径に対する傾斜の限界値
            </p>
          </div>
        </div>
      </Card>

      {/* Special Considerations */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">特別な考慮事項</h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="liquefaction"
              checked={data.criteria?.consider_liquefaction || false}
              onCheckedChange={(checked) => 
                handleCriteriaChange("consider_liquefaction", checked)
              }
            />
            <div className="grid gap-1">
              <Label htmlFor="liquefaction" className="font-normal cursor-pointer">
                液状化の検討
              </Label>
              <p className="text-sm text-muted-foreground">
                地震時の液状化判定および対策の検討を行う
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="negative_friction"
              checked={data.criteria?.consider_negative_friction || false}
              onCheckedChange={(checked) => 
                handleCriteriaChange("consider_negative_friction", checked)
              }
            />
            <div className="grid gap-1">
              <Label htmlFor="negative_friction" className="font-normal cursor-pointer">
                負の摩擦力の考慮
              </Label>
              <p className="text-sm text-muted-foreground">
                軟弱地盤における杭の負の摩擦力を考慮する
              </p>
            </div>
          </div>
        </div>

        {(data.criteria?.consider_liquefaction || data.criteria?.consider_negative_friction) && (
          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              特別な考慮事項が選択されています。
              計算時間が通常より長くなる可能性があります。
            </AlertDescription>
          </Alert>
        )}
      </Card>
    </div>
  );
}