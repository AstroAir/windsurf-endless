/**
 * Configuration Service
 * Handles MCP configuration and rules injection
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import * as vscode from 'vscode';

/**
 * Configure MCP server in Windsurf/Cursor config files
 */
export function configureMCP(context: vscode.ExtensionContext): void {
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
        updateMCPConfig(configPath, mcpServerPath);
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

      const config = {
        mcpServers: {
          'infinite-dialog': {
            url: 'http://127.0.0.1:3456/sse',
          },
        },
      };

      fs.writeFileSync(defaultConfigPath, JSON.stringify(config, null, 2), 'utf8');
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
function updateMCPConfig(configPath: string, _serverScriptPath: string): void {
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

    // Add HTTP/SSE configuration (connects to extension's HTTP server)
    config.mcpServers['infinite-dialog'] = {
      url: 'http://127.0.0.1:3456/sse',
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  }
  catch (e) {
    console.error(`Error updating ${configPath}:`, e);
  }
}

/**
 * Inject rules file into workspace
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

    const rulesContent = fs.readFileSync(rulesSource, 'utf8');

    for (const folder of workspaceFolders) {
      const ruleFile = path.join(folder.uri.fsPath, '.windsurfrules');

      // Only create if not exists to avoid overwriting user customizations
      if (!fs.existsSync(ruleFile)) {
        fs.writeFileSync(ruleFile, rulesContent, 'utf8');
        vscode.window.showInformationMessage(`Injected .windsurfrules into ${folder.name}`);
      }
      else {
        // Only update if empty
        const currentContent = fs.readFileSync(ruleFile, 'utf8');
        if (currentContent.trim() === '') {
          fs.writeFileSync(ruleFile, rulesContent, 'utf8');
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
        if (config.mcpServers?.['infinite-dialog']) {
          delete config.mcpServers['infinite-dialog'];
          modified = true;
        }

        if (modified) {
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
          console.log(`Removed infinite-dialog config from: ${configPath}`);
        }
      }
      catch (e) {
        console.error(`Error cleaning ${configPath}:`, e);
      }
    }
  }
}
