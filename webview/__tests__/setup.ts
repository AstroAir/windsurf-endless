import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

// Mock VSCode API
const mockVsCodeApi = {
  postMessage: vi.fn(),
  getState: vi.fn(() => undefined),
  setState: vi.fn(),
};

(globalThis as any).acquireVsCodeApi = vi.fn(() => mockVsCodeApi);

// Export for use in tests
export { mockVsCodeApi };
