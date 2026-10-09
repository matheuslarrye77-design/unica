# WaveFeed - TeamBlog MVP

A social feed for developers built with modern React + TypeScript + TanStack
stack.

## 📖 Description

WaveFeed is a simplified social feed (MVP) for developers, demonstrating work
with modern technologies:

- **TypeScript** - strict typing
- **TanStack Router** - type-safe routing
- **TanStack Query** - server state management
- **Redux Toolkit** - client state management
- **ShadCN UI** - component library built on Tailwind CSS
- **Tailwind CSS** - utility-first styling (used by ShadCN UI)
- **WebSocket** - real-time chat (planned)

## 🛠️ Tech Stack

- **React 19.2** - UI library
- **TypeScript 5.9** - typing
- **Vite 7.2** - build tool and dev server
- **TanStack Router 1.141** - routing
- **TanStack Query 5.90** - API management
- **Redux Toolkit 2.11** - state management
- **React Redux 9.2** - React bindings for Redux
- **ShadCN UI** - component library
- **Tailwind CSS 4.1** - styling (used by ShadCN UI)
- **Vitest 4.0** - testing

## 📁 Project Structure

```
WaveFeed/
├── src/
│   ├── routes/          # TanStack Router routes
│   │   ├── __root.tsx   # Root layout
│   │   ├── index.tsx    # Home page
│   │   ├── login.tsx    # Login page
│   │   ├── register.tsx # Register page
│   │   └── ...
│   ├── component/       # React components
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Post.tsx
│   │   └── ...
│   ├── pages/           # Page components
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   └── ...
│   ├── store/          # Redux store
│   │   ├── index.ts    # Store configuration
│   │   └── slices/     # Redux slices
│   │       └── authSlice.ts
│   ├── lib/            # Utilities and API clients
│   │   ├── api.ts      # API functions
│   │   └── queryClient.ts
│   ├── hooks/          # Custom hooks
│   ├── types/          # TypeScript types
│   ├── main.tsx        # Application entry point
│   └── routeTree.gen.ts # Auto-generated routes
├── public/             # Static files
└── package.json
```

## 🚀 Quick Start

### Install Dependencies

```bash
npm install
```

### Run Dev Server

```bash
npm run dev
```

The application will be available at: `http://localhost:5173`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Linting

```bash
npm run lint
```

### Tests

```bash
npm test
```

## 📝 Git Commit Convention

The project uses commit prefixes in square brackets to maintain consistency in
commit history.

### Commit Format

All commits should follow the format: `[type] message`

### Commit Types

- `[feat]` - new feature
- `[fix]` - bug fix
- `[docs]` - documentation changes
- `[style]` - code style changes (formatting, missing semicolons, etc.)
- `[refactor]` - code refactoring
- `[test]` - adding or updating tests
- `[chore]` - build tasks, configuration updates, etc.
- `[perf]` - performance improvements
- `[ci]` - CI/CD changes

### Examples

```bash
# New feature
[feat] Add route for posts page

# Bug fix
[fix] Fix user data caching issue

# Documentation
[docs] Update README with setup instructions

# Code style
[style] Format code in PostCard component

# Refactoring
[refactor] Extract request logic to separate module

# Tests
[test] Add unit tests for PostCard component

# Configuration
[chore] Update dependencies
```
