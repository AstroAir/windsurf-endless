/**
 * Enhanced Session Management Types
 * Based on mcp-feedback-enhanced patterns
 */

// Privacy control levels for session recording
export type PrivacyLevel = 'full' | 'metadata' | 'statistics';

// Session status
export type SessionStatus = 'active' | 'paused' | 'completed' | 'expired';

// Connection status
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

// Session data with enhanced isolation
export interface EnhancedSession {
  id: string;
  workspaceId: string;
  workspacePath: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  status: SessionStatus;

  // Session isolation
  isolationKey: string; // Unique key for session isolation
  parentSessionId?: string; // For session branching

  // Metrics
  messageCount: number;
  continueCount: number;
  endCount: number;
  totalDuration: number; // in ms

  // Privacy
  privacyLevel: PrivacyLevel;

  // Messages (based on privacy level)
  messages: SessionMessage[];

  // Metadata
  tags: string[];
  notes?: string;
}

export interface SessionMessage {
  id: string;
  timestamp: number;
  type: 'ask' | 'response';

  // Content (only if privacyLevel is 'full')
  summary?: string;
  reason?: string;
  userInstruction?: string;

  // Response data
  shouldContinue: boolean;

  // Attachments
  hasImages: boolean;
  imageCount?: number;
}

// Session statistics for 'statistics' privacy level
export interface SessionStatistics {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  totalMessages: number;
  totalContinues: number;
  totalEnds: number;
  averageSessionDuration: number;
  averageMessagesPerSession: number;
}

// Session filter options
export interface SessionFilter {
  status?: SessionStatus[];
  workspaceId?: string;
  dateRange?: {
    start: number;
    end: number;
  };
  tags?: string[];
  searchQuery?: string;
}

// Session sort options
export interface SessionSort {
  field: 'createdAt' | 'updatedAt' | 'messageCount' | 'duration';
  order: 'asc' | 'desc';
}

// Session retention settings
export interface SessionRetention {
  enabled: boolean;
  period: number; // in hours: 24, 72, 168 (1 week), 720 (30 days), -1 (forever)
  autoClean: boolean;
  keepStatistics: boolean; // Keep statistics even after cleaning
}

// Session export format
export type ExportFormat = 'json' | 'csv' | 'markdown';

export interface SessionExportOptions {
  format: ExportFormat;
  includeMessages: boolean;
  includeStatistics: boolean;
  dateRange?: {
    start: number;
    end: number;
  };
  sessionIds?: string[];
}

// Transport type for MCP connection
export type TransportType = 'http' | 'stdio' | 'auto';

// Connection mode for configuration
export type ConnectionMode = 'simple' | 'advanced';

// Server state
export interface ServerState {
  isRunning: boolean;
  transport: TransportType;
  port: number;
  uptime: number; // in seconds
  clientCount: number;
  startedAt?: number;
  error?: string;
}

// Connection monitoring
export interface ConnectionState {
  status: ConnectionStatus;
  latency: number; // in ms
  lastPing: number;
  reconnectAttempts: number;
  qualityScore: number; // 0-100
  error?: string;
  transport: TransportType; // Current transport type
  serverState?: ServerState; // Server state from extension
}

// Auto-submit settings
export interface AutoSubmitSettings {
  enabled: boolean;
  defaultTimeout: number; // in seconds (1-86400)
  promptTriggered: boolean; // Whether prompts can trigger auto-submit
  showCountdown: boolean;
  soundOnSubmit: boolean;
}

// Auto-submit state
export interface AutoSubmitState {
  isActive: boolean;
  remainingSeconds: number;
  isPaused: boolean;
  triggeredBy?: 'prompt' | 'manual';
}

// Audio notification settings
export interface AudioSettings {
  enabled: boolean;
  volume: number; // 0-100
  sound: AudioSoundType;
  customSoundUrl?: string;
  playOnSessionUpdate: boolean;
  playOnAutoSubmit: boolean;
  playOnError: boolean;
}

