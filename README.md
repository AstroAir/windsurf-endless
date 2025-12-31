# VSCode Extension Quick Starter

[![CI](https://github.com/AstroAir/vscode-extension-quick-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/AstroAir/vscode-extension-quick-starter/actions/workflows/ci.yml)

A modern VSCode extension starter template with **React + shadcn/ui + Tailwind CSS**.

## Features

- **Vite** - Lightning fast HMR for development
- **React 19** - Latest React with hooks
- **shadcn/ui** - Beautiful, accessible components
- **Tailwind CSS v4** - Utility-first CSS framework
- **TypeScript** - Full type safety
- **ESLint** - Code quality and consistency
- **Hot Module Replacement** - Instant feedback during development
- **Vitest** - Fast unit testing with React Testing Library
- **Extension Tests** - VSCode extension integration tests
- **GitHub Actions** - CI/CD workflows for testing and releases

## Project Structure

```text
├── extension/              # VSCode extension code
│   ├── index.ts            # Extension entry point
│   └── views/              # Webview panel logic
├── webview/                # React frontend
│   ├── App.tsx             # Main React component
│   ├── components/ui/      # shadcn/ui components
│   ├── lib/utils.ts        # Utility functions
│   ├── __tests__/          # React component tests
│   └── index.css           # Tailwind CSS styles
├── __tests__/              # Extension integration tests
│   └── extension/          # VSCode extension tests
├── .github/                # GitHub workflows & templates
│   ├── workflows/          # CI/CD workflows
│   └── ISSUE_TEMPLATE/     # Issue templates
├── .vscode/                # VSCode settings & launch config
├── index.html              # HTML entry point
├── vite.config.ts          # Vite configuration
├── vitest.config.ts        # Vitest test configuration
└── package.json            # Project configuration
```

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm (recommended) or npm

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Development

1. Press `F5` to open a new VSCode window with the extension loaded
2. Run the command `Hello World: Show` from the Command Palette (`Ctrl+Shift+P`)
3. The webview will open with hot reload enabled

### Build

```bash
# Build for production
pnpm build
```

## Adding shadcn/ui Components

```bash
# Add a new component
pnpm dlx shadcn@latest add [component-name]

# Example: Add dialog component
pnpm dlx shadcn@latest add dialog
```

## Available Components

Pre-installed shadcn/ui components:

- Button
- Card
- Input
- Label
- Badge
- Separator
- Textarea

## Testing

This template includes comprehensive testing support:

### Unit Tests (Vitest + Testing Library)

```bash
# Run all unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage
```

### Extension Integration Tests

```bash
# Run VSCode extension tests
pnpm test:extension
```

### E2E Tests (Playwright)

```bash
# Run E2E tests
pnpm test:e2e

# Run E2E tests with UI mode
pnpm test:e2e:ui

# View test report
pnpm test:e2e:report
```

## Scripts

| Command                | Description                       |
| ---------------------- | --------------------------------- |
| `pnpm dev`             | Start development server with HMR |
| `pnpm build`           | Build for production              |
| `pnpm lint`            | Run ESLint                        |
| `pnpm test`            | Run unit tests                    |
| `pnpm test:watch`      | Run tests in watch mode           |
| `pnpm test:coverage`   | Run tests with coverage           |
| `pnpm test:extension`  | Run extension integration tests   |
| `pnpm test:e2e`        | Run E2E tests with Playwright     |
| `pnpm test:e2e:ui`     | Run E2E tests with UI mode        |
| `pnpm test:e2e:report` | View test report                  |
| `pnpm package`         | Package extension as .vsix        |
| `pnpm publish`         | Publish extension to marketplace  |

## VSCode Theme Integration

The template uses VSCode theme variables for seamless integration:

- Background colors match editor theme
- Text colors adapt to light/dark mode
- Focus states use VSCode accent colors

## License

MIT
