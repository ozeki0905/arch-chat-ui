"use client";

import React, { useState, useRef, useEffect } from "react";
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
  ChevronRight, MessageSquare, Bot, User, Trash2, Play, Pause, RefreshCw,
  FileSearch, History
} from "lucide-react";
import { DocumentAnalysisDialog } from "@/components/DocumentAnalysisDialog";
import { DocumentAnalysisResult, ExtractedItem } from "@/types/extraction";
import { ExtendedProjectInfo } from "@/types/projectData";
import { analyzeDocument } from "@/utils/documentParser";
import { TankFoundationWizard } from "@/components/TankFoundationWizard";
import { DesignPolicy } from "@/types/designPolicy";
import { TankFoundationDesignInput } from "@/types/tankFoundationDesign";
import { ChatSession, ChatMessage as SessionChatMessage } from "@/types/chat";
import { loadSessions, saveSession, generateSessionTitle, deleteSession, loadSessionSummaries } from "@/utils/sessionStorage";
import { ChatHistorySidebar, MobileChatHistorySidebar } from "@/components/ChatHistorySidebar";
import { AIAgent, AgentResponse } from "@/services/aiAgent";
import { SiteInfoForm, BuildingOverviewForm, generateDynamicForm } from "@/components/FormInput";
import { extractInformation, mergeExtractedItems } from "@/utils/informationExtractor";
import { OrchestrationService } from "@/services/agents";

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
  size: number;
  type: string;
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
  value: string;
  status: "unset" | "set" | "auto";
};

