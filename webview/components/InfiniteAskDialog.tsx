// Windsurf Endless Dialog Component
import { AlertCircle, ChevronRight, Code, FileText, FlaskConical, History, Image as ImageIcon, Keyboard, Loader2, MessageCircle, MessageSquare, Play, Shield, Sparkles, Square, Star, Volume2, VolumeX, Wand2, Wrench, X, Zap } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { audioManager } from '../lib/audioManager';
import { autoSubmitManager } from '../lib/autoSubmitManager';
import { promptManager } from '../lib/promptManager';
import { sessionManager } from '../lib/sessionManager';
import { useConversations, useHistory } from '../store';
import { vscode } from '../utils/vscode';

import { AutoSubmitCountdown } from './AutoSubmitCountdown';
import { ConnectionStatus } from './ConnectionStatus';
import { MarkdownRenderer } from './MarkdownRenderer';
import { PromptManagerPanel } from './PromptManagerPanel';
import { SessionHistoryPanel } from './SessionHistoryPanel';

import type { PromptTemplate } from '../types/session';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'play': Play,
  'sparkles': Sparkles,
  'flask': FlaskConical,
  'wrench': Wrench,
  'file-text': FileText,
  'message-circle': MessageCircle,
  'code': Code,
  'zap': Zap,
  'shield': Shield,
  'star': Star,
};

const colorMap: Record<string, string> = {
  green: 'bg-green-500/20 text-green-600 border-green-500/30 hover:bg-green-500/30',
  blue: 'bg-blue-500/20 text-blue-600 border-blue-500/30 hover:bg-blue-500/30',
  purple: 'bg-purple-500/20 text-purple-600 border-purple-500/30 hover:bg-purple-500/30',
  orange: 'bg-orange-500/20 text-orange-600 border-orange-500/30 hover:bg-orange-500/30',
  cyan: 'bg-cyan-500/20 text-cyan-600 border-cyan-500/30 hover:bg-cyan-500/30',
  pink: 'bg-pink-500/20 text-pink-600 border-pink-500/30 hover:bg-pink-500/30',
  red: 'bg-red-500/20 text-red-600 border-red-500/30 hover:bg-red-500/30',
  yellow: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/30',
  indigo: 'bg-indigo-500/20 text-indigo-600 border-indigo-500/30 hover:bg-indigo-500/30',
};

interface InfiniteAskDialogProps {
  reason?: string;
  summary?: string;
  workspacePath?: string;
  panelId?: string;
  onContinue?: (instruction?: string) => void;
  onEnd?: () => void;
}

