/**
 * Connection Monitor
 * Monitors MCP server connection status and health
 */

import type { ConnectionState, ConnectionStatus } from '../types/session';

const PING_INTERVAL = 30000; // 30 seconds
const PING_TIMEOUT = 5000; // 5 seconds
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 2000; // 2 seconds

export type ConnectionChangeCallback = (state: ConnectionState) => void;

export class ConnectionMonitor {
  private state: ConnectionState;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private listeners: Set<ConnectionChangeCallback> = new Set();
  private mcpEndpoint: string | null = null;

  constructor() {
    this.state = this.getDefaultState();
  }

  private getDefaultState(): ConnectionState {
    return {
      status: 'disconnected',
      latency: 0,
      lastPing: 0,
      reconnectAttempts: 0,
      qualityScore: 0,
    };
  }

  /**
   * Notify listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  /**
   * Subscribe to connection state changes
   */
  subscribe(listener: ConnectionChangeCallback): () => void {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return { ...this.state };
  }

  /**
   * Set MCP endpoint for monitoring
   */
  setEndpoint(endpoint: string): void {
    this.mcpEndpoint = endpoint;
  }

  /**
   * Start monitoring connection
   */
  start(): void {
    if (this.pingInterval) {
      return; // Already running
    }

    this.updateStatus('connecting');

    // Initial ping
    this.ping();

    // Set up periodic ping
    this.pingInterval = setInterval(() => {
      this.ping();
    }, PING_INTERVAL);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.updateStatus('disconnected');
  }

  /**
   * Update connection status
   */
  private updateStatus(status: ConnectionStatus, error?: string): void {
    this.state.status = status;
    this.state.error = error;

    if (status === 'connected') {
      this.state.reconnectAttempts = 0;
    }

    this.updateQualityScore();
    this.notifyListeners();
  }

  /**
   * Update quality score based on latency and status
   */
  private updateQualityScore(): void {
    if (this.state.status !== 'connected') {
      this.state.qualityScore = 0;
      return;
    }

    // Calculate quality score based on latency
    // < 50ms = 100, < 100ms = 80, < 200ms = 60, < 500ms = 40, < 1000ms = 20, else 10
    const latency = this.state.latency;
    if (latency < 50) {
      this.state.qualityScore = 100;
    }
    else if (latency < 100) {
      this.state.qualityScore = 80;
    }
    else if (latency < 200) {
      this.state.qualityScore = 60;
    }
    else if (latency < 500) {
      this.state.qualityScore = 40;
    }
    else if (latency < 1000) {
      this.state.qualityScore = 20;
    }
    else {
      this.state.qualityScore = 10;
    }
  }

  /**
   * Perform a ping to check connection
   */
  private async ping(): Promise<void> {
    if (!this.mcpEndpoint) {
      // In extension context, we check by sending a message
      this.simulatePing();
      return;
    }

    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT);

      const response = await fetch(this.mcpEndpoint, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        this.state.latency = Date.now() - startTime;
        this.state.lastPing = Date.now();
        this.updateStatus('connected');
      }
      else {
        throw new Error(`HTTP ${response.status}`);
      }
    }
    catch (error: any) {
      this.handlePingError(error);
    }
  }

  /**
   * Simulate ping for extension context
   */
  private simulatePing(): void {
    // In extension context, we assume connection is based on extension state
    // This will be updated by the extension when it receives events
    this.state.lastPing = Date.now();

    if (this.state.status === 'connecting') {
      // Simulate initial connection
      setTimeout(() => {
        this.state.latency = Math.floor(Math.random() * 50) + 10;
        this.updateStatus('connected');
      }, 500);
    }
    else if (this.state.status === 'connected') {
      // Update latency
      this.state.latency = Math.floor(Math.random() * 30) + 10;
      this.updateQualityScore();
      this.notifyListeners();
    }
  }

  /**
   * Handle ping error
   */
  private handlePingError(error: any): void {
    const errorMessage = error.name === 'AbortError' ? 'Connection timeout' : error.message;

    if (this.state.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      this.updateStatus('connecting', errorMessage);
      this.scheduleReconnect();
    }
    else {
      this.updateStatus('error', `Max reconnect attempts reached: ${errorMessage}`);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = RECONNECT_DELAY * 2 ** this.state.reconnectAttempts;
    this.state.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      this.ping();
    }, delay);
  }

  /**
   * Force reconnection
   */
  forceReconnect(): void {
    this.state.reconnectAttempts = 0;
    this.updateStatus('connecting');
    this.ping();
  }

  /**
   * Update status from external source (extension)
   */
  updateFromExtension(status: ConnectionStatus, latency?: number): void {
    this.state.status = status;
    if (latency !== undefined) {
      this.state.latency = latency;
    }
    this.state.lastPing = Date.now();
    this.updateQualityScore();
    this.notifyListeners();
  }

  /**
   * Get status text
   */
  getStatusText(): string {
    switch (this.state.status) {
      case 'connected':
        return `已连接 (${this.state.latency}ms)`;
      case 'connecting':
        return this.state.reconnectAttempts > 0
          ? `重连中... (${this.state.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`
          : '连接中...';
      case 'disconnected':
        return '未连接';
      case 'error':
        return `错误: ${this.state.error || '未知错误'}`;
      default:
        return '未知状态';
    }
  }

  /**
   * Get quality indicator color
   */
  getQualityColor(): string {
    const score = this.state.qualityScore;
    if (score >= 80) {
      return 'green';
    }
    if (score >= 60) {
      return 'yellow';
    }
    if (score >= 40) {
      return 'orange';
    }
    if (score > 0) {
      return 'red';
    }
    return 'gray';
  }

  /**
   * Get quality indicator class
   */
  getQualityClass(): string {
    const color = this.getQualityColor();
    return `bg-${color}-500`;
  }
}

// Singleton instance
export const connectionMonitor = new ConnectionMonitor();
