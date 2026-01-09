/**
 * Connection Status Indicator
 * Shows MCP server connection status with real-time updates
 * Supports HTTP and Stdio transport types
 */

import {
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Server,
  Terminal,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { connectionMonitor } from '../lib/connectionMonitor';
import { vscode } from '../utils/vscode';

import type { ConnectionState, ConnectionStatus as ConnectionStatusType, ServerState, TransportType } from '../types/session';

interface ConnectionStatusProps {
  compact?: boolean;
  showDetails?: boolean;
}

const statusIcons: Record<ConnectionStatusType, React.ReactNode> = {
  connected: <CheckCircle className="size-4 text-green-500" />,
  connecting: <Loader2 className="size-4 text-yellow-500 animate-spin" />,
  disconnected: <WifiOff className="size-4 text-gray-500" />,
  error: <AlertCircle className="size-4 text-red-500" />,
};

const statusColors: Record<ConnectionStatusType, string> = {
  connected: 'bg-green-500',
  connecting: 'bg-yellow-500',
  disconnected: 'bg-gray-500',
  error: 'bg-red-500',
};

const transportIcons: Record<TransportType, React.ReactNode> = {
  http: <Wifi className="size-3" />,
  stdio: <Terminal className="size-3" />,
  auto: <Zap className="size-3" />,
};

function formatUptime(seconds: number): string {
  if (seconds < 60)
    return `${seconds}秒`;
  if (seconds < 3600)
    return `${Math.floor(seconds / 60)}分钟`;
  if (seconds < 86400)
    return `${Math.floor(seconds / 3600)}小时`;
  return `${Math.floor(seconds / 86400)}天`;
}

export function ConnectionStatus({ compact = false, showDetails = true }: ConnectionStatusProps) {
  const [state, setState] = useState<ConnectionState>(connectionMonitor.getState());
  const [serverState, setServerState] = useState<ServerState | null>(null);

  useEffect(() => {
    connectionMonitor.start();
    const unsubscribe = connectionMonitor.subscribe(setState);

    // Listen for server state updates from extension
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'server_state_update') {
        setServerState(message.data);
        // Update connection monitor with server state
        if (message.data.isRunning) {
          connectionMonitor.updateFromExtension('connected', message.data.latency || state.latency);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Request initial server state
    vscode.postMessage({ type: 'get_server_state' });

    return () => {
      unsubscribe();
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleReconnect = () => {
    connectionMonitor.forceReconnect();
    vscode.postMessage({ type: 'get_server_state' });
  };

  const handleRestartServer = () => {
    vscode.postMessage({
      type: 'restart_server',
      data: { port: serverState?.port },
    });
  };

  const getQualityBars = () => {
    const score = state.qualityScore;
    const bars = [
      score >= 20,
      score >= 40,
      score >= 60,
      score >= 80,
    ];
    return bars;
  };

  const currentTransport = serverState?.transport || state.transport || 'http';

  // Compact mode - just an icon with tooltip
  if (compact) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-default">
              <span className={`size-2 rounded-full ${statusColors[state.status]}`} />
              {transportIcons[currentTransport]}
              {state.status === 'connected' && (
                <span className="text-xs text-muted-foreground font-mono">
                  {state.latency}
                  ms
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p>{connectionMonitor.getStatusText()}</p>
              <p className="text-xs opacity-70">
                传输:
                {' '}
                {currentTransport.toUpperCase()}
                {serverState?.port && currentTransport !== 'stdio' && ` (端口: ${serverState.port})`}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full mode with popover details
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 h-8 px-2">
          {statusIcons[state.status]}
          <span className="text-xs">
            {state.status === 'connected' ? `${state.latency}ms` : connectionMonitor.getStatusText()}
          </span>
          {/* Transport indicator */}
          <Badge variant="outline" className="gap-1 h-5 px-1.5 text-xs">
            {transportIcons[currentTransport]}
            {currentTransport.toUpperCase()}
          </Badge>
          {/* Quality bars */}
          {state.status === 'connected' && (
            <div className="flex items-end gap-0.5 h-3">
              {getQualityBars().map((active, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-sm transition-colors ${
                    active ? connectionMonitor.getQualityClass() : 'bg-muted'
                  }`}
                  style={{ height: `${(i + 1) * 25}%` }}
                />
              ))}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      {showDetails && (
        <PopoverContent className="w-72" align="end">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="size-4" />
                <span className="font-medium text-sm">MCP 服务器</span>
              </div>
              <Badge
                variant={state.status === 'connected' ? 'default' : 'secondary'}
                className="gap-1"
              >
                <span className={`size-1.5 rounded-full ${statusColors[state.status]}`} />
                {connectionMonitor.getStatusText()}
              </Badge>
            </div>

            {/* Server Info */}
            {serverState && (
              <>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-muted rounded p-2">
                    <div className="text-muted-foreground">传输方式</div>
                    <div className="font-medium flex items-center gap-1">
                      {transportIcons[serverState.transport]}
                      {serverState.transport.toUpperCase()}
                    </div>
                  </div>
                  {serverState.transport !== 'stdio' && (
                    <div className="bg-muted rounded p-2">
                      <div className="text-muted-foreground">端口</div>
                      <div className="font-mono font-medium">{serverState.port}</div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-muted rounded p-2">
                    <div className="text-muted-foreground">运行时间</div>
                    <div className="font-medium">{formatUptime(serverState.uptime)}</div>
                  </div>
                  <div className="bg-muted rounded p-2">
                    <div className="text-muted-foreground">客户端</div>
                    <div className="font-medium">
                      {serverState.clientCount}
                      {' '}
                      个连接
                    </div>
                  </div>
                </div>

                <Separator />
              </>
            )}

            {state.status === 'connected' && (
              <>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-muted rounded p-2">
                    <div className="text-muted-foreground">延迟</div>
                    <div className="font-mono font-medium">
                      {state.latency}
                      ms
                    </div>
                  </div>
                  <div className="bg-muted rounded p-2">
                    <div className="text-muted-foreground">连接质量</div>
                    <div className="font-medium">
                      {state.qualityScore}
                      %
                      <span className={`ml-1 inline-block size-2 rounded-full ${
                        state.qualityScore >= 80
                          ? 'bg-green-500'
                          : state.qualityScore >= 60
                            ? 'bg-yellow-500'
                            : state.qualityScore >= 40 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      />
                    </div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  上次检测:
                  {' '}
                  {new Date(state.lastPing).toLocaleTimeString('zh-CN')}
                </div>
              </>
            )}

            {state.status === 'error' && state.error && (
              <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                {state.error}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1"
                onClick={handleReconnect}
              >
                <RefreshCw className="size-3" />
                刷新状态
              </Button>
              {serverState?.transport !== 'stdio' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={handleRestartServer}
                >
                  <Server className="size-3" />
                  重启服务
                </Button>
              )}
            </div>
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}

export default ConnectionStatus;
