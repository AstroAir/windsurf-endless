/**
 * Shortcuts Management Page Component
 * Manage custom quick instructions
 */

import {
  Code,
  Edit2,
  FileText,
  FlaskConical,
  Keyboard,
  MessageCircle,
  MoreVertical,
  Play,
  Plus,
  Sparkles,
  Trash2,
  Wrench,
  Zap,
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
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { defaultShortcuts } from '../types';

import type { Shortcut } from '../types';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'play': Play,
  'sparkles': Sparkles,
  'flask': FlaskConical,
  'wrench': Wrench,
  'file-text': FileText,
  'message-circle': MessageCircle,
  'code': Code,
  'zap': Zap,
};

const colorMap: Record<string, string> = {
  green: 'bg-green-500/20 text-green-600 border-green-500/30',
  blue: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  purple: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
  orange: 'bg-orange-500/20 text-orange-600 border-orange-500/30',
  cyan: 'bg-cyan-500/20 text-cyan-600 border-cyan-500/30',
  pink: 'bg-pink-500/20 text-pink-600 border-pink-500/30',
  red: 'bg-red-500/20 text-red-600 border-red-500/30',
  yellow: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
};

const categoryLabels: Record<string, string> = {
  quick: '快捷',
  code: '代码',
  test: '测试',
  doc: '文档',
  custom: '自定义',
};

interface ShortcutsPageProps {
  onUseShortcut?: (shortcut: Shortcut) => void;
}

