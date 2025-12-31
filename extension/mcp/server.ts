/**
 * Infinite Ask MCP Server
 * TypeScript implementation for VSCode extension integration
 * Supports both stdio and HTTP/SSE transport
 */

import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as os from 'node:os';
import * as path from 'node:path';
import * as readline from 'node:readline';

import type { ChildProcess } from 'node:child_process';
import type { IncomingMessage, ServerResponse } from 'node:http';

// ==================== Constants ====================
export const VERSION = '1.0.0';
export const REQUEST_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

// ==================== Types ====================
export interface PopupResult {
  shouldContinue: boolean;
  userInstruction?: string;
}

export interface PopupRequest {
  summary?: string;
  reason?: string;
}

export interface PromptOptimizeRequest {
  prompt: string;
}

export interface PromptOptimizeConfig {
  isWindsurf: boolean;
}

// Global config for environment detection
let environmentConfig: PromptOptimizeConfig = {
  isWindsurf: false,
};

/**
 * Set environment configuration
 */
export function setEnvironmentConfig(config: PromptOptimizeConfig): void {
  environmentConfig = { ...environmentConfig, ...config };
  log('INFO', `Environment config updated: isWindsurf=${config.isWindsurf}`);
}

/**
 * Get current environment config
 */
export function getEnvironmentConfig(): PromptOptimizeConfig {
  return environmentConfig;
}

export interface PromptOptimizeResult {
  success: boolean;
  optimizedPrompt?: string;
  error?: string;
}

export interface FillInputRequest {
  content: string;
}

export interface FillInputResult {
  success: boolean;
  error?: string;
}

// Custom popup handler type (for VSCode integration)
export type PopupHandler = (request: PopupRequest) => Promise<PopupResult>;

// Custom prompt optimizer handler (for VSCode integration)
export type PromptOptimizerHandler = (request: PromptOptimizeRequest) => Promise<PromptOptimizeResult>;

// Custom fill input handler (for VSCode integration)
export type FillInputHandler = (request: FillInputRequest) => Promise<FillInputResult>;

// Global popup handler - can be set by extension to use VSCode UI
let customPopupHandler: PopupHandler | null = null;

// Global prompt optimizer handler - can be set by extension
let customPromptOptimizerHandler: PromptOptimizerHandler | null = null;

// Global fill input handler - can be set by extension
let customFillInputHandler: FillInputHandler | null = null;

/**
 * Set a custom popup handler (used by extension to integrate VSCode UI)
 */
export function setPopupHandler(handler: PopupHandler | null): void {
  customPopupHandler = handler;
  log('INFO', `Custom popup handler ${handler ? 'set' : 'cleared'}`);
}

/**
 * Get current popup handler
 */
export function getPopupHandler(): PopupHandler | null {
  return customPopupHandler;
}

/**
 * Set a custom prompt optimizer handler
 */
export function setPromptOptimizerHandler(handler: PromptOptimizerHandler | null): void {
  customPromptOptimizerHandler = handler;
  log('INFO', `Custom prompt optimizer handler ${handler ? 'set' : 'cleared'}`);
}

/**
 * Get current prompt optimizer handler
 */
export function getPromptOptimizerHandler(): PromptOptimizerHandler | null {
  return customPromptOptimizerHandler;
}

/**
 * Set a custom fill input handler
 */
export function setFillInputHandler(handler: FillInputHandler | null): void {
  customFillInputHandler = handler;
  log('INFO', `Custom fill input handler ${handler ? 'set' : 'cleared'}`);
}

/**
 * Get current fill input handler
 */
export function getFillInputHandler(): FillInputHandler | null {
  return customFillInputHandler;
}

