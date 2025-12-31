/**
 * Infinite Ask Panel
 * Webview panel for displaying the infinite ask dialog
 */

import { ViewColumn, window } from 'vscode';

import { isWindsurfEnvironment, optimizePrompt } from '../services/promptOptimizer';

import { WebviewHelper } from './helper';

import type { Disposable, ExtensionContext, WebviewPanel } from 'vscode';

export interface InfiniteAskResult {
  shouldContinue: boolean;
  userInstruction?: string;
  images?: Array<{ id: string; dataUrl: string; name: string }>;
}

export class InfiniteAskPanel {
  public static currentPanel: InfiniteAskPanel | undefined;
  private readonly _panel: WebviewPanel;
  private _disposables: Disposable[] = [];
  private _resolvePromise: ((result: InfiniteAskResult) => void) | null = null;

  /**
   * Fill content into the Infinite Ask dialog's custom instruction input box
   * Returns true if panel is open and content was sent
   */
  public static async fillInput(content: string): Promise<boolean> {
    if (InfiniteAskPanel.currentPanel) {
      console.log('[InfiniteAskPanel] Sending fill_input message with content length:', content.length);
      // Give webview a moment to be ready
      await new Promise(resolve => setTimeout(resolve, 100));
      InfiniteAskPanel.currentPanel._panel.webview.postMessage({
        type: 'fill_input',
        data: { content },
      });
      return true;
    }
    console.log('[InfiniteAskPanel] No current panel, cannot fill input');
    return false;
  }

  private constructor(panel: WebviewPanel, context: ExtensionContext) {
    this._panel = panel;

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.html = WebviewHelper.setupHtml(this._panel.webview, context);

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
            const optimizeInstruction = `请帮我优化以下提示词，使其更加清晰、具体、有效。优化完成后，请调用 fill_cascade_input 工具将优化后的提示词填入输入框。

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
   * Show the infinite ask dialog and wait for user response
   */
  public static async show(
    context: ExtensionContext,
    data: { reason?: string; summary?: string },
  ): Promise<InfiniteAskResult> {
    // If panel already exists, dispose it first
    if (InfiniteAskPanel.currentPanel) {
      InfiniteAskPanel.currentPanel.dispose();
    }

    const panel = window.createWebviewPanel(
      'infiniteAsk',
      'Infinite Ask - 确认继续',
      ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );

    InfiniteAskPanel.currentPanel = new InfiniteAskPanel(panel, context);

    // Wait a bit for webview to load, then send the request
    await new Promise(resolve => setTimeout(resolve, 500));

    // Send request to webview
    panel.webview.postMessage({
      type: 'infinite_ask_request',
      data,
    });

    // Return a promise that resolves when user responds
    return new Promise<InfiniteAskResult>((resolve) => {
      InfiniteAskPanel.currentPanel!._resolvePromise = resolve;

      // Set a long timeout (24 hours)
      const timeout = setTimeout(() => {
        if (InfiniteAskPanel.currentPanel?._resolvePromise) {
          resolve({ shouldContinue: false });
          InfiniteAskPanel.currentPanel?.dispose();
        }
      }, 24 * 60 * 60 * 1000);

      // Clear timeout when resolved
      const originalResolve = InfiniteAskPanel.currentPanel!._resolvePromise;
      InfiniteAskPanel.currentPanel!._resolvePromise = (result) => {
        clearTimeout(timeout);
        originalResolve(result);
      };
    });
  }

  /**
   * Dispose the panel
   */
  public dispose() {
    InfiniteAskPanel.currentPanel = undefined;

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
