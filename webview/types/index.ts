/**
 * Type definitions for Windsurf Endless
 */

// Settings types
export interface Settings {
  // General settings
  autoStart: boolean;
  showNotifications: boolean;
  language: 'zh-CN' | 'en-US';

  // MCP settings
  mcpAutoConfig: boolean;
  mcpServerPath: string;

  // Dialog settings
  dialogTimeout: number; // in hours
  dialogPosition: 'center' | 'top-right' | 'bottom-right';
  dialogTheme: 'system' | 'light' | 'dark';

  // Rules settings
  autoInjectRules: boolean;
  customRulesPath: string;

  // History settings
  saveHistory: boolean;
  maxHistoryItems: number;
  autoCleanHistory: boolean;
  historyRetentionDays: number;
}

export const defaultSettings: Settings = {
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

// Conversation/Session types
export interface ConversationMessage {
  id: string;
  timestamp: number;
  type: 'ask' | 'response';
  reason?: string;
  summary?: string;
  shouldContinue: boolean;
  userInstruction?: string;
}

export interface Conversation {
  id: string;
  name: string;
  workspacePath: string;
  createdAt: number;
  updatedAt: number;
  messages: ConversationMessage[];
  isActive: boolean;
}

export interface Session {
  id: string;
  conversationId: string;
  windowId: string;
  createdAt: number;
  isActive: boolean;
}

// Shortcut types
export interface Shortcut {
  id: string;
  name: string;
  description: string;
  content: string;
  icon: string;
  color: string;
  hotkey?: string; // e.g., '1', '2', 'a', 'b'
  category: 'quick' | 'code' | 'test' | 'doc' | 'custom';
  isBuiltIn: boolean;
  createdAt: number;
  usageCount: number;
}

export const defaultShortcuts: Shortcut[] = [
  {
    id: 'sc-continue',
    name: '继续',
    description: '继续当前任务',
    content: '继续',
    icon: 'play',
    color: 'green',
    hotkey: '1',
    category: 'quick',
    isBuiltIn: true,
    createdAt: Date.now(),
    usageCount: 0,
  },
  {
    id: 'sc-optimize',
    name: '优化代码',
    description: '优化当前代码',
    content: '请继续优化这段代码，保持代码风格一致。',
    icon: 'sparkles',
    color: 'blue',
    hotkey: '2',
    category: 'code',
    isBuiltIn: true,
    createdAt: Date.now(),
    usageCount: 0,
  },
  {
    id: 'sc-test',
    name: '添加测试',
    description: '为代码添加单元测试',
    content: '请为刚才的代码添加完整的单元测试。',
    icon: 'flask',
    color: 'purple',
    hotkey: '3',
    category: 'test',
    isBuiltIn: true,
    createdAt: Date.now(),
    usageCount: 0,
  },
  {
    id: 'sc-fix',
    name: '修复问题',
    description: '继续修复问题',
    content: '请继续修复刚才发现的问题。',
    icon: 'wrench',
    color: 'orange',
    hotkey: '4',
    category: 'code',
    isBuiltIn: true,
    createdAt: Date.now(),
    usageCount: 0,
  },
  {
    id: 'sc-doc',
    name: '添加文档',
    description: '添加代码文档',
    content: '请为代码添加详细的文档注释。',
    icon: 'file-text',
    color: 'cyan',
    hotkey: '5',
    category: 'doc',
    isBuiltIn: true,
    createdAt: Date.now(),
    usageCount: 0,
  },
  {
    id: 'sc-explain',
    name: '解释代码',
    description: '解释代码逻辑',
    content: '请详细解释这段代码的逻辑和实现原理。',
    icon: 'message-circle',
    color: 'pink',
    hotkey: '6',
    category: 'doc',
    isBuiltIn: true,
    createdAt: Date.now(),
    usageCount: 0,
  },
];

// History types
export interface HistoryItem {
  id: string;
  conversationId: string;
  conversationName: string;
  workspacePath: string;
  timestamp: number;
  summary: string;
  action: 'continue' | 'end';
  userInstruction?: string;
}

// App state types
export interface AppState {
  settings: Settings;
  conversations: Conversation[];
  sessions: Session[];
  history: HistoryItem[];
  activeConversationId: string | null;
  activeSessionId: string | null;
  workspacePath?: string;
}

// Message types for communication
export type MessageType
  = | 'webview_ready'
    | 'state_sync'
    | 'get_settings'
    | 'save_settings'
    | 'get_conversations'
    | 'create_conversation'
    | 'update_conversation'
    | 'delete_conversation'
    | 'switch_conversation'
    | 'get_history'
    | 'add_history_item'
    | 'clear_history'
    | 'delete_history_item'
    | 'export_history'
    | 'infinite_ask_request'
    | 'infinite_ask_response'
    | 'configure'
    | 'test_infinite_ask'
    | 'mcp_status'
    | 'optimize_prompt'
    | 'prompt_optimized'
    | 'prompt_optimize_error';

export interface WebviewMessage<T = any> {
  type: MessageType;
  data?: T;
}

// Re-export session types
export * from './session';
