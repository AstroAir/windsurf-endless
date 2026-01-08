/**
 * Conversations Management Page Component
 * Supports multiple windows and conversation isolation
 */

import {
  AlertTriangle,
  Check,
  Clock,
  Copy,
  Edit2,
  FolderOpen,
  MessageSquare,
  MoreVertical,
  Plus,
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
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useConversations } from '../store';

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ConversationsPage() {
  const {
    conversations,
    activeConversationId,
    createConversation,
    deleteConversation,
    switchConversation,
    updateConversation,
  } = useConversations();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newConversationName, setNewConversationName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleCreate = () => {
    if (newConversationName.trim()) {
      createConversation(newConversationName.trim(), '');
      setNewConversationName('');
      setIsCreateDialogOpen(false);
    }
  };

  const handleRename = (id: string) => {
    if (editingName.trim()) {
      updateConversation(id, { name: editingName.trim() });
      setEditingId(null);
      setEditingName('');
    }
  };

  const handleDuplicate = (conv: typeof conversations[0]) => {
    createConversation(`${conv.name} (副本)`, conv.workspacePath);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="size-5" />
            对话管理
          </h2>
          <p className="text-sm text-muted-foreground">
            管理多个独立的对话上下文
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="size-4" />
              新建对话
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建新对话</DialogTitle>
              <DialogDescription>
                创建一个新的独立对话上下文，用于隔离不同的任务。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">对话名称</Label>
                <Input
                  id="name"
                  value={newConversationName}
                  onChange={e => setNewConversationName(e.target.value)}
                  placeholder="例如：项目重构、Bug 修复..."
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreate} disabled={!newConversationName.trim()}>
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Conversations List */}
      <ScrollArea className="h-[500px]">
        {conversations.length === 0
          ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MessageSquare className="size-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground mb-4">暂无对话</p>
                  <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                    <Plus className="size-4" />
                    创建第一个对话
                  </Button>
                </CardContent>
              </Card>
            )
          : (
              <div className="space-y-2">
                {conversations.map(conv => (
                  <Card
                    key={conv.id}
                    className={`group cursor-pointer transition-colors ${
                      conv.id === activeConversationId
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => switchConversation(conv.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {editingId === conv.id
                              ? (
                                  <Input
                                    value={editingName}
                                    onChange={e => setEditingName(e.target.value)}
                                    onBlur={() => handleRename(conv.id)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter')
                                        handleRename(conv.id);
                                      if (e.key === 'Escape') {
                                        setEditingId(null);
                                        setEditingName('');
                                      }
                                    }}
                                    className="h-7 text-sm"
                                    autoFocus
                                    onClick={e => e.stopPropagation()}
                                  />
                                )
                              : (
                                  <span className="font-medium truncate">{conv.name}</span>
                                )}
                            {conv.id === activeConversationId && (
                              <Badge variant="default" className="gap-1">
                                <Check className="size-3" />
                                当前
                              </Badge>
                            )}
                            {conv.isActive && conv.id !== activeConversationId && (
                              <Badge variant="secondary">活跃</Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {formatDate(conv.updatedAt)}
                            </span>
                            {conv.workspacePath && (
                              <span className="flex items-center gap-1 truncate">
                                <FolderOpen className="size-3" />
                                {conv.workspacePath}
                              </span>
                            )}
                            <span>
                              {conv.messages.length}
                              {' '}
                              条消息
                            </span>
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={e => e.stopPropagation()}
                            >
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(conv.id);
                                setEditingName(conv.name);
                              }}
                            >
                              <Edit2 className="size-4 mr-2" />
                              重命名
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicate(conv);
                              }}
                            >
                              <Copy className="size-4 mr-2" />
                              复制
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(conv.id);
                              }}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              确认删除对话？
            </AlertDialogTitle>
            <AlertDialogDescription>
              此操作将删除该对话及其所有消息记录，且无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmId) {
                  deleteConversation(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ConversationsPage;
