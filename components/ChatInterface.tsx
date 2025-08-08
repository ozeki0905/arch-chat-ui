"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Send, FileUp, Settings, Download, Loader2, CheckCircle2, AlertCircle,
  ChevronRight, MessageSquare, Bot, User, Trash2, Play, Pause, RefreshCw
} from "lucide-react";

// --- 型定義（必要に応じて拡張） ---
type Role = "user" | "assistant" | "system";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  files?: UploadedFile[];
  meta?: Record<string, unknown>;
};

type UploadedFile = {
  id: string;
  name: string;
  size: number; // bytes
  type: string; // mime
};

type Requirement = {
  key: string;
  label: string;
  required: boolean;
  status: "missing" | "partial" | "complete";
  note?: string;
};

type DesignCondition = {
  key: string;
  label: string;
  value?: string;
  status: "unset" | "set" | "auto";
};

type CalcStep = {
  key: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  progress?: number; // 0-100
  note?: string;
};

type Phase = {
  key: string;
  label: string;
  status: "pending" | "current" | "done";
};

// --- モック初期値（後でAPI連携に差し替え） ---
const initialRequirements: Requirement[] = [
  { key: "site", label: "敷地情報（住所・座標・用途地域）", required: true, status: "partial", note: "住所のみ取得" },
  { key: "program", label: "要求室・延床・階数", required: true, status: "missing" },
  { key: "constraints", label: "法規・制限（建ぺい/容積/斜線）", required: true, status: "partial", note: "用途地域から自動推定中" },
  { key: "ground", label: "地盤・地層情報", required: false, status: "missing" },
  { key: "structure", label: "構造種別の希望", required: false, status: "missing" },
];

const initialDesign: DesignCondition[] = [
  { key: "use", label: "建物用途", value: "事務所", status: "set" },
  { key: "floors", label: "階数", value: "8F", status: "set" },
  { key: "gfa", label: "延床面積", value: "12,000㎡（目標）", status: "set" },
  { key: "structureType", label: "構造種別", value: "S造候補（TBD）", status: "unset" },
  { key: "energy", label: "省エネ基準", value: "2025省エネ適合判定", status: "auto" },
];

const initialCalc: CalcStep[] = [
  { key: "zoning", label: "用途地域・法規チェック", status: "done", progress: 100, note: "第2種住居地域/建60容200" },
  { key: "mass", label: "ボリューム試算（斜線/日影）", status: "pending", progress: 0 },
  { key: "corePlan", label: "コア計画（EV/階段/PS）", status: "pending" },
  { key: "struct", label: "構造初期設計（スパン/柱径）", status: "pending" },
  { key: "energySim", label: "省エネ簡易計算", status: "pending" },
];

const initialPhases: Phase[] = [
  { key: "p1", label: "①対象の確認", status: "current" },
  { key: "p2", label: "②設計方針の決定", status: "pending" },
  { key: "p3", label: "③設計条件設定", status: "pending" },
  { key: "p4", label: "④設計計算の実施", status: "pending" },
  { key: "p5", label: "⑤評価の実施", status: "pending" },
  { key: "p6", label: "⑥概算コスト工期算定", status: "pending" },
  { key: "p7", label: "⑦市場性と収益構造の具体分析", status: "pending" },
  { key: "p8", label: "⑧サマリ", status: "pending" },
];

