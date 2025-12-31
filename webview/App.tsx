import {
  BarChart3,
  CheckCircle,
  FileText,
  History,
  Infinity as InfinityIcon,
  MessageSquare,
  RefreshCw,
  Settings,
  Sparkles,
  XCircle,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { ConversationsPage } from './components/ConversationsPage';
import { HistoryPage } from './components/HistoryPage';
import { InfiniteAskPage } from './components/InfiniteAskDialog';
import { QuickActions } from './components/QuickActions';
import { SettingsPage } from './components/SettingsPage';
import { ShortcutsPage } from './components/ShortcutsPage';
import { StatsPage } from './components/StatsPage';
import { TemplatesPage } from './components/TemplatesPage';
import { AppProvider, useConversations } from './store';
import { vscode } from './utils/vscode';
import './index.css';

type ViewMode = 'dashboard' | 'infinite_ask';

function Dashboard() {
  const [mcpStatus, setMcpStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');
  const { conversations, activeConversation } = useConversations();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'mcp_status') {
        setMcpStatus(message.data?.status || 'unknown');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConfigure = () => {
    vscode.postMessage({ type: 'configure' });
  };

  const handleTestDialog = () => {
    vscode.postMessage({ type: 'test_infinite_ask' });
  };

  return (
    <div className="space-y-6">
      {/* Active Conversation Banner */}
      {activeConversation && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-4 text-primary" />
                <span className="text-sm font-medium">当前对话：</span>
                <span className="text-sm">{activeConversation.name}</span>
              </div>
              <Badge variant="outline">
                {activeConversation.messages.length}
                {' '}
                条消息
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-5" />
              MCP 服务状态
            </CardTitle>
            <CardDescription>检查 Infinite Ask MCP 服务连接状态</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg bg-muted p-4">
              {mcpStatus === 'connected'
                ? (
                    <>
                      <CheckCircle className="size-6 text-green-500" />
                      <div>
                        <p className="font-medium text-green-600">已连接</p>
                        <p className="text-sm text-muted-foreground">MCP 服务运行正常</p>
                      </div>
                    </>
                  )
                : mcpStatus === 'disconnected'
                  ? (
                      <>
                        <XCircle className="size-6 text-red-500" />
                        <div>
                          <p className="font-medium text-red-600">未连接</p>
                          <p className="text-sm text-muted-foreground">请检查 MCP 配置</p>
                        </div>
                      </>
                    )
                  : (
                      <>
                        <RefreshCw className="size-6 text-yellow-500 animate-spin" />
                        <div>
                          <p className="font-medium text-yellow-600">检测中</p>
                          <p className="text-sm text-muted-foreground">正在检查服务状态...</p>
                        </div>
                      </>
                    )}
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleConfigure} className="w-full gap-2">
              <Settings className="size-4" />
              重新配置
            </Button>
          </CardFooter>
        </Card>

        {/* Quick Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <InfinityIcon className="size-5" />
              快速统计
            </CardTitle>
            <CardDescription>对话和历史记录概览</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-muted p-4 text-center">
                <p className="text-2xl font-bold">{conversations.length}</p>
                <p className="text-xs text-muted-foreground">活跃对话</p>
              </div>
              <div className="rounded-lg bg-muted p-4 text-center">
                <p className="text-2xl font-bold">
                  {conversations.reduce((acc, c) => acc + c.messages.length, 0)}
                </p>
                <p className="text-xs text-muted-foreground">总消息数</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleTestDialog} variant="secondary" className="w-full gap-2">
              <Sparkles className="size-4" />
              测试对话框
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Features List */}
      <Card>
        <CardHeader>
          <CardTitle>功能特性</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <MessageSquare className="size-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">多对话管理</p>
                <p className="text-sm text-muted-foreground">支持创建多个独立对话上下文</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <History className="size-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">历史记录</p>
                <p className="text-sm text-muted-foreground">完整保存所有交互历史</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <Sparkles className="size-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">无限续杯</p>
                <p className="text-sm text-muted-foreground">任务完成时自动询问是否继续</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <Settings className="size-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">灵活配置</p>
                <p className="text-sm text-muted-foreground">丰富的自定义设置选项</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AppContent() {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'infinite_ask_request') {
        setViewMode('infinite_ask');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Show Infinite Ask dialog when requested
  if (viewMode === 'infinite_ask') {
    return <InfiniteAskPage />;
  }

  return (
    <main className="flex min-h-screen flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <InfinityIcon className="size-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Windsurf Endless</h1>
          <p className="text-sm text-muted-foreground">Infinite Ask - 无限对话扩展</p>
        </div>
        <Badge className="ml-auto" variant="outline">v1.0.0</Badge>
      </div>

      <Separator />

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="home" className="gap-1 text-xs px-1">
            <Sparkles className="size-3" />
            首页
          </TabsTrigger>
          <TabsTrigger value="conversations" className="gap-1 text-xs px-1">
            <MessageSquare className="size-3" />
            对话
          </TabsTrigger>
          <TabsTrigger value="shortcuts" className="gap-1 text-xs px-1">
            <Zap className="size-3" />
            快捷
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1 text-xs px-1">
            <History className="size-3" />
            历史
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1 text-xs px-1">
            <FileText className="size-3" />
            模板
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-1 text-xs px-1">
            <BarChart3 className="size-3" />
            统计
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1 text-xs px-1">
            <Settings className="size-3" />
            设置
          </TabsTrigger>
        </TabsList>

        <TabsContent value="home" className="mt-4">
          <Dashboard />
        </TabsContent>

        <TabsContent value="conversations" className="mt-4">
          <ConversationsPage />
        </TabsContent>

        <TabsContent value="shortcuts" className="mt-4">
          <ShortcutsPage />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <HistoryPage />
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <TemplatesPage />
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          <StatsPage />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <SettingsPage />
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <QuickActions onNavigate={setActiveTab} />
    </main>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
