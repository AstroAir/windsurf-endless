import * as fs from 'node:fs';

import getWebviewHtml from 'virtual:vscode';
import { commands, window, workspace } from 'vscode';

import type { Disposable, ExtensionContext, Webview } from 'vscode';

// Basic shared types (mirrors webview types but kept local to avoid cross-bundle imports)
interface SettingsState {
  autoStart: boolean;
  showNotifications: boolean;
  language: 'zh-CN' | 'en-US';
  mcpAutoConfig: boolean;
  mcpServerPath: string;
  dialogTimeout: number;
  dialogPosition: 'center' | 'top-right' | 'bottom-right';
  dialogTheme: 'system' | 'light' | 'dark';
  autoInjectRules: boolean;
  customRulesPath: string;
  saveHistory: boolean;
  maxHistoryItems: number;
  autoCleanHistory: boolean;
  historyRetentionDays: number;
}

const defaultSettings: SettingsState = {
  autoStart: true,
  showNotifications: true,
  language: 'zh-CN',
  mcpAutoConfig: true,
  mcpServerPath: '',
  dialogTimeout: 24,
  dialogPosition: 'center',
  dialogTheme: 'system',
  autoInjectRules: true,
  customRulesPath: '',
  saveHistory: true,
  maxHistoryItems: 100,
  autoCleanHistory: false,
  historyRetentionDays: 30,
};

interface ConversationState {
  id: string;
  name: string;
  workspacePath: string;
  createdAt: number;
  updatedAt: number;
  messages: Array<{ id: string; timestamp: number; type: 'ask' | 'response'; summary?: string; shouldContinue: boolean; userInstruction?: string }>; // minimal shape for stats
  isActive: boolean;
}

interface HistoryItemState {
  id: string;
  conversationId: string;
  conversationName: string;
  workspacePath: string;
  timestamp: number;
  summary: string;
  action: 'continue' | 'end';
  userInstruction?: string;
}

interface PersistedState {
  settings: SettingsState;
  conversations: ConversationState[];
  history: HistoryItemState[];
  activeConversationId: string | null;
  activeSessionId: string | null;
  workspacePath: string;
}

const STORAGE_KEY = 'windsurf-endless:state';
const connectedWebviews = new Set<Webview>();

function getWorkspaceKey() {
  return workspace.workspaceFolders?.map(f => f.uri.toString()).join('|') || 'global';
}

function getWorkspacePath() {
  return workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
}

function loadState(context: ExtensionContext): PersistedState {
  const key = getWorkspaceKey();
  const stored = context.workspaceState.get<Record<string, PersistedState>>(STORAGE_KEY) || {};
  if (stored[key]) {
    return stored[key];
  }
  const initial: PersistedState = {
    settings: defaultSettings,
    conversations: [],
    history: [],
    activeConversationId: null,
    activeSessionId: null,
    workspacePath: getWorkspacePath(),
  };
  context.workspaceState.update(STORAGE_KEY, { ...stored, [key]: initial });
  return initial;
}

function saveState(context: ExtensionContext, next: PersistedState) {
  const key = getWorkspaceKey();
  const stored = context.workspaceState.get<Record<string, PersistedState>>(STORAGE_KEY) || {};
  context.workspaceState.update(STORAGE_KEY, { ...stored, [key]: next });
}

function broadcastState(state: PersistedState) {
  connectedWebviews.forEach((webview) => {
    try {
      webview.postMessage({ type: 'state_sync', data: state });
    }
    catch (error) {
      console.error('Failed to broadcast state to webview:', error);
    }
  });
}

async function handleExportData(webview: Webview): Promise<void> {
  const uri = await window.showSaveDialog({
    defaultUri: workspace.workspaceFolders?.[0]?.uri,
    filters: { 'JSON Files': ['json'] },
    saveLabel: '导出数据',
  });

  if (uri) {
    webview.postMessage({ type: 'request_export_data' });
    const listener = webview.onDidReceiveMessage((msg) => {
      if (msg.type === 'export_data_response') {
        const data = JSON.stringify(msg.data, null, 2);
        fs.writeFileSync(uri.fsPath, data, 'utf8');
        window.showInformationMessage(`数据已导出到: ${uri.fsPath}`);
        listener.dispose();
      }
    });
  }
}

async function handleImportData(webview: Webview): Promise<void> {
  const uris = await window.showOpenDialog({
    canSelectMany: false,
    filters: { 'JSON Files': ['json'] },
    openLabel: '导入数据',
  });

  if (uris && uris[0]) {
    try {
      const content = fs.readFileSync(uris[0].fsPath, 'utf8');
      const data = JSON.parse(content);
      webview.postMessage({ type: 'import_data_response', data });
      window.showInformationMessage('数据导入成功！');
    }
    catch (error) {
      window.showErrorMessage(`导入失败: ${error}`);
    }
  }
}

