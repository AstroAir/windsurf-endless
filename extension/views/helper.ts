import * as fs from 'node:fs';

import getWebviewHtml from 'virtual:vscode';
import { commands, window, workspace } from 'vscode';

import type { Disposable, ExtensionContext, Webview } from 'vscode';

async function handleExportData(webview: Webview): Promise<void> {
  const uri = await window.showSaveDialog({
    defaultUri: workspace.workspaceFolders?.[0]?.uri,
    filters: { 'JSON Files': ['json'] },
    saveLabel: '导出数据',
  });

  if (uri) {
    webview.postMessage({ type: 'request_export_data' });
    const listener = webview.onDidReceiveMessage((msg) => {
      if (msg.type === 'export_data_response') {
        const data = JSON.stringify(msg.data, null, 2);
        fs.writeFileSync(uri.fsPath, data, 'utf8');
        window.showInformationMessage(`数据已导出到: ${uri.fsPath}`);
        listener.dispose();
      }
    });
  }
}

async function handleImportData(webview: Webview): Promise<void> {
  const uris = await window.showOpenDialog({
    canSelectMany: false,
    filters: { 'JSON Files': ['json'] },
    openLabel: '导入数据',
  });

  if (uris && uris[0]) {
    try {
      const content = fs.readFileSync(uris[0].fsPath, 'utf8');
      const data = JSON.parse(content);
      webview.postMessage({ type: 'import_data_response', data });
      window.showInformationMessage('数据导入成功！');
    }
    catch (error) {
      window.showErrorMessage(`导入失败: ${error}`);
    }
  }
}

export class WebviewHelper {
  public static setupHtml(webview: Webview, context: ExtensionContext) {
    return getWebviewHtml({
      serverUrl: process.env.VITE_DEV_SERVER_URL,
      webview,
      context,
    });
  }

  public static setupWebviewHooks(webview: Webview, disposables: Disposable[]) {
    webview.onDidReceiveMessage(
      (message: any) => {
        const type = message.type;
        const data = message.data;
        console.log(`Webview message received: ${type}`);

        switch (type) {
          case 'hello':
            window.showInformationMessage(data);
            break;
          case 'configure':
            commands.executeCommand('windsurf-endless.configure');
            break;
          case 'test_infinite_ask':
            commands.executeCommand('windsurf-endless.showInfiniteAsk');
            break;
          case 'infinite_ask_response':
            console.log('Infinite Ask response:', data);
            break;
          case 'export_data':
            handleExportData(webview);
            break;
          case 'import_data':
            handleImportData(webview);
            break;
          case 'save_settings':
            console.log('Settings saved:', data);
            break;
        }
      },
      undefined,
      disposables,
    );
  }
}
