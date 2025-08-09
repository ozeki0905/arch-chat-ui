"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  Info
} from "lucide-react";
import {
  TankFoundationDesignInput,
  Phase2WizardStep,
  Phase2WizardState,
  ValidationResponse
} from "@/types/tankFoundationDesign";
import { ProjectInfo } from "@/types/extraction";

// Import wizard step components
import { BasicInfoStep } from "./wizard-steps/BasicInfoStep";
import { TankSpecStep } from "./wizard-steps/TankSpecStep";
import { RegulationsStep } from "./wizard-steps/RegulationsStep";
import { SoilDataStep } from "./wizard-steps/SoilDataStep";
import { DesignCriteriaStep } from "./wizard-steps/DesignCriteriaStep";
import { PileCatalogStep } from "./wizard-steps/PileCatalogStep";
import { ReviewStep } from "./wizard-steps/ReviewStep";

interface TankFoundationWizardProps {
  projectInfo: Partial<ProjectInfo>;
  onComplete: (designData: TankFoundationDesignInput) => void;
  onBack?: () => void;
}

const WIZARD_STEPS: { key: Phase2WizardStep; label: string; description: string }[] = [
  { 
    key: "basic_info", 
    label: "基本情報", 
    description: "プロジェクトとサイト情報の確認・編集" 
  },
  { 
    key: "tank_spec", 
    label: "タンク仕様", 
    description: "タンクの容量、寸法、内容物の設定" 
  },
  { 
    key: "regulations", 
    label: "適用法規", 
    description: "法的分類と適用規格の選択" 
  },
  { 
    key: "soil_data", 
    label: "地盤データ", 
    description: "地層構成とN値の入力" 
  },
  { 
    key: "design_criteria", 
    label: "設計条件", 
    description: "耐震レベル、安全率等の設定" 
  },
  { 
    key: "pile_catalog", 
    label: "杭カタログ", 
    description: "使用可能な杭種の選択" 
  },
  { 
    key: "review", 
    label: "確認", 
    description: "入力内容の最終確認" 
  }
];

