/**
 * Windsurf Endless Panel
 * Webview panel for displaying the Windsurf Endless dialog
 * Supports multiple concurrent panels
 */

import { ViewColumn, window, workspace } from 'vscode';

import { isWindsurfEnvironment, optimizePrompt } from '../services/promptOptimizer';

import { WebviewHelper } from './helper';

import type { Disposable, ExtensionContext, WebviewPanel } from 'vscode';

export interface InfiniteAskResult {
  shouldContinue: boolean;
  userInstruction?: string;
  images?: Array<{ id: string; dataUrl: string; name: string }>;
}

interface PanelInfo {
  panel: InfiniteAskPanel;
  resolvePromise: ((result: InfiniteAskResult) => void) | null;
}

export class InfiniteAskPanel {
  // Support multiple panels with unique IDs
  private static panels: Map<string, PanelInfo> = new Map();
  private static panelCounter = 0;

  private readonly _panel: WebviewPanel;
  private readonly _panelId: string;
  private _disposables: Disposable[] = [];
  private _resolvePromise: ((result: InfiniteAskResult) => void) | null = null;

  /**
   * Get the most recently created panel (for backward compatibility)
   */
  public static get currentPanel(): InfiniteAskPanel | undefined {
    if (InfiniteAskPanel.panels.size === 0) {
      return undefined;
    }
    const lastEntry = Array.from(InfiniteAskPanel.panels.values()).pop();
    return lastEntry?.panel;
  }

  /**
   * Get all active panel IDs
   */
  public static getActivePanelIds(): string[] {
    return Array.from(InfiniteAskPanel.panels.keys());
  }

  /**
   * Get panel by ID
   */
  public static getPanelById(id: string): InfiniteAskPanel | undefined {
    return InfiniteAskPanel.panels.get(id)?.panel;
  }

  /**
   * Fill content into a specific panel's custom instruction input box
   * If panelId is not provided, fills the most recent panel
   */
  public static async fillInput(content: string, panelId?: string): Promise<boolean> {
    let targetPanel: InfiniteAskPanel | undefined;

    if (panelId) {
      targetPanel = InfiniteAskPanel.getPanelById(panelId);
    }
    else {
      targetPanel = InfiniteAskPanel.currentPanel;
    }

    if (targetPanel) {
      console.log('[InfiniteAskPanel] Sending fill_input message with content length:', content.length);
      await new Promise(resolve => setTimeout(resolve, 100));
      targetPanel._panel.webview.postMessage({
        type: 'fill_input',
        data: { content },
      });
      return true;
    }
    console.log('[InfiniteAskPanel] No target panel found, cannot fill input');
    return false;
  }

  private constructor(panel: WebviewPanel, context: ExtensionContext, panelId: string) {
    this._panel = panel;
    this._panelId = panelId;

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.html = WebviewHelper.setupHtml(this._panel.webview, context);

    // Pass panelId to setupWebviewHooks for proper window isolation
    WebviewHelper.setupWebviewHooks(this._panel.webview, this._disposables, context, panelId);
    this._setupMessageHandler();
  }

