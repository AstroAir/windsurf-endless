/**
 * Audio Manager
 * Handles audio notifications for session events
 */

import { AUDIO_SOUNDS } from '../types/session';

import type { AudioSettings, AudioSoundType } from '../types/session';

const AUDIO_SETTINGS_KEY = 'windsurf-endless-audio-settings';

export class AudioManager {
  private settings: AudioSettings;
  private audioElement: HTMLAudioElement | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.settings = this.getDefaultSettings();
    this.loadSettings();
  }

  private getDefaultSettings(): AudioSettings {
    return {
      enabled: true,
      volume: 50,
      sound: 'notification-ding',
      playOnSessionUpdate: true,
      playOnAutoSubmit: true,
      playOnError: true,
    };
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    try {
      const settingsJson = localStorage.getItem(AUDIO_SETTINGS_KEY);
      if (settingsJson) {
        this.settings = { ...this.settings, ...JSON.parse(settingsJson) };
      }
    }
    catch (error) {
      console.error('[AudioManager] Failed to load settings:', error);
    }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(this.settings));
    }
    catch (error) {
      console.error('[AudioManager] Failed to save settings:', error);
    }
  }

  /**
   * Initialize audio context (must be called from user interaction)
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    try {
      this.audioElement = document.createElement('audio');
      this.isInitialized = true;
    }
    catch (error) {
      console.error('[AudioManager] Failed to initialize audio:', error);
    }
  }

  /**
   * Get current settings
   */
  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  /**
   * Update settings
   */
  updateSettings(settings: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.saveSettings();
  }

  /**
   * Get sound URL
   */
  private getSoundUrl(sound: AudioSoundType): string {
    if (sound === 'custom' && this.settings.customSoundUrl) {
      return this.settings.customSoundUrl;
    }
    return AUDIO_SOUNDS[sound as Exclude<AudioSoundType, 'custom'>] || AUDIO_SOUNDS['notification-ding'];
  }

  /**
   * Play sound
   */
  async play(sound?: AudioSoundType): Promise<void> {
    if (!this.settings.enabled)
      return;

    // Ensure initialized
    if (!this.isInitialized) {
      this.initialize();
    }

    const soundToPlay = sound ?? this.settings.sound;
    const url = this.getSoundUrl(soundToPlay);
    const volume = this.settings.volume / 100;

    try {
      if (this.audioElement) {
        this.audioElement.src = url;
        this.audioElement.volume = volume;
        await this.audioElement.play();
      }
    }
    catch (error) {
      console.error('[AudioManager] Failed to play sound:', error);
    }
  }

  /**
   * Play notification for session update
   */
  async playSessionUpdate(): Promise<void> {
    if (this.settings.playOnSessionUpdate) {
      await this.play();
    }
  }

  /**
   * Play notification for auto-submit
   */
  async playAutoSubmit(): Promise<void> {
    if (this.settings.playOnAutoSubmit) {
      await this.play();
    }
  }

  /**
   * Play notification for error
   */
  async playError(): Promise<void> {
    if (this.settings.playOnError) {
      await this.play('classic-beep');
    }
  }

  /**
   * Test current sound
   */
  async test(): Promise<void> {
    const wasEnabled = this.settings.enabled;
    this.settings.enabled = true;
    await this.play();
    this.settings.enabled = wasEnabled;
  }

  /**
   * Set custom sound from file
   */
  async setCustomSound(file: File): Promise<boolean> {
    try {
      // Validate file type
      const validTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
      if (!validTypes.includes(file.type)) {
        console.error('[AudioManager] Invalid file type:', file.type);
        return false;
      }

      // Convert to base64
      const reader = new FileReader();
      return new Promise((resolve) => {
        reader.onload = () => {
          this.settings.customSoundUrl = reader.result as string;
          this.settings.sound = 'custom';
          this.saveSettings();
          resolve(true);
        };
        reader.onerror = () => resolve(false);
        reader.readAsDataURL(file);
      });
    }
    catch (error) {
      console.error('[AudioManager] Failed to set custom sound:', error);
      return false;
    }
  }

  /**
   * Clear custom sound
   */
  clearCustomSound(): void {
    this.settings.customSoundUrl = undefined;
    if (this.settings.sound === 'custom') {
      this.settings.sound = 'notification-ding';
    }
    this.saveSettings();
  }
}

// Singleton instance
export const audioManager = new AudioManager();
