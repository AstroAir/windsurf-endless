import { commands, env, window, workspace } from 'vscode';

import { setEnvironmentConfig, setFillInputHandler, setPopupHandler, setPromptOptimizerHandler, startHTTPServer, stopHTTPServer } from './mcp';
import { configureMCP, injectRules, removeMCPConfig } from './services/config';
import { isWindsurfEnvironment, optimizePrompt } from './services/promptOptimizer';
import { InfiniteAskPanel } from './views/infiniteAskPanel';
import { MainPanel } from './views/panel';

import type { ExtensionContext } from 'vscode';

export function activate(context: ExtensionContext) {
  console.log('Windsurf Endless (Infinite Ask) is now active!');

  // Detect and set environment configuration
  const isWindsurf = isWindsurfEnvironment();
  console.log(`Environment: ${isWindsurf ? 'Windsurf' : 'VSCode/Cursor'}`);
  setEnvironmentConfig({ isWindsurf });

  // Set up VSCode popup handler for MCP server
  setPopupHandler(async (request) => {
    const result = await InfiniteAskPanel.show(context, {
      summary: request.summary,
      reason: request.reason,
    });
    return result;
  });

  // Set up prompt optimizer handler for MCP server
  setPromptOptimizerHandler(async (request) => {
    try {
      const result = await optimizePrompt(request.prompt);
      return {
        success: result.success,
        optimizedPrompt: result.optimizedPrompt,
        error: result.error,
      };
    }
    catch (error: any) {
      return {
        success: false,
        error: error.message || '优化提示词时发生错误',
      };
    }
  });

  // Set up fill input handler for MCP server
  // This fills the Infinite Ask dialog input if open, otherwise uses clipboard
  setFillInputHandler(async (request) => {
    try {
      // First, try to fill the Infinite Ask dialog if it's open
      const filledDialog = await InfiniteAskPanel.fillInput(request.content);

      if (filledDialog) {
        // Content was sent to the dialog's input box
        window.showInformationMessage('优化后的提示词已填入对话框输入框');
        return { success: true };
      }

      // Dialog not open - use clipboard method for main Cascade input
      await env.clipboard.writeText(request.content);

      // Show notification with the content for manual paste
      window.showInformationMessage(
        '优化后的提示词已复制到剪贴板，请按 Ctrl+V 粘贴到输入框。',
        '查看内容',
      ).then((selection) => {
        if (selection === '查看内容') {
          window.showInformationMessage(request.content.substring(0, 200) + (request.content.length > 200 ? '...' : ''));
        }
      });

      return { success: true };
    }
    catch (error: any) {
      return {
        success: false,
        error: error.message || '填入输入框时发生错误',
      };
    }
  });

  // Start HTTP MCP server for HTTP transport mode
  startHTTPServer(3456).then(() => {
    console.log('MCP HTTP server started on port 3456');
  }).catch((error) => {
    console.error('Failed to start MCP HTTP server:', error);
  });

  // 1. Initial Configuration - Configure MCP and inject rules
  configureMCP(context);
  injectRules(context);

  // 2. Register Commands
  context.subscriptions.push(
    // Show main panel
    commands.registerCommand('windsurf-endless.showPanel', async () => {
      MainPanel.render(context);
    }),

    // Manual configuration command
    commands.registerCommand('windsurf-endless.configure', async () => {
      configureMCP(context);
      injectRules(context);
      window.showInformationMessage('Windsurf Endless: Configuration updated successfully!');
    }),

    // Show infinite ask dialog (for testing)
    commands.registerCommand('windsurf-endless.showInfiniteAsk', async () => {
      const result = await InfiniteAskPanel.show(context, {
        summary: '测试对话框',
        reason: '这是一个测试消息，用于验证 Infinite Ask 功能是否正常工作。',
      });

      if (result.shouldContinue) {
        window.showInformationMessage(
          `用户选择继续${result.userInstruction ? `，指令: ${result.userInstruction}` : ''}`,
        );
      }
      else {
        window.showInformationMessage('用户选择结束对话');
      }
    }),

    // Remove MCP configuration
    commands.registerCommand('windsurf-endless.removeConfig', async () => {
      removeMCPConfig();
      window.showInformationMessage('Windsurf Endless: MCP configuration removed.');
    }),
  );

  // 3. Watch for workspace folder changes
  context.subscriptions.push(
    workspace.onDidChangeWorkspaceFolders(() => {
      injectRules(context);
    }),
  );
}

export function deactivate() {
  // Clear all handlers
  setPopupHandler(null);
  setPromptOptimizerHandler(null);
  setFillInputHandler(null);
  // Stop HTTP server on deactivation
  stopHTTPServer();
}
