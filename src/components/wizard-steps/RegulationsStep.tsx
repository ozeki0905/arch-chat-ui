"use client";

import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Book, 
  Info,
  HelpCircle,
  Sparkles,
  ExternalLink
} from "lucide-react";
import {
  TankFoundationDesignInput,
  ValidationResponse
} from "@/types/tankFoundationDesign";

interface RegulationsStepProps {
  data: Partial<TankFoundationDesignInput>;
  onUpdate: (data: Partial<TankFoundationDesignInput>) => void;
  validation?: ValidationResponse;
}

const LEGAL_CLASSIFICATIONS = [
  { 
    value: "危険物_特定", 
    label: "危険物施設（特定屋外タンク貯蔵所）",
    description: "容量1,000kL以上の危険物タンク",
    applicableCodes: ["消防法", "危険物政令", "危険物規則"]
  },
  { 
    value: "危険物_準特定", 
    label: "危険物施設（準特定屋外タンク貯蔵所）",
    description: "容量500kL以上1,000kL未満の危険物タンク",
    applicableCodes: ["消防法", "危険物政令", "危険物規則"]
  },
  { 
    value: "危険物_一般", 
    label: "危険物施設（一般屋外タンク貯蔵所）",
    description: "容量500kL未満の危険物タンク",
    applicableCodes: ["消防法", "危険物政令"]
  },
  { 
    value: "高圧ガス", 
    label: "高圧ガス施設",
    description: "高圧ガス保安法が適用される施設",
    applicableCodes: ["高圧ガス保安法", "一般高圧ガス保安規則"]
  },
  { 
    value: "その他", 
    label: "その他の貯蔵施設",
    description: "上記に該当しない貯蔵施設",
    applicableCodes: ["建築基準法"]
  }
];

const APPLICABLE_CODES = [
  { 
    value: "消防法", 
    label: "消防法",
    version: "令和5年改正",
    tooltip: "危険物の貯蔵・取扱いに関する基本法令"
  },
  { 
    value: "危険物政令", 
    label: "危険物の規制に関する政令",
    version: "令和5年改正",
    tooltip: "消防法に基づく技術基準の詳細規定"
  },
  { 
    value: "危険物規則", 
    label: "危険物の規制に関する規則",
    version: "令和5年改正",
    tooltip: "タンク基礎・地盤の技術基準を規定"
  },
  { 
    value: "建築基準法", 
    label: "建築基準法",
    version: "令和4年改正",
    tooltip: "建築物としての構造基準"
  },
  { 
    value: "高圧ガス保安法", 
    label: "高圧ガス保安法",
    version: "令和5年改正",
    tooltip: "高圧ガス設備の保安基準"
  },
  { 
    value: "API650", 
    label: "API 650",
    version: "13th Edition",
    tooltip: "石油タンクの設計・建設に関する米国規格"
  },
  { 
    value: "JIS_B8501", 
    label: "JIS B 8501",
    version: "2013年版",
    tooltip: "鋼製石油貯槽の構造に関する日本工業規格"
  }
];

