import * as fs from 'node:fs';
import * as http from 'node:http';

import getWebviewHtml from 'virtual:vscode';
import { commands, window, workspace } from 'vscode';

import {
  checkPortAvailable,
  findAvailablePort,
  getServerState,
  restartHTTPServer,
  switchTransport,
} from '../mcp';
import { configureMCP, validateServerName, validateServerPort } from '../services/config';

import type { TransportType as MCPTransportType } from '../mcp';
import type { Disposable, ExtensionContext, Webview, WebviewView, WebviewViewProvider } from 'vscode';

// ==================== Random Tool Name Generator ====================
// Generate random prefixes to avoid detection/filtering

// Word pools for generating natural-looking tool names
const ADJECTIVES = [
  'smart',
  'quick',
  'auto',
  'easy',
  'fast',
  'deep',
  'safe',
  'core',
  'flex',
  'super',
  'meta',
  'neo',
  'pro',
  'ultra',
  'hyper',
  'micro',
  'macro',
  'multi',
  'omni',
  'prime',
  'alpha',
  'beta',
  'delta',
  'sigma',
  'omega',
  'zen',
  'flow',
  'sync',
  'live',
  'next',
];

const NOUNS = [
  'task',
  'flow',
  'work',
  'proc',
  'exec',
  'run',
  'ops',
  'sys',
  'hub',
  'node',
  'core',
  'link',
  'gate',
  'port',
  'path',
  'step',
  'data',
  'info',
  'util',
  'tool',
  'agent',
  'pilot',
  'guide',
  'spark',
  'wave',
  'beam',
  'flux',
  'grid',
  'mesh',
  'loop',
];

// Base tool names (internal identifiers)
const BASE_TOOL_NAMES = {
  checkpoint: 'session_checkpoint',
  promptRefiner: 'prompt_refiner',
  inputBridge: 'input_bridge',
} as const;

// Generate a random string of specified length
function generateRandomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// Generate a random prefix using word combinations
function generateRandomPrefix(): string {
  const strategies = [
    // Strategy 1: adjective_noun
    () => {
      const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
      const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
      return `${adj}_${noun}`;
    },
    // Strategy 2: random 3-5 letter string
    () => generateRandomString(3 + Math.floor(Math.random() * 3)),
    // Strategy 3: single word from pool
    () => NOUNS[Math.floor(Math.random() * NOUNS.length)],
    // Strategy 4: two random strings
    () => `${generateRandomString(3)}_${generateRandomString(3)}`,
  ];

  const strategy = strategies[Math.floor(Math.random() * strategies.length)];
  return strategy();
}

// Cached randomized tool names (regenerated on each extension activation)
let randomizedToolNames: {
  checkpoint: string;
  promptRefiner: string;
  inputBridge: string;
} | null = null;

// Get or generate randomized tool names
export function getRandomizedToolNames(): { checkpoint: string; promptRefiner: string; inputBridge: string } {
  if (!randomizedToolNames) {
    const prefix = generateRandomPrefix();
    const suffix = generateRandomString(4);

    randomizedToolNames = {
      checkpoint: `${prefix}_confirm_${suffix}`,
      promptRefiner: `${prefix}_optimize_${suffix}`,
      inputBridge: `${prefix}_fill_${suffix}`,
    };

    console.log('[ToolNames] Generated randomized tool names:', randomizedToolNames);
  }
  return randomizedToolNames;
}

// Get the base tool names (for internal use)
export function getBaseToolNames() {
  return BASE_TOOL_NAMES;
}

// Check if a tool name matches any of the checkpoint tool variants
export function isCheckpointToolName(name: string): boolean {
  const randomNames = getRandomizedToolNames();
  const legacyNames = ['windsurf-endless', 'session_checkpoint'];
  return name === randomNames.checkpoint || legacyNames.includes(name);
}