export type AudioSoundType = 'classic-beep' | 'notification-ding' | 'soft-chime' | 'custom';

// Built-in audio sounds
export const AUDIO_SOUNDS: Record<Exclude<AudioSoundType, 'custom'>, string> = {
  'classic-beep': 'data:audio/wav;base64,UklGRl4AAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YToAAACAgICAgICAgH9/f39/f4CAgICAgIB/f39/f39/gICAgICAgH9/f39/f3+AgICAgICAf39/f39/f4CAgA==',
  'notification-ding': 'data:audio/wav;base64,UklGRn4AAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YVoAAAB/gH1/gH6AgH6AgH6Af3+Af4CAgICAgICAgH9/f39/f39/f39/gICAgICAgICAgH9/f39/f39/f39/gICAgICAgICAgH9/f39/f39/f39/gICA',
  'soft-chime': 'data:audio/wav;base64,UklGRpYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YXIAAABgYGBwcHCAkJCQoKCgsLCwwMDA0NDQ4ODg8PDw//////////////////////////////////////////Dw8ODg4NDQ0MDAoKCQkJCAgHBwcGBg',
};

// Prompt template for CRUD
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  icon: string;
  color: string;
  hotkey?: string;
  category: 'quick' | 'code' | 'test' | 'doc' | 'custom';

  // CRUD metadata
  isBuiltIn: boolean;
  isEditable: boolean;
  createdAt: number;
  updatedAt: number;

  // Usage tracking
  usageCount: number;
  lastUsedAt?: number;

  // Auto-submit integration
  autoSubmit: boolean;
  autoSubmitDelay?: number; // in seconds
}

// Prompt category
export interface PromptCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  order: number;
}

export const DEFAULT_CATEGORIES: PromptCategory[] = [
  { id: 'quick', name: '快捷指令', icon: 'zap', color: 'yellow', order: 0 },
  { id: 'code', name: '代码相关', icon: 'code', color: 'blue', order: 1 },
  { id: 'test', name: '测试相关', icon: 'flask', color: 'purple', order: 2 },
  { id: 'doc', name: '文档相关', icon: 'file-text', color: 'cyan', order: 3 },
  { id: 'custom', name: '自定义', icon: 'star', color: 'orange', order: 4 },
];

// Enhanced settings
export interface EnhancedSettings {
  // Session settings
  session: {
    privacyLevel: PrivacyLevel;
    retention: SessionRetention;
    autoSave: boolean;
    syncAcrossWorkspaces: boolean;
  };

  // Audio settings
  audio: AudioSettings;

  // Auto-submit settings
  autoSubmit: AutoSubmitSettings;

  // UI preferences
  ui: {
    showSessionHistory: boolean;
    showStatistics: boolean;
    showConnectionStatus: boolean;
    compactMode: boolean;
    animationsEnabled: boolean;
  };

  // Prompt settings
  prompts: {
    showUsageCount: boolean;
    sortByUsage: boolean;
    showCategories: boolean;
  };
}

export const DEFAULT_ENHANCED_SETTINGS: EnhancedSettings = {
  session: {
    privacyLevel: 'full',
    retention: {
      enabled: true,
      period: 720, // 30 days
      autoClean: false,
      keepStatistics: true,
    },
    autoSave: true,
    syncAcrossWorkspaces: false,
  },
  audio: {
    enabled: true,
    volume: 50,
    sound: 'notification-ding',
    playOnSessionUpdate: true,
    playOnAutoSubmit: true,
    playOnError: true,
  },
  autoSubmit: {
    enabled: false,
    defaultTimeout: 30,
    promptTriggered: true,
    showCountdown: true,
    soundOnSubmit: true,
  },
  ui: {
    showSessionHistory: true,
    showStatistics: true,
    showConnectionStatus: true,
    compactMode: false,
    animationsEnabled: true,
  },
  prompts: {
    showUsageCount: true,
    sortByUsage: true,
    showCategories: true,
  },
};
