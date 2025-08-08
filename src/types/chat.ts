// チャットセッション関連の型定義

export type Role = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  files?: UploadedFile[];
  meta?: Record<string, unknown>;
  timestamp: number;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  files: UploadedFile[];
  projectInfo?: Record<string, any>; // フェーズ1で抽出した情報
  designPolicy?: Record<string, any>; // フェーズ2で決定した方針
  phase?: string; // 現在のフェーズ
  isActive: boolean;
}

export interface ChatHistoryState {
  sessions: ChatSession[];
  currentSessionId: string | null;
}

// セッションのサマリー情報（リスト表示用）
export interface SessionSummary {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  fileCount: number;
  phase?: string;
}