export function TankFoundationWizard({ 
  projectInfo, 
  onComplete, 
  onBack 
}: TankFoundationWizardProps) {
  const [wizardState, setWizardState] = useState<Phase2WizardState>({
    currentStep: "basic_info",
    data: {
      project: {
        project_id: `TF-${Date.now()}`,
        name: projectInfo.projectName || "新規タンク基礎設計",
        created_at: new Date().toISOString()
      },
      site: {
        site_name: projectInfo.siteName || "",
        location: projectInfo.siteAddress || "",
      },
      ui_flags: {
        show_all_assumptions: true,
        language: "ja"
      }
    },
    validation: {} as Record<Phase2WizardStep, ValidationResponse>,
    isValidating: false,
    isCalculating: false
  });

  const currentStepIndex = WIZARD_STEPS.findIndex(step => step.key === wizardState.currentStep);
  const currentStepInfo = WIZARD_STEPS[currentStepIndex];
  const progress = ((currentStepIndex + 1) / WIZARD_STEPS.length) * 100;

  const validateStep = async (step: Phase2WizardStep): Promise<ValidationResponse> => {
    // TODO: Call validation API endpoint
    // For now, return mock validation
    return {
      valid: true,
      warnings: []
    };
  };

  const handleNext = async () => {
    // Validate current step
    setWizardState(prev => ({ ...prev, isValidating: true }));
    
    const validation = await validateStep(wizardState.currentStep);
    
    setWizardState(prev => ({
      ...prev,
      validation: {
        ...prev.validation,
        [prev.currentStep]: validation
      },
      isValidating: false
    }));

    if (validation.valid) {
      const nextIndex = currentStepIndex + 1;
      if (nextIndex < WIZARD_STEPS.length) {
        setWizardState(prev => ({
          ...prev,
          currentStep: WIZARD_STEPS[nextIndex].key
        }));
      }
    }
  };

  const handlePrevious = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setWizardState(prev => ({
        ...prev,
        currentStep: WIZARD_STEPS[prevIndex].key
      }));
    }
  };

  const handleStepUpdate = (stepData: Partial<TankFoundationDesignInput>) => {
    setWizardState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        ...stepData
      }
    }));
  };

  const handleRunCalculation = async () => {
    setWizardState(prev => ({ ...prev, isCalculating: true }));
    
    try {
      // Save project data to database
      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wizardState.data)
      });
      
      if (!projectResponse.ok) {
        throw new Error('Failed to save project');
      }
      
      const { projectId } = await projectResponse.json();
      
      // Create calculation run
      const calcResponse = await fetch('/api/calc-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          designInput: wizardState.data
        })
      });
      
      if (!calcResponse.ok) {
        throw new Error('Failed to create calculation run');
      }
      
      const { runId } = await calcResponse.json();
      
      // Update wizard state with IDs
      setWizardState(prev => ({ 
        ...prev, 
        runId,
        data: {
          ...prev.data,
          project: {
            ...prev.data.project!,
            project_id: projectId
          }
        }
      }));
      
      // Complete the wizard
      if (wizardState.data as TankFoundationDesignInput) {
        onComplete({
          ...wizardState.data,
          project: {
            ...wizardState.data.project!,
            project_id: projectId
          }
        } as TankFoundationDesignInput);
      }
    } catch (error) {
      console.error('Calculation error:', error);
      alert('計算の実行に失敗しました。もう一度お試しください。');
    } finally {
      setWizardState(prev => ({ ...prev, isCalculating: false }));
    }
  };

  const renderStepContent = () => {
    const commonProps = {
      data: wizardState.data,
      onUpdate: handleStepUpdate,
      validation: wizardState.validation[wizardState.currentStep]
    };

    switch (wizardState.currentStep) {
      case "basic_info":
        return <BasicInfoStep {...commonProps} projectInfo={projectInfo} />;
      case "tank_spec":
        return <TankSpecStep {...commonProps} />;
      case "regulations":
        return <RegulationsStep {...commonProps} />;
      case "soil_data":
        return <SoilDataStep {...commonProps} />;
      case "design_criteria":
        return <DesignCriteriaStep {...commonProps} />;
      case "pile_catalog":
        return <PileCatalogStep {...commonProps} />;
      case "review":
        return <ReviewStep {...commonProps} onRunCalculation={handleRunCalculation} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold">タンク基礎設計ウィザード</h2>
          <Badge variant="secondary">
            ステップ {currentStepIndex + 1} / {WIZARD_STEPS.length}
          </Badge>
        </div>
        <Progress value={progress} className="h-2 mb-4" />
        
        {/* Step indicators */}
        <div className="flex items-center justify-between mb-6">
          {WIZARD_STEPS.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;
            const hasValidation = wizardState.validation[step.key];
            
            return (
              <div
                key={step.key}
                className={`flex items-center ${
                  index < WIZARD_STEPS.length - 1 ? "flex-1" : ""
                }`}
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isCompleted
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {hasValidation?.valid === false ? (
                      <AlertCircle className="h-5 w-5" />
                    ) : isCompleted ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className={`text-xs mt-1 ${
                      isActive ? "font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < WIZARD_STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-[2px] mx-2 ${
                      isCompleted ? "bg-primary/20" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Current step content */}
      <Card>
        <CardHeader>
          <CardTitle>{currentStepInfo.label}</CardTitle>
          <CardDescription>{currentStepInfo.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {wizardState.isCalculating ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
              <p className="text-lg font-medium">計算実行中...</p>
              <p className="text-sm text-muted-foreground mt-2">
                設計計算を実行しています。しばらくお待ちください。
              </p>
            </div>
          ) : (
            renderStepContent()
          )}
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack && currentStepIndex === 0 && (
            <Button variant="outline" onClick={onBack}>
              キャンセル
            </Button>
          )}
          {currentStepIndex > 0 && (
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={wizardState.isValidating || wizardState.isCalculating}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              前へ
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {currentStepIndex < WIZARD_STEPS.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={wizardState.isValidating || wizardState.isCalculating}
            >
              {wizardState.isValidating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  検証中...
                </>
              ) : (
                <>
                  次へ
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleRunCalculation}
              disabled={wizardState.isCalculating}
              className="min-w-[120px]"
            >
              {wizardState.isCalculating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  計算中...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  計算実行
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Validation warnings */}
      {wizardState.validation[wizardState.currentStep]?.warnings && 
       wizardState.validation[wizardState.currentStep].warnings.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc pl-5 space-y-1">
              {wizardState.validation[wizardState.currentStep].warnings.map((warning, index) => (
                <li key={index} className="text-sm">{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}