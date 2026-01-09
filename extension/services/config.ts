/**
 * Configuration Service
 * Handles MCP configuration and rules injection
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import * as vscode from 'vscode';

import { getRandomizedToolNames } from '../views/helper';

/**
 * Transport type for MCP connection
 */
export type TransportType = 'http' | 'stdio' | 'auto';

/**
 * MCP Configuration options
 */
export interface MCPConfigOptions {
  serverName: string;
  serverPort: number;
  transportType: TransportType;
  fallbackToStdio: boolean;
  fallbackPorts: number[];
  connectionTimeout: number; // in seconds
  autoReconnect: boolean;
  reconnectAttempts: number;
}

/**
 * Default MCP configuration
 */
export const defaultMCPConfig: MCPConfigOptions = {
  serverName: 'windsurf-endless',
  serverPort: 6000,
  transportType: 'http',
  fallbackToStdio: false,
  fallbackPorts: [6001, 6002, 16000],
  connectionTimeout: 10,
  autoReconnect: true,
  reconnectAttempts: 5,
};

/**
 * Server state information
 */
export interface ServerState {
  isRunning: boolean;
  transport: TransportType;
  port: number;
  uptime: number;
  clientCount: number;
  startedAt?: number;
  error?: string;
}

/**
 * Validate MCP server name
 * @returns Error message if invalid, undefined if valid
 */
export function validateServerName(name: string): string | undefined {
  if (!name || name.trim().length === 0) {
    return '服务器名称不能为空';
  }
  if (name.length > 50) {
    return '服务器名称不能超过50个字符';
  }
  if (!/^[a-z][\w-]*$/i.test(name)) {
    return '服务器名称只能包含字母、数字、下划线和连字符，且必须以字母开头';
  }
  return undefined;
}

/**
 * Validate MCP server port
 * @returns Error message if invalid, undefined if valid
 */
export function validateServerPort(port: number): string | undefined {
  if (!Number.isInteger(port)) {
    return '端口必须是整数';
  }
  if (port < 1 || port > 65535) {
    return '端口必须在 1-65535 范围内';
  }
  if (port < 1024) {
    return '建议使用 1024 以上的端口号，避免权限问题';
  }
  return undefined;
}

/**
 * Configure MCP server in Windsurf/Cursor config files
 */
export function configureMCP(context: vscode.ExtensionContext, options?: Partial<MCPConfigOptions>): void {
  const config: MCPConfigOptions = {
    ...defaultMCPConfig,
    ...options,
  };

  try {
    const mcpServerPath = context.asAbsolutePath(path.join('dist', 'mcp-server.js'));
    const homeDir = os.homedir();

    // Potential locations for mcp_config.json
    const configPaths = [
      path.join(homeDir, '.codeium', 'windsurf', 'mcp_config.json'),
      path.join(homeDir, '.codeium', 'windsurf-next', 'mcp_config.json'),
      path.join(homeDir, '.codeium', 'mcp_config.json'),
      path.join(homeDir, '.cursor', 'mcp.json'),
    ];

    let configFound = false;

    for (const configPath of configPaths) {
      if (fs.existsSync(configPath)) {
        updateMCPConfig(configPath, mcpServerPath, config);
        configFound = true;
        console.log(`Updated MCP config at: ${configPath}`);
      }
    }

    if (!configFound) {
      // Try to create config in the most common location
      const defaultConfigPath = path.join(homeDir, '.codeium', 'windsurf', 'mcp_config.json');
      const defaultConfigDir = path.dirname(defaultConfigPath);

      if (!fs.existsSync(defaultConfigDir)) {
        fs.mkdirSync(defaultConfigDir, { recursive: true });
      }

      const mcpConfig = {
        mcpServers: {
          [config.serverName]: {
            url: `http://127.0.0.1:${config.serverPort}/sse`,
          },
        },
      };

      fs.writeFileSync(defaultConfigPath, JSON.stringify(mcpConfig, null, 2), 'utf8');
      console.log(`Created MCP config at: ${defaultConfigPath}`);
    }
  }
  catch (error) {
    console.error('Failed to configure MCP:', error);
  }
}

