import { commands } from 'vscode';

import { MainPanel } from './views/panel';

import type { ExtensionContext } from 'vscode';

export function activate(context: ExtensionContext) {
  // Add command to the extension context
  context.subscriptions.push(
    commands.registerCommand('hello-world.showHelloWorld', async () => {
      MainPanel.render(context);
    }),
  );
}

export function deactivate() {}
