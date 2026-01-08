/**
 * Settings Page Component
 */

import {
  Bell,
  Clock,
  FolderOpen,
  Globe,
  History,
  RotateCcw,
  Save,
} from 'lucide-react';

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
import { defaultSettings } from '../types';

export function SettingsPage() {
  const { settings, saveSettings } = useSettings();

  const handleReset = () => {
    saveSettings(defaultSettings);
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
