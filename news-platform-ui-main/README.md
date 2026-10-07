# News Platform - Frontend

A news platform web application built with **Next.js 16**, **React 19**, **TypeScript**, **Tailwind CSS 4**, and **Shadcn UI**. Features JWT-based authentication with hCaptcha, role-based article management (ADMIN/EDITOR/READER), article browsing with filtering and sorting, and admin dashboards for user role management. This is the frontend client for the [News Platform API](https://github.com/PathumSandeepa/news-platform-api) (NestJS backend).

**Live Demo:** https://news-updates-pearl.vercel.app

> **Note:** The live demo connects to a backend hosted on Render's free tier. The backend may take 30-60 seconds to wake up on the first request after inactivity. If login fails or articles don't load, wait a moment and try again.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Role-Based Access](#role-based-access)
- [Key Design Decisions and Assumptions](#key-design-decisions-and-assumptions)
- [API Integration](#api-integration)
- [Authentication Flow](#authentication-flow)
- [CI/CD Pipeline](#cicd-pipeline)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Features

- **JWT Authentication** - Login and register with hCaptcha verification to prevent bots
- **Role-Based UI** - UI buttons and actions rendered conditionally based on user role (ADMIN, EDITOR, READER)
- **Article Grid** - Browse articles with category filter, sort by date/views/likes, and client-side title search
- **Article Detail Page** - View full article content with automatic view count increment on visit
- **Like Articles** - Like button on articles for all authenticated users
- **Create Articles** - Slide-out drawer form for creating new articles (ADMIN/EDITOR)
- **Edit Articles** - Slide-out drawer with pre-filled form and publish/unpublish toggle (ADMIN/EDITOR)
- **Delete Articles** - Delete with confirmation dialog (ADMIN only)
- **User Management** - Admin dashboard table with role change dropdown for managing users (ADMIN only)
- **Navbar User Popover** - Displays username, email, role badge, and sign out button
- **Persistent Auth State** - Authentication state persisted in localStorage (`auth_token`, `auth_user`)
- **Poppins Font** - Custom typography via `next/font/google`

---

## Tech Stack

| Technology                                            | Version | Purpose                             |
| ----------------------------------------------------- | ------- | ----------------------------------- |
| [Next.js](https://nextjs.org/)                        | 16.1.6  | React framework with App Router     |
| [React](https://react.dev/)                           | 19.2.3  | UI library                          |
| [TypeScript](https://www.typescriptlang.org/)         | 5.x     | Static type checking                |
| [Tailwind CSS](https://tailwindcss.com/)              | 4.x     | Utility-first CSS framework         |
| [shadcn/ui](https://ui.shadcn.com/)                   | 4.0.0   | Pre-built component library         |
| [TanStack Query](https://tanstack.com/query)          | 5.90.21 | Server state management and caching |
| [React Hook Form](https://react-hook-form.com/)       | 7.71.2  | Performant form handling            |
| [Zod](https://zod.dev/)                               | 4.3.6   | Schema validation                   |
| [Axios](https://axios-http.com/)                      | 1.13.6  | HTTP client with interceptors       |
| [@hcaptcha/react-hcaptcha](https://www.hcaptcha.com/) | 2.0.2   | Bot protection captcha widget       |
| [Lucide React](https://lucide.dev/)                   | 0.577.0 | Icon library                        |
| [Poppins](https://fonts.google.com/specimen/Poppins)  | —       | Google Font via next/font           |
| [pnpm](https://pnpm.io/)                              | latest  | Package manager                     |

---

## Project Structure

```
news-platform-ui/
├── src/
│   ├── app/                                # Next.js App Router pages
│   │   ├── layout.tsx                      # Root layout (Poppins font, ThemeProvider, QueryProvider)
│   │   ├── page.tsx                        # Root page (redirects to /login)
│   │   ├── globals.css                     # Global styles and Tailwind directives
│   │   ├── (auth)/                         # Auth route group (public)
│   │   │   ├── layout.tsx                  # Auth layout with hero panel
│   │   │   ├── login/
│   │   │   │   └── page.tsx                # Login page
│   │   │   └── register/
│   │   │       └── page.tsx                # Registration page
│   │   └── (protected)/                    # Protected route group (authenticated)
│   │       ├── layout.tsx                  # Protected layout with navbar, footer, auth guard
│   │       ├── news/
│   │       │   ├── page.tsx                # Article listing with filters and sorting
│   │       │   └── [id]/
│   │       │       └── page.tsx            # Article detail page
│   │       └── dashboard/
│   │           └── users/
│   │               └── page.tsx            # User management table (ADMIN only)
│   ├── features/                           # Feature-based domain modules
│   │   ├── auth/
│   │   │   ├── api.ts                      # Auth API calls (login, register)
│   │   │   ├── schemas.ts                  # Zod validation schemas
│   │   │   ├── types.ts                    # Auth types (AuthUser, Role, payloads)
│   │   │   ├── utils.ts                    # Token and user localStorage helpers
│   │   │   ├── components/
│   │   │   │   ├── login-form.tsx          # Login form with hCaptcha
│   │   │   │   ├── register-form.tsx       # Registration form with hCaptcha
│   │   │   │   ├── auth-hero-panel.tsx     # Auth page hero/branding panel
│   │   │   │   └── protected-route.tsx     # Auth guard wrapper component
│   │   │   └── hooks/
│   │   │       ├── use-login.ts            # Login mutation hook
│   │   │       └── use-register.ts         # Register mutation hook
│   │   ├── articles/
│   │   │   ├── api.ts                      # Articles API calls (CRUD, like, views)
│   │   │   ├── constants.ts                # Article-related constants
│   │   │   ├── schemas.ts                  # Article form validation schemas
│   │   │   ├── types.ts                    # Article types (Article, Category, payloads)
│   │   │   ├── components/
│   │   │   │   ├── article-card.tsx        # Article card for grid display
│   │   │   │   ├── article-detail.tsx      # Full article detail view
│   │   │   │   ├── article-form.tsx        # Reusable article create/edit form
│   │   │   │   ├── article-list.tsx        # Article grid with filters and search
│   │   │   │   ├── create-article-drawer.tsx  # Drawer for creating articles
│   │   │   │   └── edit-article-drawer.tsx    # Drawer for editing articles
│   │   │   └── hooks/
│   │   │       ├── use-articles.ts         # Articles list query hook
│   │   │       ├── use-article-detail.ts   # Single article query hook
│   │   │       ├── use-create-article.ts   # Create article mutation hook
│   │   │       ├── use-update-article.ts   # Update article mutation hook
│   │   │       ├── use-delete-article.ts   # Delete article mutation hook
│   │   │       └── use-like-article.ts     # Like article mutation hook
│   │   └── users/
│   │       ├── api.ts                      # Users API calls (list, update role)
│   │       ├── constants.ts                # User-related constants
│   │       ├── types.ts                    # User types
│   │       ├── components/
│   │       │   └── users-role-table.tsx    # User management table with role dropdown
│   │       └── hooks/
│   │           ├── use-users.ts            # Users list query hook
│   │           └── use-update-role.ts      # Update role mutation hook
│   ├── components/
│   │   ├── layout/
│   │   │   ├── navbar.tsx                  # Top navigation bar with user popover
│   │   │   └── footer.tsx                  # Page footer
│   │   ├── providers/
│   │   │   └── query-provider.tsx          # TanStack Query provider wrapper
│   │   └── ui/                             # shadcn/ui components (fully owned)
│   │       ├── alert-dialog.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── drawer.tsx
│   │       ├── field.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── navigation-menu.tsx
│   │       ├── popover.tsx
│   │       ├── select.tsx
│   │       ├── separator.tsx
│   │       ├── spinner.tsx
│   │       ├── switch.tsx
│   │       └── textarea.tsx
│   └── lib/
│       ├── api-client.ts                   # Axios instance with auth interceptors
│       ├── constants.ts                    # App-wide constants (routes, storage keys)
│       ├── query-client.ts                 # TanStack Query client configuration
│       └── utils.ts                        # Utility functions (cn)
├── public/
│   └── auth-banner.png                     # Auth page hero banner image
├── .env.example                            # Example environment variables
├── .github/
│   └── workflows/
│       └── main.yml                        # CI pipeline (lint + build)
├── components.json                         # shadcn/ui configuration
├── eslint.config.mjs                       # ESLint configuration
├── next.config.ts                          # Next.js configuration
├── package.json                            # Dependencies and scripts
├── pnpm-lock.yaml                          # pnpm lockfile
├── pnpm-workspace.yaml                     # pnpm workspace configuration
├── postcss.config.mjs                      # PostCSS configuration (Tailwind plugin)
└── tsconfig.json                           # TypeScript compiler configuration
```

---

## Prerequisites

- **Node.js** >= 18.x
- **pnpm** (recommended package manager) — Install with `npm install -g pnpm`
- **NestJS Backend** running locally or accessible remotely. See [news-platform-api](https://github.com/PathumSandeepa/news-platform-api)

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/PathumSandeepa/news-platform-ui.git
cd news-platform-ui
```

### 2. Start the backend first

The frontend depends on the NestJS backend API. Clone and run it before starting the frontend:

```bash
git clone https://github.com/PathumSandeepa/news-platform-api.git
cd news-platform-api
# Follow the backend README for setup
# The backend runs on http://localhost:8000 by default
```

### 3. Create the environment file

In the **frontend** project root, copy the example environment file and fill in the values:

```bash
cp .env.example .env.local
```

Or create a `.env.local` file manually:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=10000000-ffff-ffff-ffff-000000000001
```

### 4. Install dependencies

```bash
pnpm install
```

### 5. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The root path (`/`) automatically redirects to `/login`.

---

## Environment Variables

| Variable                        | Required | Default                                | Description                                                |
| ------------------------------- | -------- | -------------------------------------- | ---------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`           | Yes      | `http://localhost:8000`                | Base URL of the NestJS backend API                         |
| `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` | Yes      | `10000000-ffff-ffff-ffff-000000000001` | hCaptcha site key (use the test key for local development) |

Create a `.env.local` file in the project root (this file is gitignored):

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=10000000-ffff-ffff-ffff-000000000001
```

For production, set `NEXT_PUBLIC_API_URL` to your deployed backend URL and `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` to a real hCaptcha site key.

---

## Available Scripts

| Command      | Description                                                             |
| ------------ | ----------------------------------------------------------------------- |
| `pnpm dev`   | Start the development server on `http://localhost:3000` with hot reload |
| `pnpm build` | Create an optimized production build in the `.next` directory           |
| `pnpm start` | Start the production server (requires `pnpm build` first)               |
| `pnpm lint`  | Run ESLint to check for code quality issues                             |

---

## Role-Based Access

| Role     | Permissions                                                                            |
| -------- | -------------------------------------------------------------------------------------- |
| `READER` | Browse and read published articles, like articles                                      |
| `EDITOR` | All READER permissions + create and edit articles                                      |
| `ADMIN`  | All EDITOR permissions + delete articles, access `/dashboard/users`, change user roles |

---

## Key Design Decisions and Assumptions

### State Management — localStorage over Zustand

Auth state is stored directly in `localStorage` using two keys (`auth_token` and `auth_user`) instead of a state management library:

- Keeps the stack minimal with no additional dependencies for global state.
- Helper functions in `src/features/auth/utils.ts` provide `getToken()`, `getUser()`, `setAuth()`, and `clearAuth()` for consistent access.
- Works across page refreshes without extra middleware or persistence plugins.

### Server State — TanStack Query

[TanStack Query](https://tanstack.com/query) (React Query) manages all server state:

- Default `staleTime` of 5 minutes and `retry: 1` configured in a shared `QueryClient`.
- Custom hooks per feature (`use-articles.ts`, `use-create-article.ts`, etc.) encapsulate query and mutation logic.
- Automatic cache invalidation after mutations ensures the UI stays in sync with the backend.

### API Layer — Axios with Interceptors

The project uses an Axios instance (`src/lib/api-client.ts`) with request and response interceptors:

- **Request interceptor** automatically attaches the `Authorization: Bearer <token>` header to every request.
- **Response interceptor** catches 401 errors, clears auth state, and redirects to `/login`.
- Provides a centralized HTTP client shared across all feature API modules.

### Component Library — shadcn/ui

UI components are sourced from [shadcn/ui](https://ui.shadcn.com/):

- Components live in `src/components/ui/` and are fully owned (copied into the project, not imported from a package). This allows full customization.
- Built on top of Radix UI primitives for accessibility (keyboard navigation, screen reader support, focus management).
- A custom `Field` component wraps form inputs with labels, descriptions, and error messages for consistent form UX.

### Feature-Based Folder Structure

Code is organized by domain under `src/features/`:

- Each feature (`auth`, `articles`, `users`) owns its own `api.ts`, `types.ts`, `schemas.ts`, `components/`, and `hooks/` directories.
- Page components in `src/app/` are thin — they only import and render feature components with no business logic.
- This keeps related code co-located and makes features easy to find and maintain.

### Form Handling — React Hook Form + Zod

- [React Hook Form](https://react-hook-form.com/) provides performant, uncontrolled form management.
- [Zod](https://zod.dev/) schemas define validation rules, integrated via `@hookform/resolvers`.
- Both client-side validation (instant feedback) and server-side error display (backend validation messages) are supported.

### hCaptcha Integration

- Login and registration forms include hCaptcha verification to prevent automated submissions.
- The test site key (`10000000-ffff-ffff-ffff-000000000001`) is used for local development — the red "for testing only" text is expected behavior.
- A real hCaptcha site key should be configured in production via environment variables.

### Edit Article Drawer — Forced Remount

The edit article drawer uses `key={article.id}` to force a React remount whenever a different article is selected. This ensures `react-hook-form` initializes with fresh `defaultValues` for the selected article, avoiding stale form state.

### Routing and Page Structure

- **App Router** (Next.js 13+ pattern) with file-based routing under `src/app/`.
- Route groups `(auth)` and `(protected)` separate public and authenticated pages with distinct layouts.
- The `ProtectedRoute` component in the `(protected)` layout guards against unauthenticated access.
- The root page (`/`) redirects to `/login`.

### Assumptions

- The backend API is a NestJS application running the [news-platform-api](https://github.com/PathumSandeepa/news-platform-api) project.
- The backend exposes RESTful endpoints at `/auth/login`, `/auth/register`, `/articles`, and `/users`.
- Articles have categories: `SPORTS`, `BUSINESS`, `ENTERTAINMENT`, `TECHNOLOGY`, `POLITICS`, `HEALTH`.
- User roles are: `ADMIN`, `EDITOR`, `READER`.
- The backend handles pagination and returns responses with `data`, `total`, `page`, `limit`, and `totalPages` fields.

---

## API Integration

The frontend communicates with the backend through these endpoints:

### Authentication

| Method | Endpoint         | Description                                   |
| ------ | ---------------- | --------------------------------------------- |
| POST   | `/auth/login`    | Authenticate and receive a JWT token          |
| POST   | `/auth/register` | Create a new user account and receive a token |

### Articles (Authenticated)

| Method | Endpoint             | Description                                     |
| ------ | -------------------- | ----------------------------------------------- |
| GET    | `/articles`          | List articles (paginated, filterable, sortable) |
| GET    | `/articles/:id`      | Get a single article (increments view count)    |
| POST   | `/articles`          | Create a new article                            |
| PATCH  | `/articles/:id`      | Update an existing article                      |
| DELETE | `/articles/:id`      | Delete an article                               |
| POST   | `/articles/:id/like` | Like an article                                 |

**Query Parameters for GET `/articles`:**

| Parameter  | Type   | Description                                       |
| ---------- | ------ | ------------------------------------------------- |
| `sortBy`   | string | Sort order (`date`, `views`, `likes`)             |
| `category` | string | Filter by category (e.g., `SPORTS`, `TECHNOLOGY`) |
| `page`     | number | Page number for pagination                        |
| `limit`    | number | Number of articles per page                       |

### Users (ADMIN only)

| Method | Endpoint          | Description          |
| ------ | ----------------- | -------------------- |
| GET    | `/users`          | List all users       |
| PATCH  | `/users/:id/role` | Update a user's role |

---

## Authentication Flow

```
1. User visits / → redirected to /login
2. User submits login form with hCaptcha token
3. Frontend sends POST /auth/login with credentials and captcha token
4. Backend returns { token, id, email, username, role }
5. Token and user object saved to localStorage (auth_token, auth_user)
6. User redirected to /news
7. All subsequent API calls include Authorization: Bearer <token>
8. On 401 response → clear localStorage, redirect to /login
```

---

## CI/CD Pipeline

The project uses **GitHub Actions** for continuous integration.

**Workflow file:** `.github/workflows/main.yml`

**Trigger:** Push and pull request to the `main` branch.

**Jobs:**

| Job     | Steps                                                         | Purpose                          |
| ------- | ------------------------------------------------------------- | -------------------------------- |
| `lint`  | Checkout → Node 22 → pnpm install → `pnpm lint`               | Ensures code quality via ESLint  |
| `build` | (needs lint) Checkout → Node 22 → pnpm install → `pnpm build` | Ensures successful Next.js build |

---

## Deployment

### Frontend — Vercel

The Next.js frontend is deployed on [Vercel](https://vercel.com/):

1. **Import the GitHub repository** into Vercel: [github.com/PathumSandeepa/news-platform-ui](https://github.com/PathumSandeepa/news-platform-ui)
2. Vercel automatically detects:
   - **Framework:** Next.js 16
   - **Build command:** `next build`
   - **Output directory:** `.next`
   - **Package manager:** pnpm (detected from `pnpm-lock.yaml`)
3. **Configure environment variables** in Vercel's project settings:
   - `NEXT_PUBLIC_API_URL` = `https://news-platform-api-do7e.onrender.com`
   - `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` = your production hCaptcha site key
4. The deployment is connected to the `main` branch with **automatic redeployment** on every push.

**Production URL:** https://news-updates-pearl.vercel.app

### Backend — Render

The NestJS backend API is deployed on [Render](https://render.com/):

- **Backend URL:** `https://news-platform-api-do7e.onrender.com`
- **Backend Repo:** [github.com/PathumSandeepa/news-platform-api](https://github.com/PathumSandeepa/news-platform-api)
- Hosted on Render's **free tier**, which means:
   - The service spins down after periods of inactivity.
   - The first request after inactivity may take 30-60 seconds while the server cold-starts.
   - Occasional timeouts or slow responses may occur.

### Manual Deployment (Vercel CLI)

If you prefer deploying via the CLI:

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (follow the prompts)
vercel

# Deploy to production
vercel --prod
```

### Environment Setup Summary

| Environment         | `NEXT_PUBLIC_API_URL`                         | Notes                                   |
| ------------------- | --------------------------------------------- | --------------------------------------- |
| Local Development   | `http://localhost:8000`                       | Requires NestJS backend running locally |
| Production (Vercel) | `https://news-platform-api-do7e.onrender.com` | Set in Vercel dashboard                 |

---

## Troubleshooting

| Issue                                | Solution                                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| **Login fails with "Login failed"**  | The Render backend may be cold-starting. Wait 30-60 seconds and retry.                                 |
| **CORS error on API calls**          | `NEXT_PUBLIC_API_URL` must exactly match the backend's `FRONTEND_URL` setting.                         |
| **hCaptcha red warning text**        | Expected behavior with test keys. Use real hCaptcha keys in production.                                |
| **Articles not loading after login** | Clear localStorage (`auth_token`, `auth_user`) and log in again — stale token from a previous session. |
| **`pnpm: command not found`**        | Install pnpm globally: `npm install -g pnpm`                                                           |
| **Environment variable not applied** | Ensure the variable starts with `NEXT_PUBLIC_`. Restart the dev server after changes.                  |
| **Build fails in CI**                | Check that all required `NEXT_PUBLIC_` environment variables are set in the workflow file.             |
| **Port 3000 already in use**         | Stop the other process or run `pnpm dev -- -p 3001` to use a different port.                           |
| **TypeScript errors after pulling**  | Run `pnpm install` to ensure all dependencies are up to date.                                          |

---

## License

This project is for educational and demonstration purposes.
