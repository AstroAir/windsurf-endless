/**
 * Quick Actions Component
 * Floating panel for quick access to common actions
 */

import {
  Download,
  FileText,
  History,
  MessageSquare,
  RefreshCw,
  Settings,
  Upload,
  Zap,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { vscode } from '../utils/vscode';

interface QuickActionsProps {
  onNavigate: (tab: string) => void;
}

export function QuickActions({ onNavigate }: QuickActionsProps) {
  const handleConfigure = () => {
    vscode.postMessage({ type: 'configure' });
  };

  const handleExport = () => {
    vscode.postMessage({ type: 'export_data' });
  };

  const handleImport = () => {
    vscode.postMessage({ type: 'import_data' });
  };

  const actions = [
    {
      icon: RefreshCw,
      label: '重新配置',
      onClick: handleConfigure,
    },
    {
      icon: MessageSquare,
      label: '对话管理',
      onClick: () => onNavigate('conversations'),
    },
    {
      icon: History,
      label: '历史记录',
      onClick: () => onNavigate('history'),
    },
    {
      icon: FileText,
      label: '指令模板',
      onClick: () => onNavigate('templates'),
    },
    {
      icon: Download,
      label: '导出数据',
      onClick: handleExport,
    },
    {
      icon: Upload,
      label: '导入数据',
      onClick: handleImport,
    },
    {
      icon: Settings,
      label: '设置',
      onClick: () => onNavigate('settings'),
    },
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        <div className="bg-card border rounded-lg shadow-lg p-2 flex flex-col gap-1">
          {actions.map((action, index) => (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={action.onClick}
                  className="size-9"
                >
                  <action.icon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>{action.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <div className="flex justify-center">
          <Button
            size="icon"
            className="size-10 rounded-full shadow-lg"
            onClick={() => vscode.postMessage({ type: 'test_infinite_ask' })}
          >
            <Zap className="size-5" />
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default QuickActions;