// Check if a tool name matches any of the prompt refiner tool variants
export function isPromptRefinerToolName(name: string): boolean {
  const randomNames = getRandomizedToolNames();
  const legacyNames = ['optimize_prompt', 'prompt_refiner'];
  return name === randomNames.promptRefiner || legacyNames.includes(name);
}

// Check if a tool name matches any of the input bridge tool variants
export function isInputBridgeToolName(name: string): boolean {
  const randomNames = getRandomizedToolNames();
  const legacyNames = ['fill_cascade_input', 'input_bridge'];
  return name === randomNames.inputBridge || legacyNames.includes(name);
}

// Reset randomized names (called on extension deactivation if needed)
export function resetRandomizedToolNames(): void {
  randomizedToolNames = null;
}

// Basic shared types (mirrors webview types but kept local to avoid cross-bundle imports)
type TransportType = 'http' | 'stdio' | 'auto';
type ConnectionMode = 'simple' | 'advanced';

interface SettingsState {
  autoStart: boolean;
  showNotifications: boolean;
  language: 'zh-CN' | 'en-US';
  mcpAutoConfig: boolean;
  mcpServerPath: string;
  mcpServerName: string;
  mcpServerPort: number;
  // Transport settings
  transportType: TransportType;
  connectionMode: ConnectionMode;
  autoReconnect: boolean;
  reconnectAttempts: number;
  connectionTimeout: number;
  fallbackToStdio: boolean;
  fallbackPorts: number[];
  // Dialog settings
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
  mcpServerName: 'windsurf-endless',
  mcpServerPort: 6000,
  transportType: 'http',
  connectionMode: 'simple',
  autoReconnect: true,
  reconnectAttempts: 5,
  connectionTimeout: 10,
  fallbackToStdio: false,
  fallbackPorts: [6001, 6002, 16000],
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

// Track webviews by panelId for targeted message delivery
interface WebviewInfo {
  webview: Webview;
  panelId: string;
}
const connectedWebviews = new Map<string, WebviewInfo>();

// Generate unique panel IDs
let panelIdCounter = 0;
function generatePanelId(): string {
  return `panel-${Date.now()}-${++panelIdCounter}-${Math.random().toString(36).slice(2, 7)}`;
}

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

/**
 * Get MCP settings from persisted state
 * @param context Extension context
 * @returns MCP server name and port, or undefined if not set
 */
export function getMCPSettings(context: ExtensionContext): { serverName: string; serverPort: number } | undefined {
  const state = loadState(context);
  if (state.settings.mcpServerName && state.settings.mcpServerPort) {
    return {
      serverName: state.settings.mcpServerName,
      serverPort: state.settings.mcpServerPort,
    };
  }
  return undefined;
}

/**
 * Send state to specific webview or broadcast to all
 * @param state The state to send
 * @param targetPanelId If provided, only send to this specific panel
 */
function broadcastState(state: PersistedState, targetPanelId?: string) {
  connectedWebviews.forEach((info) => {
    // If targetPanelId is specified, only send to that panel
    if (targetPanelId && info.panelId !== targetPanelId) {
      return;
    }
    try {
      info.webview.postMessage({ type: 'state_sync', data: state, panelId: info.panelId });
    }
    catch (error) {
      console.error(`Failed to send state to webview ${info.panelId}:`, error);
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

/**
 * Handle MCP configuration save with confirmation dialog
 */
async function handleSaveMcpConfig(
  context: ExtensionContext,
  data: { serverName: string; serverPort: number },
  webview: Webview,
): Promise<void> {
  // Validate inputs
  const nameError = validateServerName(data.serverName);
  const portError = validateServerPort(data.serverPort);

  if (nameError) {
    window.showErrorMessage(`服务器名称无效: ${nameError}`);
    return;
  }

  if (portError) {
    window.showWarningMessage(`端口提示: ${portError}`);
    // Don't return for port warning, only for hard errors
    if (data.serverPort < 1 || data.serverPort > 65535) {
      return;
    }
  }

  // Show confirmation dialog
  const choice = await window.showWarningMessage(
    `确认修改 MCP 配置？\n\n服务器名称: ${data.serverName}\n端口: ${data.serverPort}\n\n修改后需要重启 Windsurf 才能生效。`,
    { modal: true },
    '保存并重启',
    '仅保存',
    '取消',
  );

  if (choice === '取消' || !choice) {
    return;
  }

  try {
    // Update settings in state
    const currentState = loadState(context);
    const updatedSettings: SettingsState = {
      ...currentState.settings,
      mcpServerName: data.serverName,
      mcpServerPort: data.serverPort,
    };
    const nextState: PersistedState = {
      ...currentState,
      settings: updatedSettings,
    };
    saveState(context, nextState);

    // Update MCP configuration files
    configureMCP(context, {
      serverName: data.serverName,
      serverPort: data.serverPort,
    });

    // Broadcast updated state to all webviews
    broadcastState(nextState);

    // Notify webview of success
    webview.postMessage({
      type: 'mcp_config_saved',
      data: { success: true, serverName: data.serverName, serverPort: data.serverPort },
    });

    if (choice === '保存并重启') {
      window.showInformationMessage('MCP 配置已保存，正在重启 Windsurf...');
      // Reload the window to apply changes
      setTimeout(() => {
        commands.executeCommand('workbench.action.reloadWindow');
      }, 500);
    }
    else {
      window.showInformationMessage(
        'MCP 配置已保存。请手动重启 Windsurf 以应用更改。',
        '立即重启',
      ).then((selection) => {
        if (selection === '立即重启') {
          commands.executeCommand('workbench.action.reloadWindow');
        }
      });
    }
  }
  catch (error: any) {
    window.showErrorMessage(`保存 MCP 配置失败: ${error.message || error}`);
    webview.postMessage({
      type: 'mcp_config_saved',
      data: { success: false, error: error.message || '未知错误' },
    });
  }
}

/**
 * Test MCP server connection
 */
async function handleTestMcpConnection(data: { serverName: string; serverPort: number }): Promise<void> {
  const { serverPort } = data;

  window.showInformationMessage(`正在测试连接 127.0.0.1:${serverPort}...`);

  try {
    // Make a simple HTTP request to check if server is running
    const result = await new Promise<{ success: boolean; message: string }>((resolve) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: serverPort,
          path: '/health',
          method: 'GET',
          timeout: 5000,
        },
        (res) => {
          if (res.statusCode === 200) {
            resolve({ success: true, message: 'MCP 服务器连接正常' });
          }
          else {
            resolve({ success: true, message: `服务器响应状态码: ${res.statusCode}` });
          }
        },
      );

      req.on('error', (err: any) => {
        if (err.code === 'ECONNREFUSED') {
          resolve({ success: false, message: 'MCP 服务器未运行或端口不可达' });
        }
        else {
          resolve({ success: false, message: `连接失败: ${err.message}` });
        }
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, message: '连接超时' });
      });

      req.end();
    });

    if (result.success) {
      window.showInformationMessage(`✅ ${result.message}`);
    }
    else {
      window.showWarningMessage(`⚠️ ${result.message}`);
    }
  }
  catch (error: any) {
    window.showErrorMessage(`测试连接失败: ${error.message || error}`);
  }
}

