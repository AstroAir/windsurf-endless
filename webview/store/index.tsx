/**
 * State management for Windsurf Endless
 */

import { createContext, useContext, useEffect, useReducer } from 'react';

import { defaultSettings } from '../types';
import { vscode } from '../utils/vscode';

import type {
  AppState,
  Conversation,
  ConversationMessage,
  HistoryItem,
  Settings,
} from '../types';
import type { ReactNode } from 'react';

const initialState: AppState = {
  settings: defaultSettings,
  conversations: [],
  sessions: [],
  history: [],
  activeConversationId: null,
  activeSessionId: null,
};

type Action
  = | { type: 'SET_SETTINGS'; payload: Settings }
    | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> }
    | { type: 'SET_CONVERSATIONS'; payload: Conversation[] }
    | { type: 'ADD_CONVERSATION'; payload: Conversation }
    | { type: 'UPDATE_CONVERSATION'; payload: { id: string; updates: Partial<Conversation> } }
    | { type: 'DELETE_CONVERSATION'; payload: string }
    | { type: 'SET_ACTIVE_CONVERSATION'; payload: string | null }
    | { type: 'ADD_MESSAGE'; payload: { conversationId: string; message: ConversationMessage } }
    | { type: 'SET_HISTORY'; payload: HistoryItem[] }
    | { type: 'ADD_HISTORY_ITEM'; payload: HistoryItem }
    | { type: 'DELETE_HISTORY_ITEM'; payload: string }
    | { type: 'CLEAR_HISTORY' }
    | { type: 'LOAD_STATE'; payload: Partial<AppState> };

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'SET_CONVERSATIONS':
      return { ...state, conversations: action.payload };
    case 'ADD_CONVERSATION':
      return { ...state, conversations: [...state.conversations, action.payload] };
    case 'UPDATE_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.map(c =>
          c.id === action.payload.id ? { ...c, ...action.payload.updates } : c,
        ),
      };
    case 'DELETE_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.filter(c => c.id !== action.payload),
        activeConversationId: state.activeConversationId === action.payload ? null : state.activeConversationId,
      };
    case 'SET_ACTIVE_CONVERSATION':
      return { ...state, activeConversationId: action.payload };
    case 'ADD_MESSAGE':
      return {
        ...state,
        conversations: state.conversations.map(c =>
          c.id === action.payload.conversationId
            ? { ...c, messages: [...c.messages, action.payload.message], updatedAt: Date.now() }
            : c,
        ),
      };
    case 'SET_HISTORY':
      return { ...state, history: action.payload };
    case 'ADD_HISTORY_ITEM': {
      const newHistory = [action.payload, ...state.history];
      return { ...state, history: newHistory.slice(0, state.settings.maxHistoryItems) };
    }
    case 'DELETE_HISTORY_ITEM':
      return { ...state, history: state.history.filter(h => h.id !== action.payload) };
    case 'CLEAR_HISTORY':
      return { ...state, history: [] };
    case 'LOAD_STATE':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  saveSettings: (settings: Partial<Settings>) => void;
  createConversation: (name: string, workspacePath: string) => Conversation;
  deleteConversation: (id: string) => void;
  switchConversation: (id: string) => void;
  addHistoryItem: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
  deleteHistoryItem: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    const savedState = vscode.getState();
    if (savedState) {
      dispatch({ type: 'LOAD_STATE', payload: savedState as Partial<AppState> });
    }

    // Listen for messages from extension
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'request_export_data') {
        vscode.postMessage({ type: 'export_data_response', data: state });
      }
      else if (message.type === 'import_data_response') {
        dispatch({ type: 'LOAD_STATE', payload: message.data });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [state]);

  useEffect(() => {
    vscode.setState(state);
  }, [state]);

  const saveSettings = (settings: Partial<Settings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
    vscode.postMessage({ type: 'save_settings', data: { ...state.settings, ...settings } });
  };

  const createConversation = (name: string, workspacePath: string): Conversation => {
    const conversation: Conversation = {
      id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      name,
      workspacePath,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      isActive: true,
    };
    dispatch({ type: 'ADD_CONVERSATION', payload: conversation });
    dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conversation.id });
    vscode.postMessage({ type: 'create_conversation', data: conversation });
    return conversation;
  };

  const deleteConversation = (id: string) => {
    dispatch({ type: 'DELETE_CONVERSATION', payload: id });
    vscode.postMessage({ type: 'delete_conversation', data: { id } });
  };

  const switchConversation = (id: string) => {
    dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: id });
    vscode.postMessage({ type: 'switch_conversation', data: { id } });
  };

  const addHistoryItem = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const historyItem: HistoryItem = {
      ...item,
      id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      timestamp: Date.now(),
    };
    dispatch({ type: 'ADD_HISTORY_ITEM', payload: historyItem });
  };

  const clearHistory = () => {
    dispatch({ type: 'CLEAR_HISTORY' });
    vscode.postMessage({ type: 'clear_history' });
  };

  const deleteHistoryItem = (id: string) => {
    dispatch({ type: 'DELETE_HISTORY_ITEM', payload: id });
    vscode.postMessage({ type: 'delete_history_item', data: { id } });
  };

  const contextValue: AppContextType = {
    state,
    dispatch,
    saveSettings,
    createConversation,
    deleteConversation,
    switchConversation,
    addHistoryItem,
    clearHistory,
    deleteHistoryItem,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export function useSettings() {
  const { state, saveSettings } = useApp();
  return { settings: state.settings, saveSettings };
}

export function useConversations() {
  const { state, createConversation, deleteConversation, switchConversation } = useApp();
  const activeConversation = state.conversations.find(c => c.id === state.activeConversationId);
  return {
    conversations: state.conversations,
    activeConversation,
    activeConversationId: state.activeConversationId,
    createConversation,
    deleteConversation,
    switchConversation,
  };
}

export function useHistory() {
  const { state, addHistoryItem, clearHistory, deleteHistoryItem } = useApp();
  return {
    history: state.history,
    addHistoryItem,
    clearHistory,
    deleteHistoryItem,
  };
}
