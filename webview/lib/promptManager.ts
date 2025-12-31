/**
 * Prompt Manager
 * Handles CRUD operations for prompt templates
 */

import { DEFAULT_CATEGORIES } from '../types/session';

import type { PromptCategory, PromptTemplate } from '../types/session';

const PROMPTS_STORAGE_KEY = 'windsurf-endless-prompts';
const CATEGORIES_STORAGE_KEY = 'windsurf-endless-prompt-categories';

// Default built-in prompts
const DEFAULT_PROMPTS: PromptTemplate[] = [
  {
    id: 'prompt-continue',
    name: '继续',
    description: '继续当前任务',
    content: '继续',
    icon: 'play',
    color: 'green',
    hotkey: '1',
    category: 'quick',
    isBuiltIn: true,
    isEditable: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    autoSubmit: false,
  },
  {
    id: 'prompt-optimize',
    name: '优化代码',
    description: '优化当前代码，保持代码风格一致',
    content: '请继续优化这段代码，保持代码风格一致。',
    icon: 'sparkles',
    color: 'blue',
    hotkey: '2',
    category: 'code',
    isBuiltIn: true,
    isEditable: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    autoSubmit: false,
  },
  {
    id: 'prompt-test',
    name: '添加测试',
    description: '为代码添加完整的单元测试',
    content: '请为刚才的代码添加完整的单元测试。',
    icon: 'flask',
    color: 'purple',
    hotkey: '3',
    category: 'test',
    isBuiltIn: true,
    isEditable: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    autoSubmit: false,
  },
  {
    id: 'prompt-fix',
    name: '修复问题',
    description: '继续修复发现的问题',
    content: '请继续修复刚才发现的问题。',
    icon: 'wrench',
    color: 'orange',
    hotkey: '4',
    category: 'code',
    isBuiltIn: true,
    isEditable: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    autoSubmit: false,
  },
  {
    id: 'prompt-doc',
    name: '添加文档',
    description: '为代码添加详细的文档注释',
    content: '请为代码添加详细的文档注释。',
    icon: 'file-text',
    color: 'cyan',
    hotkey: '5',
    category: 'doc',
    isBuiltIn: true,
    isEditable: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    autoSubmit: false,
  },
  {
    id: 'prompt-explain',
    name: '解释代码',
    description: '详细解释代码的逻辑和实现原理',
    content: '请详细解释这段代码的逻辑和实现原理。',
    icon: 'message-circle',
    color: 'pink',
    hotkey: '6',
    category: 'doc',
    isBuiltIn: true,
    isEditable: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    autoSubmit: false,
  },
  {
    id: 'prompt-refactor',
    name: '重构代码',
    description: '重构代码以提高可读性和可维护性',
    content: '请重构这段代码，提高可读性和可维护性，但不要改变功能。',
    icon: 'code',
    color: 'indigo',
    hotkey: '7',
    category: 'code',
    isBuiltIn: true,
    isEditable: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    autoSubmit: false,
  },
  {
    id: 'prompt-performance',
    name: '性能优化',
    description: '优化代码性能',
    content: '请优化这段代码的性能，并解释优化点。',
    icon: 'zap',
    color: 'yellow',
    hotkey: '8',
    category: 'code',
    isBuiltIn: true,
    isEditable: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    autoSubmit: false,
  },
  {
    id: 'prompt-security',
    name: '安全检查',
    description: '检查代码的安全漏洞',
    content: '请检查这段代码是否存在安全漏洞，并提供修复建议。',
    icon: 'shield',
    color: 'red',
    hotkey: '9',
    category: 'code',
    isBuiltIn: true,
    isEditable: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    autoSubmit: false,
  },
];

