/**
 * Connection Status Indicator
 * Shows MCP server connection status with real-time updates
 */

import {
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { connectionMonitor } from '../lib/connectionMonitor';

import type { ConnectionState, ConnectionStatus as ConnectionStatusType } from '../types/session';

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

export function ConnectionStatus({ compact = false, showDetails = true }: ConnectionStatusProps) {
  const [state, setState] = useState<ConnectionState>(connectionMonitor.getState());

  useEffect(() => {
    connectionMonitor.start();
    const unsubscribe = connectionMonitor.subscribe(setState);
    return () => {
      unsubscribe();
    };
  }, []);

  const handleReconnect = () => {
    connectionMonitor.forceReconnect();
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

  // Compact mode - just an icon with tooltip
  if (compact) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 cursor-default">
              <span className={`size-2 rounded-full ${statusColors[state.status]}`} />
              {state.status === 'connected' && (
                <span className="text-xs text-muted-foreground font-mono">
                  {state.latency}
                  ms
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{connectionMonitor.getStatusText()}</p>
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
        <PopoverContent className="w-64" align="end">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="size-4" />
                <span className="font-medium text-sm">连接状态</span>
              </div>
              <Badge
                variant={state.status === 'connected' ? 'default' : 'secondary'}
                className="gap-1"
              >
                <span className={`size-1.5 rounded-full ${statusColors[state.status]}`} />
                {connectionMonitor.getStatusText()}
              </Badge>
            </div>

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
                    <div className="text-muted-foreground">质量</div>
                    <div className="font-medium">
                      {state.qualityScore}
                      %
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

            {state.status !== 'connected' && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1"
                onClick={handleReconnect}
              >
                <RefreshCw className="size-3" />
                重新连接
              </Button>
            )}
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}

export default ConnectionStatus;
