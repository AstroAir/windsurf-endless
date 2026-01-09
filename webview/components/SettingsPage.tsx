/**
 * Settings Page Component
 */

import {
  AlertCircle,
  Bell,
  ChevronDown,
  ChevronUp,
  Clock,
  FolderOpen,
  Globe,
  History,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Server,
  Settings2,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

import { useSettings } from '../store';
import { defaultSettings, portPresets } from '../types';
import { vscode } from '../utils/vscode';

import type { ConnectionMode, ServerState, TransportType } from '../types/session';

// Re-export types from index for consistency
export type { ConnectionMode, TransportType } from '../types/session';

// Validation functions
function validateServerName(name: string): string | undefined {
  if (!name || name.trim().length === 0) {
    return '服务器名称不能为空';
  }
  if (name.length > 50) {
    return '服务器名称不能超过50个字符';
  }
  if (!/^[a-z][\w-]*$/i.test(name)) {
    return '服务器名称只能包含字母、数字、下划线和连字符，且必须以字母开头';
  }
  return undefined;
}

function validateServerPort(port: number): string | undefined {
  if (!Number.isInteger(port)) {
    return '端口必须是整数';
  }
  if (port < 1 || port > 65535) {
    return '端口必须在 1-65535 范围内';
  }
  return undefined;
}

export function SettingsPage() {
  const { settings, saveSettings } = useSettings();
  const [mcpServerName, setMcpServerName] = React.useState(settings.mcpServerName);
  const [mcpServerPort, setMcpServerPort] = React.useState(settings.mcpServerPort);
  const [transportType, setTransportType] = React.useState<TransportType>(settings.transportType || 'http');
  const [connectionMode, setConnectionMode] = React.useState<ConnectionMode>(settings.connectionMode || 'simple');
  const [fallbackPorts, setFallbackPorts] = React.useState<number[]>(settings.fallbackPorts || [6001, 6002, 16000]);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [nameError, setNameError] = React.useState<string | undefined>();
  const [portError, setPortError] = React.useState<string | undefined>();
  const [isSavingMcp, setIsSavingMcp] = React.useState(false);
  const [isSwitchingTransport, setIsSwitchingTransport] = React.useState(false);
  const [isRestartingServer, setIsRestartingServer] = React.useState(false);
  const [serverState, setServerState] = React.useState<ServerState | null>(null);
  const [portAvailability, setPortAvailability] = React.useState<Record<number, boolean>>({});

  // Check if MCP settings have changed
  const mcpSettingsChanged = mcpServerName !== settings.mcpServerName
    || mcpServerPort !== settings.mcpServerPort
    || transportType !== (settings.transportType || 'http');

  // Listen for server state updates
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case 'server_state_update':
          setServerState(message.data);
          break;
        case 'switch_transport_result':
          setIsSwitchingTransport(false);
          break;
        case 'restart_server_result':
          setIsRestartingServer(false);
          break;
        case 'check_port_result':
          setPortAvailability(prev => ({
            ...prev,
            [message.data.port]: message.data.available,
          }));
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    // Request initial server state
    vscode.postMessage({ type: 'get_server_state' });

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Validate on change
  React.useEffect(() => {
    setNameError(validateServerName(mcpServerName));
  }, [mcpServerName]);

  React.useEffect(() => {
    setPortError(validateServerPort(mcpServerPort));
  }, [mcpServerPort]);

  const handleReset = () => {
    saveSettings(defaultSettings);
    setMcpServerName(defaultSettings.mcpServerName);
    setMcpServerPort(defaultSettings.mcpServerPort);
    setTransportType(defaultSettings.transportType || 'http');
    setConnectionMode(defaultSettings.connectionMode || 'simple');
    setFallbackPorts(defaultSettings.fallbackPorts || [6001, 6002, 16000]);
  };

  const handleSaveMcpSettings = () => {
    // Validate before saving
    const nameErr = validateServerName(mcpServerName);
    const portErr = validateServerPort(mcpServerPort);

    if (nameErr || portErr) {
      setNameError(nameErr);
      setPortError(portErr);
      return;
    }

    setIsSavingMcp(true);

    // Save transport settings to local state
    saveSettings({
      transportType,
      connectionMode,
      fallbackPorts,
    });

    // Send message to extension to save MCP settings and show restart dialog
    vscode.postMessage({
      type: 'save_mcp_config',
      data: {
        serverName: mcpServerName,
        serverPort: mcpServerPort,
        transportType,
      },
    });

    // Reset saving state after a short delay
    setTimeout(() => setIsSavingMcp(false), 1000);
  };

  const handleSwitchTransport = (newTransport: TransportType) => {
    setTransportType(newTransport);

    // If in advanced mode, immediately switch transport
    if (connectionMode === 'advanced') {
      setIsSwitchingTransport(true);
      vscode.postMessage({
        type: 'switch_transport',
        data: {
          transport: newTransport,
          port: mcpServerPort,
        },
      });
    }
  };

  const handleRestartServer = () => {
    setIsRestartingServer(true);
    vscode.postMessage({
      type: 'restart_server',
      data: { port: mcpServerPort },
    });
  };

  const handleCheckPort = (port: number) => {
    vscode.postMessage({
      type: 'check_port',
      data: { port },
    });
  };

  const handlePortPresetChange = (presetPort: number) => {
    if (presetPort === 0) {
      // Custom port - keep current value
      return;
    }
    setMcpServerPort(presetPort);
    handleCheckPort(presetPort);
  };

  const handleTestMcpConnection = () => {
    vscode.postMessage({
      type: 'test_mcp_connection',
      data: {
        serverName: settings.mcpServerName,
        serverPort: settings.mcpServerPort,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="size-5" />
            常规设置
          </CardTitle>
          <CardDescription>配置插件的基本行为</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>自动启动</Label>
              <p className="text-sm text-muted-foreground">打开工作区时自动配置 MCP</p>
            </div>
            <Switch
              checked={settings.autoStart}
              onCheckedChange={checked => saveSettings({ autoStart: checked })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Bell className="size-4" />
                显示通知
              </Label>
              <p className="text-sm text-muted-foreground">配置完成时显示通知消息</p>
            </div>
            <Switch
              checked={settings.showNotifications}
              onCheckedChange={checked => saveSettings({ showNotifications: checked })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>语言</Label>
              <p className="text-sm text-muted-foreground">选择界面显示语言</p>
            </div>
            <Select
              value={settings.language}
              onValueChange={(value: 'zh-CN' | 'en-US') => saveSettings({ language: value })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh-CN">简体中文</SelectItem>
                <SelectItem value="en-US">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* MCP Server Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="size-5" />
            MCP 服务器设置
          </CardTitle>
          <CardDescription>配置 MCP 服务器的连接方式、名称和端口</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Server Status */}
          {serverState && (
            <>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-2">
                  {serverState.isRunning
                    ? (
                        <Wifi className="size-4 text-green-500" />
                      )
                    : (
                        <WifiOff className="size-4 text-red-500" />
                      )}
                  <span className="text-sm font-medium">
                    服务器状态
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={serverState.isRunning ? 'default' : 'destructive'}>
                    {serverState.isRunning ? '运行中' : '已停止'}
                  </Badge>
                  {serverState.isRunning && (
                    <Badge variant="outline">
                      {serverState.transport.toUpperCase()}
                      :
                      {serverState.port}
                    </Badge>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>自动配置 MCP</Label>
              <p className="text-sm text-muted-foreground">启动时自动配置 MCP 服务器</p>
            </div>
            <Switch
              checked={settings.mcpAutoConfig}
              onCheckedChange={checked => saveSettings({ mcpAutoConfig: checked })}
            />
          </div>

          <Separator />

          {/* Transport Type Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Zap className="size-4" />
              连接方式
              {isSwitchingTransport && <Loader2 className="size-3 animate-spin" />}
            </Label>
            <Select
              value={transportType}
              onValueChange={(value: TransportType) => handleSwitchTransport(value)}
              disabled={isSwitchingTransport}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择连接方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="http">
                  <div className="flex items-center gap-2">
                    <span>HTTP/SSE</span>
                    <Badge variant="secondary" className="text-xs">推荐</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="stdio">
                  <div className="flex items-center gap-2">
                    <span>Stdio</span>
                    <Badge variant="outline" className="text-xs">备用</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="auto">
                  <div className="flex items-center gap-2">
                    <span>自动</span>
                    <Badge variant="outline" className="text-xs">智能切换</Badge>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {transportType === 'http' && 'HTTP/SSE 模式性能更好，支持多客户端连接'}
              {transportType === 'stdio' && 'Stdio 模式兼容性更好，适用于特殊环境'}
              {transportType === 'auto' && '自动模式会在 HTTP 失败时切换到 Stdio'}
            </p>
          </div>

          <Separator />

          {/* Port Selection with Presets */}
          {transportType !== 'stdio' && (
            <>
              <div className="space-y-2">
                <Label>端口预设</Label>
                <div className="flex flex-wrap gap-2">
                  {portPresets.map(preset => (
                    <Button
                      key={preset.port}
                      variant={mcpServerPort === preset.port ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePortPresetChange(preset.port)}
                      className="text-xs"
                    >
                      {preset.name}
                      {preset.port > 0 && ` (${preset.port})`}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />
            </>
          )}

          <div className="space-y-2">
            <Label>服务器名称</Label>
            <Input
              value={mcpServerName}
              onChange={e => setMcpServerName(e.target.value)}
              placeholder="windsurf-endless"
              className={nameError ? 'border-red-500' : ''}
            />
            {nameError && (
              <p className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="size-3" />
                {nameError}
              </p>
            )}
            <p className="text-xs text-muted-foreground">MCP 配置文件中的服务器标识名称</p>
          </div>

          <Separator />

          {transportType !== 'stdio' && (
            <>
              <div className="space-y-2">
                <Label>服务器端口</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={mcpServerPort}
                    onChange={(e) => {
                      const port = Number.parseInt(e.target.value) || 6000;
                      setMcpServerPort(port);
                    }}
                    onBlur={() => handleCheckPort(mcpServerPort)}
                    placeholder="6000"
                    min={1}
                    max={65535}
                    className={portError ? 'border-red-500' : ''}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCheckPort(mcpServerPort)}
                    title="检查端口可用性"
                  >
                    <RefreshCw className="size-4" />
                  </Button>
                </div>
                {portError && (
                  <p className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="size-3" />
                    {portError}
                  </p>
                )}
                {portAvailability[mcpServerPort] !== undefined && (
                  <p className={`flex items-center gap-1 text-xs ${portAvailability[mcpServerPort] ? 'text-green-500' : 'text-red-500'}`}>
                    {portAvailability[mcpServerPort] ? '✓ 端口可用' : '✗ 端口已被占用'}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">MCP HTTP 服务器监听的端口号 (1-65535)</p>
              </div>

              <Separator />
            </>
          )}

          {/* Advanced Options Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2">
              <Settings2 className="size-4" />
              高级选项
            </span>
            {showAdvanced ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>自动重连</Label>
                  <p className="text-sm text-muted-foreground">连接断开时自动尝试重连</p>
                </div>
                <Switch
                  checked={settings.autoReconnect}
                  onCheckedChange={checked => saveSettings({ autoReconnect: checked })}
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>重连尝试次数</Label>
                  <span className="text-sm text-muted-foreground">
                    {settings.reconnectAttempts}
                    {' '}
                    次
                  </span>
                </div>
                <Slider
                  value={[settings.reconnectAttempts]}
                  onValueChange={([value]) => saveSettings({ reconnectAttempts: value })}
                  min={1}
                  max={10}
                  step={1}
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>连接超时</Label>
                  <span className="text-sm text-muted-foreground">
                    {settings.connectionTimeout}
                    {' '}
                    秒
                  </span>
                </div>
                <Slider
                  value={[settings.connectionTimeout]}
                  onValueChange={([value]) => saveSettings({ connectionTimeout: value })}
                  min={5}
                  max={60}
                  step={5}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>自动回退到 Stdio</Label>
                  <p className="text-sm text-muted-foreground">HTTP 连接失败时自动切换</p>
                </div>
                <Switch
                  checked={settings.fallbackToStdio}
                  onCheckedChange={checked => saveSettings({ fallbackToStdio: checked })}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>备用端口</Label>
                <p className="text-xs text-muted-foreground">
                  当前备用端口:
                  {' '}
                  {fallbackPorts.join(', ')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {[6001, 6002, 6003, 16000, 16001].map(port => (
                    <Button
                      key={port}
                      variant={fallbackPorts.includes(port) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const newPorts = fallbackPorts.includes(port)
                          ? fallbackPorts.filter(p => p !== port)
                          : [...fallbackPorts, port].sort((a, b) => a - b);
                        setFallbackPorts(newPorts);
                        saveSettings({ fallbackPorts: newPorts });
                      }}
                      className="text-xs"
                    >
                      {port}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">当前配置:</span>
              <span className="font-mono text-xs">
                {transportType.toUpperCase()}
                {' '}
                |
                {settings.mcpServerName}
                :
                {settings.mcpServerPort}
              </span>
            </div>
            {mcpSettingsChanged && (
              <div className="flex items-center gap-2 rounded-md bg-yellow-500/10 p-2 text-xs text-yellow-600 dark:text-yellow-400">
                <AlertCircle className="size-4" />
                设置已修改，需要保存并重启 Windsurf 才能生效
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestMcpConnection}
              className="gap-2"
            >
              <RefreshCw className="size-4" />
              测试连接
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestartServer}
              disabled={isRestartingServer || transportType === 'stdio'}
              className="gap-2"
            >
              {isRestartingServer
                ? (
                    <RefreshCw className="size-4 animate-spin" />
                  )
                : (
                    <Play className="size-4" />
                  )}
              重启服务器
            </Button>
            <Button
              size="sm"
              onClick={handleSaveMcpSettings}
              disabled={!mcpSettingsChanged || !!nameError || !!portError || isSavingMcp}
              className="gap-2"
            >
              {isSavingMcp
                ? (
                    <RefreshCw className="size-4 animate-spin" />
                  )
                : (
                    <Save className="size-4" />
                  )}
              保存 MCP 配置
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-5" />
            对话框设置
          </CardTitle>
          <CardDescription>配置 Windsurf Endless 对话框的行为</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>超时时间</Label>
              <span className="text-sm text-muted-foreground">
                {settings.dialogTimeout}
                {' '}
                小时
              </span>
            </div>
            <Slider
              value={[settings.dialogTimeout]}
              onValueChange={([value]) => saveSettings({ dialogTimeout: value })}
              min={1}
              max={48}
              step={1}
            />
            <p className="text-xs text-muted-foreground">对话框等待用户响应的最长时间</p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>对话框位置</Label>
              <p className="text-sm text-muted-foreground">对话框显示的位置</p>
            </div>
            <Select
              value={settings.dialogPosition}
              onValueChange={(value: 'center' | 'top-right' | 'bottom-right') =>
                saveSettings({ dialogPosition: value })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="center">居中</SelectItem>
                <SelectItem value="top-right">右上角</SelectItem>
                <SelectItem value="bottom-right">右下角</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>主题</Label>
              <p className="text-sm text-muted-foreground">对话框的颜色主题</p>
            </div>
            <Select
              value={settings.dialogTheme}
              onValueChange={(value: 'system' | 'light' | 'dark') =>
                saveSettings({ dialogTheme: value })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">跟随系统</SelectItem>
                <SelectItem value="light">浅色</SelectItem>
                <SelectItem value="dark">深色</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Rules Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="size-5" />
            规则设置
          </CardTitle>
          <CardDescription>配置 AI 规则文件的注入</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>自动注入规则</Label>
              <p className="text-sm text-muted-foreground">自动创建 .windsurfrules 文件</p>
            </div>
            <Switch
              checked={settings.autoInjectRules}
              onCheckedChange={checked => saveSettings({ autoInjectRules: checked })}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>自定义规则路径</Label>
            <Input
              value={settings.customRulesPath}
              onChange={e => saveSettings({ customRulesPath: e.target.value })}
              placeholder="留空使用默认规则"
            />
            <p className="text-xs text-muted-foreground">指定自定义规则文件的路径（可选）</p>
          </div>
        </CardContent>
      </Card>

      {/* History Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-5" />
            历史记录设置
          </CardTitle>
          <CardDescription>配置对话历史的存储和管理</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>保存历史记录</Label>
              <p className="text-sm text-muted-foreground">记录所有 Windsurf Endless 交互</p>
            </div>
            <Switch
              checked={settings.saveHistory}
              onCheckedChange={checked => saveSettings({ saveHistory: checked })}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>最大记录数</Label>
              <span className="text-sm text-muted-foreground">
                {settings.maxHistoryItems}
                {' '}
                条
              </span>
            </div>
            <Slider
              value={[settings.maxHistoryItems]}
              onValueChange={([value]) => saveSettings({ maxHistoryItems: value })}
              min={10}
              max={500}
              step={10}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>自动清理历史</Label>
              <p className="text-sm text-muted-foreground">自动删除过期的历史记录</p>
            </div>
            <Switch
              checked={settings.autoCleanHistory}
              onCheckedChange={checked => saveSettings({ autoCleanHistory: checked })}
            />
          </div>

          {settings.autoCleanHistory && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>保留天数</Label>
                  <span className="text-sm text-muted-foreground">
                    {settings.historyRetentionDays}
                    {' '}
                    天
                  </span>
                </div>
                <Slider
                  value={[settings.historyRetentionDays]}
                  onValueChange={([value]) => saveSettings({ historyRetentionDays: value })}
                  min={1}
                  max={90}
                  step={1}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={handleReset} className="gap-2">
          <RotateCcw className="size-4" />
          重置为默认
        </Button>
        <Button className="gap-2 ml-auto">
          <Save className="size-4" />
          保存设置
        </Button>
      </div>
    </div>
  );
}

export default SettingsPage;
