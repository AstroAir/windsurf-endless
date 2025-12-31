/**
 * Session Manager
 * Handles session isolation, history, and persistence
 */

import type {
  EnhancedSession,
  PrivacyLevel,
  SessionFilter,
  SessionMessage,
  SessionRetention,
  SessionSort,
  SessionStatistics,
  SessionStatus,
} from '../types/session';

const SESSION_STORAGE_KEY = 'windsurf-endless-sessions';
const STATISTICS_STORAGE_KEY = 'windsurf-endless-statistics';

export class SessionManager {
  private sessions: Map<string, EnhancedSession> = new Map();
  private currentSessionId: string | null = null;
  private statistics: SessionStatistics;
  private listeners: Set<(sessions: EnhancedSession[]) => void> = new Set();

  constructor() {
    this.statistics = this.getDefaultStatistics();
    this.loadFromStorage();
  }

  private getDefaultStatistics(): SessionStatistics {
    return {
      totalSessions: 0,
      activeSessions: 0,
      completedSessions: 0,
      totalMessages: 0,
      totalContinues: 0,
      totalEnds: 0,
      averageSessionDuration: 0,
      averageMessagesPerSession: 0,
    };
  }

  private generateId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateIsolationKey(workspaceId: string): string {
    return `${workspaceId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }

  /**
   * Load sessions from localStorage
   */
  private loadFromStorage(): void {
    try {
      const sessionsJson = localStorage.getItem(SESSION_STORAGE_KEY);
      if (sessionsJson) {
        const sessionsArray: EnhancedSession[] = JSON.parse(sessionsJson);
        sessionsArray.forEach((session) => {
          this.sessions.set(session.id, session);
        });
      }

      const statsJson = localStorage.getItem(STATISTICS_STORAGE_KEY);
      if (statsJson) {
        this.statistics = JSON.parse(statsJson);
      }
    }
    catch (error) {
      console.error('[SessionManager] Failed to load from storage:', error);
    }
  }

  /**
   * Save sessions to localStorage
   */
  private saveToStorage(): void {
    try {
      const sessionsArray = Array.from(this.sessions.values());
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionsArray));
      localStorage.setItem(STATISTICS_STORAGE_KEY, JSON.stringify(this.statistics));
    }
    catch (error) {
      console.error('[SessionManager] Failed to save to storage:', error);
    }
  }

  /**
   * Notify listeners of session changes
   */
  private notifyListeners(): void {
    const sessions = this.getAllSessions();
    this.listeners.forEach(listener => listener(sessions));
  }

  /**
   * Subscribe to session changes
   */
  subscribe(listener: (sessions: EnhancedSession[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Create a new session with isolation
   */
  createSession(
    workspaceId: string,
    workspacePath: string,
    privacyLevel: PrivacyLevel = 'full',
    parentSessionId?: string,
  ): EnhancedSession {
    const session: EnhancedSession = {
      id: this.generateId(),
      workspaceId,
      workspacePath,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'active',
      isolationKey: this.generateIsolationKey(workspaceId),
      parentSessionId,
      messageCount: 0,
      continueCount: 0,
      endCount: 0,
      totalDuration: 0,
      privacyLevel,
      messages: [],
      tags: [],
    };

    this.sessions.set(session.id, session);
    this.currentSessionId = session.id;

    // Update statistics
    this.statistics.totalSessions++;
    this.statistics.activeSessions++;

    this.saveToStorage();
    this.notifyListeners();

    return session;
  }

  /**
   * Get current session
   */
  getCurrentSession(): EnhancedSession | null {
    if (!this.currentSessionId)
      return null;
    return this.sessions.get(this.currentSessionId) ?? null;
  }

  /**
   * Get session by ID
   */
  getSession(id: string): EnhancedSession | null {
    return this.sessions.get(id) ?? null;
  }

  /**
   * Get all sessions
   */
  getAllSessions(): EnhancedSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get sessions with filter and sort
   */
  getSessions(filter?: SessionFilter, sort?: SessionSort): EnhancedSession[] {
    let sessions = this.getAllSessions();

    // Apply filters
    if (filter) {
      if (filter.status && filter.status.length > 0) {
        sessions = sessions.filter(s => filter.status!.includes(s.status));
      }
      if (filter.workspaceId) {
        sessions = sessions.filter(s => s.workspaceId === filter.workspaceId);
      }
      if (filter.dateRange) {
        sessions = sessions.filter(
          s => s.createdAt >= filter.dateRange!.start && s.createdAt <= filter.dateRange!.end,
        );
      }
      if (filter.tags && filter.tags.length > 0) {
        sessions = sessions.filter(s => filter.tags!.some(tag => s.tags.includes(tag)));
      }
      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        sessions = sessions.filter(
          s =>
            s.workspacePath.toLowerCase().includes(query)
            || s.notes?.toLowerCase().includes(query)
            || s.messages.some(
              m =>
                m.summary?.toLowerCase().includes(query)
                || m.userInstruction?.toLowerCase().includes(query),
            ),
        );
      }
    }

    // Apply sort
    if (sort) {
      sessions.sort((a, b) => {
        let compareValue = 0;
        switch (sort.field) {
          case 'createdAt':
            compareValue = a.createdAt - b.createdAt;
            break;
          case 'updatedAt':
            compareValue = a.updatedAt - b.updatedAt;
            break;
          case 'messageCount':
            compareValue = a.messageCount - b.messageCount;
            break;
          case 'duration':
            compareValue = a.totalDuration - b.totalDuration;
            break;
        }
        return sort.order === 'asc' ? compareValue : -compareValue;
      });
    }
    else {
      // Default sort: most recent first
      sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    }

    return sessions;
  }

  /**
   * Add message to current session
   */
  addMessage(
    message: Omit<SessionMessage, 'id' | 'timestamp'>,
    sessionId?: string,
  ): SessionMessage | null {
    const id = sessionId ?? this.currentSessionId;
    if (!id)
      return null;

    const session = this.sessions.get(id);
    if (!session)
      return null;

    const fullMessage: SessionMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
    };

    // Apply privacy level filtering
    if (session.privacyLevel === 'statistics') {
      // Only store metadata
      delete fullMessage.summary;
      delete fullMessage.reason;
      delete fullMessage.userInstruction;
    }
    else if (session.privacyLevel === 'metadata') {
      // Store timestamp and type but not content
      delete fullMessage.summary;
      delete fullMessage.reason;
      delete fullMessage.userInstruction;
    }

    session.messages.push(fullMessage);
    session.messageCount++;
    session.updatedAt = Date.now();

    if (message.shouldContinue) {
      session.continueCount++;
      this.statistics.totalContinues++;
    }
    else {
      session.endCount++;
      this.statistics.totalEnds++;
    }

    this.statistics.totalMessages++;
    this.updateAverages();

    this.saveToStorage();
    this.notifyListeners();

    return fullMessage;
  }

  /**
   * Update session status
   */
  updateSessionStatus(id: string, status: SessionStatus): void {
    const session = this.sessions.get(id);
    if (!session)
      return;

    const previousStatus = session.status;
    session.status = status;
    session.updatedAt = Date.now();

    if (status === 'completed' && previousStatus === 'active') {
      session.completedAt = Date.now();
      session.totalDuration = session.completedAt - session.createdAt;
      this.statistics.activeSessions--;
      this.statistics.completedSessions++;
    }
    else if (status === 'active' && previousStatus !== 'active') {
      this.statistics.activeSessions++;
      if (previousStatus === 'completed') {
        this.statistics.completedSessions--;
      }
    }

    this.updateAverages();
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Complete current session and create a new one
   */
  completeAndCreateNew(
    workspaceId: string,
    workspacePath: string,
    privacyLevel: PrivacyLevel = 'full',
  ): EnhancedSession {
    if (this.currentSessionId) {
      this.updateSessionStatus(this.currentSessionId, 'completed');
    }
    return this.createSession(workspaceId, workspacePath, privacyLevel, this.currentSessionId ?? undefined);
  }

  /**
   * Switch to a different session
   */
  switchSession(id: string): boolean {
    if (!this.sessions.has(id))
      return false;
    this.currentSessionId = id;
    this.notifyListeners();
    return true;
  }

  /**
   * Add tag to session
   */
  addTag(id: string, tag: string): void {
    const session = this.sessions.get(id);
    if (!session)
      return;

    if (!session.tags.includes(tag)) {
      session.tags.push(tag);
      session.updatedAt = Date.now();
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  /**
   * Remove tag from session
   */
  removeTag(id: string, tag: string): void {
    const session = this.sessions.get(id);
    if (!session)
      return;

    const index = session.tags.indexOf(tag);
    if (index > -1) {
      session.tags.splice(index, 1);
      session.updatedAt = Date.now();
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  /**
   * Update session notes
   */
  updateNotes(id: string, notes: string): void {
    const session = this.sessions.get(id);
    if (!session)
      return;

    session.notes = notes;
    session.updatedAt = Date.now();
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Delete session
   */
  deleteSession(id: string): boolean {
    const session = this.sessions.get(id);
    if (!session)
      return false;

    if (session.status === 'active') {
      this.statistics.activeSessions--;
    }
    else if (session.status === 'completed') {
      this.statistics.completedSessions--;
    }

    this.statistics.totalSessions--;
    this.statistics.totalMessages -= session.messageCount;
    this.statistics.totalContinues -= session.continueCount;
    this.statistics.totalEnds -= session.endCount;

    this.sessions.delete(id);

    if (this.currentSessionId === id) {
      this.currentSessionId = null;
    }

    this.updateAverages();
    this.saveToStorage();
    this.notifyListeners();

    return true;
  }

  /**
   * Apply retention policy
   */
  applyRetention(retention: SessionRetention): number {
    if (!retention.enabled || retention.period === -1)
      return 0;

    const cutoffTime = Date.now() - retention.period * 60 * 60 * 1000;
    let deletedCount = 0;

    this.sessions.forEach((session, id) => {
      if (session.createdAt < cutoffTime && session.status === 'completed') {
        if (retention.keepStatistics) {
          // Keep statistics but remove message content
          session.messages = [];
          session.notes = undefined;
        }
        else {
          this.deleteSession(id);
          deletedCount++;
        }
      }
    });

    this.saveToStorage();
    this.notifyListeners();

    return deletedCount;
  }

  /**
   * Clear all sessions
   */
  clearAll(keepStatistics: boolean = false): void {
    this.sessions.clear();
    this.currentSessionId = null;

    if (!keepStatistics) {
      this.statistics = this.getDefaultStatistics();
    }

    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Get statistics
   */
  getStatistics(): SessionStatistics {
    return { ...this.statistics };
  }

  /**
   * Update average statistics
   */
  private updateAverages(): void {
    const completedSessions = this.getAllSessions().filter(s => s.status === 'completed');

    if (completedSessions.length > 0) {
      this.statistics.averageSessionDuration
        = completedSessions.reduce((sum, s) => sum + s.totalDuration, 0) / completedSessions.length;
      this.statistics.averageMessagesPerSession
        = completedSessions.reduce((sum, s) => sum + s.messageCount, 0) / completedSessions.length;
    }
  }

  /**
   * Export sessions
   */
  exportSessions(sessionIds?: string[]): string {
    const sessionsToExport = sessionIds
      ? sessionIds.map(id => this.sessions.get(id)).filter((s): s is EnhancedSession => s !== undefined)
      : this.getAllSessions();

    return JSON.stringify(
      {
        exportedAt: Date.now(),
        version: '1.0.0',
        statistics: this.statistics,
        sessions: sessionsToExport,
      },
      null,
      2,
    );
  }

  /**
   * Import sessions
   */
  importSessions(json: string, merge: boolean = true): number {
    try {
      const data = JSON.parse(json);
      const importedSessions: EnhancedSession[] = data.sessions || [];

      let importedCount = 0;
      importedSessions.forEach((session) => {
        if (merge && this.sessions.has(session.id)) {
          // Merge: update existing session
          const existing = this.sessions.get(session.id)!;
          this.sessions.set(session.id, { ...existing, ...session });
        }
        else {
          // Add new session (with new ID if conflict)
          if (this.sessions.has(session.id)) {
            session.id = this.generateId();
          }
          this.sessions.set(session.id, session);
          this.statistics.totalSessions++;
          if (session.status === 'active') {
            this.statistics.activeSessions++;
          }
          else if (session.status === 'completed') {
            this.statistics.completedSessions++;
          }
        }
        importedCount++;
      });

      this.updateAverages();
      this.saveToStorage();
      this.notifyListeners();

      return importedCount;
    }
    catch (error) {
      console.error('[SessionManager] Failed to import sessions:', error);
      return 0;
    }
  }
}

// Singleton instance
export const sessionManager = new SessionManager();