/**
 * Update existing MCP config file
 */
function updateMCPConfig(configPath: string, _serverScriptPath: string, options: MCPConfigOptions): void {
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(content);

    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    // Remove old stdio config if exists
    if (config.mcpServers.infinite_ask) {
      delete config.mcpServers.infinite_ask;
    }

    // Remove old windsurf-endless config if name changed
    if (options.serverName !== 'windsurf-endless' && config.mcpServers['windsurf-endless']) {
      delete config.mcpServers['windsurf-endless'];
    }

    // Add HTTP/SSE configuration (connects to extension's HTTP server)
    config.mcpServers[options.serverName] = {
      url: `http://127.0.0.1:${options.serverPort}/sse`,
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  }
  catch (e) {
    console.error(`Error updating ${configPath}:`, e);
  }
}

/**
 * Inject rules file into workspace
 * Replaces tool name placeholders with actual randomized tool names
 */
export function injectRules(context: vscode.ExtensionContext): void {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    return;
  }

  const rulesSource = context.asAbsolutePath(path.join('assets', 'rules', 'windsurf-rules.md'));

  try {
    if (!fs.existsSync(rulesSource)) {
      console.error('Rules source file not found:', rulesSource);
      return;
    }

    let rulesContent = fs.readFileSync(rulesSource, 'utf8');

    // Get current randomized tool names and replace placeholders
    const toolNames = getRandomizedToolNames();
    rulesContent = rulesContent
      .replace(/\{\{CHECKPOINT_TOOL\}\}/g, toolNames.checkpoint)
      .replace(/\{\{PROMPT_REFINER_TOOL\}\}/g, toolNames.promptRefiner)
      .replace(/\{\{INPUT_BRIDGE_TOOL\}\}/g, toolNames.inputBridge);

    for (const folder of workspaceFolders) {
      const ruleFile = path.join(folder.uri.fsPath, '.windsurfrules');

      // Only create if not exists to avoid overwriting user customizations
      if (!fs.existsSync(ruleFile)) {
        fs.writeFileSync(ruleFile, rulesContent, 'utf8');
        vscode.window.showInformationMessage(`Injected .windsurfrules into ${folder.name}`);
      }
      else {
        // Check if file needs updating (contains old placeholders or old tool names)
        const currentContent = fs.readFileSync(ruleFile, 'utf8');
        if (currentContent.trim() === '' || currentContent.includes('{{CHECKPOINT_TOOL}}') || currentContent.includes('windsurf_endless_feedback')) {
          fs.writeFileSync(ruleFile, rulesContent, 'utf8');
          console.log(`Updated .windsurfrules in ${folder.name} with new tool names`);
        }
      }
    }
  }
  catch (e) {
    console.error('Failed to inject rules:', e);
  }
}

/**
 * Remove MCP configuration (for cleanup)
 */
export function removeMCPConfig(): void {
  const homeDir = os.homedir();
  const configPaths = [
    path.join(homeDir, '.codeium', 'windsurf', 'mcp_config.json'),
    path.join(homeDir, '.codeium', 'windsurf-next', 'mcp_config.json'),
    path.join(homeDir, '.codeium', 'mcp_config.json'),
    path.join(homeDir, '.cursor', 'mcp.json'),
  ];

  for (const configPath of configPaths) {
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(content);

        let modified = false;

        // Remove old stdio config
        if (config.mcpServers?.infinite_ask) {
          delete config.mcpServers.infinite_ask;
          modified = true;
        }

        // Remove HTTP/SSE config
        if (config.mcpServers?.['windsurf-endless']) {
          delete config.mcpServers['windsurf-endless'];
          modified = true;
        }

        if (modified) {
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
          console.log(`Removed windsurf-endless config from: ${configPath}`);
        }
      }
      catch (e) {
        console.error(`Error cleaning ${configPath}:`, e);
      }
    }
  }
}
