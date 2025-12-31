/**
 * History Page Component
 */

import {
  AlertTriangle,
  Clock,
  Download,
  FolderOpen,
  History,
  MoreVertical,
  Play,
  Search,
  Square,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useHistory } from '../store';
import { vscode } from '../utils/vscode';

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1)
    return '刚刚';
  if (diffMins < 60)
    return `${diffMins} 分钟前`;
  if (diffHours < 24)
    return `${diffHours} 小时前`;
  if (diffDays < 7)
    return `${diffDays} 天前`;

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function HistoryPage() {
  const { history, clearHistory, deleteHistoryItem } = useHistory();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = history.filter(
    item =>
      item.summary.toLowerCase().includes(searchQuery.toLowerCase())
      || item.conversationName.toLowerCase().includes(searchQuery.toLowerCase())
      || (item.userInstruction?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false),
  );

  const handleExport = () => {
    vscode.postMessage({ type: 'export_history', data: { history } });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <History className="size-5" />
            对话历史
          </h2>
          <p className="text-sm text-muted-foreground">
            共
            {' '}
            {history.length}
            {' '}
            条记录
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1">
            <Download className="size-4" />
            导出
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-1" disabled={history.length === 0}>
                <Trash2 className="size-4" />
                清空
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="size-5 text-destructive" />
                  确认清空历史记录？
                </AlertDialogTitle>
                <AlertDialogDescription>
                  此操作将删除所有
                  {' '}
                  {history.length}
                  {' '}
                  条历史记录，且无法恢复。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={clearHistory}>确认清空</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="搜索历史记录..."
          className="pl-9"
        />
      </div>

      {/* History List */}
      <ScrollArea className="h-[500px]">
        {filteredHistory.length === 0
          ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <History className="size-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery ? '没有找到匹配的记录' : '暂无历史记录'}
                  </p>
                </CardContent>
              </Card>
            )
          : (
              <div className="space-y-2">
                {filteredHistory.map(item => (
                  <Card key={item.id} className="group">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant={item.action === 'continue' ? 'default' : 'secondary'}
                              className="gap-1"
                            >
                              {item.action === 'continue'
                                ? (
                                    <>
                                      <Play className="size-3" />
                                      继续
                                    </>
                                  )
                                : (
                                    <>
                                      <Square className="size-3" />
                                      结束
                                    </>
                                  )}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="size-3" />
                              {formatDate(item.timestamp)}
                            </span>
                          </div>

                          <p className="font-medium truncate">{item.summary}</p>

                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <FolderOpen className="size-3" />
                            <span className="truncate">{item.conversationName}</span>
                          </div>

                          {item.userInstruction && (
                            <div className="mt-2 p-2 rounded bg-muted text-sm">
                              <span className="text-muted-foreground">用户指令：</span>
                              {item.userInstruction}
                            </div>
                          )}
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteHistoryItem(item.id)}
                            >
                              <Trash2 className="size-4 mr-2" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
      </ScrollArea>
    </div>
  );
}

export default HistoryPage;