interface MCPRequest {
  jsonrpc: string;
  id?: number;
  method: string;
  params?: any;
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

// ==================== Logging ====================
const DEBUG_MODE = process.env.DEBUG_MCP === '1';

function log(level: string, message: string, data?: any): void {
  if (!DEBUG_MODE) {
    return;
  }
  const timestamp = new Date().toISOString();
  let logMsg = `[${timestamp}] [infinite_ask] [${level}] ${message}`;
  if (data) {
    logMsg += ` | ${JSON.stringify(data)}`;
  }
  process.stderr.write(`${logMsg}\n`);
}

// ==================== Local Popups ====================
export async function showLocalPopup(reason: string): Promise<PopupResult> {
  // Use custom handler if available (VSCode UI)
  if (customPopupHandler) {
    log('INFO', 'Using custom popup handler (VSCode UI)');
    return customPopupHandler({ summary: reason, reason });
  }

  // Fallback to system popups (should not be used when extension is active)
  log('INFO', 'Using fallback system popup');
  if (process.platform === 'win32') {
    return showWindowsPopup(reason);
  }
  else if (process.platform === 'darwin') {
    return showMacPopup(reason);
  }
  else {
    return showLinuxPopup(reason);
  }
}

// Windows (PowerShell + WinForms)
function showWindowsPopup(reason: string): Promise<PopupResult> {
  return new Promise((resolve) => {
    const escapedReason = reason.replace(/'/g, "''").replace(/`/g, '``');
    const tempFile = path.join(os.tmpdir(), `ia_result_${Date.now()}.txt`);
    const psScript = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Application]::EnableVisualStyles()
$form = New-Object System.Windows.Forms.Form
$form.Text = 'Infinite Ask'
$form.Size = New-Object System.Drawing.Size(450, 320)
$form.StartPosition = 'CenterScreen'
$form.TopMost = $true
$lblReason = New-Object System.Windows.Forms.Label
$lblReason.Location = New-Object System.Drawing.Point(15, 10)
$lblReason.Size = New-Object System.Drawing.Size(400, 20)
$lblReason.Text = 'AI想要结束对话的原因：'
$form.Controls.Add($lblReason)
$txtReason = New-Object System.Windows.Forms.TextBox
$txtReason.Location = New-Object System.Drawing.Point(15, 35)
$txtReason.Size = New-Object System.Drawing.Size(400, 50)
$txtReason.Multiline = $true
$txtReason.ReadOnly = $true
$txtReason.Text = '${escapedReason}'
$form.Controls.Add($txtReason)
$lblInst = New-Object System.Windows.Forms.Label
$lblInst.Location = New-Object System.Drawing.Point(15, 95)
$lblInst.Size = New-Object System.Drawing.Size(400, 20)
$lblInst.Text = '输入新指令（可选）：'
$form.Controls.Add($lblInst)
$txtInst = New-Object System.Windows.Forms.TextBox
$txtInst.Location = New-Object System.Drawing.Point(15, 120)
$txtInst.Size = New-Object System.Drawing.Size(400, 80)
$txtInst.Multiline = $true
$form.Controls.Add($txtInst)
$btnContinue = New-Object System.Windows.Forms.Button
$btnContinue.Location = New-Object System.Drawing.Point(100, 220)
$btnContinue.Size = New-Object System.Drawing.Size(100, 35)
$btnContinue.Text = '继续执行'
$btnContinue.DialogResult = [System.Windows.Forms.DialogResult]::OK
$form.Controls.Add($btnContinue)
$btnEnd = New-Object System.Windows.Forms.Button
$btnEnd.Location = New-Object System.Drawing.Point(230, 220)
$btnEnd.Size = New-Object System.Drawing.Size(100, 35)
$btnEnd.Text = '结束对话'
$btnEnd.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
$form.Controls.Add($btnEnd)
$form.AcceptButton = $btnContinue
$form.CancelButton = $btnEnd
$result = $form.ShowDialog()
if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
    "CONTINUE:::$($txtInst.Text)" | Out-File -FilePath '${tempFile.replace(/\\/g, '\\\\')}' -Encoding UTF8
} else {
    "END:::" | Out-File -FilePath '${tempFile.replace(/\\/g, '\\\\')}' -Encoding UTF8
}
`;
    const ps = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript], {
      stdio: 'ignore',
      detached: false,
      windowsHide: false,
    });

    handlePopupProcess(ps, tempFile, resolve);
  });
}

// MacOS (AppleScript)
function showMacPopup(reason: string): Promise<PopupResult> {
  return new Promise((resolve) => {
    const escapedReason = reason.replace(/"/g, '\\"').replace(/'/g, "'\\''");
    const appleScript = `
set dialogResult to display dialog "AI想要结束的原因:\\n${escapedReason}\\n\\n请输入新指令(可选):" default answer "" buttons {"结束对话", "继续执行"} default button "继续执行" with title "Infinite Ask" with icon note

if button returned of dialogResult is "继续执行" then
    return "CONTINUE:::" & text returned of dialogResult
else
    return "END:::"
end if
`;
    const p = spawn('osascript', ['-e', appleScript]);
    let output = '';
    p.stdout.on('data', (data) => {
      output += data.toString();
    });

    p.on('close', () => {
      output = output.trim();
      if (output.startsWith('CONTINUE:::')) {
        resolve({
          shouldContinue: true,
          userInstruction: output.substring(11) || undefined,
        });
      }
      else {
        resolve({ shouldContinue: false });
      }
    });

    p.on('error', () => resolve({ shouldContinue: false }));
  });
}

// Linux (Zenity)
function showLinuxPopup(reason: string): Promise<PopupResult> {
  return new Promise((resolve) => {
    const escapedReason = reason.replace(/"/g, '\\"');
    const tempFile = path.join(os.tmpdir(), `ia_result_${Date.now()}.txt`);
    const script = `
result=$(zenity --forms --title="Infinite Ask" \\
    --text="AI想要结束对话的原因：\\n${escapedReason}" \\
    --add-entry="输入新指令（可选）：" \\
    --ok-label="继续执行" \\
    --cancel-label="结束对话" 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "CONTINUE:::$result" > "${tempFile}"
else
    echo "END:::" > "${tempFile}"
fi
`;
    const sh = spawn('bash', ['-c', script], { stdio: 'ignore', detached: false });
    handlePopupProcess(sh, tempFile, resolve);
  });
}

function handlePopupProcess(
  proc: ChildProcess,
  tempFile: string,
  resolve: (result: PopupResult) => void,
): void {
  proc.on('close', () => {
    try {
      if (fs.existsSync(tempFile)) {
        const result = fs.readFileSync(tempFile, 'utf-8').trim();
        fs.unlinkSync(tempFile);
        if (result.startsWith('CONTINUE:::')) {
          const instruction = result.substring(11).trim();
          resolve({
            shouldContinue: true,
            userInstruction: instruction || undefined,
          });
        }
        else {
          resolve({ shouldContinue: false });
        }
      }
      else {
        resolve({ shouldContinue: false });
      }
    }
    catch {
      resolve({ shouldContinue: false });
    }
  });
  proc.on('error', () => resolve({ shouldContinue: false }));
}

// ==================== MCP Protocol ====================
const TOOLS: MCPTool[] = [
  {
    name: 'infinite_dialog_feedback',
    description: '当AI想要结束对话或任务时，必须调用此工具询问用户是否继续。',
    inputSchema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'AI刚刚完成了什么（必填）' },
        reason: { type: 'string', description: '结束原因' },
        workspace: { type: 'string', description: '工作区路径' },
      },
      required: ['summary'],
    },
  },
  {
    name: 'optimize_prompt',
    description: '优化用户的提示词，使其更加清晰、具体、有效。第一步调用此工具获取优化后的提示词，第二步调用 fill_cascade_input 将结果填入输入框。',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: '需要优化的原始提示词（必填）' },
        optimized_prompt: { type: 'string', description: 'AI优化后的提示词（可选，如果提供则直接使用此优化结果）' },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'fill_cascade_input',
    description: '将内容填入 Infinite Ask 对话框的自定义指令输入框中。通常与 optimize_prompt 配合使用，将优化后的提示词自动填入输入框。',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: '要填入输入框的内容（必填）' },
      },
      required: ['content'],
    },
  },
];

function sendResponse(id: number, result: any): void {
  const response = { jsonrpc: '2.0', id, result };
  console.log(JSON.stringify(response));
}

function sendError(id: number, code: number, message: string): void {
  const response = { jsonrpc: '2.0', id, error: { code, message } };
  console.log(JSON.stringify(response));
}

async function handleToolCall(name: string, args: any): Promise<any> {
  if (name === 'infinite_dialog_feedback' || name.includes('infinite')) {
    const summary = args.summary || args.reason || '任务已完成';
    const result = await showLocalPopup(summary);
    let responseText = `结果: should_continue=${result.shouldContinue}`;
    if (result.shouldContinue && result.userInstruction) {
      responseText += `\n用户指令: ${result.userInstruction}`;
    }
    return { content: [{ type: 'text', text: responseText }] };
  }

  if (name === 'optimize_prompt') {
    const prompt = args.prompt;
    const optimizedPrompt = args.optimized_prompt;

    if (!prompt) {
      return { content: [{ type: 'text', text: '错误: 请提供需要优化的提示词 (prompt 参数)' }] };
    }

    // If AI already provided optimized prompt, use it directly
    if (optimizedPrompt) {
      log('INFO', 'Using AI-provided optimized prompt');
      return {
        content: [{
          type: 'text',
          text: `优化成功！\n\n优化后的提示词：\n${optimizedPrompt}\n\n提示：请调用 fill_cascade_input 工具将此提示词填入输入框。`,
        }],
      };
    }

    // In Windsurf environment, don't use VSCode LM API - let AI optimize directly
    if (environmentConfig.isWindsurf) {
      log('INFO', 'Windsurf environment detected, returning optimization request to AI');
      return {
        content: [{
          type: 'text',
          text: `请你直接优化以下提示词，优化后调用此工具时在 optimized_prompt 参数中提供优化结果，然后调用 fill_cascade_input 填入输入框。\n\n需要优化的原始提示词：\n${prompt}\n\n优化要求：\n1. 保持原始意图不变\n2. 使表达更加清晰具体\n3. 添加必要的上下文和约束\n4. 使用更专业的措辞\n5. 保持简洁`,
        }],
      };
    }

    // Non-Windsurf environment: use VSCode LM API
    if (customPromptOptimizerHandler) {
      log('INFO', 'Using custom prompt optimizer handler (VSCode LM API)');
      const result = await customPromptOptimizerHandler({ prompt });
      if (result.success && result.optimizedPrompt) {
        return {
          content: [{
            type: 'text',
            text: `优化成功！\n\n优化后的提示词：\n${result.optimizedPrompt}\n\n提示：你可以调用 fill_cascade_input 工具将此提示词填入输入框。`,
          }],
        };
      }
      else {
        return {
          content: [{ type: 'text', text: `优化失败: ${result.error || '未知错误'}` }],
        };
      }
    }
    else {
      return {
        content: [{ type: 'text', text: '错误: 提示词优化服务未配置。请确保扩展已正确加载。' }],
      };
    }
  }

  if (name === 'fill_cascade_input') {
    const content = args.content;
    if (!content) {
      return { content: [{ type: 'text', text: '错误: 请提供要填入的内容 (content 参数)' }] };
    }

    if (customFillInputHandler) {
      log('INFO', 'Using custom fill input handler');
      const result = await customFillInputHandler({ content });
      if (result.success) {
        return {
          content: [{ type: 'text', text: '成功！内容已填入对话框的自定义指令输入框。' }],
        };
      }
      else {
        return {
          content: [{ type: 'text', text: `填入失败: ${result.error || '未知错误'}` }],
        };
      }
    }
    else {
      return {
        content: [{ type: 'text', text: '错误: 填入输入框服务未配置。请确保扩展已正确加载。' }],
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
}

async function handleRequest(request: MCPRequest): Promise<void> {
  const { method, id, params } = request;
  try {
    switch (method) {
      case 'initialize':
        sendResponse(id!, {
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'infinite_ask', version: VERSION },
          capabilities: { tools: {} },
        });
        break;
      case 'tools/list':
        sendResponse(id!, { tools: TOOLS });
        break;
      case 'tools/call': {
        const result = await handleToolCall(params.name, params.arguments || {});
        sendResponse(id!, result);
        break;
      }
      case 'initialized':
      case 'notifications/cancelled':
        break;
      default:
        if (id !== undefined) {
          sendError(id, -32601, `Unknown method: ${method}`);
        }
    }
  }
  catch (error: any) {
    if (id !== undefined) {
      sendError(id, -32603, error.message);
    }
  }
}

// ==================== HTTP Transport ====================
const HTTP_PORT = Number.parseInt(process.env.MCP_HTTP_PORT || '3456', 10);

interface SSEClient {
  id: string;
  res: ServerResponse;
}

let sseClients: SSEClient[] = [];
let httpServer: http.Server | null = null;

function sendSSEEvent(client: SSEClient, event: string, data: any): void {
  try {
    client.res.write(`event: ${event}\n`);
    client.res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
  catch (error: any) {
    log('ERROR', `Failed to send SSE event: ${error.message}`);
  }
}

function broadcastSSE(event: string, data: any): void {
  for (const client of sseClients) {
    sendSSEEvent(client, event, data);
  }
}

async function handleHTTPRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url || '/';

  // SSE endpoint for Streamable HTTP
  if (req.method === 'GET' && (url === '/' || url === '/sse' || url === '/events')) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const client: SSEClient = { id: clientId, res };
    sseClients.push(client);

    log('INFO', `SSE client connected: ${clientId}`);

    // Send initial connection event
    sendSSEEvent(client, 'endpoint', `/message?sessionId=${clientId}`);

    req.on('close', () => {
      sseClients = sseClients.filter(c => c.id !== clientId);
      log('INFO', `SSE client disconnected: ${clientId}`);
    });

    return;
  }

  // JSON-RPC endpoint
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const request = JSON.parse(body) as MCPRequest;
        const response = await handleRequestWithResponse(request);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));

        // Also broadcast to SSE clients
        if (response) {
          broadcastSSE('message', response);
        }
      }
      catch (error: any) {
        log('ERROR', `HTTP request error: ${error.message}`);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' } }));
      }
    });
    return;
  }

  // 404 for other requests
  res.writeHead(404);
  res.end('Not Found');
}

async function handleRequestWithResponse(request: MCPRequest): Promise<any> {
  const { method, id, params } = request;
  try {
    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: { name: 'infinite_ask', version: VERSION },
            capabilities: { tools: {} },
          },
        };
      case 'tools/list':
        return { jsonrpc: '2.0', id, result: { tools: TOOLS } };
      case 'tools/call': {
        const result = await handleToolCall(params.name, params.arguments || {});
        return { jsonrpc: '2.0', id, result };
      }
      case 'initialized':
      case 'notifications/cancelled':
        return null;
      default:
        if (id !== undefined) {
          return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown method: ${method}` } };
        }
        return null;
    }
  }
  catch (error: any) {
    if (id !== undefined) {
      return { jsonrpc: '2.0', id, error: { code: -32603, message: error.message } };
    }
    return null;
  }
}

