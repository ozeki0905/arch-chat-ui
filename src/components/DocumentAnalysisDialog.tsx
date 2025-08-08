"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FileText, CheckCircle, AlertCircle, XCircle, 
  Edit, Save, X, FileSearch, Sparkles 
} from "lucide-react";
import { ExtractedItem, DocumentAnalysisResult, InfoCategory } from "@/types/extraction";
import { calculateCompletionPercentage } from "@/utils/documentParser";

interface DocumentAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysisResult: DocumentAnalysisResult | null;
  onConfirm: (items: ExtractedItem[]) => void;
}

export function DocumentAnalysisDialog({
  open,
  onOpenChange,
  analysisResult,
  onConfirm,
}: DocumentAnalysisDialogProps) {
  const [editingItems, setEditingItems] = useState<Record<string, string>>({});
  const [items, setItems] = useState<ExtractedItem[]>([]);

  React.useEffect(() => {
    if (analysisResult?.extractedItems) {
      setItems(analysisResult.extractedItems);
      setEditingItems({});
    }
  }, [analysisResult]);

  const handleEdit = (itemId: string, value: string) => {
    setEditingItems(prev => ({ ...prev, [itemId]: value }));
  };

  const handleSave = (itemId: string) => {
    const newValue = editingItems[itemId];
    setItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, value: newValue, status: "edited" as const }
        : item
    ));
    setEditingItems(prev => {
      const { [itemId]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleCancel = (itemId: string) => {
    setEditingItems(prev => {
      const { [itemId]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleConfirmAll = () => {
    const confirmedItems = items.map(item => ({
      ...item,
      status: item.value ? "confirmed" as const : item.status,
    }));
    onConfirm(confirmedItems);
    onOpenChange(false);
  };

  const getCategoryLabel = (category: InfoCategory): string => {
    const labels: Record<InfoCategory, string> = {
      customer: "顧客情報",
      general: "一般情報",
      internal: "社内情報",
    };
    return labels[category];
  };

  const getStatusIcon = (item: ExtractedItem) => {
    if (item.status === "confirmed" || (item.status === "extracted" && item.value)) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (item.status === "missing") {
      return <XCircle className="h-4 w-4 text-red-500" />;
    } else {
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const completionPercentage = calculateCompletionPercentage(items);

  // カテゴリ別にアイテムをグループ化
  const itemsByCategory = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<InfoCategory, ExtractedItem[]>);

  if (!analysisResult) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5" />
            ドキュメント解析結果
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* ファイル情報と進捗 */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">{analysisResult.fileName}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(analysisResult.uploadedAt).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">情報抽出率</p>
                <p className="text-2xl font-bold">{completionPercentage}%</p>
              </div>
              <Progress value={completionPercentage} className="w-24 h-3" />
            </div>
          </div>

          {/* エラーメッセージ */}
          {analysisResult.processingStatus === "failed" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                解析中にエラーが発生しました: {analysisResult.errorMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* 抽出結果 */}
          <Tabs defaultValue="customer" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="customer">顧客情報</TabsTrigger>
              <TabsTrigger value="general">一般情報</TabsTrigger>
              <TabsTrigger value="internal">社内情報</TabsTrigger>
            </TabsList>

            {(["customer", "general", "internal"] as InfoCategory[]).map(category => (
              <TabsContent key={category} value={category}>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {itemsByCategory[category]?.map(item => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                      >
                        {getStatusIcon(item)}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">
                              {item.label}
                              {item.required && <span className="text-destructive ml-1">*</span>}
                            </Label>
                            <div className="flex items-center gap-2">
                              {item.confidence > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  {Math.round(item.confidence * 100)}%
                                </Badge>
                              )}
                              {item.status === "extracted" && (
                                <Badge variant="secondary" className="text-xs">
                                  自動抽出
                                </Badge>
                              )}
                              {item.status === "edited" && (
                                <Badge variant="default" className="text-xs">
                                  編集済み
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {editingItems[item.id] !== undefined ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editingItems[item.id]}
                                onChange={(e) => handleEdit(item.id, e.target.value)}
                                className="flex-1"
                                placeholder={`${item.label}を入力`}
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleSave(item.id)}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleCancel(item.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <p className="text-sm">
                                {item.value || (
                                  <span className="text-muted-foreground italic">
                                    未入力
                                  </span>
                                )}
                              </p>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleEdit(item.id, item.value || "")}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          
                          {item.note && (
                            <p className="text-xs text-muted-foreground">{item.note}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleConfirmAll}>
            確認して次へ進む
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}