export class WebviewHelper {
  public static setupHtml(webview: Webview, context: ExtensionContext) {
    return getWebviewHtml({
      serverUrl: process.env.VITE_DEV_SERVER_URL,
      webview,
      context,
    });
  }

  public static setupWebviewHooks(webview: Webview, disposables: Disposable[], context: ExtensionContext) {
    connectedWebviews.add(webview);

    const disposeWebview = () => connectedWebviews.delete(webview);
    disposables.push({ dispose: disposeWebview });

    webview.onDidReceiveMessage(
      (message: any) => {
        const type = message.type;
        const data = message.data;
        console.log(`Webview message received: ${type}`);

        switch (type) {
          case 'webview_ready': {
            const currentState = loadState(context);
            if (data?.workspacePath && data.workspacePath !== currentState.workspacePath) {
              const updated = { ...currentState, workspacePath: data.workspacePath };
              saveState(context, updated);
              webview.postMessage({ type: 'state_sync', data: updated });
              broadcastState(updated);
              break;
            }
            webview.postMessage({ type: 'state_sync', data: currentState });
            break;
          }
          case 'save_settings': {
            const currentState = loadState(context);
            const next: PersistedState = {
              ...currentState,
              settings: { ...currentState.settings, ...data },
            };
            saveState(context, next);
            broadcastState(next);
            break;
          }
          case 'create_conversation': {
            const currentState = loadState(context);
            const next: PersistedState = {
              ...currentState,
              conversations: [...currentState.conversations.filter(c => c.id !== data.id), data],
              activeConversationId: data.id,
            };
            saveState(context, next);
            broadcastState(next);
            break;
          }
          case 'update_conversation': {
            const currentState = loadState(context);
            const next: PersistedState = {
              ...currentState,
              conversations: currentState.conversations.map(c => (c.id === data.id ? { ...c, ...data.updates, updatedAt: Date.now() } : c)),
            };
            saveState(context, next);
            broadcastState(next);
            break;
          }
          case 'delete_conversation': {
            const currentState = loadState(context);
            const conversations = currentState.conversations.filter(c => c.id !== data.id);
            const history = currentState.history.filter(h => h.conversationId !== data.id);
            const next: PersistedState = {
              ...currentState,
              conversations,
              history,
              activeConversationId: currentState.activeConversationId === data.id ? null : currentState.activeConversationId,
            };
            saveState(context, next);
            broadcastState(next);
            break;
          }
          case 'switch_conversation': {
            const currentState = loadState(context);
            const next = { ...currentState, activeConversationId: data.id };
            saveState(context, next);
            broadcastState(next);
            break;
          }
          case 'add_history_item': {
            const currentState = loadState(context);
            const historyItem: HistoryItemState = data;
            const trimmedHistory = [historyItem, ...currentState.history].slice(0, currentState.settings.maxHistoryItems);
            const conversations = currentState.conversations.map((c) => {
              if (c.id !== historyItem.conversationId)
                return c;

              const message: ConversationState['messages'][number] = {
                id: `msg-${historyItem.id}`,
                timestamp: historyItem.timestamp,
                type: 'response',
                summary: historyItem.summary,
                shouldContinue: historyItem.action === 'continue',
                userInstruction: historyItem.userInstruction,
              };

              return {
                ...c,
                updatedAt: historyItem.timestamp,
                messages: [...c.messages, message],
              };
            });
            const next: PersistedState = { ...currentState, history: trimmedHistory, conversations };
            saveState(context, next);
            broadcastState(next);
            break;
          }
          case 'clear_history': {
            const currentState = loadState(context);
            const next = { ...currentState, history: [] };
            saveState(context, next);
            broadcastState(next);
            break;
          }
          case 'delete_history_item': {
            const currentState = loadState(context);
            const next = { ...currentState, history: currentState.history.filter(h => h.id !== data.id) };
            saveState(context, next);
            broadcastState(next);
            break;
          }
          case 'hello':
            window.showInformationMessage(data);
            break;
          case 'configure':
            commands.executeCommand('windsurf-endless.configure');
            break;
          case 'test_infinite_ask':
            commands.executeCommand('windsurf-endless.showInfiniteAsk');
            break;
          case 'infinite_ask_response':
            console.log('Windsurf Endless response:', data);
            break;
          case 'export_data':
            handleExportData(webview);
            break;
          case 'import_data':
            handleImportData(webview);
            break;
        }
      },
      undefined,
      disposables,
    );
  }
}
