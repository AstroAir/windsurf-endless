import path from 'node:path';

import { runTests } from '@vscode/test-electron';

async function main() {
  try {
    // When compiled, __dirname is __tests__/out/extension/
    // Project root is 3 levels up
    const extensionDevelopmentPath = path.resolve(__dirname, '../../../');
    const extensionTestsPath = path.resolve(__dirname, './suite/index');

    console.log('Extension path:', extensionDevelopmentPath);
    console.log('Tests path:', extensionTestsPath);

    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
    });
  }
  catch (err) {
    console.error('Failed to run tests:', err);
    process.exit(1);
  }
}

main();
