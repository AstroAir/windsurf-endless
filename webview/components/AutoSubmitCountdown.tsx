/**
 * Auto-Submit Countdown Component
 * Displays countdown timer with controls for auto-submit
 */

import {
  Pause,
  Play,
  Plus,
  Timer,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { audioManager } from '../lib/audioManager';
import { autoSubmitManager } from '../lib/autoSubmitManager';

import type { AutoSubmitState } from '../types/session';

interface AutoSubmitCountdownProps {
  onSubmit?: () => void;
  defaultTimeout?: number;
  autoStart?: boolean;
  showControls?: boolean;
  compact?: boolean;
}

export function AutoSubmitCountdown({
  onSubmit,
  defaultTimeout,
  autoStart = false,
  showControls = true,
  compact = false,
}: AutoSubmitCountdownProps) {
  const [state, setState] = useState<AutoSubmitState>(autoSubmitManager.getState());
  const settings = autoSubmitManager.getSettings();

  // Set up callbacks
  useEffect(() => {
    autoSubmitManager.setOnSubmit(() => {
      if (settings.soundOnSubmit) {
        audioManager.playAutoSubmit();
      }
      onSubmit?.();
    });

    autoSubmitManager.setOnStateChange(setState);

    return () => {
      autoSubmitManager.setOnSubmit(() => {});
      autoSubmitManager.setOnStateChange(() => {});
    };
  }, [onSubmit, settings.soundOnSubmit]);

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart && settings.enabled) {
      autoSubmitManager.start(defaultTimeout, 'manual');
    }
  }, [autoStart, defaultTimeout, settings.enabled]);

  // Handlers
  const handleStart = useCallback(() => {
    autoSubmitManager.start(defaultTimeout, 'manual');
  }, [defaultTimeout]);

  const handlePause = useCallback(() => {
    autoSubmitManager.pause();
  }, []);

  const handleResume = useCallback(() => {
    autoSubmitManager.resume();
  }, []);

  const handleCancel = useCallback(() => {
    autoSubmitManager.cancel();
  }, []);

  const handleAddTime = useCallback((seconds: number) => {
    autoSubmitManager.addTime(seconds);
  }, []);

  // Not active and no auto-start
  if (!state.isActive && !autoStart) {
    if (!showControls) {
      return null;
    }

    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStart}
              disabled={!settings.enabled}
              className="gap-1"
            >
              <Timer className="size-4" />
              {!compact && '自动提交'}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {settings.enabled
              ? `启动 ${defaultTimeout || settings.defaultTimeout} 秒倒计时`
              : '自动提交已禁用'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Active countdown
  if (!state.isActive) {
    return null;
  }

  const progress = autoSubmitManager.getProgress();
  const timeText = autoSubmitManager.formatRemainingTime();

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge
          variant={state.isPaused ? 'secondary' : 'default'}
          className="gap-1 font-mono"
        >
          <Timer className="size-3" />
          {timeText}
        </Badge>
        {showControls && (
          <>
            {state.isPaused
              ? (
                  <Button variant="ghost" size="icon" className="size-6" onClick={handleResume}>
                    <Play className="size-3" />
                  </Button>
                )
              : (
                  <Button variant="ghost" size="icon" className="size-6" onClick={handlePause}>
                    <Pause className="size-3" />
                  </Button>
                )}
            <Button variant="ghost" size="icon" className="size-6" onClick={handleCancel}>
              <X className="size-3" />
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className={`size-4 ${state.isPaused ? 'text-muted-foreground' : 'text-primary animate-pulse'}`} />
          <span className="text-sm font-medium">
            自动提交
            {state.triggeredBy === 'prompt' && (
              <Badge variant="secondary" className="ml-2 text-xs">
                提示词触发
              </Badge>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-mono text-lg font-bold">{timeText}</span>
          {state.isPaused && (
            <Badge variant="outline" className="text-xs">
              已暂停
            </Badge>
          )}
        </div>
      </div>

      {settings.showCountdown && (
        <Progress value={progress} className="h-2" />
      )}

      {showControls && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddTime(30)}
                    className="size-8 p-0"
                  >
                    <Plus className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>+30秒</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddTime(60)}
                    className="h-8 px-2 text-xs"
                  >
                    +1分钟
                  </Button>
                </TooltipTrigger>
                <TooltipContent>+1分钟</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center gap-1">
            {state.isPaused
              ? (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleResume}
                    className="gap-1"
                  >
                    <Play className="size-3" />
                    继续
                  </Button>
                )
              : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handlePause}
                    className="gap-1"
                  >
                    <Pause className="size-3" />
                    暂停
                  </Button>
                )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="gap-1"
            >
              <X className="size-3" />
              取消
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AutoSubmitCountdown;