type CalcStep = {
  key: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  progress?: number;
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isAutoScrollingRef = useRef(false);
  const userHasScrolledRef = useRef(false);
  
  // セッション管理
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionSummaries, setSessionSummaries] = useState<ReturnType<typeof loadSessionSummaries>>([]);
  
  // AIエージェント
  const [aiAgent] = useState(() => new AIAgent());
  const [orchestrationService] = useState(() => new OrchestrationService());
  const [showForm, setShowForm] = useState<AgentResponse["suggestedForm"] | null>(null);
  const [formData, setFormData] = useState<any>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  const [requirements, setRequirements] = useState<Requirement[]>(initialRequirements);
  const [design, setDesign] = useState<DesignCondition[]>(initialDesign);
  const [calc, setCalc] = useState<CalcStep[]>(initialCalc);
  const [phases, setPhases] = useState<Phase[]>(initialPhases);
  const [isRunning, setIsRunning] = useState(false);
  
  // フェーズ1: ドキュメント解析関連の状態
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<DocumentAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  
  // フェーズ2: 設計方針関連の状態
  const [projectInfo, setProjectInfo] = useState<Partial<ExtendedProjectInfo>>({});
  const [showPhase2Form, setShowPhase2Form] = useState(false);
  
  // 自動スクロールの改善版
  useEffect(() => {
    // 自動スクロール中フラグをチェックして無限ループを防ぐ
    if (isAutoScrollingRef.current) return;
    
    // ユーザーが手動でスクロールした場合は自動スクロールを停止
    if (userHasScrolledRef.current) return;
    
    const scrollToBottom = () => {
      isAutoScrollingRef.current = true;
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      // スムーズスクロールの完了を待つ
      setTimeout(() => {
        isAutoScrollingRef.current = false;
      }, 1000);
    };
    
    // 少し遅延を入れてDOMの更新を待つ
    const timeoutId = setTimeout(scrollToBottom, 100);
    
    return () => clearTimeout(timeoutId);
  }, [messages.length, showPhase2Form, showForm]); // メッセージ数やフォーム表示が変わった時にスクロール
  
  // セッションの初期化と読み込み
  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window === "undefined") return;
    
    const loadedSessions = loadSessions();
    setSessions(loadedSessions);
    setSessionSummaries(loadSessionSummaries());
    
    // アクティブなセッションがあれば復元
    const activeSession = loadedSessions.find(s => s.isActive);
    if (activeSession) {
      setCurrentSession(activeSession);
      setMessages(activeSession.messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        files: msg.files,
        meta: msg.meta
      })));
      setFiles(activeSession.files || []);
      if (activeSession.projectInfo) {
        setProjectInfo(activeSession.projectInfo);
      }
    } else {
      // 新規セッションを作成
      const newSession: ChatSession = {
        id: crypto.randomUUID(),
        title: "新規チャット",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        files: [],
        phase: "p1",
        isActive: true
      };
      setCurrentSession(newSession);
      saveSession(newSession);
    }
  }, []);
  
  // 現在のフェーズを計算
  const currentPhaseLocal = phases.find((p) => p.status === "current");
  const phaseProgress = Math.round(
    (phases.filter((p) => p.status === "done").length / phases.length) * 100
  );
  
  // セッションの保存
  useEffect(() => {
    if (currentSession) {
      const updatedSession: ChatSession = {
        ...currentSession,
        messages: messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          files: msg.files,
          meta: msg.meta,
          timestamp: Date.now()
        })),
        files,
        projectInfo,
        updatedAt: Date.now(),
        phase: currentPhaseLocal?.key
      };
      
      // タイトルの自動生成
      if (messages.length === 1 && currentSession.title === "新規チャット") {
        updatedSession.title = generateSessionTitle(messages[0].content, files);
      }
      
      setCurrentSession(updatedSession);
      saveSession(updatedSession);
    }
  }, [messages, files, projectInfo, currentPhaseLocal]);
  
  // セッションサマリーの更新は別のuseEffectで管理
  useEffect(() => {
    if (typeof window === "undefined") return;
    setSessionSummaries(loadSessionSummaries());
  }, [currentSession?.id]); // currentSessionのIDが変わった時のみ更新

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

  const handleSend = async (): Promise<void> => {
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
    setIsLoading(true);
    setShowForm(null);
    
    // ユーザーが新しいメッセージを送信したときは自動スクロールを再開
    userHasScrolledRef.current = false;

    try {
      // Orchestration Serviceで処理
      const orchestrationResult = await orchestrationService.processUserInput(
        input,
        currentPhaseLocal?.key || "p1",
        extractedItems,
        projectInfo,
        currentProjectId || currentSession?.projectId
      );
      
      // アクションを処理
      for (const action of orchestrationResult.actions) {
        switch (action.type) {
          case "update_status":
            if (action.payload.extractedItems) {
              setExtractedItems(action.payload.extractedItems);
              updateRequirementsFromExtracted(action.payload.extractedItems);
            }
            if (action.payload.projectInfo) {
              setProjectInfo(action.payload.projectInfo);
            }
            if (action.payload.projectId) {
              setCurrentProjectId(action.payload.projectId);
            }
            if (action.payload.progressStatus) {
              // 進捗状況を更新
              const progress = action.payload.progressStatus;
              setRequirements(prev => prev.map(req => ({
                ...req,
                status: progress.completedFields.includes(req.key) ? "complete" : 
                        progress.missingFields.includes(req.key) ? "missing" : "partial"
              })));
            }
            break;
          case "proceed_phase":
            if (action.payload.nextPhase === "p2") {
              goNextPhase();
              setShowPhase2Form(true);
            }
            break;
          case "show_form":
            setShowForm(action.payload.phase === "p1" ? "dynamic" : null);
            setFormData(action.payload.defaults);
            break;
          case "show_message":
            // エラーメッセージなどを表示
            console.error(action.payload.message);
            break;
        }
      }
      
      // アシスタントの応答を追加
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: orchestrationResult.responseMessage,
      };
      setMessages(prev => [...prev, assistantMsg]);
      
      // API呼び出しも並行して実行（既存の機能を維持）
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          phase: currentPhaseLocal?.key,
          projectInfo,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("Chat API error:", errorData);
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const apiAssistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.message,
      };
      setMessages((prev) => [...prev, apiAssistantMsg]);
      
    } catch (error) {
      console.error("Chat API error:", error);
      let errorMessage = "申し訳ございません。一時的なエラーが発生しました。";
      
      if (error instanceof Error) {
        // Show the actual error message from the backend
        errorMessage = error.message;
        
        // Add additional context for common errors
        if (error.message.includes("OpenAI API key is not configured")) {
          errorMessage = "OpenAI APIキーが設定されていません。環境変数 OPENAI_API_KEY を設定してください。";
        } else if (error.message.includes("API key")) {
          errorMessage = "APIキーに問題があります。環境変数を確認してください。";
        } else if (error.message.includes("model")) {
          errorMessage = "AIモデルの設定に問題があります。";
        } else if (error.message.includes("データベース接続エラー")) {
          errorMessage += "\n\nPostgreSQLが起動していることを確認し、.env.localの設定を確認してください。";
        } else if (error.message.includes("Failed to create project")) {
          errorMessage = "プロジェクトの作成に失敗しました。データベース接続を確認してください。";
        }
      }
      
      const errorAssistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: errorMessage + " しばらくしてから再度お試しください。",
      };
      setMessages((prev) => [...prev, errorAssistantMsg]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // ドキュメント解析結果の確認
  const handleAnalysisConfirm = (items: ExtractedItem[]): void => {
    // プロジェクト情報を保存
    if (currentAnalysis?.projectInfo) {
      setProjectInfo(currentAnalysis.projectInfo);
    }
    
    // 抽出された情報をRequirementに反映
    const updatedRequirements = requirements.map(req => {
      const extractedItem = items.find(item => 
        (item.key === "siteAddress" && req.key === "site") ||
        (item.key === "requiredFloorArea" && req.key === "program") ||
        (item.key === "landUse" && req.key === "constraints")
      );
      
      if (extractedItem && extractedItem.value) {
        return {
          ...req,
          status: "complete" as const,
          note: `抽出値: ${extractedItem.value}`
        };
      }
      return req;
    });
    
    setRequirements(updatedRequirements);
    
    // アシスタントメッセージを追加
    const analysisAssistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: `ドキュメントから以下の情報を抽出しました:\n\n${items
        .filter(item => item.value)
        .map(item => `• ${item.label}: ${item.value}`)
        .join("\n")}\n\n抽出された情報を確認し、不足している項目があれば追加入力してください。`,
    };
    setMessages(prev => [...prev, analysisAssistantMsg]);
    
    // フェーズ1完了時、自動的にフェーズ2へ
    if (currentPhaseLocal?.key === "p1") {
      setTimeout(() => {
        goNextPhase();
        setShowPhase2Form(true);
      }, 1000);
    }
  };
  
  // フェーズ2: タンク基礎設計の確定
  const handlePhase2Complete = (designData: TankFoundationDesignInput): void => {
    setShowPhase2Form(false);
    
    // 設計データから設計条件を更新
    setDesign(prev => prev.map(d => {
      if (d.key === "structureType") {
        return { ...d, value: "RC造（タンク基礎）", status: "set" };
      }
      return d;
    }));
    
    // アシスタントメッセージを追加
    const phase2AssistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: `タンク基礎設計データが確定しました:\n\n• プロジェクト: ${designData.project.name}\n• タンク容量: ${designData.tank.capacity_kl} kL\n• タンク寸法: φ${designData.tank.diameter_m}m × H${designData.tank.height_m}m\n• 内容物: ${designData.tank.content_type}\n• 耐震レベル: ${designData.criteria.seismic_level}\n• 法的分類: ${designData.regulations.legal_classification}\n\n設計計算が実行されました。次のフェーズで結果を確認します。`,
    };
    setMessages(prev => [...prev, phase2AssistantMsg]);
    
    // 次のフェーズへ
    goNextPhase();
  };

  const handleFiles = async (fls: FileList | null): Promise<void> => {
    if (!fls) return;
    const next: UploadedFile[] = Array.from(fls).map((f) => ({ id: crypto.randomUUID(), name: f.name, size: f.size, type: f.type }));
    setFiles((prev) => [...prev, ...next]);
    
    // フェーズ1の場合、ドキュメント解析を実行
    const currentPhaseFile = phases.find(p => p.status === "current");
    if (currentPhaseFile?.key === "p1") {
      setIsAnalyzing(true);
      try {
        // 最初のファイルを解析（実際には複数ファイル対応も可能）
        const result = await analyzeDocument(Array.from(fls)[0]);
        setCurrentAnalysis(result);
        setShowAnalysisDialog(true);
      } catch (error) {
        console.error("Document analysis failed:", error);
      } finally {
        setIsAnalyzing(false);
      }
    }
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
  
  // セッション管理関数
  const handleSelectSession = (sessionId: string): void => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    
    // 現在のセッションを非アクティブに
    if (currentSession) {
      saveSession({ ...currentSession, isActive: false });
    }
    
    // 新しいセッションをアクティブに
    setCurrentSession({ ...session, isActive: true });
    setMessages(session.messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      files: msg.files,
      meta: msg.meta
    })));
    setFiles(session.files || []);
    if (session.projectInfo) {
      setProjectInfo(session.projectInfo);
    }
    if (session.phase) {
      // フェーズの復元
      setPhases(prev => prev.map(p => ({
        ...p,
        status: p.key === session.phase ? "current" : 
                phases.findIndex(ph => ph.key === session.phase) > phases.findIndex(ph => ph.key === p.key) ? "done" : "pending"
      })));
    }
  };
  
  const handleNewSession = (): void => {
    // 現在のセッションを非アクティブに
    if (currentSession) {
      saveSession({ ...currentSession, isActive: false });
    }
    
    // 新規セッションを作成
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: "新規チャット",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      files: [],
      phase: "p1",
      isActive: true
    };
    
    setCurrentSession(newSession);
    setMessages([]);
    setFiles([]);
    setProjectInfo({});
    setPhases(initialPhases);
    setRequirements(initialRequirements);
    setDesign(initialDesign);
    setCalc(initialCalc);
    saveSession(newSession);
    
    // セッション一覧を更新
    setSessions(prev => [newSession, ...prev.map(s => ({ ...s, isActive: false }))]);
  };
  
  const handleDeleteSession = async (sessionId: string): Promise<void> => {
    try {
      // APIエンドポイントを呼び出してセッションを削除
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete session');
      }
      
      // ローカルストレージからも削除
      deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      setSessionSummaries(prev => prev.filter(s => s.id !== sessionId));
      
      // 削除したセッションが現在のセッションの場合は新規セッションを作成
      if (currentSession?.id === sessionId) {
        handleNewSession();
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      // エラーメッセージを表示（オプション）
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "セッションの削除に失敗しました。しばらくしてから再度お試しください。",
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  };
  
  // 抽出情報からRequirementsを更新
  const updateRequirementsFromExtracted = (items: ExtractedItem[]): void => {
    const updatedRequirements = requirements.map(req => {
      const extractedItem = items.find(item => 
        (item.key === "siteAddress" && req.key === "site") ||
        (item.key === "requiredFloorArea" && req.key === "program") ||
        (item.key === "landUse" && req.key === "constraints")
      );
      
      if (extractedItem && extractedItem.value) {
        return {
          ...req,
          status: "complete" as const,
          note: `${extractedItem.value}`
        };
      } else if (extractedItem) {
        return {
          ...req,
          status: "partial" as const,
          note: "情報検出済み（値未抽出）"
        };
      }
      return req;
    });
    
    setRequirements(updatedRequirements);
  };
  
  // フォーム送信処理
  const handleFormSubmit = async (data: Record<string, string>): Promise<void> => {
    setShowForm(null);
    setIsLoading(true);
    
    try {
      // Orchestration Serviceでフォーム送信を処理
      const orchestrationResult = await orchestrationService.processFormSubmission(
        data,
        showForm || "unknown",
        currentPhaseLocal?.key || "p1",
        extractedItems,
        projectInfo,
        currentProjectId || currentSession?.projectId
      );
      
      // アクションを処理
      for (const action of orchestrationResult.actions) {
        switch (action.type) {
          case "update_status":
            if (action.payload.extractedItems) {
              setExtractedItems(action.payload.extractedItems);
              updateRequirementsFromExtracted(action.payload.extractedItems);
            }
            if (action.payload.projectInfo) {
              setProjectInfo(action.payload.projectInfo);
            }
            if (action.payload.projectId) {
              setCurrentProjectId(action.payload.projectId);
            }
            break;
          case "proceed_phase":
            if (action.payload.nextPhase === "p2") {
              goNextPhase();
              setShowPhase2Form(true);
            }
            break;
        }
      }
      
      // メッセージを追加
      const formAssistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: orchestrationResult.responseMessage,
      };
      setMessages(prev => [...prev, formAssistantMsg]);
    } catch (error) {
      console.error("Form processing error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="w-full h-screen grid grid-cols-1 lg:grid-cols-[320px_1fr] 2xl:grid-cols-[320px_1fr_480px] bg-background">
        {/* 履歴サイドバー（デスクトップ） */}
        <div className="hidden lg:block border-r">
          <ChatHistorySidebar
            sessions={sessionSummaries}
            currentSessionId={currentSession?.id || null}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
            onDeleteSession={handleDeleteSession}
          />
        </div>
        {/* 左：チャット領域 */}
        <div className="flex flex-col h-full min-h-0 overflow-hidden">
          {/* ヘッダー */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b glass animate-in">
            <div className="flex items-center gap-3">
              {/* モバイル履歴サイドバー */}
              <div className="lg:hidden">
                <MobileChatHistorySidebar
                  sessions={sessionSummaries}
                  currentSessionId={currentSession?.id || null}
                  onSelectSession={handleSelectSession}
                  onNewSession={handleNewSession}
                  onDeleteSession={handleDeleteSession}
                />
              </div>
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
                  <Button variant="ghost" size="sm" className="2xl:hidden">
                    <ChevronRight className="h-4 w-4"/>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[90vw] max-w-[420px] p-0">
                  <SheetHeader className="sr-only">
                    <SheetTitle>進捗パネル</SheetTitle>
                  </SheetHeader>
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

          {/* チャット表示エリア */}
          {/* 
            The ScrollArea wrapping the message list must be able to shrink
            within its flex parent. Without `min-h-0` the default `min-height: min-content`
            causes the element to stretch to accommodate its children and prevents
            scrollbars from appearing when content overflows.
          */}
          <ScrollArea 
            ref={scrollAreaRef}
            className="flex-1 min-h-0 p-4 sm:p-6 scroll-smooth-optimized"
            onScroll={(e) => {
              if (!isAutoScrollingRef.current) {
                const target = e.target as HTMLElement;
                const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
                userHasScrolledRef.current = !isAtBottom;
              }
            }}
          >
            <div className="space-y-4 max-w-4xl mx-auto animate-slide-up">
              {messages.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="mb-4 gradient-accent rounded-full p-3 w-16 h-16 mx-auto flex items-center justify-center animate-bounce-in">
                    <Bot className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-lg font-medium mb-2">建築検討アシスタントへようこそ</p>
                  <p className="text-sm">図面をアップロードするか、プロジェクトの要件を入力してください</p>
                  {currentPhaseLocal?.key === "p1" && (
                    <div className="mt-6 p-4 bg-primary/10 rounded-lg max-w-md mx-auto">
                      <FileSearch className="h-6 w-6 mx-auto mb-2 text-primary" />
                      <p className="text-sm font-medium">フェーズ1: 対象の確認</p>
                      <p className="text-xs mt-1">案件概要書やPDFをアップロードすると、自動で情報を抽出します</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* メッセージを時系列順に表示 */}
              {messages.map((msg) => (
                <ChatBubble key={msg.id} role={msg.role} content={msg.content} files={msg.files} />
              ))}
              
              {/* フォーム表示 - メッセージの後に表示 */}
              {showForm && !isLoading && (
                <div className="max-w-2xl mx-auto animate-slide-up">
                  {showForm === "site_info" && (
                    <SiteInfoForm onSubmit={handleFormSubmit} />
                  )}
                  {showForm === "building_overview" && (
                    <BuildingOverviewForm onSubmit={handleFormSubmit} />
                  )}
                  {showForm === "dynamic" && formData?.missingInfo && (
                    generateDynamicForm(formData.missingInfo, handleFormSubmit)
                  )}
                </div>
              )}
              
              {/* フェーズ2フォームの表示 - 最後に表示 */}
              {showPhase2Form && currentPhaseLocal?.key === "p2" && (
                <div className="max-w-4xl mx-auto">
                  <TankFoundationWizard
                    projectInfo={projectInfo}
                    onComplete={handlePhase2Complete}
                    onBack={() => setShowPhase2Form(false)}
                  />
                </div>
              )}
              
              {/* フェーズ2への誘導 - フォームが表示されていない場合のみ */}
              {currentPhaseLocal?.key === "p2" && !showPhase2Form && messages.length > 0 && (
                <div className="max-w-3xl mx-auto">
                  <Card className="shadow-lg hover-lift animate-in">
                    <CardContent className="py-6">
                      <div className="text-center">
                        <Settings className="h-8 w-8 mx-auto mb-3 text-primary" />
                        <h3 className="text-lg font-semibold mb-2">タンク基礎設計を開始する</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          タンク仕様、地盤条件、設計基準を入力し、基礎設計計算を実行します
                        </p>
                        <Button onClick={() => setShowPhase2Form(true)}>
                          タンク基礎設計ウィザードを開始
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              <div ref={messagesEndRef} />
              {(isLoading || isAnalyzing) && (
                <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">
                    {isAnalyzing ? "ドキュメントを解析中..." : "応答を生成中..."}
                  </span>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* 入力エリア */}
          <div className="border-t bg-card/50 backdrop-blur-sm p-4 sm:p-6 animate-in">
            {files.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {files.map((f) => (
                  <div key={f.id} className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-full text-sm hover-lift">
                    <FileUp className="h-3 w-3" />
                    <span className="max-w-[150px] truncate">{f.name}</span>
                    <span className="text-xs text-muted-foreground">({formatBytes(f.size)})</span>
                    <button onClick={() => removeFile(f.id)} className="hover:text-destructive transition-colors">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFiles(e.target.files)}
                multiple
                className="hidden"
                accept=".pdf,.dwg,.dxf,.xlsx,.xls,.png,.jpg,.jpeg"
              />
              <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} className="hover-lift">
                <FileUp className="h-4 w-4" />
              </Button>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.metaKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="建築要件やファイルをここに入力..."
                className="flex-1 min-h-[40px] max-h-[120px] resize-none"
              />
              <Button onClick={handleSend} disabled={(!input && files.length === 0) || isLoading} className="gradient-primary text-white hover:opacity-90 transition-opacity hover-lift">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* 右：進捗・条件パネル（デスクトップ用） */}
        <div className="border-l bg-card/50 backdrop-blur-sm flex-col hidden 2xl:flex animate-in h-full min-h-0">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              進捗・条件
            </h2>
          </div>
          <ScrollArea className="flex-1 min-h-0 px-6 py-4">
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
                {currentPhaseLocal && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    現在: <span className="font-medium text-foreground">{currentPhaseLocal.label}</span>
                  </div>
                )}
                <div className="mt-3">
                  <Accordion type="single" collapsible>
                    <AccordionItem value="phases" className="border-none">
                      <AccordionTrigger className="text-xs py-2 hover:no-underline">
                        全フェーズを表示
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-1">
                          {phases.map((p) => (
                            <div key={p.key} className="flex items-center justify-between text-sm">
                              <span>{p.label}</span>
                              <Badge variant={p.status === "done" ? "default" : p.status === "current" ? "secondary" : "outline"}>
                                {p.status === "done" ? "済" : p.status === "current" ? "進行中" : "未"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
                <Button size="sm" onClick={goNextPhase} className="w-full mt-3">次のフェーズへ</Button>
              </CardContent>
            </Card>

            <Card className="shadow-lg hover-lift animate-in">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm">情報回収状況</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {requirements.map((r) => (
                    <div key={r.key} className="flex items-start justify-between gap-2 text-sm">
                      <div className="flex-1">
                        <div className="flex items-center gap-1">
                          {r.required && <span className="text-destructive">*</span>}
                          <span>{r.label}</span>
                        </div>
                        {r.note && <div className="text-xs text-muted-foreground mt-0.5">{r.note}</div>}
                      </div>
                      {requirementStatusBadge(r.status)}
                    </div>
                  ))}
                </div>
                <Separator className="my-3" />
                <PhaseForm phase={phases[0]} onNext={goNextPhase} />
              </CardContent>
            </Card>

            <Card className="shadow-lg hover-lift animate-in">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm">設計条件</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {design.map((d) => (
                  <div key={d.key} className="flex items-center justify-between text-sm">
                    <div>
                      <span>{d.label}</span>
                      {d.status === "auto" && <span className="text-xs text-muted-foreground ml-1">(自動)</span>}
                    </div>
                    <span className="font-medium">{d.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-lg hover-lift animate-in">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm flex items-center justify-between">
                  設計計算
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleRun}>
                      {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {calc.map((c) => (
                  <div key={c.key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
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
      
      {/* ドキュメント解析ダイアログ */}
      <DocumentAnalysisDialog
        open={showAnalysisDialog}
        onOpenChange={setShowAnalysisDialog}
        analysisResult={currentAnalysis}
        onConfirm={handleAnalysisConfirm}
      />
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
  const curPhase = phases.find((p) => p.status === "current");
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b bg-card/50">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          進捗・条件
        </h2>
      </div>
      <ScrollArea className="flex-1 min-h-0 px-4 py-4">
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
              {curPhase && (
                <div className="mt-2 text-xs text-muted-foreground">
                  現在: <span className="font-medium text-foreground">{curPhase.label}</span>
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
const ChatBubble = React.memo(function ChatBubble({ role, content, files }: { role: Role; content: string; files?: UploadedFile[] }) {
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
        <div className="shrink-0 mt-1 rounded-full bg-secondary text-secondary-foreground p-2 animate-bounce-in">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
});