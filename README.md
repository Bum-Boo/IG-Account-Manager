# IG Manager

IG Manager is a local-first content operations platform for managing multiple concept-driven social accounts. It is designed for creators and small teams who need a reviewable pipeline for accounts, concepts, content assets, post candidates, scheduling, publishing plugins, and audit history.

The Core is platform-neutral. Instagram support belongs in publisher plugins that use official APIs only.

## What It Does

- Manages multiple accounts and multiple concepts per account.
- Stores concept profiles, content recipes, assets, post candidates, publish jobs, plugins, and audit logs.
- Provides a React dashboard for account, concept, asset, candidate, schedule, job, plugin, and settings workflows.
- Exposes a local Fastify API for the dashboard and mobile PWA.
- Runs a local worker that polls due publish jobs while the user's computer is awake.
- Defines a plugin SDK for importers, generators, validators, scheduler policies, publishers, analytics exporters, and UI extensions.
- Supports official MVP plugins for mock publishing, local asset import, and an Instagram publisher skeleton with dry-run and mock modes.

## What It Does Not Do

- It does not scrape Instagram, Pinterest, or any other platform.
- It does not use browser automation to simulate posting.
- It does not include CAPTCHA bypass, anti-detection behavior, credential sharing, or stealth automation.
- It does not automate engagement actions such as likes, follows, unfollows, comments, or direct messages.
- It does not store raw tokens or secrets in git.
- It does not enable uncontrolled auto-publishing by default. Publishing is review-first, auditable, and opt-in when automation policy allows it.
- It does not require the private AI Content Factory plugin for the open-source Core to run.

## Stack

- pnpm workspaces
- Turborepo
- TypeScript
- React + Vite in `apps/web`
- Fastify in `apps/api`
- Node TypeScript worker in `apps/worker`
- SQLite + Drizzle in `packages/db`
- Zod validation across domain, API, and plugin boundaries

## Workspace Layout

```text
apps/
  api/                  Local Fastify API
  web/                  React dashboard and PWA shell
  worker/               Local publish worker
packages/
  config/               Shared runtime config helpers
  db/                   SQLite schema and repositories
  domain/               Platform-neutral domain model
  logger/               Logging helpers
  plugin-sdk/           Manifest, permissions, and plugin contracts
  scheduler-core/       Polling, locking, retry policy, scheduler service
  workflow-engine/      Review, schedule, publish, retry workflows
plugins/
  official/             Open-source official plugins
  examples/             Manifest-only examples
  templates/            Copyable plugin development templates
docs/
  architecture/
  api/
  integrations/
  plugins/
  product/
```

## Setup

Requirements:

- Node.js 22 or newer
- pnpm 11

Install dependencies and verify the workspace:

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

Copy `.env.example` to `.env` only when local runtime configuration is needed. Never commit `.env` files or token vault files.

## Development

Run all development tasks:

```bash
pnpm dev
```

Or run apps individually:

```bash
pnpm --filter @ig-manager/api dev
pnpm --filter @ig-manager/web dev
pnpm --filter @ig-manager/worker dev
```

Default ports:

- Web dashboard: `5173`
- Local API: `3001`

To test from a phone on the same network, keep the API and web app running, find your computer's local IPv4 address, then open:

```text
http://<your-computer-ip>:5173/#/candidates
```

## Architecture Overview

IG Manager separates local Core behavior from platform-specific integrations:

- `packages/domain` defines accounts, concepts, assets, recipes, candidates, publish jobs, plugins, audit logs, policies, validation, and state transitions.
- `packages/db` maps domain objects to local SQLite storage through repository interfaces.
- `packages/workflow-engine` enforces review, scheduling, publishing, retry, event, and audit rules.
- `packages/scheduler-core` polls due publish jobs, locks them, retries bounded failures, and delegates execution to the workflow engine.
- `apps/api` exposes local Core operations to clients.
- `apps/web` provides the operational dashboard and mobile review flow.
- `apps/worker` runs the local publish loop when the user's computer is awake.
- `packages/plugin-sdk` defines the boundary between Core and plugins.

See [docs/architecture/overview.md](docs/architecture/overview.md), [docs/architecture/workflow-engine.md](docs/architecture/workflow-engine.md), [docs/architecture/scheduler.md](docs/architecture/scheduler.md), and [docs/architecture/security.md](docs/architecture/security.md).

## Plugin System

Plugins extend IG Manager through explicit SDK contracts. A plugin must include a `plugin.json` manifest declaring:

- stable plugin id, version, type, and distribution,
- capabilities,
- requested permissions,
- dry-run support,
- official API-only behavior for publisher plugins,
- private/internal status when applicable.

Supported plugin types:

- `source_importer`
- `media_generator`
- `copy_generator`
- `validator`
- `scheduler_policy`
- `publisher`
- `analytics`
- `ui_extension`

Start with [docs/plugins/getting-started.md](docs/plugins/getting-started.md) or copy [plugins/templates/basic-plugin](plugins/templates/basic-plugin).

Private AI/content generation plugins are developed outside this Core repository and installed into local workspaces only when needed. This repository keeps the SDK contracts and safety boundaries, not the private generation implementation.

## Safety And Compliance Principles

- Official APIs only for publishing, account access, media upload, analytics, and external service integration.
- No scraping, stealth browser automation, CAPTCHA bypass, anti-detection behavior, or UI-based posting.
- No raw tokens, API keys, credential files, local vaults, or generated private media in git.
- Plugins must declare permissions explicitly and should receive only narrow host-provided capabilities.
- Private automation plugins stay private and are not required for Core operation.
- Every publish action must be auditable.
- Auto-publish is opt-in only and must respect account, concept, workflow, and plugin policy.
- Generated candidates should default to review before scheduling and publishing.

## Scripts

- `pnpm dev` runs app development processes.
- `pnpm build` builds all apps and packages.
- `pnpm typecheck` runs TypeScript checks.
- `pnpm lint` runs the current lightweight lint gate.
- `pnpm test` runs unit tests.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening issues or pull requests. Security issues should follow [SECURITY.md](SECURITY.md) rather than public issue reports.
