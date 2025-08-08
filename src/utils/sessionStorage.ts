import { ChatSession, SessionSummary } from "@/types/chat";

const STORAGE_KEY = "arch-chat-sessions";
const MAX_SESSIONS = 50; // 最大保存セッション数

// セッション一覧をLocalStorageから取得
export function loadSessions(): ChatSession[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const sessions = JSON.parse(stored) as ChatSession[];
    // 日付を数値に変換
    return sessions.map(session => ({
      ...session,
      createdAt: Number(session.createdAt),
      updatedAt: Number(session.updatedAt),
      messages: session.messages.map(msg => ({
        ...msg,
        timestamp: Number(msg.timestamp || msg.createdAt || Date.now())
      }))
    }));
  } catch (error) {
    console.error("Failed to load sessions:", error);
    return [];
  }
}

// セッション一覧をLocalStorageに保存
export function saveSessions(sessions: ChatSession[]): void {
  try {
    // 最新のセッションを優先して保存数を制限
    const sortedSessions = [...sessions]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_SESSIONS);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sortedSessions));
  } catch (error) {
    console.error("Failed to save sessions:", error);
    // ストレージ容量超過の場合は古いセッションを削除
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      const reducedSessions = sessions.slice(0, Math.floor(MAX_SESSIONS / 2));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reducedSessions));
      } catch (e) {
        console.error("Failed to save even reduced sessions:", e);
      }
    }
  }
}

// 単一セッションを取得
export function loadSession(sessionId: string): ChatSession | null {
  const sessions = loadSessions();
  return sessions.find(s => s.id === sessionId) || null;
}

// 単一セッションを保存/更新
export function saveSession(session: ChatSession): void {
  const sessions = loadSessions();
  const index = sessions.findIndex(s => s.id === session.id);
  
  if (index >= 0) {
    sessions[index] = session;
  } else {
    sessions.unshift(session); // 新規セッションは先頭に追加
  }
  
  saveSessions(sessions);
}

// セッションを削除
export function deleteSession(sessionId: string): void {
  const sessions = loadSessions();
  const filtered = sessions.filter(s => s.id !== sessionId);
  saveSessions(filtered);
}

// セッションのサマリー情報を取得（軽量版）
export function loadSessionSummaries(): SessionSummary[] {
  const sessions = loadSessions();
  return sessions.map(session => ({
    id: session.id,
    title: session.title,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    messageCount: session.messages.length,
    fileCount: session.files.length,
    phase: session.phase
  }));
}

// セッションタイトルを生成
export function generateSessionTitle(firstMessage: string, files: { name: string }[]): string {
  if (firstMessage) {
    // 最初のメッセージから適切な長さのタイトルを生成
    const cleaned = firstMessage.replace(/\n/g, " ").trim();
    return cleaned.length > 50 ? cleaned.substring(0, 50) + "..." : cleaned;
  } else if (files.length > 0) {
    // ファイルのみの場合はファイル名を使用
    return files[0].name + (files.length > 1 ? ` 他${files.length - 1}件` : "");
  } else {
    // デフォルトタイトル
    return "新規チャット";
  }
}

// ストレージ容量の確認
export function getStorageInfo(): { used: number; available: boolean } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) || "";
    const used = new Blob([stored]).size;
    // 一般的なブラウザのLocalStorage制限は5MB
    const limit = 5 * 1024 * 1024;
    return {
      used,
      available: used < limit * 0.9 // 90%未満なら利用可能
    };
  } catch {
    return { used: 0, available: true };
  }
}