export function startHTTPServer(port: number = HTTP_PORT): Promise<void> {
  return new Promise((resolve, reject) => {
    if (httpServer) {
      log('INFO', 'HTTP server already running');
      resolve();
      return;
    }

    httpServer = http.createServer(handleHTTPRequest);

    httpServer.on('error', (error: any) => {
      log('ERROR', `HTTP server error: ${error.message}`);
      reject(error);
    });

    httpServer.listen(port, '127.0.0.1', () => {
      log('INFO', `MCP HTTP server listening on http://127.0.0.1:${port}`);
      console.error(`[infinite_ask] HTTP server started on port ${port}`);
      resolve();
    });
  });
}

export function stopHTTPServer(): void {
  if (httpServer) {
    httpServer.close();
    httpServer = null;
    sseClients = [];
    log('INFO', 'HTTP server stopped');
  }
}

// ==================== Stdio Transport ====================
export function startStdioServer(): void {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  rl.on('line', async (line: string) => {
    if (!line.trim())
      return;
    try {
      const request = JSON.parse(line) as MCPRequest;
      await handleRequest(request);
    }
    catch (error: any) {
      log('ERROR', `Error processing line: ${error.message}`);
    }
  });
}

// ==================== Main Entry ====================
export function startMCPServer(): void {
  const mode = process.env.MCP_TRANSPORT || 'stdio';

  if (mode === 'http') {
    startHTTPServer().catch((error) => {
      console.error(`Failed to start HTTP server: ${error.message}`);
      process.exit(1);
    });
  }
  else {
    startStdioServer();
  }
}

// Run if executed directly
if (require.main === module) {
  startMCPServer();
}
