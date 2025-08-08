"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  History,
  MessageSquare,
  FileUp,
  Calendar,
  Plus,
  Trash2,
  ChevronRight,
  Search,
  Archive
} from "lucide-react";
import { ChatSession, SessionSummary } from "@/types/chat";
import { formatDistanceToNow } from "@/utils/dateUtils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ChatHistorySidebarProps {
  sessions: SessionSummary[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  className?: string;
}

export function ChatHistorySidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  className
}: ChatHistorySidebarProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  
  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const phaseLabels: Record<string, string> = {
    p1: "対象確認",
    p2: "設計方針",
    p3: "設計条件",
    p4: "設計計算",
    p5: "評価実施",
    p6: "概算コスト",
    p7: "市場分析",
    p8: "サマリ"
  };
  
  const groupSessionsByDate = (sessions: SessionSummary[]) => {
    const now = Date.now();
    const today = new Date().setHours(0, 0, 0, 0);
    const yesterday = today - 86400000;
    const thisWeek = today - 7 * 86400000;
    const thisMonth = today - 30 * 86400000;
    
    const groups: { [key: string]: SessionSummary[] } = {
      today: [],
      yesterday: [],
      thisWeek: [],
      thisMonth: [],
      older: []
    };
    
    sessions.forEach(session => {
      const sessionDate = new Date(session.createdAt).setHours(0, 0, 0, 0);
      if (sessionDate === today) {
        groups.today.push(session);
      } else if (sessionDate === yesterday) {
        groups.yesterday.push(session);
      } else if (sessionDate > thisWeek) {
        groups.thisWeek.push(session);
      } else if (sessionDate > thisMonth) {
        groups.thisMonth.push(session);
      } else {
        groups.older.push(session);
      }
    });
    
    return groups;
  };
  
  const groupedSessions = groupSessionsByDate(filteredSessions);
  
  const SessionItem = ({ session }: { session: SessionSummary }) => {
    const isActive = session.id === currentSessionId;
    
    return (
      <Card
        className={`p-3 cursor-pointer transition-all hover:shadow-md ${
          isActive ? "border-primary bg-primary/5" : "hover:bg-muted/50"
        }`}
        onClick={() => onSelectSession(session.id)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{session.title}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {session.messageCount}
              </span>
              {session.fileCount > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileUp className="h-3 w-3" />
                  {session.fileCount}
                </span>
              )}
              {session.phase && (
                <Badge variant="secondary" className="text-xs">
                  {phaseLabels[session.phase] || session.phase}
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteSession(session.id);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </Card>
    );
  };
  
  const SessionGroup = ({ title, sessions }: { title: string; sessions: SessionSummary[] }) => {
    if (sessions.length === 0) return null;
    
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground px-2">{title}</h3>
        <div className="space-y-2">
          {sessions.map((session) => (
            <SessionItem key={session.id} session={session} />
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <History className="h-5 w-5" />
            履歴
          </h2>
          <Button size="sm" onClick={onNewSession} className="gap-1">
            <Plus className="h-4 w-4" />
            新規
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="履歴を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      
      <Separator />
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          <SessionGroup title="今日" sessions={groupedSessions.today} />
          <SessionGroup title="昨日" sessions={groupedSessions.yesterday} />
          <SessionGroup title="今週" sessions={groupedSessions.thisWeek} />
          <SessionGroup title="今月" sessions={groupedSessions.thisMonth} />
          <SessionGroup title="それ以前" sessions={groupedSessions.older} />
        </div>
      </ScrollArea>
      
      <Separator />
      
      <div className="p-4">
        <Button variant="outline" size="sm" className="w-full gap-2">
          <Archive className="h-4 w-4" />
          アーカイブされた履歴
        </Button>
      </div>
    </div>
  );
}

// モバイル用のシートラッパー
export function MobileChatHistorySidebar(props: ChatHistorySidebarProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <History className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[320px] p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>チャット履歴</SheetTitle>
        </SheetHeader>
        <ChatHistorySidebar {...props} />
      </SheetContent>
    </Sheet>
  );
}