export function RegulationsStep({ 
  data, 
  onUpdate, 
  validation 
}: RegulationsStepProps) {
  const [showLLMTooltip, setShowLLMTooltip] = useState<string | null>(null);

  const handleClassificationChange = (value: string) => {
    const classification = LEGAL_CLASSIFICATIONS.find(c => c.value === value);
    
    onUpdate({
      regulations: {
        ...data.regulations,
        legal_classification: value,
        // Auto-select applicable codes based on classification
        applied_codes: classification?.applicableCodes || []
      }
    });
  };

  const handleCodeToggle = (code: string, checked: boolean) => {
    const currentCodes = data.regulations?.applied_codes || [];
    const newCodes = checked
      ? [...currentCodes, code]
      : currentCodes.filter(c => c !== code);
    
    onUpdate({
      regulations: {
        ...data.regulations!,
        applied_codes: newCodes
      }
    });
  };

  const handleVersionChange = (code: string, version: string) => {
    onUpdate({
      regulations: {
        ...data.regulations!,
        code_versions: {
          ...data.regulations?.code_versions,
          [code]: version
        }
      }
    });
  };

  const getLLMExplanation = async (code: string) => {
    // TODO: Call LLM API for explanation
    // For now, return mock explanation
    setShowLLMTooltip(code);
    setTimeout(() => setShowLLMTooltip(null), 5000);
  };

  const selectedClassification = LEGAL_CLASSIFICATIONS.find(
    c => c.value === data.regulations?.legal_classification
  );

  return (
    <div className="space-y-6">
      {/* Legal Classification */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Book className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">法的分類</h3>
        </div>
        
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="classification">施設分類 *</Label>
            <Select
              value={data.regulations?.legal_classification || ""}
              onValueChange={handleClassificationChange}
            >
              <SelectTrigger id="classification">
                <SelectValue placeholder="施設分類を選択" />
              </SelectTrigger>
              <SelectContent>
                {LEGAL_CLASSIFICATIONS.map(classification => (
                  <SelectItem key={classification.value} value={classification.value}>
                    <div>
                      <div>{classification.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {classification.description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedClassification && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm font-medium mb-2">推奨される適用法令:</p>
              <div className="flex flex-wrap gap-2">
                {selectedClassification.applicableCodes.map(code => (
                  <Badge key={code} variant="secondary">
                    {code}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Applicable Codes */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Book className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">適用法令・規格</h3>
        </div>
        
        <div className="space-y-3">
          <TooltipProvider>
            {APPLICABLE_CODES.map(code => {
              const isChecked = data.regulations?.applied_codes?.includes(code.value) || false;
              const version = data.regulations?.code_versions?.[code.value] || code.version;
              
              return (
                <div
                  key={code.value}
                  className={`p-3 rounded-lg border transition-colors ${
                    isChecked ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={code.value}
                      checked={isChecked}
                      onCheckedChange={(checked) => 
                        handleCodeToggle(code.value, checked as boolean)
                      }
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={code.value}
                          className="text-base font-medium cursor-pointer"
                        >
                          {code.label}
                        </Label>
                        <Badge variant="outline" className="text-xs">
                          {version}
                        </Badge>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => getLLMExplanation(code.value)}
                            >
                              <HelpCircle className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-2">
                              <p className="text-sm font-medium">{code.label}</p>
                              <p className="text-xs">{code.tooltip}</p>
                              {showLLMTooltip === code.value && (
                                <div className="pt-2 border-t">
                                  <div className="flex items-center gap-1 mb-1">
                                    <Sparkles className="h-3 w-3 text-primary" />
                                    <span className="text-xs font-medium">AI解説</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    この法令は{code.value === "危険物規則" 
                                      ? "タンク基礎の構造計算において、地盤の支持力や杭の設計基準を定めています。特に第20条の5では液状化判定の方法が規定されています。"
                                      : "タンク設計の基本的な要求事項を定めています。"
                                    }
                                  </p>
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </TooltipProvider>
        </div>
      </Card>

      {/* Selected Codes Summary */}
      {data.regulations?.applied_codes && data.regulations.applied_codes.length > 0 && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-sm">選択された法令・規格</p>
              <p className="text-sm text-muted-foreground mt-1">
                {data.regulations.applied_codes.length}件の法令・規格が選択されています。
                これらの要求事項に基づいて設計計算が実行されます。
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* External Links */}
      <div className="flex items-center gap-2 text-sm">
        <Button variant="link" size="sm" className="gap-1 px-0">
          <ExternalLink className="h-3 w-3" />
          法令データベース (e-Gov)
        </Button>
        <span className="text-muted-foreground">•</span>
        <Button variant="link" size="sm" className="gap-1 px-0">
          <ExternalLink className="h-3 w-3" />
          消防法令適用早見表
        </Button>
      </div>
    </div>
  );
}