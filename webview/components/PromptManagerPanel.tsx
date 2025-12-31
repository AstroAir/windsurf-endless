/**
 * Prompt Manager Panel
 * CRUD interface for managing prompt templates
 */

import {
  Check,
  ChevronDown,
  Copy,
  Edit,
  Plus,
  RotateCcw,
  Search,
  Star,
  Timer,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  DropdownMenuSeparator,
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
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

import { promptManager } from '../lib/promptManager';
import { DEFAULT_CATEGORIES } from '../types/session';

import type { PromptTemplate } from '../types/session';

interface PromptManagerPanelProps {
  onSelectPrompt?: (prompt: PromptTemplate) => void;
  mode?: 'manage' | 'select';
}

const iconOptions = [
  { value: 'play', label: '▶ 播放' },
  { value: 'sparkles', label: '✨ 星光' },
  { value: 'flask', label: '🧪 实验' },
  { value: 'wrench', label: '🔧 工具' },
  { value: 'file-text', label: '📄 文档' },
  { value: 'message-circle', label: '💬 消息' },
  { value: 'code', label: '💻 代码' },
  { value: 'zap', label: '⚡ 闪电' },
  { value: 'shield', label: '🛡️ 安全' },
  { value: 'star', label: '⭐ 星标' },
];

const colorOptions = [
  { value: 'green', label: '绿色', class: 'bg-green-500' },
  { value: 'blue', label: '蓝色', class: 'bg-blue-500' },
  { value: 'purple', label: '紫色', class: 'bg-purple-500' },
  { value: 'orange', label: '橙色', class: 'bg-orange-500' },
  { value: 'cyan', label: '青色', class: 'bg-cyan-500' },
  { value: 'pink', label: '粉色', class: 'bg-pink-500' },
  { value: 'red', label: '红色', class: 'bg-red-500' },
  { value: 'yellow', label: '黄色', class: 'bg-yellow-500' },
  { value: 'indigo', label: '靛蓝', class: 'bg-indigo-500' },
];

const defaultNewPrompt: Partial<PromptTemplate> = {
  name: '',
  description: '',
  content: '',
  icon: 'zap',
  color: 'blue',
  category: 'custom',
  autoSubmit: false,
  autoSubmitDelay: 30,
  isEditable: true,
};

export function PromptManagerPanel({ onSelectPrompt, mode = 'manage' }: PromptManagerPanelProps) {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Partial<PromptTemplate> | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Load prompts
  useEffect(() => {
    setPrompts(promptManager.getAllPrompts());
    const unsubscribe = promptManager.subscribe(setPrompts);
    return unsubscribe;
  }, []);

  // Filter prompts
  const filteredPrompts = useMemo(() => {
    let result = prompts;

    if (selectedCategory !== 'all') {
      result = result.filter(p => p.category === selectedCategory);
    }

    if (searchQuery) {
      result = promptManager.searchPrompts(searchQuery);
      if (selectedCategory !== 'all') {
        result = result.filter(p => p.category === selectedCategory);
      }
    }

    return result;
  }, [prompts, searchQuery, selectedCategory]);

  // Grouped prompts by category
  const groupedPrompts = useMemo(() => {
    const groups: Record<string, PromptTemplate[]> = {};
    filteredPrompts.forEach((prompt) => {
      if (!groups[prompt.category]) {
        groups[prompt.category] = [];
      }
      groups[prompt.category].push(prompt);
    });
    return groups;
  }, [filteredPrompts]);

  // Handlers
  const handleCreateNew = useCallback(() => {
    setEditingPrompt({ ...defaultNewPrompt });
    setIsEditing(false);
    setIsDialogOpen(true);
  }, []);

  const handleEdit = useCallback((prompt: PromptTemplate) => {
    setEditingPrompt({ ...prompt });
    setIsEditing(true);
    setIsDialogOpen(true);
  }, []);

  const handleDuplicate = useCallback((prompt: PromptTemplate) => {
    promptManager.duplicatePrompt(prompt.id);
  }, []);

  const handleDelete = useCallback((prompt: PromptTemplate) => {
    if (prompt.isBuiltIn && !prompt.isEditable) {
      return;
    }
    promptManager.deletePrompt(prompt.id);
  }, []);

  const handleSave = useCallback(() => {
    if (!editingPrompt || !editingPrompt.name || !editingPrompt.content) {
      return;
    }

    if (isEditing && editingPrompt.id) {
      promptManager.updatePrompt(editingPrompt.id, editingPrompt);
    }
    else {
      promptManager.createPrompt(editingPrompt as Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'isBuiltIn'>);
    }

    setIsDialogOpen(false);
    setEditingPrompt(null);
  }, [editingPrompt, isEditing]);

  const handleSelect = useCallback((prompt: PromptTemplate) => {
    promptManager.recordUsage(prompt.id);
    onSelectPrompt?.(prompt);
  }, [onSelectPrompt]);

  const handleReset = useCallback(() => {
    // eslint-disable-next-line no-alert
    if (window.confirm('确定要重置所有提示词为默认值吗？这将删除所有自定义提示词。')) {
      promptManager.resetToDefaults();
    }
  }, []);

  const handleExport = useCallback(() => {
    const json = promptManager.exportPrompts();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompts-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

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
          const count = promptManager.importPrompts(json);
          if (count > 0) {
            console.log(`Imported ${count} prompts`);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, []);

  const getCategoryLabel = (categoryId: string) => {
    const cat = DEFAULT_CATEGORIES.find(c => c.id === categoryId);
    return cat?.name || categoryId;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="size-5" />
              {mode === 'select' ? '选择提示词' : '提示词管理'}
            </CardTitle>
            <CardDescription>
              共
              {' '}
              {prompts.length}
              {' '}
              个提示词
            </CardDescription>
          </div>
          {mode === 'manage' && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                导出
              </Button>
              <Button variant="outline" size="sm" onClick={handleImport}>
                导入
              </Button>
              <Button size="sm" onClick={handleCreateNew}>
                <Plus className="size-4 mr-1" />
                新建
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <Separator />

      <div className="p-3 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="搜索提示词..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Badge
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            className="cursor-pointer shrink-0"
            onClick={() => setSelectedCategory('all')}
          >
            全部
          </Badge>
          {DEFAULT_CATEGORIES.map(cat => (
            <Badge
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              className="cursor-pointer shrink-0"
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      {/* Prompt list */}
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[400px]">
          {filteredPrompts.length === 0
            ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Star className="size-12 mx-auto mb-2 opacity-50" />
                  <p>暂无提示词</p>
                  {mode === 'manage' && (
                    <Button variant="outline" size="sm" className="mt-2" onClick={handleCreateNew}>
                      <Plus className="size-4 mr-1" />
                      创建第一个
                    </Button>
                  )}
                </div>
              )
            : (
                <div className="divide-y">
                  {Object.entries(groupedPrompts).map(([category, categoryPrompts]) => (
                    <div key={category}>
                      <div className="px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground sticky top-0">
                        {getCategoryLabel(category)}
                        {' '}
                        (
                        {categoryPrompts.length}
                        )
                      </div>
                      {categoryPrompts.map(prompt => (
                        <div
                          key={prompt.id}
                          className="p-3 hover:bg-muted/50 cursor-pointer transition-colors group"
                          onClick={() => mode === 'select' && handleSelect(prompt)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <div
                                className={`size-8 rounded-md flex items-center justify-center shrink-0 bg-${prompt.color}-500/20 text-${prompt.color}-600`}
                              >
                                {prompt.hotkey && (
                                  <span className="text-xs font-bold">{prompt.hotkey}</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{prompt.name}</span>
                                  {prompt.isBuiltIn && (
                                    <Badge variant="secondary" className="text-[10px]">
                                      内置
                                    </Badge>
                                  )}
                                  {prompt.autoSubmit && (
                                    <Badge variant="outline" className="text-[10px] gap-0.5">
                                      <Timer className="size-2.5" />
                                      {prompt.autoSubmitDelay}
                                      s
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {prompt.description || prompt.content}
                                </p>
                                {prompt.usageCount > 0 && (
                                  <span className="text-[10px] text-muted-foreground">
                                    使用
                                    {' '}
                                    {prompt.usageCount}
                                    {' '}
                                    次
                                  </span>
                                )}
                              </div>
                            </div>
                            {mode === 'manage' && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="size-8 p-0 opacity-0 group-hover:opacity-100"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <ChevronDown className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleSelect(prompt)}>
                                    <Check className="size-4 mr-2" />
                                    使用
                                  </DropdownMenuItem>
                                  {prompt.isEditable && (
                                    <DropdownMenuItem onClick={() => handleEdit(prompt)}>
                                      <Edit className="size-4 mr-2" />
                                      编辑
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => handleDuplicate(prompt)}>
                                    <Copy className="size-4 mr-2" />
                                    复制
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {(!prompt.isBuiltIn || prompt.isEditable) && (
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => handleDelete(prompt)}
                                    >
                                      <Trash2 className="size-4 mr-2" />
                                      删除
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                            {mode === 'select' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="size-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelect(prompt);
                                }}
                              >
                                <Check className="size-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
        </ScrollArea>
      </CardContent>

      {mode === 'manage' && (
        <>
          <Separator />
          <div className="p-3 flex justify-end">
            <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground">
              <RotateCcw className="size-4 mr-1" />
              重置为默认
            </Button>
          </div>
        </>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? '编辑提示词' : '新建提示词'}</DialogTitle>
            <DialogDescription>
              {isEditing ? '修改提示词的内容和设置' : '创建一个新的提示词模板'}
            </DialogDescription>
          </DialogHeader>

          {editingPrompt && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">名称</Label>
                <Input
                  id="name"
                  value={editingPrompt.name || ''}
                  onChange={e => setEditingPrompt({ ...editingPrompt, name: e.target.value })}
                  placeholder="例如：优化代码"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">描述</Label>
                <Input
                  id="description"
                  value={editingPrompt.description || ''}
                  onChange={e => setEditingPrompt({ ...editingPrompt, description: e.target.value })}
                  placeholder="简短描述提示词的用途"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">提示词内容</Label>
                <Textarea
                  id="content"
                  value={editingPrompt.content || ''}
                  onChange={e => setEditingPrompt({ ...editingPrompt, content: e.target.value })}
                  placeholder="输入发送给 AI 的提示词内容..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>分类</Label>
                  <Select
                    value={editingPrompt.category || 'custom'}
                    onValueChange={value => setEditingPrompt({
                      ...editingPrompt,
                      category: value as PromptTemplate['category'],
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFAULT_CATEGORIES.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>快捷键</Label>
                  <Input
                    value={editingPrompt.hotkey || ''}
                    onChange={e => setEditingPrompt({
                      ...editingPrompt,
                      hotkey: e.target.value.slice(0, 1),
                    })}
                    placeholder="1-9"
                    maxLength={1}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>颜色</Label>
                  <Select
                    value={editingPrompt.color || 'blue'}
                    onValueChange={value => setEditingPrompt({ ...editingPrompt, color: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map(color => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <span className={`size-3 rounded-full ${color.class}`} />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>图标</Label>
                  <Select
                    value={editingPrompt.icon || 'zap'}
                    onValueChange={value => setEditingPrompt({ ...editingPrompt, icon: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {iconOptions.map(icon => (
                        <SelectItem key={icon.value} value={icon.value}>
                          {icon.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>自动提交</Label>
                  <p className="text-xs text-muted-foreground">选择后自动倒计时提交</p>
                </div>
                <Switch
                  checked={editingPrompt.autoSubmit || false}
                  onCheckedChange={checked => setEditingPrompt({ ...editingPrompt, autoSubmit: checked })}
                />
              </div>

              {editingPrompt.autoSubmit && (
                <div className="space-y-2">
                  <Label>倒计时 (秒)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={86400}
                    value={editingPrompt.autoSubmitDelay || 30}
                    onChange={e => setEditingPrompt({
                      ...editingPrompt,
                      autoSubmitDelay: Number.parseInt(e.target.value) || 30,
                    })}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={!editingPrompt?.name || !editingPrompt?.content}
            >
              {isEditing ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default PromptManagerPanel;