  private _setupMessageHandler() {
    this._panel.webview.onDidReceiveMessage(
      async (message: any) => {
        if (message.type === 'infinite_ask_response') {
          const result: InfiniteAskResult = {
            shouldContinue: message.data?.shouldContinue ?? false,
            userInstruction: message.data?.userInstruction,
            images: message.data?.images,
          };

          if (this._resolvePromise) {
            this._resolvePromise(result);
            this._resolvePromise = null;
          }

          // Close the panel after receiving response
          this.dispose();
        }
        else if (message.type === 'optimize_prompt') {
          // 本地优化（使用VSCode LM API）
          const prompt = message.data?.prompt;
          if (prompt) {
            // Check if in Windsurf - VSCode LM API not available
            if (isWindsurfEnvironment()) {
              this._panel.webview.postMessage({
                type: 'prompt_optimize_error',
                data: { error: 'Windsurf环境不支持本地优化，请使用"AI优化并填入"功能' },
              });
              window.showWarningMessage('Windsurf环境不支持本地优化，请使用"AI优化并填入"功能');
              return;
            }

            try {
              const result = await optimizePrompt(prompt);
              if (result.success && result.optimizedPrompt) {
                this._panel.webview.postMessage({
                  type: 'prompt_optimized',
                  data: { optimizedPrompt: result.optimizedPrompt },
                });
              }
              else {
                this._panel.webview.postMessage({
                  type: 'prompt_optimize_error',
                  data: { error: result.error || '优化失败' },
                });
                window.showWarningMessage(result.error || '优化提示词失败');
              }
            }
            catch (error: any) {
              this._panel.webview.postMessage({
                type: 'prompt_optimize_error',
                data: { error: error.message },
              });
              window.showErrorMessage(`优化提示词失败: ${error.message}`);
            }
          }
        }
        else if (message.type === 'optimize_prompt_with_ai') {
          // AI优化流程：让AI通过MCP工具来优化提示词并填入输入框
          const prompt = message.data?.prompt;
          if (prompt) {
            // 构建让AI优化提示词的指令
            const optimizeInstruction = `请帮我优化以下提示词，使其更加清晰、具体、有效。优化完成后，请调用 input_bridge 工具将优化后的提示词填入输入框。

需要优化的原始提示词：
${prompt}

请直接优化并填入，不需要解释。`;

            // 关闭对话框并返回特殊指令
            const result: InfiniteAskResult = {
              shouldContinue: true,
              userInstruction: optimizeInstruction,
            };

            if (this._resolvePromise) {
              this._resolvePromise(result);
              this._resolvePromise = null;
            }

            // 显示提示
            window.showInformationMessage('已发送优化请求给AI，优化后的提示词将自动填入输入框');

            // 关闭面板
            this.dispose();
          }
        }
      },
      undefined,
      this._disposables,
    );
  }

  /**
   * Show the Windsurf Endless dialog and wait for user response
   * Creates a new panel for each call, allowing multiple concurrent dialogs
   */
  public static async show(
    context: ExtensionContext,
    data: { reason?: string; summary?: string },
  ): Promise<InfiniteAskResult> {
    // Generate unique panel ID
    const panelId = `infinite-ask-${++InfiniteAskPanel.panelCounter}-${Date.now()}`;
    const panelCount = InfiniteAskPanel.panels.size + 1;

    // Create title with counter if multiple panels
    const title = panelCount > 1
      ? `Windsurf Endless #${panelCount} - 确认继续`
      : 'Windsurf Endless - 确认继续';

    const panel = window.createWebviewPanel(
      'infiniteAsk',
      title,
      ViewColumn.Beside, // Use Beside to avoid replacing existing panels
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );

    const infiniteAskPanel = new InfiniteAskPanel(panel, context, panelId);

    // Register in panels map
    InfiniteAskPanel.panels.set(panelId, {
      panel: infiniteAskPanel,
      resolvePromise: null,
    });

    console.log(`[InfiniteAskPanel] Created new panel: ${panelId}, total panels: ${InfiniteAskPanel.panels.size}`);

    // Wait a bit for webview to load, then send the request
    await new Promise(resolve => setTimeout(resolve, 500));

    // Send request to webview
    panel.webview.postMessage({
      type: 'infinite_ask_request',
      data: {
        ...data,
        workspacePath: workspace.workspaceFolders?.[0]?.uri.fsPath ?? '',
        panelId, // Include panelId for tracking
      },
    });

    // Return a promise that resolves when user responds
    return new Promise<InfiniteAskResult>((resolve) => {
      infiniteAskPanel._resolvePromise = resolve;

      // Update panels map
      const panelInfo = InfiniteAskPanel.panels.get(panelId);
      if (panelInfo) {
        panelInfo.resolvePromise = resolve;
      }

      // Set a long timeout (24 hours)
      const timeout = setTimeout(() => {
        if (infiniteAskPanel._resolvePromise) {
          resolve({ shouldContinue: false });
          infiniteAskPanel.dispose();
        }
      }, 24 * 60 * 60 * 1000);

      // Clear timeout when resolved
      const originalResolve = infiniteAskPanel._resolvePromise;
      infiniteAskPanel._resolvePromise = (result) => {
        clearTimeout(timeout);
        originalResolve(result);
      };
    });
  }

  /**
   * Dispose the panel
   */
  public dispose() {
    // Remove from panels map
    InfiniteAskPanel.panels.delete(this._panelId);
    console.log(`[InfiniteAskPanel] Disposed panel: ${this._panelId}, remaining panels: ${InfiniteAskPanel.panels.size}`);

    // If there's a pending promise, resolve with shouldContinue: false
    if (this._resolvePromise) {
      this._resolvePromise({ shouldContinue: false });
      this._resolvePromise = null;
    }

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