/**
 * Handle transport type switching
 */
async function handleSwitchTransport(
  data: { transport: MCPTransportType; port?: number },
  webview: Webview,
): Promise<void> {
  try {
    window.showInformationMessage(`正在切换到 ${data.transport.toUpperCase()} 传输模式...`);

    const result = await switchTransport(data.transport, data.port);

    if (result.success) {
      window.showInformationMessage(`✅ 已成功切换到 ${data.transport.toUpperCase()} 模式`);
      webview.postMessage({
        type: 'switch_transport_result',
        data: { success: true, transport: data.transport },
      });
    }
    else {
      window.showErrorMessage(`切换传输模式失败: ${result.error}`);
      webview.postMessage({
        type: 'switch_transport_result',
        data: { success: false, error: result.error },
      });
    }

    // Send updated server state
    webview.postMessage({
      type: 'server_state_update',
      data: getServerState(),
    });
  }
  catch (error: any) {
    window.showErrorMessage(`切换传输模式失败: ${error.message || error}`);
    webview.postMessage({
      type: 'switch_transport_result',
      data: { success: false, error: error.message },
    });
  }
}

/**
 * Handle server restart
 */
async function handleRestartServer(
  data: { port?: number },
  webview: Webview,
): Promise<void> {
  try {
    const port = data.port || getServerState().port;
    window.showInformationMessage(`正在重启 MCP 服务器 (端口: ${port})...`);

    await restartHTTPServer(port);

    window.showInformationMessage(`✅ MCP 服务器已重启 (端口: ${port})`);
    webview.postMessage({
      type: 'restart_server_result',
      data: { success: true, port },
    });

    // Send updated server state
    webview.postMessage({
      type: 'server_state_update',
      data: getServerState(),
    });
  }
  catch (error: any) {
    window.showErrorMessage(`重启服务器失败: ${error.message || error}`);
    webview.postMessage({
      type: 'restart_server_result',
      data: { success: false, error: error.message },
    });
  }
}

