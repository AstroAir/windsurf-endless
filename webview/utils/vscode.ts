// Mock VSCode API for standalone browser testing
const mockVsCodeApi = {
  postMessage: (message: unknown) => {
    console.log('[Mock VSCode API] postMessage:', message);
  },
  getState: () => undefined,
  setState: (state: unknown) => {
    console.log('[Mock VSCode API] setState:', state);
    return state;
  },
};

// Exports class singleton to prevent multiple invocations of acquireVsCodeApi.
// Falls back to mock when running outside VSCode (e.g., E2E tests)
export const vscode = typeof acquireVsCodeApi === 'function'
  ? acquireVsCodeApi<any>()
  : mockVsCodeApi;
