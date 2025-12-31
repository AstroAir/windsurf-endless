/**
 * Templates Page Component
 * Manage instruction templates for quick use
 */

import {
  Copy,
  Edit2,
  FileText,
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
import { Textarea } from '@/components/ui/textarea';

import { vscode } from '../utils/vscode';

interface Template {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
  createdAt: number;
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'tpl-1',
    name: '继续优化',
    description: '让AI继续优化当前代码',
    content: '请继续优化这段代码，注意保持代码风格一致，添加必要的注释。',
    category: '代码',
    createdAt: Date.now(),
  },
  {
    id: 'tpl-2',
    name: '添加测试',
    description: '为当前功能添加单元测试',
    content: '请为刚才实现的功能添加完整的单元测试，覆盖正常情况和边界情况。',
    category: '测试',
    createdAt: Date.now(),
  },
  {
    id: 'tpl-3',
    name: '修复Bug',
    description: '继续修复发现的问题',
    content: '请继续修复刚才发现的问题，确保不影响其他功能。',
    category: '修复',
    createdAt: Date.now(),
  },
  {
    id: 'tpl-4',
    name: '添加文档',
    description: '为代码添加文档注释',
    content: '请为刚才的代码添加详细的文档注释，包括函数说明、参数说明和返回值说明。',
    category: '文档',
    createdAt: Date.now(),
  },
];

export function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    content: '',
    category: '',
  });

  const handleCreate = () => {
    if (formData.name && formData.content) {
      const newTemplate: Template = {
        id: `tpl-${Date.now()}`,
        name: formData.name,
        description: formData.description,
        content: formData.content,
        category: formData.category || '通用',
        createdAt: Date.now(),
      };
      setTemplates([newTemplate, ...templates]);
      setFormData({ name: '', description: '', content: '', category: '' });
      setIsCreateOpen(false);
    }
  };

  const handleEdit = () => {
    if (editingTemplate && formData.name && formData.content) {
      setTemplates(templates.map(t =>
        t.id === editingTemplate.id
          ? { ...t, ...formData }
          : t,
      ));
      setEditingTemplate(null);
      setFormData({ name: '', description: '', content: '', category: '' });
    }
  };

  const handleDelete = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
    setDeleteConfirmId(null);
  };

  const handleUse = (template: Template) => {
    vscode.postMessage({
      type: 'use_template',
      data: { content: template.content },
    });
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const openEdit = (template: Template) => {
    setFormData({
      name: template.name,
      description: template.description,
      content: template.content,
      category: template.category,
    });
    setEditingTemplate(template);
  };

  const categories = [...new Set(templates.map(t => t.category))];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="size-5" />
            指令模板
          </h2>
          <p className="text-sm text-muted-foreground">
            预设常用指令，快速继续对话
          </p>
        </div>
        <Button size="sm" onClick={() => setIsCreateOpen(true)} className="gap-1">
          <Plus className="size-4" />
          新建模板
        </Button>
      </div>

      {/* Categories */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <Badge key={cat} variant="outline">
            {cat}
            {' '}
            (
            {templates.filter(t => t.category === cat).length}
            )
          </Badge>
        ))}
      </div>

      {/* Templates List */}
      <ScrollArea className="h-[450px]">
        <div className="grid gap-3 md:grid-cols-2">
          {templates.map(template => (
            <Card key={template.id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{template.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {template.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                      {template.description}
                    </p>
                    <p className="text-xs bg-muted p-2 rounded line-clamp-2">
                      {template.content}
                    </p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleUse(template)}>
                        <FileText className="size-4 mr-2" />
                        使用
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopy(template.content)}>
                        <Copy className="size-4 mr-2" />
                        复制
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(template)}>
                        <Edit2 className="size-4 mr-2" />
                        编辑
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteConfirmId(template.id)}
                      >
                        <Trash2 className="size-4 mr-2" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <Button
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => handleUse(template)}
                >
                  使用此模板
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateOpen || !!editingTemplate}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingTemplate(null);
            setFormData({ name: '', description: '', content: '', category: '' });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? '编辑模板' : '新建模板'}
            </DialogTitle>
            <DialogDescription>
              创建常用的指令模板，在继续对话时快速使用
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">模板名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：继续优化"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">分类</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                placeholder="例如：代码、测试、文档"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="简短描述这个模板的用途"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">指令内容</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
                placeholder="输入要发送给AI的指令内容..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingTemplate(null);
                setFormData({ name: '', description: '', content: '', category: '' });
              }}
            >
              取消
            </Button>
            <Button onClick={editingTemplate ? handleEdit : handleCreate}>
              {editingTemplate ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除模板？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销，模板将被永久删除。
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

export default TemplatesPage;