export function InfiniteAskDialog({
  reason = '',
  summary = '',
  workspacePath = '',
  panelId: _panelId, // Reserved for future multi-window tracking
  onContinue,
  onEnd,
}: InfiniteAskDialogProps) {
  const { activeConversation, createConversation, switchConversation, updateConversation } = useConversations();
  const { addHistoryItem } = useHistory();
  const [instruction, setInstruction] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [pastedImages, setPastedImages] = useState<{ id: string; dataUrl: string; name: string }[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(audioManager.getSettings().enabled);
  const [activeTab, setActiveTab] = useState('main');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    audioManager.initialize();
    setPrompts(promptManager.getPromptsSortedByUsage().slice(0, 9));
    if (!sessionManager.getCurrentSession()) {
      sessionManager.createSession(workspacePath, workspacePath);
    }
    if (!activeConversation) {
      const created = createConversation('默认对话', workspacePath);
      switchConversation(created.id);
    }
    else if (!activeConversation.workspacePath && workspacePath) {
      updateConversation(activeConversation.id, { workspacePath });
    }
    audioManager.playSessionUpdate();
    return promptManager.subscribe(() => setPrompts(promptManager.getPromptsSortedByUsage().slice(0, 9)));
  }, [workspacePath, activeConversation, createConversation, switchConversation, updateConversation]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) {
      return;
    }
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            setPastedImages(prev => [...prev, { id: `img-${Date.now()}`, dataUrl, name: file.name || 'image.png' }]);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  }, []);

  const removeImage = useCallback((id: string) => {
    setPastedImages(prev => prev.filter(img => img.id !== id));
  }, []);

  const handleContinue = useCallback((customInstruction?: string) => {
    setIsSubmitting(true);
    autoSubmitManager.cancel();
    const finalInstruction = customInstruction ?? instruction.trim();
    // Record session with both summary and reason
    const displaySummary = summary || reason || '任务已完成';
    sessionManager.addMessage({
      type: 'response',
      summary: displaySummary,
      userInstruction: finalInstruction,
      shouldContinue: true,
      hasImages: pastedImages.length > 0,
      imageCount: pastedImages.length,
    });
    const targetConversation = activeConversation;
    addHistoryItem({
      conversationId: targetConversation?.id ?? 'default',
      conversationName: targetConversation?.name ?? '默认对话',
      workspacePath: targetConversation?.workspacePath || workspacePath || '',
      summary: displaySummary,
      action: 'continue',
      userInstruction: finalInstruction || undefined,
    });
    vscode.postMessage({
      type: 'infinite_ask_response',
      data: {
        shouldContinue: true,
        userInstruction: finalInstruction || undefined,
        images: pastedImages.length > 0 ? pastedImages : undefined,
      },
    });
    onContinue?.(finalInstruction || undefined);
  }, [instruction, onContinue, pastedImages, reason, summary, addHistoryItem, activeConversation, workspacePath]);

  useEffect(() => {
    autoSubmitManager.setOnSubmit(() => handleContinue());
    return () => {
      autoSubmitManager.setOnSubmit(() => {});
      autoSubmitManager.cancel();
    };
  }, [handleContinue]);

  const handleEnd = useCallback(() => {
    setIsSubmitting(true);
    autoSubmitManager.cancel();
    // Record session with both summary and reason
    const displaySummary = summary || reason || '任务已完成';
    sessionManager.addMessage({
      type: 'response',
      summary: displaySummary,
      shouldContinue: false,
      hasImages: false,
    });
    const targetConversation = activeConversation;
    addHistoryItem({
      conversationId: targetConversation?.id ?? 'default',
      conversationName: targetConversation?.name ?? '默认对话',
      workspacePath: targetConversation?.workspacePath || workspacePath || '',
      summary: displaySummary,
      action: 'end',
    });
    const session = sessionManager.getCurrentSession();
    if (session) {
      sessionManager.updateSessionStatus(session.id, 'completed');
    }
    vscode.postMessage({ type: 'infinite_ask_response', data: { shouldContinue: false } });
    onEnd?.();
  }, [onEnd, reason, summary, addHistoryItem, activeConversation, workspacePath]);

  const handlePromptSelect = useCallback((prompt: PromptTemplate) => {
    setInstruction(prompt.content);
    promptManager.recordUsage(prompt.id);
    if (prompt.autoSubmit && prompt.autoSubmitDelay) {
      autoSubmitManager.start(prompt.autoSubmitDelay, 'prompt');
    }
    setActiveTab('main');
  }, []);

  const handleLocalOptimize = useCallback(async () => {
    if (!instruction.trim() || isOptimizing) {
      return;
    }
    setIsOptimizing(true);
    vscode.postMessage({ type: 'optimize_prompt', data: { prompt: instruction.trim() } });
  }, [instruction, isOptimizing]);

  const handleAIOptimize = useCallback(async () => {
    if (!instruction.trim() || isOptimizing) {
      return;
    }
    setIsOptimizing(true);
    vscode.postMessage({ type: 'optimize_prompt_with_ai', data: { prompt: instruction.trim() } });
  }, [instruction, isOptimizing]);

  const toggleAudio = useCallback(() => {
    const newEnabled = !audioEnabled;
    setAudioEnabled(newEnabled);
    audioManager.updateSettings({ enabled: newEnabled });
    if (newEnabled) {
      audioManager.test();
    }
  }, [audioEnabled]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg.type === 'prompt_optimized') {
        setIsOptimizing(false);
        if (msg.data?.optimizedPrompt) {
          setInstruction(msg.data.optimizedPrompt);
        }
      }
      else if (msg.type === 'prompt_optimize_error') {
        setIsOptimizing(false);
      }
      else if (msg.type === 'fill_input' && msg.data?.content) {
        setInstruction(msg.data.content);
        setIsOptimizing(false);
        setTimeout(() => textareaRef.current?.focus(), 100);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isSubmitting) {
        return;
      }
      if (e.key >= '1' && e.key <= '9' && document.activeElement?.tagName !== 'TEXTAREA') {
        const p = prompts.find(x => x.hotkey === e.key);
        if (p) {
          e.preventDefault();
          handlePromptSelect(p);
        }
      }
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        handleContinue();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        handleEnd();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prompts, isSubmitting, handleContinue, handleEnd, handlePromptSelect]);

  const getIcon = (name: string) => iconMap[name] || Zap;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-2xl shadow-2xl border-2">
        <CardHeader className="space-y-3 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-6 text-primary" />
              <CardTitle className="text-xl">Windsurf Endless</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <ConnectionStatus compact />
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8" onClick={toggleAudio}>
                      {audioEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4 text-muted-foreground" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{audioEnabled ? '关闭提示音' : '开启提示音'}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Badge variant="outline" className="gap-1 text-xs">
                <Keyboard className="size-3" />
                快捷键
              </Badge>
              <Badge variant="secondary" className="font-mono">等待确认</Badge>
            </div>
          </div>
          <CardDescription className="text-base">AI 已完成当前任务，请选择是否继续对话</CardDescription>
        </CardHeader>
        <Separator />
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-4 pt-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="main" className="text-xs">
                <MessageSquare className="size-3 mr-1" />
                对话
              </TabsTrigger>
              <TabsTrigger value="prompts" className="text-xs">
                <Star className="size-3 mr-1" />
                提示词
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs">
                <History className="size-3 mr-1" />
                历史
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="main" className="mt-0">
            <CardContent className="space-y-4 pt-4">
              {/* Display summary (what AI did) */}
              {summary && summary.trim() && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Sparkles className="size-4" />
                    <span>AI 完成的任务：</span>
                  </div>
                  <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-sm leading-relaxed">
                    <MarkdownRenderer content={summary} />
                  </div>
                </div>
              )}
              {/* Display reason (why AI wants to stop) */}
              {reason && reason.trim() && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <AlertCircle className="size-4" />
                    <span>AI 想要结束的原因：</span>
                  </div>
                  <div className="rounded-lg bg-muted p-3 text-sm leading-relaxed">
                    <MarkdownRenderer content={reason} />
                  </div>
                </div>
              )}
              {/* Fallback if neither summary nor reason has meaningful content */}
              {(!summary || !summary.trim()) && (!reason || !reason.trim()) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Sparkles className="size-4" />
                    <span>AI 状态：</span>
                  </div>
                  <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-sm leading-relaxed">
                    <p className="text-muted-foreground">AI 已完成当前任务阶段，正在等待您的确认。</p>
                    <p className="mt-2 text-xs text-muted-foreground/70">
                      提示：如果您看到此消息但期望看到详细的任务摘要，可能是 MCP 工具调用时未提供 summary 参数。
                    </p>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Zap className="size-4" />
                    <span>快捷指令：</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setActiveTab('prompts')}>
                    管理
                    <ChevronRight className="size-3 ml-1" />
                  </Button>
                </div>
                <TooltipProvider delayDuration={0}>
                  <div className="grid grid-cols-3 gap-2">
                    {prompts.slice(0, 6).map((p) => {
                      const Icon = getIcon(p.icon);
                      return (
                        <Tooltip key={p.id}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => handlePromptSelect(p)}
                              disabled={isSubmitting}
                              className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-colors ${colorMap[p.color] || colorMap.blue} disabled:opacity-50`}
                            >
                              <Icon className="size-4 shrink-0" />
                              <span className="text-xs font-medium truncate flex-1">{p.name}</span>
                              {p.hotkey && <Badge variant="secondary" className="text-[10px] px-1 py-0">{p.hotkey}</Badge>}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <p className="max-w-xs text-xs">{p.content}</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </TooltipProvider>
              </div>
              <AutoSubmitCountdown onSubmit={() => handleContinue()} compact={false} />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <MessageSquare className="size-4" />
                    <span>自定义指令：</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={handleLocalOptimize} disabled={isSubmitting || isOptimizing || !instruction.trim()} className="gap-1 h-7 text-xs">
                            {isOptimizing
                              ? (
                                  <>
                                    <Loader2 className="size-3 animate-spin" />
                                    优化中...
                                  </>
                                )
                              : (
                                  <>
                                    <Wand2 className="size-3" />
                                    本地优化
                                  </>
                                )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom"><p className="text-xs">使用Copilot优化</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" onClick={handleAIOptimize} disabled={isSubmitting || isOptimizing || !instruction.trim()} className="gap-1 h-7 text-xs">
                            <Sparkles className="size-3" />
                            AI优化
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom"><p className="text-xs">让AI优化并填入</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                <Textarea ref={textareaRef} value={instruction} onChange={e => setInstruction(e.target.value)} onPaste={handlePaste} placeholder="输入自定义指令... (Ctrl+Enter 发送，支持粘贴图片)" className="min-h-[80px] resize-none" disabled={isSubmitting} />
                {pastedImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {pastedImages.map(img => (
                      <div key={img.id} className="relative group">
                        <img src={img.dataUrl} alt={img.name} className="h-16 w-16 object-cover rounded-md border" />
                        <button
                          type="button"
                          aria-label="移除图片"
                          onClick={() => removeImage(img.id)}
                          className="absolute -top-1 -right-1 size-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ImageIcon className="size-3" />
                      <span>
                        {pastedImages.length}
                        {' '}
                        张图片
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </TabsContent>
          <TabsContent value="prompts" className="mt-0 max-h-[500px] overflow-auto">
            <PromptManagerPanel mode="select" onSelectPrompt={handlePromptSelect} />
          </TabsContent>
          <TabsContent value="history" className="mt-0 max-h-[500px] overflow-auto">
            <SessionHistoryPanel />
          </TabsContent>
        </Tabs>
        <Separator />
        <CardFooter className="flex gap-3 pt-4">
          <Button onClick={() => handleContinue()} disabled={isSubmitting} className="flex-1 gap-2" size="lg">
            <Play className="size-4" />
            继续执行
          </Button>
          <Button onClick={handleEnd} disabled={isSubmitting} variant="destructive" className="flex-1 gap-2" size="lg">
            <Square className="size-4" />
            结束对话
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

interface InfiniteAskPageProps {
  initialData?: { reason?: string; summary?: string; workspacePath?: string; panelId?: string } | null;
}

export function InfiniteAskPage({ initialData }: InfiniteAskPageProps = {}) {
  const [dialogData, setDialogData] = useState<{ reason?: string; summary?: string; workspacePath?: string; panelId?: string }>(
    initialData || {},
  );
  const [isResolved, setIsResolved] = useState(false);

  // Initialize with initial data if provided
  useEffect(() => {
    if (initialData) {
      console.log('[InfiniteAskPage] Initialized with initial data:', initialData);
      setDialogData(initialData);
    }
  }, [initialData]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data.type === 'infinite_ask_request') {
        const data = event.data.data || {};
        console.log('[InfiniteAskPage] Received infinite_ask_request:', data);

        // Extract summary and reason, handling various formats
        const summary = data.summary || data.message || data.content || data.text || '';
        const reason = data.reason || data.stop_reason || data.explanation || '';

        setDialogData({
          reason,
          summary,
          workspacePath: data.workspacePath || '',
          panelId: data.panelId || '',
        });
        setIsResolved(false);
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  if (isResolved) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md text-center p-8">
          <Sparkles className="size-12 mx-auto text-primary mb-4" />
          <h2 className="text-xl font-semibold mb-2">已提交</h2>
          <p className="text-muted-foreground">您的选择已发送给 AI</p>
        </Card>
      </div>
    );
  }

  return (
    <InfiniteAskDialog
      {...dialogData}
      onContinue={() => setIsResolved(true)}
      onEnd={() => setIsResolved(true)}
    />
  );
}

export default InfiniteAskDialog;