// --- ユーティリティ ---
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// --- メインコンポーネント ---
export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m1",
      role: "system",
      content: "ようこそ。テキストや図面・仕様書などのファイルを投入すると、法規チェック・ボリューム試算・構造初期設計・省エネ簡易計算まで自動で進み、結果をファイルで出力します。まずは敷地情報と要求条件をご提示ください。",
    },
  ]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [input, setInput] = useState("");
  const [requirements, setRequirements] = useState<Requirement[]>(initialRequirements);
  const [design] = useState<DesignCondition[]>(initialDesign);
  const [calc, setCalc] = useState<CalcStep[]>(initialCalc);
  const [phases, setPhases] = useState<Phase[]>(initialPhases);
  const [isRunning, setIsRunning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const phaseProgress = Math.round(
    (phases.filter((p) => p.status === "done").length / phases.length) * 100
  );
  const currentPhase = phases.find((p) => p.status === "current");

  const goNextPhase = (): void => {
    setPhases((prev) => {
      const idx = prev.findIndex((p) => p.status === "current");
      return prev.map((p, i) =>
        i === idx
          ? { ...p, status: "done" }
          : i === idx + 1
          ? { ...p, status: "current" }
          : p
      );
    });
  };

  const handleSend = (): void => {
    if (!input && files.length === 0) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      files,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setFiles([]);

    // 疑似レスポンス（後でAPI連携）
    setTimeout(() => {
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "入力を受領しました。敷地と要求室の条件を確認し、用途地域・建ぺい/容積/斜線の一次判定を開始します。未入力の項目があれば、右の『情報回収状況』からご入力ください。",
      };
      setMessages((prev) => [...prev, assistantMsg]);
      // 進捗を少し進める
      setCalc((prev) => prev.map((c) => (c.key === "mass" ? { ...c, status: "running", progress: 20 } : c)));
      setRequirements((prev) => prev.map((r) => (r.key === "program" ? { ...r, status: "partial", note: "延床のみ取得" } : r)));
    }, 600);
  };

  const handleFiles = (fls: FileList | null): void => {
    if (!fls) return;
    const next: UploadedFile[] = Array.from(fls).map((f) => ({ id: crypto.randomUUID(), name: f.name, size: f.size, type: f.type }));
    setFiles((prev) => [...prev, ...next]);
  };

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const toggleRun = (): void => {
    if (!isRunning) {
      setIsRunning(true);
      // 疑似的に進捗を動かす
      let p = 20;
      const interval = setInterval(() => {
        p += 10;
        setCalc((prev) =>
          prev.map((c) => (c.key === "mass" ? { ...c, status: p >= 100 ? "done" : "running", progress: Math.min(p, 100) } : c))
        );
        if (p >= 100) {
          clearInterval(interval);
          setIsRunning(false);
        }
      }, 800);
    } else {
      // 一時停止（デモ）
      setIsRunning(false);
    }
  };

  const requirementStatusBadge = (s: Requirement["status"]) => {
    const map: Record<Requirement["status"], { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      missing: { variant: "destructive", label: "未" },
      partial: { variant: "secondary", label: "一部" },
      complete: { variant: "default", label: "済" },
    };
    const v = map[s];
    return <Badge variant={v.variant}>{v.label}</Badge>;
  };

  const calcStepIcon = (s: CalcStep["status"]) => {
    switch (s) {
      case "done":
        return <CheckCircle2 className="h-4 w-4" />;
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "error":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <ChevronRight className="h-4 w-4" />;
    }
  };

  return (
    <TooltipProvider>
      <div className="w-full h-screen grid grid-cols-1 lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_480px] overflow-hidden bg-background">
        {/* 左：チャット領域 */}
        <div className="flex flex-col h-full">
          {/* ヘッダー */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b glass animate-in">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl gradient-primary shadow-glow">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">建築検討アシスタント</h1>
              <Badge variant="secondary" className="ml-2 animate-pulse-slow">β</Badge>
            </div>
            <div className="flex items-center gap-2">
              {/* モバイルでサイドパネルを開くボタン */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="xl:hidden">
                    <ChevronRight className="h-4 w-4"/>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[90vw] max-w-[420px] p-0">
                  <MobileProgressPanel phases={phases} phaseProgress={phaseProgress} />
                </SheetContent>
              </Sheet>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm"><Settings className="h-4 w-4 mr-2"/>設定</Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[420px]">
                  <SheetHeader>
                    <SheetTitle>プロジェクト設定</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">出力形式</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Input defaultValue="/outputs" placeholder="/outputs" />
                          <Button variant="secondary" size="sm">参照</Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="outline" size="sm">PDF</Button>
                          <Button variant="outline" size="sm">Excel</Button>
                          <Button variant="outline" size="sm">DWG</Button>
                          <Button variant="outline" size="sm">IFC</Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">法規基準年・地域係数</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Input placeholder="2025" defaultValue="2025" />
                          <Input placeholder="地域係数（例: Z=1.0）" defaultValue="Z=1.0" />
                        </div>
                        <Button variant="outline" size="sm">保存</Button>
                      </CardContent>
                    </Card>
                  </div>
                </SheetContent>
              </Sheet>
              <Button variant="default" size="sm" className="gradient-primary text-white hover:opacity-90 transition-opacity hover-lift hidden sm:flex"><Download className="h-4 w-4 mr-2"/>結果をダウンロード</Button>
              <Button variant="default" size="icon" className="gradient-primary text-white hover:opacity-90 transition-opacity hover-lift sm:hidden"><Download className="h-4 w-4"/></Button>
            </div>
          </div>

          {/* メッセージリスト */}
          <ScrollArea className="flex-1 px-4 animate-fade-in-up">
            <div className="max-w-4xl mx-auto py-4 space-y-4 px-2 sm:px-0">
              {currentPhase && <PhaseForm phase={currentPhase} onNext={goNextPhase} />}
              {messages.map((m) => (
                <ChatBubble key={m.id} role={m.role} content={m.content} files={m.files} />
              ))}
            </div>
          </ScrollArea>

          {/* コンポーザー */}
          <div className="border-t">
            <div className="max-w-4xl mx-auto px-4 py-3">
              {/* ドロップ領域 */}
              <div
                className="border-2 border-dashed rounded-2xl p-6 text-sm text-muted-foreground hover:bg-muted/30 hover:border-primary/50 transition-all duration-300 group"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFiles(e.dataTransfer.files);
                }}
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <FileUp className="h-10 w-10 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                  <span>ファイルをここにドラッグ＆ドロップ、または</span>
                  <Button variant="link" size="sm" className="px-1 text-primary hover:text-primary/80" onClick={() => fileInputRef.current?.click()}>
                    クリックして選択
                  </Button>
                </div>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                {files.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {files.map((f) => (
                      <div key={f.id} className="flex items-center justify-between rounded-xl border p-3 bg-card hover:shadow-md transition-shadow animate-slide-up">
                        <div className="truncate">
                          <div className="text-sm font-medium truncate">{f.name}</div>
                          <div className="text-xs text-muted-foreground">{formatBytes(f.size)} ・ {f.type || "unknown"}</div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeFile(f.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="例：敷地は東京都大田区羽田空港3-3-2、用途は事務所・延床12,000㎡・8階想定。既存地盤情報PDFを添付します。"
                  className="min-h-[70px] rounded-2xl resize-none"
                />
                <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto sm:min-w-[120px]">
                  <Button onClick={handleSend} className="rounded-2xl gradient-primary text-white hover:opacity-90 transition-all hover-lift">
                    <Send className="h-4 w-4 mr-2"/>送信
                  </Button>
                  <Button variant="outline" className="rounded-2xl hover:bg-primary/10 hover:border-primary transition-all" onClick={toggleRun}>
                    {isRunning ? <Pause className="h-4 w-4 mr-2"/> : <Play className="h-4 w-4 mr-2"/>}
                    {isRunning ? "一時停止" : "計算を実行"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 右：進捗/条件パネル */}
        <div className="hidden lg:flex flex-col h-full border-l bg-muted/30 glass-dark">
          <div className="px-4 py-4 border-b bg-card/50">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              進捗・条件
            </h2>
          </div>
          <ScrollArea className="flex-1 px-4 py-4">
            <div className="space-y-4">
            <Card className="shadow-lg hover-lift animate-in">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">フェーズ進捗</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Progress value={phaseProgress} className="h-3" />
                  <div className="text-sm font-bold w-12 text-right gradient-primary bg-clip-text text-transparent">{phaseProgress}%</div>
                </div>
                {currentPhase && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    現在: <span className="font-medium text-foreground">{currentPhase.label}</span>
                  </div>
                )}
                <div className="mt-3 space-y-1">
                  {phases.map((p) => (
                    <div key={p.key} className="flex items-center justify-between text-sm">
                      <span>{p.label}</span>
                      <Badge variant={p.status === "done" ? "default" : p.status === "current" ? "secondary" : "outline"}>
                        {p.status === "done" ? "済" : p.status === "current" ? "進行中" : "未"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg hover-lift animate-in">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm">情報回収状況</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {requirements.map((r) => (
                  <div key={r.key} className="flex items-start justify-between gap-2 py-1">
                    <div className="text-sm leading-tight">
                      <div className="font-medium">{r.label}</div>
                      {r.note && <div className="text-xs text-muted-foreground">{r.note}</div>}
                    </div>
                    {requirementStatusBadge(r.status)}
                  </div>
                ))}
                <Separator className="my-2" />
                <Button variant="outline" size="sm" className="w-full">不足項目を入力</Button>
              </CardContent>
            </Card>

            <Card className="shadow-lg hover-lift animate-in">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm">設計条件</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Accordion type="single" collapsible defaultValue="a0">
                  <AccordionItem value="a0">
                    <AccordionTrigger className="text-sm">基本条件</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {design.map((d) => (
                          <div key={d.key} className="flex items-center justify-between gap-2">
                            <div className="text-sm">{d.label}</div>
                            <div className="text-sm text-muted-foreground">{d.value || "未設定"}</div>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" className="w-full mt-2">条件を編集</Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            <Card className="shadow-lg hover-lift animate-in">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm">計算の進捗</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {calc.map((c) => (
                  <div key={c.key} className="rounded-xl border p-3 bg-card hover:shadow-md transition-all hover-lift">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium flex items-center gap-2">
                        {calcStepIcon(c.status)}
                        {c.label}
                      </div>
                      <div className="text-xs text-muted-foreground">{c.status}</div>
                    </div>
                    {c.status !== "pending" && (
                      <div className="mt-2">
                        <Progress value={c.progress ?? (c.status === "done" ? 100 : 0)} className="h-2 bg-muted" />
                        {c.note && <div className="text-xs text-muted-foreground mt-1">{c.note}</div>}
                      </div>
                    )}
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCalc(initialCalc)}>リセット</Button>
                  <Button variant="outline" size="sm" onClick={() => setCalc((prev)=> prev.map(c=> c.status!=="done"? {...c, status:"running", progress: (c.progress??0)+10}: c))}><RefreshCw className="h-4 w-4 mr-1"/>再計算</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg hover-lift animate-in">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm">出力ファイル</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-muted-foreground">計算が完了すると、ここにPDF/Excel/DWG/IFCのダウンロードリンクが表示されます。</div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2"/>PDF</Button>
                  <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2"/>Excel</Button>
                </div>
              </CardContent>
            </Card>
            </div>
          </ScrollArea>
        </div>
      </div>
    </TooltipProvider>
  );
}

// --- サブ：フェーズ入力フォーム ---
function PhaseForm({ phase, onNext }: { phase: Phase; onNext: () => void }) {
  return (
    <Card className="shadow-lg hover-lift animate-in">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{phase.label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Input placeholder="入力してください" />
        <Textarea placeholder="補足情報" />
        <div className="flex justify-end">
          <Button size="sm" onClick={onNext}>次へ</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// --- サブ：モバイル用プログレスパネル ---
function MobileProgressPanel({ phases, phaseProgress }: {
  phases: Phase[];
  phaseProgress: number;
}) {
  const currentPhase = phases.find((p) => p.status === "current");
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b bg-card/50">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          進捗・条件
        </h2>
      </div>
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-4">
          <Card className="shadow-lg hover-lift animate-in">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">フェーズ進捗</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Progress value={phaseProgress} className="h-3" />
                <div className="text-sm font-bold w-12 text-right gradient-primary bg-clip-text text-transparent">{phaseProgress}%</div>
              </div>
              {currentPhase && (
                <div className="mt-2 text-xs text-muted-foreground">
                  現在: <span className="font-medium text-foreground">{currentPhase.label}</span>
                </div>
              )}
              <div className="mt-3 space-y-1">
                {phases.map((p) => (
                  <div key={p.key} className="flex items-center justify-between text-sm">
                    <span>{p.label}</span>
                    <Badge variant={p.status === "done" ? "default" : p.status === "current" ? "secondary" : "outline"}>
                      {p.status === "done" ? "済" : p.status === "current" ? "進行中" : "未"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          {/* 他のカードも同様に表示 */}
        </div>
      </ScrollArea>
    </div>
  );
}

// --- サブ：チャットバブル ---
function ChatBubble({ role, content, files }: { role: Role; content: string; files?: UploadedFile[] }) {
  const isUser = role === "user";
  return (
    <div className={`flex items-start gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="shrink-0 mt-1 rounded-full gradient-primary text-white p-2 shadow-glow animate-bounce-in">
          <Bot className="h-4 w-4" />
        </div>
      )}
      <div className={`max-w-[80%] rounded-2xl p-4 shadow-lg ${
        isUser ? "gradient-primary text-white rounded-br-sm animate-slide-in-right" : "bg-card border border-border/50 rounded-bl-sm animate-slide-in-left"
      }`}>
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{content}</div>
        {files && files.length > 0 && (
          <div className="mt-2 space-y-2">
            {files.map((f) => (
              <div key={f.id} className={`text-xs ${isUser ? "text-slate-200" : "text-slate-600"}`}>📎 {f.name}（{formatBytes(f.size)}）</div>
            ))}
          </div>
        )}
      </div>
      {isUser && (
        <div className="shrink-0 mt-1 rounded-full gradient-accent text-white p-2 shadow-glow animate-bounce-in">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