/**
 * Handle port availability check
 */
async function handleCheckPort(
  data: { port: number },
  webview: Webview,
): Promise<void> {
  try {
    const available = await checkPortAvailable(data.port);
    webview.postMessage({
      type: 'check_port_result',
      data: { port: data.port, available },
    });
  }
  catch (error: any) {
    webview.postMessage({
      type: 'check_port_result',
      data: { port: data.port, available: false, error: error.message },
    });
  }
}

/**
 * Handle finding available port from candidates
 */
async function handleFindAvailablePort(
  data: { ports: number[] },
  webview: Webview,
): Promise<void> {
  try {
    const availablePort = await findAvailablePort(data.ports);
    webview.postMessage({
      type: 'find_available_port_result',
      data: { port: availablePort, success: availablePort !== null },
    });
  }
  catch (error: any) {
    webview.postMessage({
      type: 'find_available_port_result',
      data: { port: null, success: false, error: error.message },
    });
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

  /**
   * Setup webview hooks with optional predefined panelId
   * @param webview The webview instance
   * @param disposables Disposables array to manage cleanup
   * @param context Extension context
   * @param existingPanelId Optional existing panelId (for InfiniteAskPanel which generates its own)
   */
  public static setupWebviewHooks(webview: Webview, disposables: Disposable[], context: ExtensionContext, existingPanelId?: string) {
    const panelId = existingPanelId || generatePanelId();

    // Register webview with its panelId
    connectedWebviews.set(panelId, { webview, panelId });

    const disposeWebview = () => {
      connectedWebviews.delete(panelId);
      console.log(`[WebviewHelper] Disposed webview: ${panelId}, remaining: ${connectedWebviews.size}`);
    };
    disposables.push({ dispose: disposeWebview });

    webview.onDidReceiveMessage(
      (message: any) => {
        const type = message.type;
        const data = message.data;
        const messagePanelId = message.panelId || data?.panelId;
        console.log(`[WebviewHelper] Message received: ${type} from panel: ${messagePanelId || panelId}`);

        switch (type) {
          case 'webview_ready': {
            const currentState = loadState(context);
            // Send state_sync with panelId so webview knows its identity
            if (data?.workspacePath && data.workspacePath !== currentState.workspacePath) {
              const updated = { ...currentState, workspacePath: data.workspacePath };
              saveState(context, updated);
              webview.postMessage({ type: 'state_sync', data: updated, panelId });
              break;
            }
            webview.postMessage({ type: 'state_sync', data: currentState, panelId });
            break;
          }
          case 'save_settings': {
            const currentState = loadState(context);
            const next: PersistedState = {
              ...currentState,
              settings: { ...currentState.settings, ...data },
            };
            saveState(context, next);
            // Settings are shared, broadcast to all
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
            // Send updated state only to the originating panel
            broadcastState(next, panelId);
            break;
          }
          case 'update_conversation': {
            const currentState = loadState(context);
            const next: PersistedState = {
              ...currentState,
              conversations: currentState.conversations.map(c => (c.id === data.id ? { ...c, ...data.updates, updatedAt: Date.now() } : c)),
            };
            saveState(context, next);
            // Send updated state only to the originating panel
            broadcastState(next, panelId);
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
            // Send updated state only to the originating panel
            broadcastState(next, panelId);
            break;
          }
          case 'switch_conversation': {
            const currentState = loadState(context);
            const next = { ...currentState, activeConversationId: data.id };
            saveState(context, next);
            // Send updated state only to the originating panel
            broadcastState(next, panelId);
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
            // Send updated state only to the originating panel
            broadcastState(next, panelId);
            break;
          }
          case 'clear_history': {
            const currentState = loadState(context);
            const next = { ...currentState, history: [] };
            saveState(context, next);
            // Send updated state only to the originating panel
            broadcastState(next, panelId);
            break;
          }
          case 'delete_history_item': {
            const currentState = loadState(context);
            const next = { ...currentState, history: currentState.history.filter(h => h.id !== data.id) };
            saveState(context, next);
            // Send updated state only to the originating panel
            broadcastState(next, panelId);
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
          case 'save_mcp_config':
            handleSaveMcpConfig(context, data, webview);
            break;
          case 'test_mcp_connection':
            handleTestMcpConnection(data);
            break;
          case 'get_server_state':
            // Send current server state to webview
            webview.postMessage({
              type: 'server_state_update',
              data: getServerState(),
            });
            break;
          case 'switch_transport':
            handleSwitchTransport(data, webview);
            break;
          case 'restart_server':
            handleRestartServer(data, webview);
            break;
          case 'check_port':
            handleCheckPort(data, webview);
            break;
          case 'find_available_port':
            handleFindAvailablePort(data, webview);
            break;
        }
      },
      undefined,
      disposables,
    );
  }
}

/**
 * Sidebar Panel Provider
 * Provides the main extension UI in the sidebar (Activity Bar)
 */
export class SidebarPanelProvider implements WebviewViewProvider {
  public static readonly viewType = 'windsurf-endless.sidebarView';

  private _view?: WebviewView;
  private _disposables: Disposable[] = [];

  constructor(private readonly _context: ExtensionContext) {}

  public resolveWebviewView(
    webviewView: WebviewView,
  ): void | Thenable<void> {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._context.extensionUri],
    };

    webviewView.webview.html = WebviewHelper.setupHtml(webviewView.webview, this._context);

    // Generate a unique panel ID for this sidebar view
    const sidebarPanelId = `sidebar-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Register webview with tracking
    connectedWebviews.set(sidebarPanelId, { webview: webviewView.webview, panelId: sidebarPanelId });

    // Setup message handlers
    WebviewHelper.setupWebviewHooks(webviewView.webview, this._disposables, this._context, sidebarPanelId);

    webviewView.onDidDispose(() => {
      connectedWebviews.delete(sidebarPanelId);
      while (this._disposables.length) {
        const disposable = this._disposables.pop();
        if (disposable) {
          disposable.dispose();
        }
      }
    });
  }

  /**
   * Get the webview view instance
   */
  public get view(): WebviewView | undefined {
    return this._view;
  }

  /**
   * Reveal the sidebar panel
   */
  public reveal(): void {
    if (this._view) {
      this._view.show?.(true);
    }
  }
}
