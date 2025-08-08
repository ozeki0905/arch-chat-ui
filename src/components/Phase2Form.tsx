"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle, AlertCircle, ExternalLink, Sparkles, Info } from "lucide-react";
import { 
  DesignPolicyEstimation, 
  DesignPolicy, 
  DesignBasis,
  DesignOption,
  ConflictItem 
} from "@/types/designPolicy";
import { ProjectInfo } from "@/types/extraction";

interface Phase2FormProps {
  projectInfo: Partial<ProjectInfo>;
  onComplete: (policy: DesignPolicy) => void;
  onBack?: () => void;
}

type Step = "loading" | "basis" | "options" | "conflicts" | "confirm";

export function Phase2Form({ projectInfo, onComplete, onBack }: Phase2FormProps) {
  const [currentStep, setCurrentStep] = useState<Step>("loading");
  const [estimation, setEstimation] = useState<DesignPolicyEstimation | null>(null);
  const [userSelections, setUserSelections] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // LLMから設計方針を取得
  useEffect(() => {
    fetchDesignPolicy();
  }, []);

  const fetchDesignPolicy = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/design-policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectInfo }),
      });

      if (!response.ok) {
        throw new Error("設計方針の推定に失敗しました");
      }

      const data = await response.json();
      setEstimation(data);
      
      // デフォルト選択を設定
      const defaults: Record<string, string> = {};
      data.conflicts.forEach((conflict: ConflictItem) => {
        if (conflict.defaultValue) {
          defaults[conflict.id] = conflict.defaultValue;
        }
      });
      setUserSelections(defaults);
      
      setCurrentStep("basis");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectionChange = (conflictId: string, value: string) => {
    setUserSelections(prev => ({ ...prev, [conflictId]: value }));
  };

  const handleComplete = () => {
    if (!estimation) return;

    const policy: DesignPolicy = {
      ...estimation.recommendedPolicy,
      foundationType: userSelections.conflict1 === "pile" ? "杭基礎" : "直接基礎",
      seismicLevel: userSelections.conflict2 === "level2" ? "レベル2" : "レベル1",
    };

    onComplete(policy);
  };

  const getStepProgress = () => {
    const steps: Step[] = ["basis", "options", "conflicts", "confirm"];
    const currentIndex = steps.indexOf(currentStep);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  if (loading || currentStep === "loading") {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
          <p className="text-lg font-medium">設計方針を推定中...</p>
          <p className="text-sm text-muted-foreground mt-2">
            プロジェクト情報から最適な設計基準と方針を分析しています
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex justify-center mt-4">
            <Button onClick={fetchDesignPolicy} variant="outline">
              再試行
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!estimation) return null;

  return (
    <div className="space-y-4">
      {/* 進捗バー */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">フェーズ2: 設計方針の決定</h3>
          <Badge variant="secondary">
            <Sparkles className="h-3 w-3 mr-1" />
            確信度: {Math.round(estimation.confidence * 100)}%
          </Badge>
        </div>
        <Progress value={getStepProgress()} className="h-2" />
      </div>

      {/* 基準情報（ステップ1） */}
      {currentStep === "basis" && (
        <Card>
          <CardHeader>
            <CardTitle>適用基準・法規</CardTitle>
            <CardDescription>
              プロジェクトに適用される法規制と設計基準を確認してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="法規" className="w-full">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="法規">法規</TabsTrigger>
                <TabsTrigger value="設計基準">設計基準</TabsTrigger>
                <TabsTrigger value="過去実績">過去実績</TabsTrigger>
              </TabsList>
              
              {estimation.designBasis.map((basis) => (
                <TabsContent key={basis.category} value={basis.category}>
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-3">
                      {basis.items.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{item.name}</h4>
                                {item.required && (
                                  <Badge variant="destructive" className="text-xs">必須</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {item.description}
                              </p>
                              {item.source && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  出典: {item.source}
                                </p>
                              )}
                            </div>
                            {item.link && (
                              <Button
                                variant="ghost"
                                size="icon"
                                asChild
                                className="ml-2"
                              >
                                <a href={item.link} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              ))}
            </Tabs>
            
            <div className="flex justify-end mt-6">
              <Button onClick={() => setCurrentStep("options")}>
                次へ: 設計オプション
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 設計オプション（ステップ2） */}
      {currentStep === "options" && (
        <div className="space-y-4">
          {/* 基礎形式 */}
          <Card>
            <CardHeader>
              <CardTitle>基礎形式の選択肢</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {estimation.foundationOptions.map((option) => (
                <div
                  key={option.id}
                  className={`p-4 rounded-lg border ${
                    option.isRecommended ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{option.name}</h4>
                        {option.isRecommended && (
                          <Badge className="text-xs">推奨</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {option.description}
                      </p>
                      
                      <div className="mt-3 space-y-1">
                        <p className="text-xs font-medium">メリット:</p>
                        {option.reasons.map((reason, idx) => (
                          <p key={idx} className="text-xs text-muted-foreground pl-3">
                            • {reason}
                          </p>
                        ))}
                      </div>
                      
                      {option.constraints && option.constraints.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs font-medium text-destructive">制約:</p>
                          {option.constraints.map((constraint, idx) => (
                            <p key={idx} className="text-xs text-destructive/80 pl-3">
                              • {constraint}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 耐震レベル */}
          <Card>
            <CardHeader>
              <CardTitle>耐震設計レベル</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {estimation.seismicOptions.map((option) => (
                <div
                  key={option.id}
                  className={`p-4 rounded-lg border ${
                    option.isRecommended ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{option.name}</h4>
                    {option.isRecommended && (
                      <Badge className="text-xs">推奨</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {option.description}
                  </p>
                  <div className="mt-2">
                    {option.reasons.map((reason, idx) => (
                      <p key={idx} className="text-xs text-muted-foreground">
                        • {reason}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep("basis")}>
              戻る
            </Button>
            <Button onClick={() => setCurrentStep("conflicts")}>
              次へ: 選択確認
            </Button>
          </div>
        </div>
      )}

      {/* 条件分岐（ステップ3） */}
      {currentStep === "conflicts" && (
        <Card>
          <CardHeader>
            <CardTitle>設計方針の選択</CardTitle>
            <CardDescription>
              プロジェクトに最適な設計方針を選択してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {estimation.conflicts.map((conflict) => (
              <div key={conflict.id} className="space-y-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <Label className="text-base font-medium">{conflict.question}</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {conflict.impact}
                    </p>
                  </div>
                </div>
                
                <RadioGroup
                  value={userSelections[conflict.id] || conflict.defaultValue}
                  onValueChange={(value) => handleSelectionChange(conflict.id, value)}
                  className="space-y-2"
                >
                  {conflict.options.map((option) => (
                    <div
                      key={option.value}
                      className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/5 transition-colors"
                    >
                      <RadioGroupItem value={option.value} id={`${conflict.id}-${option.value}`} />
                      <Label
                        htmlFor={`${conflict.id}-${option.value}`}
                        className="flex-1 cursor-pointer"
                      >
                        <span className="font-medium">{option.label}</span>
                        {option.description && (
                          <span className="text-sm text-muted-foreground block mt-1">
                            {option.description}
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}

            <div className="flex justify-between pt-6">
              <Button variant="outline" onClick={() => setCurrentStep("options")}>
                戻る
              </Button>
              <Button onClick={() => setCurrentStep("confirm")}>
                次へ: 確認
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 最終確認（ステップ4） */}
      {currentStep === "confirm" && (
        <Card>
          <CardHeader>
            <CardTitle>設計方針の確認</CardTitle>
            <CardDescription>
              選択した設計方針を確認し、確定してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/30">
                <h4 className="font-medium mb-3">選択された設計方針</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">基礎形式:</span>
                    <span className="text-sm font-medium">
                      {userSelections.conflict1 === "pile" ? "杭基礎" : "直接基礎"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">耐震レベル:</span>
                    <span className="text-sm font-medium">
                      {userSelections.conflict2 === "level2" ? "レベル2" : "レベル1"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">構造種別:</span>
                    <span className="text-sm font-medium">RC造</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">耐火性能:</span>
                    <span className="text-sm font-medium">耐火構造</span>
                  </div>
                </div>
              </div>

              {estimation.recommendedPolicy.specialConsiderations && 
               estimation.recommendedPolicy.specialConsiderations.length > 0 && (
                <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    特別な配慮事項
                  </h4>
                  <ul className="text-sm space-y-1">
                    {estimation.recommendedPolicy.specialConsiderations.map((item, idx) => (
                      <li key={idx}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  この設計方針に基づいて、次のフェーズで詳細な設計条件を設定します。
                  必要に応じて、後から変更することも可能です。
                </AlertDescription>
              </Alert>
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setCurrentStep("conflicts")}>
                戻る
              </Button>
              <Button onClick={handleComplete} className="gap-2">
                <CheckCircle className="h-4 w-4" />
                設計方針を確定
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}