export function ShortcutsPage({ onUseShortcut }: ShortcutsPageProps) {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(defaultShortcuts);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingShortcut, setEditingShortcut] = useState<Shortcut | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    content: '',
    icon: 'zap',
    color: 'blue',
    hotkey: '',
    category: 'custom' as Shortcut['category'],
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      content: '',
      icon: 'zap',
      color: 'blue',
      hotkey: '',
      category: 'custom',
    });
  };

  const handleCreate = () => {
    if (formData.name && formData.content) {
      const newShortcut: Shortcut = {
        id: `sc-${Date.now()}`,
        name: formData.name,
        description: formData.description,
        content: formData.content,
        icon: formData.icon,
        color: formData.color,
        hotkey: formData.hotkey || undefined,
        category: formData.category,
        isBuiltIn: false,
        createdAt: Date.now(),
        usageCount: 0,
      };
      setShortcuts([...shortcuts, newShortcut]);
      resetForm();
      setIsCreateOpen(false);
    }
  };

  const handleEdit = () => {
    if (editingShortcut && formData.name && formData.content) {
      setShortcuts(shortcuts.map(s =>
        s.id === editingShortcut.id
          ? {
              ...s,
              name: formData.name,
              description: formData.description,
              content: formData.content,
              icon: formData.icon,
              color: formData.color,
              hotkey: formData.hotkey || undefined,
              category: formData.category,
            }
          : s,
      ));
      setEditingShortcut(null);
      resetForm();
    }
  };

  const handleDelete = (id: string) => {
    setShortcuts(shortcuts.filter(s => s.id !== id));
    setDeleteConfirmId(null);
  };

  const handleUse = (shortcut: Shortcut) => {
    setShortcuts(shortcuts.map(s =>
      s.id === shortcut.id ? { ...s, usageCount: s.usageCount + 1 } : s,
    ));
    onUseShortcut?.(shortcut);
  };

  const openEdit = (shortcut: Shortcut) => {
    setFormData({
      name: shortcut.name,
      description: shortcut.description,
      content: shortcut.content,
      icon: shortcut.icon,
      color: shortcut.color,
      hotkey: shortcut.hotkey || '',
      category: shortcut.category,
    });
    setEditingShortcut(shortcut);
  };

  const getIcon = (iconName: string) => {
    const Icon = iconMap[iconName] || Zap;
    return Icon;
  };

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce(
    (acc, shortcut) => {
      const cat = shortcut.category;
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(shortcut);
      return acc;
    },
    {} as Record<string, Shortcut[]>,
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Keyboard className="size-5" />
            快捷指令
          </h2>
          <p className="text-sm text-muted-foreground">
            管理自定义快捷指令，按数字键快速使用
          </p>
        </div>
        <Button size="sm" onClick={() => setIsCreateOpen(true)} className="gap-1">
          <Plus className="size-4" />
          新建快捷指令
        </Button>
      </div>

      {/* Shortcuts Grid */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-6">
          {Object.entries(groupedShortcuts).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Badge variant="outline">{categoryLabels[category]}</Badge>
                <span className="text-muted-foreground text-xs">
                  {items.length}
                  {' '}
                  个
                </span>
              </h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {items.map((shortcut) => {
                  const Icon = getIcon(shortcut.icon);
                  return (
                    <Card
                      key={shortcut.id}
                      className="group cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => handleUse(shortcut)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg border ${colorMap[shortcut.color] || colorMap.blue}`}>
                            <Icon className="size-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">
                                {shortcut.name}
                              </span>
                              {shortcut.hotkey && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {shortcut.hotkey}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {shortcut.description}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical className="size-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                openEdit(shortcut);
                              }}
                              >
                                <Edit2 className="size-4 mr-2" />
                                编辑
                              </DropdownMenuItem>
                              {!shortcut.isBuiltIn && (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirmId(shortcut.id);
                                  }}
                                >
                                  <Trash2 className="size-4 mr-2" />
                                  删除
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <p className="text-xs bg-muted/50 p-2 rounded mt-2 line-clamp-2">
                          {shortcut.content}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateOpen || !!editingShortcut}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingShortcut(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingShortcut ? '编辑快捷指令' : '新建快捷指令'}
            </DialogTitle>
            <DialogDescription>
              创建快捷指令，在 Windsurf Endless 对话框中快速使用
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">名称</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：继续优化"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hotkey">快捷键</Label>
                <Input
                  id="hotkey"
                  value={formData.hotkey}
                  onChange={e => setFormData({ ...formData, hotkey: e.target.value.slice(0, 1) })}
                  placeholder="1-9 或字母"
                  maxLength={1}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>图标</Label>
                <Select value={formData.icon} onValueChange={v => setFormData({ ...formData, icon: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="play">▶️ 播放</SelectItem>
                    <SelectItem value="sparkles">✨ 闪光</SelectItem>
                    <SelectItem value="flask">🧪 烧瓶</SelectItem>
                    <SelectItem value="wrench">🔧 扳手</SelectItem>
                    <SelectItem value="file-text">📄 文件</SelectItem>
                    <SelectItem value="message-circle">💬 消息</SelectItem>
                    <SelectItem value="code">💻 代码</SelectItem>
                    <SelectItem value="zap">⚡ 闪电</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>颜色</Label>
                <Select value={formData.color} onValueChange={v => setFormData({ ...formData, color: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="green">🟢 绿色</SelectItem>
                    <SelectItem value="blue">🔵 蓝色</SelectItem>
                    <SelectItem value="purple">🟣 紫色</SelectItem>
                    <SelectItem value="orange">🟠 橙色</SelectItem>
                    <SelectItem value="cyan">🔵 青色</SelectItem>
                    <SelectItem value="pink">🩷 粉色</SelectItem>
                    <SelectItem value="red">🔴 红色</SelectItem>
                    <SelectItem value="yellow">🟡 黄色</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>分类</Label>
              <Select
                value={formData.category}
                onValueChange={v => setFormData({ ...formData, category: v as Shortcut['category'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quick">快捷</SelectItem>
                  <SelectItem value="code">代码</SelectItem>
                  <SelectItem value="test">测试</SelectItem>
                  <SelectItem value="doc">文档</SelectItem>
                  <SelectItem value="custom">自定义</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="简短描述"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">指令内容</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
                placeholder="输入发送给AI的指令..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingShortcut(null);
                resetForm();
              }}
            >
              取消
            </Button>
            <Button onClick={editingShortcut ? handleEdit : handleCreate}>
              {editingShortcut ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销，快捷指令将被永久删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ShortcutsPage;
