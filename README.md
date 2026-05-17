# my-monorepo — Cheat Sheet

Stack: **pnpm workspaces** + **Turborepo** + **TypeScript**

---

## Table of Contents

1. [Repo Structure](#repo-structure)
2. [How It Works](#how-it-works)
3. [Setup from Scratch](#setup-from-scratch)
4. [Daily Commands](#daily-commands)
5. [Running a Single App or Package](#running-a-single-app-or-package)
6. [Using One Package Inside Another](#using-one-package-inside-another)
7. [Adding a New App](#adding-a-new-app)
8. [Adding a New Shared Package](#adding-a-new-shared-package)
9. [Adding Dependencies](#adding-dependencies)
10. [Apps Reference](#apps-reference)
11. [Packages Reference](#packages-reference)
12. [Turbo Pipeline](#turbo-pipeline)
13. [TypeScript Config Inheritance](#typescript-config-inheritance)
14. [ESLint Config Inheritance](#eslint-config-inheritance)
15. [CORS Between Apps](#cors-between-apps)
16. [Troubleshooting](#troubleshooting)

---

## Repo Structure

```
my-monorepo/
├── apps/
│   ├── backend/          # Express API  →  http://localhost:4000
│   ├── my-react-app/     # Vite + React →  http://localhost:5173
│   ├── web/              # Next.js       →  http://localhost:3000
│   └── docs/             # Next.js docs  →  http://localhost:3001
├── packages/
│   ├── utils/            # @mono/utils          — shared TS utility functions
│   ├── ui/               # @repo/ui             — shared React components
│   ├── typescript-config/# @repo/typescript-config — shared tsconfig bases
│   └── eslint-config/    # @repo/eslint-config  — shared ESLint configs
├── package.json          # root — scripts, pnpm engine, turbo dev dep
├── pnpm-workspace.yaml   # tells pnpm which folders are workspaces
└── turbo.json            # task pipeline (build order, caching)
```

---

## How It Works

**pnpm workspaces** link all `apps/*` and `packages/*` together so they can import each other using `workspace:*` — no publishing required.

**Turborepo** orchestrates tasks across all packages. It knows the dependency order (e.g. build `utils` before `web`) and caches results so unchanged packages are skipped.

```
pnpm-workspace.yaml          turbo.json
─────────────────────        ──────────────────────────────────
packages:                    tasks:
  - "apps/*"                   build:
  - "packages/*"                 dependsOn: ["^build"]   ← build deps first
                                 outputs: [".next/**"]
                               dev:
                                 cache: false
                                 persistent: true
```

---

## Setup from Scratch

```bash
# 1. Clone / enter the repo
cd my-monorepo

# 2. Install all dependencies for every app and package at once
pnpm install

# 3. Run everything in dev mode
pnpm dev
```

Requirements: **Node >= 18**, **pnpm 9**.

Install pnpm if missing:
```bash
npm install -g pnpm@9
```

---

## Daily Commands

Run from the **repo root** — Turbo fans out to every workspace:

| Task | Command |
|---|---|
| Dev all apps | `pnpm dev` |
| Build all | `pnpm build` |
| Lint all | `pnpm lint` |
| Type-check all | `pnpm check-types` |
| Format all files | `pnpm format` |
| Install a new dep everywhere | `pnpm install` |

---

## Running a Single App or Package

Use the `--filter` flag to target one workspace by its `name` in `package.json`:

```bash
# dev
pnpm --filter backend dev
pnpm --filter my-react-app dev
pnpm --filter web dev
pnpm --filter docs dev

# build
pnpm --filter backend build

# lint
pnpm --filter @mono/utils lint

# or use turbo filter (same result)
turbo dev --filter=web
turbo build --filter=backend
```

---

## Using One Package Inside Another

### Step 1 — add the dependency with `workspace:*`

```bash
# Add @mono/utils to my-react-app
pnpm --filter my-react-app add @mono/utils

# This writes into apps/my-react-app/package.json:
# "dependencies": { "@mono/utils": "workspace:*" }
```

Or edit `package.json` manually and run `pnpm install`.

### Step 2 — import and use it

```ts
// apps/my-react-app/src/App.tsx
import { formatDate, slugify, convertTime } from "@mono/utils";

slugify("Hello World")        // → "hello-world"
formatDate(new Date())        // → "May 18, 2026"
convertTime(3661000)          // → "01:01:01"
```

### How resolution works

`@mono/utils` has `"main": "./src/index.ts"` — pnpm symlinks it directly into `node_modules/@mono/utils`, so the import resolves to the live TypeScript source. No build step needed for local packages.

### Currently wired up

| Consumer | Uses |
|---|---|
| `apps/my-react-app` | `@mono/utils` |
| `apps/web` | `@repo/ui`, `@mono/utils`, `@repo/eslint-config`, `@repo/typescript-config` |
| `apps/docs` | `@repo/ui`, `@mono/utils`, `@repo/eslint-config`, `@repo/typescript-config` |
| `packages/ui` | `@repo/eslint-config`, `@repo/typescript-config` |

---

## Adding a New App

### Option A — Vite + React

```bash
# 1. Scaffold inside apps/
cd apps
pnpm create vite my-new-app --template react-ts
cd my-new-app

# 2. Install deps from root
cd ../..
pnpm install

# 3. Add shared packages (optional)
pnpm --filter my-new-app add @mono/utils
```

### Option B — Next.js

```bash
cd apps
pnpm create next-app my-next-app --typescript
cd ../..
pnpm install
```

### Option C — Express backend

```bash
# 1. Create the folder + files manually
mkdir -p apps/my-api/src

# 2. apps/my-api/package.json
{
  "name": "my-api",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": { "express": "^4", "cors": "^2" },
  "devDependencies": {
    "@types/express": "^5",
    "@types/cors": "^2",
    "@types/node": "^22",
    "tsx": "^4",
    "typescript": "5.9.2"
  }
}

# 3. Install from root
cd ../..
pnpm install
```

After adding any new app, pnpm auto-detects it because `pnpm-workspace.yaml` already includes `apps/*`.

---

## Adding a New Shared Package

```bash
# 1. Create folder
mkdir -p packages/my-lib/src

# 2. packages/my-lib/package.json  (pick a scoped name)
{
  "name": "@mono/my-lib",
  "version": "1.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}

# 3. packages/my-lib/src/index.ts
export const hello = (name: string) => `Hello, ${name}!`;

# 4. Install from root to link it
pnpm install

# 5. Add it to any app
pnpm --filter my-react-app add @mono/my-lib
```

---

## Adding Dependencies

```bash
# Add to a specific app/package
pnpm --filter backend add express
pnpm --filter backend add -D @types/express

# Add to root (shared tooling only)
pnpm add -w -D prettier

# Add to multiple packages at once
pnpm --filter web --filter docs add lodash

# Remove a dependency
pnpm --filter my-react-app remove axios
```

---

## Apps Reference

### `backend` — Express API (port 4000)

```
apps/backend/
├── src/index.ts    # all routes live here
├── package.json    # name: "backend"
└── tsconfig.json   # module: commonjs, outDir: dist
```

**Endpoints:**

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/users` | All users |
| GET | `/api/users/:id` | Single user by id |
| POST | `/api/users` | Create user `{ name, email }` |
| DELETE | `/api/users/:id` | Delete user |

Start: `pnpm --filter backend dev`

---

### `my-react-app` — Vite + React (port 5173)

```
apps/my-react-app/
├── src/
│   ├── App.tsx         # main component, fetches /api/users/1
│   └── main.tsx        # React root
├── tsconfig.app.json   # browser target, jsx: react-jsx
└── tsconfig.node.json  # for vite.config.ts
```

Start: `pnpm --filter my-react-app dev`

---

### `web` — Next.js (port 3000)

```
apps/web/
├── app/
│   ├── layout.tsx
│   └── page.tsx
└── tsconfig.json   # extends @repo/typescript-config/nextjs.json
```

Start: `pnpm --filter web dev`

---

### `docs` — Next.js docs site (port 3001)

Same structure as `web`. Start: `pnpm --filter docs dev`

---

## Packages Reference

### `@mono/utils` — Utility functions

```ts
import { slugify, formatDate, convertTime } from "@mono/utils";

slugify("Hello World")     // "hello-world"
formatDate(new Date())     // "May 18, 2026"
convertTime(3661000)       // "01:01:01"
```

Source: [packages/utils/src/index.ts](packages/utils/src/index.ts)

---

### `@repo/ui` — React component library

```tsx
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Code } from "@repo/ui/code";
```

Source: [packages/ui/src/](packages/ui/src/)

---

### `@repo/typescript-config` — Shared tsconfig bases

| File | Use for |
|---|---|
| `base.json` | Any TS project |
| `nextjs.json` | Next.js apps |
| `react-library.json` | React component packages |

Usage in your `tsconfig.json`:
```json
{ "extends": "@repo/typescript-config/nextjs.json" }
```

---

### `@repo/eslint-config` — Shared ESLint configs

| Export | Use for |
|---|---|
| `./base` | Any TS project |
| `./next-js` | Next.js apps |
| `./react-internal` | React packages/libraries |

Usage in your `eslint.config.js`:
```js
import { nextJsConfig } from "@repo/eslint-config/next-js";
export default [...nextJsConfig];
```

---

## Turbo Pipeline

`turbo.json` defines how tasks depend on each other:

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**"]
    },
    "dev": { "cache": false, "persistent": true },
    "lint": { "dependsOn": ["^lint"] },
    "check-types": { "dependsOn": ["^check-types"] }
  }
}
```

- `"^build"` means: build all dependencies of this package first.
- `cache: false` on `dev` means dev servers are never cached.
- `persistent: true` means the process stays alive (watch mode).

**Build order example:**
```
pnpm build
  └─ turbo figures out: build @mono/utils first
                        then build @repo/ui
                        then build web, docs, backend (parallel)
```

---

## TypeScript Config Inheritance

```
@repo/typescript-config/base.json          ← strict TS foundation
    ├── @repo/typescript-config/nextjs.json
    │       └── apps/web/tsconfig.json     (extends nextjs.json)
    │       └── apps/docs/tsconfig.json
    └── @repo/typescript-config/react-library.json
            └── packages/ui/tsconfig.json  (extends react-library.json)

apps/backend/tsconfig.json                 ← standalone (commonjs, node)
apps/my-react-app/tsconfig.app.json        ← standalone (browser, bundler)
```

---

## ESLint Config Inheritance

```
@repo/eslint-config/base.js
    ├── @repo/eslint-config/next.js   ← used by apps/web, apps/docs
    └── @repo/eslint-config/react-internal.js  ← used by packages/ui
```

`apps/my-react-app` has its own standalone `eslint.config.js` (Vite default).

---

## CORS Between Apps

When a frontend (e.g. `my-react-app` on port 5173) calls the backend (port 4000), the browser blocks it without CORS headers.

The backend uses the `cors` package:

```ts
// apps/backend/src/index.ts
import cors from "cors";
app.use(cors({ origin: "http://localhost:5173" }));
```

To allow multiple origins:
```ts
app.use(cors({ origin: ["http://localhost:5173", "http://localhost:3000"] }));
```

To allow all origins (dev only, never production):
```ts
app.use(cors());
```

---

## Troubleshooting

**`Cannot find module '@mono/utils'`**
```bash
pnpm install   # re-links workspace packages
```

**Type errors after adding a new package**
```bash
pnpm --filter <app> check-types
```

**Turbo cache returning stale results**
```bash
turbo build --force   # ignore cache for one run
```

**Port already in use**
```bash
lsof -ti:4000 | xargs kill   # kill whatever is on port 4000
```

**pnpm lock file conflict after pulling**
```bash
pnpm install   # regenerates pnpm-lock.yaml
```

**Adding a new app not picked up by turbo**

Check `pnpm-workspace.yaml` includes its folder pattern (`apps/*` already covers anything under `apps/`). Then run `pnpm install`.
