/**
 * Auto-Submit Manager
 * Handles countdown timer and automatic submission
 */

import type { AutoSubmitSettings, AutoSubmitState } from '../types/session';

const AUTO_SUBMIT_SETTINGS_KEY = 'windsurf-endless-auto-submit-settings';

export type AutoSubmitCallback = () => void;

export class AutoSubmitManager {
  private settings: AutoSubmitSettings;
  private state: AutoSubmitState;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private onSubmitCallback: AutoSubmitCallback | null = null;
  private onStateChangeCallback: ((state: AutoSubmitState) => void) | null = null;

  constructor() {
    this.settings = this.getDefaultSettings();
    this.state = this.getDefaultState();
    this.loadSettings();
  }

  private getDefaultSettings(): AutoSubmitSettings {
    return {
      enabled: false,
      defaultTimeout: 30,
      promptTriggered: true,
      showCountdown: true,
      soundOnSubmit: true,
    };
  }

  private getDefaultState(): AutoSubmitState {
    return {
      isActive: false,
      remainingSeconds: 0,
      isPaused: false,
    };
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    try {
      const settingsJson = localStorage.getItem(AUTO_SUBMIT_SETTINGS_KEY);
      if (settingsJson) {
        this.settings = { ...this.settings, ...JSON.parse(settingsJson) };
      }
    }
    catch (error) {
      console.error('[AutoSubmitManager] Failed to load settings:', error);
    }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem(AUTO_SUBMIT_SETTINGS_KEY, JSON.stringify(this.settings));
    }
    catch (error) {
      console.error('[AutoSubmitManager] Failed to save settings:', error);
    }
  }

  /**
   * Notify state change
   */
  private notifyStateChange(): void {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback({ ...this.state });
    }
  }

  /**
   * Get current settings
   */
  getSettings(): AutoSubmitSettings {
    return { ...this.settings };
  }

  /**
   * Update settings
   */
  updateSettings(settings: Partial<AutoSubmitSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.saveSettings();
  }

  /**
   * Get current state
   */
  getState(): AutoSubmitState {
    return { ...this.state };
  }

  /**
   * Set submit callback
   */
  setOnSubmit(callback: AutoSubmitCallback): void {
    this.onSubmitCallback = callback;
  }

  /**
   * Set state change callback
   */
  setOnStateChange(callback: (state: AutoSubmitState) => void): void {
    this.onStateChangeCallback = callback;
  }

  /**
   * Start countdown timer
   */
  start(timeout?: number, triggeredBy: 'prompt' | 'manual' = 'manual'): boolean {
    if (!this.settings.enabled && triggeredBy !== 'manual') {
      return false;
    }

    if (triggeredBy === 'prompt' && !this.settings.promptTriggered) {
      return false;
    }

    // Stop any existing timer
    this.stop();

    const seconds = timeout ?? this.settings.defaultTimeout;

    // Validate timeout range
    if (seconds < 1 || seconds > 86400) {
      console.error('[AutoSubmitManager] Invalid timeout:', seconds);
      return false;
    }

    this.state = {
      isActive: true,
      remainingSeconds: seconds,
      isPaused: false,
      triggeredBy,
    };

    this.timerId = setInterval(() => {
      if (this.state.isPaused)
        return;

      this.state.remainingSeconds--;
      this.notifyStateChange();

      if (this.state.remainingSeconds <= 0) {
        this.submit();
      }
    }, 1000);

    this.notifyStateChange();
    return true;
  }

  /**
   * Pause countdown
   */
  pause(): void {
    if (!this.state.isActive)
      return;

    this.state.isPaused = true;
    this.notifyStateChange();
  }

  /**
   * Resume countdown
   */
  resume(): void {
    if (!this.state.isActive)
      return;

    this.state.isPaused = false;
    this.notifyStateChange();
  }

  /**
   * Stop countdown without submitting
   */
  stop(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    this.state = this.getDefaultState();
    this.notifyStateChange();
  }

  /**
   * Cancel countdown (alias for stop)
   */
  cancel(): void {
    this.stop();
  }

  /**
   * Submit immediately
   */
  private submit(): void {
    this.stop();

    if (this.onSubmitCallback) {
      this.onSubmitCallback();
    }
  }

  /**
   * Force submit (manual trigger)
   */
  forceSubmit(): void {
    this.submit();
  }

  /**
   * Add time to countdown
   */
  addTime(seconds: number): void {
    if (!this.state.isActive)
      return;

    this.state.remainingSeconds = Math.min(
      this.state.remainingSeconds + seconds,
      86400,
    );
    this.notifyStateChange();
  }

  /**
   * Check if timer is running
   */
  isRunning(): boolean {
    return this.state.isActive && !this.state.isPaused;
  }

  /**
   * Format remaining time as string
   */
  formatRemainingTime(): string {
    const hours = Math.floor(this.state.remainingSeconds / 3600);
    const minutes = Math.floor((this.state.remainingSeconds % 3600) / 60);
    const seconds = this.state.remainingSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Get progress percentage (0-100)
   */
  getProgress(): number {
    if (!this.state.isActive)
      return 0;

    const initial = this.settings.defaultTimeout;
    return Math.max(0, Math.min(100, ((initial - this.state.remainingSeconds) / initial) * 100));
  }
}

// Singleton instance
export const autoSubmitManager = new AutoSubmitManager();