export class PromptManager {
  private prompts: Map<string, PromptTemplate> = new Map();
  private categories: PromptCategory[] = DEFAULT_CATEGORIES;
  private listeners: Set<(prompts: PromptTemplate[]) => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private generateId(): string {
    return `prompt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Load prompts from localStorage
   */
  private loadFromStorage(): void {
    try {
      const promptsJson = localStorage.getItem(PROMPTS_STORAGE_KEY);
      if (promptsJson) {
        const savedPrompts: PromptTemplate[] = JSON.parse(promptsJson);
        savedPrompts.forEach((prompt) => {
          this.prompts.set(prompt.id, prompt);
        });
      }
      else {
        // Initialize with defaults
        DEFAULT_PROMPTS.forEach((prompt) => {
          this.prompts.set(prompt.id, prompt);
        });
      }

      const categoriesJson = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (categoriesJson) {
        this.categories = JSON.parse(categoriesJson);
      }
    }
    catch (error) {
      console.error('[PromptManager] Failed to load from storage:', error);
      // Fallback to defaults
      DEFAULT_PROMPTS.forEach((prompt) => {
        this.prompts.set(prompt.id, prompt);
      });
    }
  }

  /**
   * Save prompts to localStorage
   */
  private saveToStorage(): void {
    try {
      const promptsArray = Array.from(this.prompts.values());
      localStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(promptsArray));
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(this.categories));
    }
    catch (error) {
      console.error('[PromptManager] Failed to save to storage:', error);
    }
  }

  /**
   * Notify listeners
   */
  private notifyListeners(): void {
    const prompts = this.getAllPrompts();
    this.listeners.forEach(listener => listener(prompts));
  }

  /**
   * Subscribe to prompt changes
   */
  subscribe(listener: (prompts: PromptTemplate[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get all prompts
   */
  getAllPrompts(): PromptTemplate[] {
    return Array.from(this.prompts.values());
  }

  /**
   * Get prompts by category
   */
  getPromptsByCategory(category: string): PromptTemplate[] {
    return this.getAllPrompts().filter(p => p.category === category);
  }

  /**
   * Get prompts sorted by usage
   */
  getPromptsSortedByUsage(): PromptTemplate[] {
    return this.getAllPrompts().sort((a, b) => b.usageCount - a.usageCount);
  }

  /**
   * Get prompt by ID
   */
  getPrompt(id: string): PromptTemplate | undefined {
    return this.prompts.get(id);
  }

  /**
   * Get prompt by hotkey
   */
  getPromptByHotkey(hotkey: string): PromptTemplate | undefined {
    return this.getAllPrompts().find(p => p.hotkey === hotkey);
  }

  /**
   * Create a new prompt
   */
  createPrompt(
    prompt: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'isBuiltIn'>,
  ): PromptTemplate {
    const newPrompt: PromptTemplate = {
      ...prompt,
      id: this.generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0,
      isBuiltIn: false,
      isEditable: true,
    };

    this.prompts.set(newPrompt.id, newPrompt);
    this.saveToStorage();
    this.notifyListeners();

    return newPrompt;
  }

  /**
   * Update an existing prompt
   */
  updatePrompt(id: string, updates: Partial<PromptTemplate>): PromptTemplate | null {
    const prompt = this.prompts.get(id);
    if (!prompt) {
      return null;
    }

    if (!prompt.isEditable && prompt.isBuiltIn) {
      console.warn('[PromptManager] Cannot edit non-editable built-in prompt:', id);
      return null;
    }

    const updatedPrompt: PromptTemplate = {
      ...prompt,
      ...updates,
      id: prompt.id, // Preserve ID
      isBuiltIn: prompt.isBuiltIn, // Preserve built-in status
      createdAt: prompt.createdAt, // Preserve creation time
      updatedAt: Date.now(),
    };

    this.prompts.set(id, updatedPrompt);
    this.saveToStorage();
    this.notifyListeners();

    return updatedPrompt;
  }

  /**
   * Delete a prompt
   */
  deletePrompt(id: string): boolean {
    const prompt = this.prompts.get(id);
    if (!prompt) {
      return false;
    }

    if (prompt.isBuiltIn && !prompt.isEditable) {
      console.warn('[PromptManager] Cannot delete non-editable built-in prompt:', id);
      return false;
    }

    this.prompts.delete(id);
    this.saveToStorage();
    this.notifyListeners();

    return true;
  }

  /**
   * Record prompt usage
   */
  recordUsage(id: string): void {
    const prompt = this.prompts.get(id);
    if (!prompt) {
      return;
    }

    prompt.usageCount++;
    prompt.lastUsedAt = Date.now();
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Duplicate a prompt
   */
  duplicatePrompt(id: string): PromptTemplate | null {
    const prompt = this.prompts.get(id);
    if (!prompt) {
      return null;
    }

    return this.createPrompt({
      name: `${prompt.name} (副本)`,
      description: prompt.description,
      content: prompt.content,
      icon: prompt.icon,
      color: prompt.color,
      category: prompt.category,
      isEditable: true,
      autoSubmit: prompt.autoSubmit,
      autoSubmitDelay: prompt.autoSubmitDelay,
    });
  }

  /**
   * Get all categories
   */
  getCategories(): PromptCategory[] {
    return [...this.categories];
  }

  /**
   * Add a category
   */
  addCategory(category: Omit<PromptCategory, 'id' | 'order'>): PromptCategory {
    const newCategory: PromptCategory = {
      ...category,
      id: `cat-${Date.now()}`,
      order: this.categories.length,
    };

    this.categories.push(newCategory);
    this.saveToStorage();

    return newCategory;
  }

  /**
   * Update a category
   */
  updateCategory(id: string, updates: Partial<PromptCategory>): boolean {
    const index = this.categories.findIndex(c => c.id === id);
    if (index === -1) {
      return false;
    }

    this.categories[index] = { ...this.categories[index], ...updates };
    this.saveToStorage();

    return true;
  }

  /**
   * Delete a category
   */
  deleteCategory(id: string): boolean {
    const index = this.categories.findIndex(c => c.id === id);
    if (index === -1) {
      return false;
    }

    // Move prompts in this category to 'custom'
    this.getAllPrompts()
      .filter(p => p.category === id)
      .forEach((p) => {
        p.category = 'custom';
      });

    this.categories.splice(index, 1);
    this.saveToStorage();
    this.notifyListeners();

    return true;
  }

  /**
   * Reset to default prompts
   */
  resetToDefaults(): void {
    this.prompts.clear();
    DEFAULT_PROMPTS.forEach((prompt) => {
      this.prompts.set(prompt.id, { ...prompt, usageCount: 0 });
    });
    this.categories = [...DEFAULT_CATEGORIES];
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Export prompts
   */
  exportPrompts(): string {
    return JSON.stringify(
      {
        exportedAt: Date.now(),
        version: '1.0.0',
        prompts: this.getAllPrompts(),
        categories: this.categories,
      },
      null,
      2,
    );
  }

  /**
   * Import prompts
   */
  importPrompts(json: string, merge: boolean = true): number {
    try {
      const data = JSON.parse(json);
      const importedPrompts: PromptTemplate[] = data.prompts || [];
      const importedCategories: PromptCategory[] = data.categories || [];

      let importedCount = 0;

      // Import categories first
      if (importedCategories.length > 0) {
        if (!merge) {
          this.categories = [];
        }
        importedCategories.forEach((cat) => {
          if (!this.categories.find(c => c.id === cat.id)) {
            this.categories.push(cat);
          }
        });
      }

      // Import prompts
      importedPrompts.forEach((prompt) => {
        if (merge && this.prompts.has(prompt.id)) {
          // Update existing
          const existing = this.prompts.get(prompt.id)!;
          if (existing.isEditable || !existing.isBuiltIn) {
            this.prompts.set(prompt.id, { ...existing, ...prompt });
          }
        }
        else {
          // Add new (with new ID if conflict)
          if (this.prompts.has(prompt.id)) {
            prompt.id = this.generateId();
          }
          prompt.isBuiltIn = false;
          prompt.isEditable = true;
          this.prompts.set(prompt.id, prompt);
        }
        importedCount++;
      });

      this.saveToStorage();
      this.notifyListeners();

      return importedCount;
    }
    catch (error) {
      console.error('[PromptManager] Failed to import prompts:', error);
      return 0;
    }
  }

  /**
   * Search prompts
   */
  searchPrompts(query: string): PromptTemplate[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllPrompts().filter(
      p =>
        p.name.toLowerCase().includes(lowerQuery)
        || p.description.toLowerCase().includes(lowerQuery)
        || p.content.toLowerCase().includes(lowerQuery),
    );
  }
}

// Singleton instance
export const promptManager = new PromptManager();
