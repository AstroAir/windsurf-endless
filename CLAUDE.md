# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VSCode extension starter template using React + shadcn/ui + Tailwind CSS for webview panels. Built with Vite and `@tomjs/vite-plugin-vscode` for unified extension and webview builds.

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server with HMR
pnpm build            # Production build
pnpm lint             # Run ESLint with auto-fix
pnpm test             # Run unit tests (Vitest)
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Run tests with coverage
pnpm test:extension   # Run VSCode extension integration tests
pnpm test:e2e         # Run E2E tests (Playwright)
pnpm package          # Package as .vsix
```

**Development**: Press F5 in VSCode to launch Extension Development Host, then run "Hello World: Show" from Command Palette.

## Architecture

### Two-Part Structure

1. **Extension Host** (`extension/`) - Node.js code running in VSCode
   - `index.ts` - Entry point, registers commands
   - `views/panel.ts` - `MainPanel` class manages webview lifecycle (singleton pattern)
   - `views/helper.ts` - `WebviewHelper` sets up HTML and message handlers

2. **Webview** (`webview/`) - React app rendered in webview panel
   - `App.tsx` - Main React component
   - `components/ui/` - shadcn/ui components
   - `utils/vscode.ts` - VSCode API wrapper with mock fallback for testing

### Extension-Webview Communication

```typescript
// Extension → Webview
panel.webview.postMessage({ type: 'hello', data: 'message' });

// Webview → Extension
vscode.postMessage({ type: 'hello', data: 'message' });

// Extension receives via onDidReceiveMessage in helper.ts
```

### Vite Plugin Integration

`@tomjs/vite-plugin-vscode` provides:

- `__getWebviewHtml__()` function injected at build time for webview HTML generation
- `process.env.VITE_DEV_SERVER_URL` for HMR during development
- Unified build output to `dist/`

## Path Alias

`@/` maps to `./webview/` (configured in tsconfig.json and vite.config.ts)

## Adding shadcn/ui Components

```bash
pnpm dlx shadcn@latest add [component-name]
```

Config in `components.json`: style is "new-york", components go to `webview/components/ui/`

## Testing

- **Unit tests** (`webview/__tests__/`): Vitest + React Testing Library, run with `pnpm test`
- **Extension tests** (`__tests__/extension/`): Mocha in VSCode test runner, run with `pnpm test:extension`
- **E2E tests** (`e2e/`): Playwright, run with `pnpm test:e2e`

Mock VSCode API is provided in `webview/__tests__/setup.ts` and `webview/utils/vscode.ts` for testing outside VSCode context.
