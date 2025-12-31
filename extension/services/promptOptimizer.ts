/**
 * Prompt Optimizer Service
 * Uses AI models to optimize user prompts for better results
 */

import * as vscode from 'vscode';

/**
 * Check if running in Windsurf environment
 */
export function isWindsurfEnvironment(): boolean {
  const appName = vscode.env.appName?.toLowerCase() || '';
  return appName.includes('windsurf') || appName.includes('codeium');
}

const OPTIMIZE_PROMPT_TEMPLATE = `你是一个提示词优化专家。请优化以下用户提示词，使其更加清晰、具体、有效。

原始提示词：
{prompt}

优化要求：
1. 保持原始意图不变
2. 使表达更加清晰具体
3. 添加必要的上下文和约束
4. 使用更专业的措辞
5. 保持简洁，不要过度冗长

请直接输出优化后的提示词，不要包含任何解释或额外说明。`;

export interface OptimizePromptResult {
  success: boolean;
  optimizedPrompt?: string;
  error?: string;
}

/**
 * Optimize a prompt using VSCode's language model API
 * Note: In Windsurf environment, this will return an error since Windsurf
 * doesn't support VSCode's LM API. The AI should optimize directly instead.
 */
export async function optimizePrompt(prompt: string): Promise<OptimizePromptResult> {
  // Check if in Windsurf environment - VSCode LM API is not available
  if (isWindsurfEnvironment()) {
    return {
      success: false,
      error: 'Windsurf环境不支持本地优化，请使用AI优化功能',
    };
  }

  try {
    // Try to use VSCode's built-in language model API (Copilot)
    const models = await vscode.lm.selectChatModels({
      vendor: 'copilot',
    });

    if (models.length > 0) {
      const model = models[0];
      const messages = [
        vscode.LanguageModelChatMessage.User(
          OPTIMIZE_PROMPT_TEMPLATE.replace('{prompt}', prompt),
        ),
      ];

      const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);

      let result = '';
      for await (const chunk of response.text) {
        result += chunk;
      }

      return {
        success: true,
        optimizedPrompt: result.trim(),
      };
    }

    // Fallback: Try other available models
    const allModels = await vscode.lm.selectChatModels();
    if (allModels.length > 0) {
      const model = allModels[0];
      const messages = [
        vscode.LanguageModelChatMessage.User(
          OPTIMIZE_PROMPT_TEMPLATE.replace('{prompt}', prompt),
        ),
      ];

      const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);

      let result = '';
      for await (const chunk of response.text) {
        result += chunk;
      }

      return {
        success: true,
        optimizedPrompt: result.trim(),
      };
    }

    return {
      success: false,
      error: '没有可用的语言模型。请确保已安装 GitHub Copilot 或其他语言模型扩展。',
    };
  }
  catch (error: any) {
    console.error('Prompt optimization failed:', error);
    return {
      success: false,
      error: error.message || '优化提示词时发生错误',
    };
  }
}

/**
 * Optimize prompt using a custom MCP server (fallback option)
 */
export async function optimizePromptWithMCP(_prompt: string): Promise<OptimizePromptResult> {
  // This is a placeholder for MCP-based optimization
  // The actual implementation would call an MCP server with AI capabilities
  return {
    success: false,
    error: 'MCP优化功能暂未实现',
  };
}
