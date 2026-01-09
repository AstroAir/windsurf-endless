import { commands, env, window, workspace } from 'vscode';

import {
  setEnvironmentConfig,
  setFillInputHandler,
  setPopupHandler,
  setPromptOptimizerHandler,
  startHTTPServer,
  stopHTTPServer,
} from './mcp';
import { configureMCP, defaultMCPConfig, injectRules, removeMCPConfig } from './services/config';
import { isWindsurfEnvironment, optimizePrompt } from './services/promptOptimizer';
import { getMCPSettings, resetRandomizedToolNames, SidebarPanelProvider } from './views/helper';
import { InfiniteAskPanel } from './views/infiniteAskPanel';

import type { ExtensionContext } from 'vscode';

export function activate(context: ExtensionContext) {
  console.log('Windsurf Endless is now active!');

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
  // This fills the Windsurf Endless dialog input if open, otherwise uses clipboard
  setFillInputHandler(async (request) => {
    try {
      // First, try to fill the Windsurf Endless dialog if it's open
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
  // Load saved MCP settings or use defaults
  const mcpSettings = getMCPSettings(context);
  const serverPort = mcpSettings?.serverPort ?? defaultMCPConfig.serverPort;

  startHTTPServer(serverPort).then(() => {
    console.log(`MCP HTTP server started on port ${serverPort}`);
  }).catch((error) => {
    console.error('Failed to start MCP HTTP server:', error);
    window.showErrorMessage(`无法启动 MCP 服务器 (端口 ${serverPort}): ${error.message || error}`);
  });

  // 1. Initial Configuration - Configure MCP and inject rules
  configureMCP(context, {
    serverName: mcpSettings?.serverName ?? defaultMCPConfig.serverName,
    serverPort,
  });
  injectRules(context);

  // 2. Register Sidebar Panel Provider
  const sidebarProvider = new SidebarPanelProvider(context);
  context.subscriptions.push(
    window.registerWebviewViewProvider(SidebarPanelProvider.viewType, sidebarProvider, {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
    }),
  );

  // 3. Register Commands
  context.subscriptions.push(
    // Show main panel (now focuses sidebar)
    commands.registerCommand('windsurf-endless.showPanel', async () => {
      // Focus the sidebar panel
      await commands.executeCommand('windsurf-endless.sidebarView.focus');
    }),

    // Focus sidebar panel command
    commands.registerCommand('windsurf-endless.focusSidebar', async () => {
      await commands.executeCommand('windsurf-endless.sidebarView.focus');
    }),

    // Manual configuration command
    commands.registerCommand('windsurf-endless.configure', async () => {
      const currentSettings = getMCPSettings(context);
      configureMCP(context, {
        serverName: currentSettings?.serverName ?? defaultMCPConfig.serverName,
        serverPort: currentSettings?.serverPort ?? defaultMCPConfig.serverPort,
      });
      injectRules(context);
      window.showInformationMessage('Windsurf Endless: Configuration updated successfully!');
    }),

    // Show Windsurf Endless dialog (for testing)
    commands.registerCommand('windsurf-endless.showInfiniteAsk', async () => {
      const result = await InfiniteAskPanel.show(context, {
        summary: '测试对话框',
        reason: '这是一个测试消息，用于验证 Windsurf Endless 功能是否正常工作。',
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

    // Restart extension / reload window
    commands.registerCommand('windsurf-endless.restart', async () => {
      const choice = await window.showWarningMessage(
        '确定要重新加载窗口吗？这将重启所有扩展。',
        { modal: true },
        '确定',
        '取消',
      );

      if (choice === '确定') {
        await commands.executeCommand('workbench.action.reloadWindow');
      }
    }),

    // Open MCP settings
    commands.registerCommand('windsurf-endless.openMcpSettings', async () => {
      // Focus sidebar and navigate to settings
      await commands.executeCommand('windsurf-endless.sidebarView.focus');
      window.showInformationMessage('请在侧边栏的"设置"标签页中配置 MCP 服务器。');
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
  // Reset randomized tool names for next activation
  resetRandomizedToolNames();
  // Stop HTTP server on deactivation
  stopHTTPServer();
}
