/**
 * Session History Panel
 * Displays session history with filtering and export options
 */

import {
  Calendar,
  ChevronDown,
  Clock,
  Download,
  Filter,
  MessageSquare,
  MoreVertical,
  Search,
  Tag,
  Trash2,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

import { sessionManager } from '../lib/sessionManager';

import type { EnhancedSession, SessionFilter, SessionStatus } from '../types/session';

interface SessionHistoryPanelProps {
  onSelectSession?: (session: EnhancedSession) => void;
  onClose?: () => void;
}

const statusColors: Record<SessionStatus, string> = {
  active: 'bg-green-500',
  paused: 'bg-yellow-500',
  completed: 'bg-blue-500',
  expired: 'bg-gray-500',
};

const statusLabels: Record<SessionStatus, string> = {
  active: '进行中',
  paused: '已暂停',
  completed: '已完成',
  expired: '已过期',
};

export function SessionHistoryPanel({ onSelectSession, onClose: _onClose }: SessionHistoryPanelProps) {
  const [sessions, setSessions] = useState<EnhancedSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SessionStatus[]>([]);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // Load sessions
  useEffect(() => {
    setSessions(sessionManager.getAllSessions());
    const unsubscribe = sessionManager.subscribe(setSessions);
    return unsubscribe;
  }, []);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    const filter: SessionFilter = {};

    if (statusFilter.length > 0) {
      filter.status = statusFilter;
    }

    if (searchQuery) {
      filter.searchQuery = searchQuery;
    }

    return sessionManager.getSessions(filter);
  }, [sessions, searchQuery, statusFilter]);

  // Statistics
  const statistics = useMemo(() => sessionManager.getStatistics(), [sessions]);

  // Format duration
  const formatDuration = useCallback((ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}小时 ${minutes % 60}分钟`;
    }
    if (minutes > 0) {
      return `${minutes}分钟`;
    }
    return `${seconds}秒`;
  }, []);

  // Format date
  const formatDate = useCallback((timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `今天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffDays === 1) {
      return `昨天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  // Handle export
  const handleExport = useCallback(() => {
    const json = sessionManager.exportSessions();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sessions-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Handle import
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          const json = reader.result as string;
          const count = sessionManager.importSessions(json);
          if (count > 0) {
            console.log(`Imported ${count} sessions`);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, []);

  // Handle delete session
  const handleDeleteSession = useCallback((id: string) => {
    sessionManager.deleteSession(id);
  }, []);

  // Toggle status filter
  const toggleStatusFilter = useCallback((status: SessionStatus) => {
    setStatusFilter((prev) => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status);
      }
      return [...prev, status];
    });
  }, []);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="size-5" />
              会话历史
            </CardTitle>
            <CardDescription>
              共
              {' '}
              {statistics.totalSessions}
              {' '}
              个会话，
              {statistics.totalMessages}
              {' '}
              条消息
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="size-4 mr-1" />
              导出
            </Button>
            <Button variant="outline" size="sm" onClick={handleImport}>
              <Upload className="size-4 mr-1" />
              导入
            </Button>
          </div>
        </div>
      </CardHeader>

      <Separator />

      <div className="p-3 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="搜索会话..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="size-4 text-muted-foreground" />
          {(Object.keys(statusLabels) as SessionStatus[]).map(status => (
            <Badge
              key={status}
              variant={statusFilter.includes(status) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => toggleStatusFilter(status)}
            >
              <span className={`size-2 rounded-full mr-1 ${statusColors[status]}`} />
              {statusLabels[status]}
            </Badge>
          ))}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-muted rounded-md p-2">
            <div className="font-semibold text-lg">{statistics.activeSessions}</div>
            <div className="text-muted-foreground">进行中</div>
          </div>
          <div className="bg-muted rounded-md p-2">
            <div className="font-semibold text-lg">{statistics.completedSessions}</div>
            <div className="text-muted-foreground">已完成</div>
          </div>
          <div className="bg-muted rounded-md p-2">
            <div className="font-semibold text-lg">{statistics.totalContinues}</div>
            <div className="text-muted-foreground">继续</div>
          </div>
          <div className="bg-muted rounded-md p-2">
            <div className="font-semibold text-lg">{statistics.totalEnds}</div>
            <div className="text-muted-foreground">结束</div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Session list */}
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[400px]">
          {filteredSessions.length === 0
            ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Clock className="size-12 mx-auto mb-2 opacity-50" />
                  <p>暂无会话记录</p>
                </div>
              )
            : (
                <div className="divide-y">
                  {filteredSessions.map(session => (
                    <div
                      key={session.id}
                      className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setExpandedSessionId(
                        expandedSessionId === session.id ? null : session.id,
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`size-2 rounded-full ${statusColors[session.status]}`} />
                            <span className="font-medium truncate text-sm">
                              {session.workspacePath.split(/[/\\]/).pop() || '未知工作区'}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {session.messageCount}
                              {' '}
                              消息
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="size-3" />
                              {formatDate(session.createdAt)}
                            </span>
                            {session.totalDuration > 0 && (
                              <span className="flex items-center gap-1">
                                <Clock className="size-3" />
                                {formatDuration(session.totalDuration)}
                              </span>
                            )}
                          </div>
                          {session.tags.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <Tag className="size-3 text-muted-foreground" />
                              {session.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="size-8 p-0">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onSelectSession?.(session)}>
                              <MessageSquare className="size-4 mr-2" />
                              查看详情
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSession(session.id);
                              }}
                            >
                              <Trash2 className="size-4 mr-2" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Expanded content */}
                      {expandedSessionId === session.id && (
                        <div className="mt-3 pt-3 border-t space-y-2">
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-muted-foreground">
                              继续:
                              {' '}
                              <strong className="text-green-600">{session.continueCount}</strong>
                            </span>
                            <span className="text-muted-foreground">
                              结束:
                              {' '}
                              <strong className="text-red-600">{session.endCount}</strong>
                            </span>
                          </div>
                          {session.notes && (
                            <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                              {session.notes}
                            </p>
                          )}
                          {session.messages.slice(-3).map(msg => (
                            <div
                              key={msg.id}
                              className="text-xs p-2 bg-muted/50 rounded flex items-start gap-2"
                            >
                              <Badge
                                variant={msg.shouldContinue ? 'default' : 'destructive'}
                                className="text-[10px] shrink-0"
                              >
                                {msg.shouldContinue ? '继续' : '结束'}
                              </Badge>
                              <span className="text-muted-foreground truncate">
                                {msg.summary || msg.userInstruction || '无内容'}
                              </span>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs"
                            onClick={() => onSelectSession?.(session)}
                          >
                            <ChevronDown className="size-3 mr-1" />
                            查看全部
                            {' '}
                            {session.messageCount}
                            {' '}
                            条消息
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default SessionHistoryPanel;
