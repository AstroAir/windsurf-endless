import path from 'node:path';

import { glob } from 'glob';
import Mocha from 'mocha';

export async function run(): Promise<void> {
  const mocha = new Mocha({
    ui: 'bdd',
    color: true,
    timeout: 10000,
  });

  const testsRoot = path.resolve(__dirname, '.');
  const files = await glob('**/**.test.js', { cwd: testsRoot });

  files.forEach((f) => {
    mocha.addFile(path.resolve(testsRoot, f));
  });

  return new Promise((resolve, reject) => {
    try {
      mocha.run((failures) => {
        if (failures > 0) {
          reject(new Error(`${failures} tests failed.`));
        }
        else {
          resolve();
        }
      });
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}
