# Contributing

Thanks for helping improve IG Manager. This project is an open-source Core for a local-first, reviewable content operations workflow. Contributions should keep the Core platform-neutral, auditable, and safe by default.

## Before You Start

Read these first:

- [README.md](README.md)
- [docs/architecture/overview.md](docs/architecture/overview.md)
- [docs/architecture/security.md](docs/architecture/security.md)
- [docs/plugins/getting-started.md](docs/plugins/getting-started.md)
- [SECURITY.md](SECURITY.md)

For larger changes, open an issue before implementing so the scope, safety boundary, and plugin/Core ownership are clear.

## Development Setup

Requirements:

- Node.js 22 or newer
- pnpm 11

Install and verify:

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

Run local apps:

```bash
pnpm --filter @ig-manager/api dev
pnpm --filter @ig-manager/web dev
pnpm --filter @ig-manager/worker dev
```

## Contribution Areas

Good first areas:

- Domain model validation.
- Repository tests.
- Workflow engine tests.
- Dashboard usability and accessibility.
- Official API-based plugin skeletons.
- Documentation and templates.

Areas that require extra review:

- Plugin loading and execution.
- Permission enforcement.
- Secret storage.
- Publishing workflows.
- Scheduler and retry behavior.
- Any external network integration.

## Safety Rules

Contributions must follow these rules:

- Use official APIs only for platform access, publishing, media upload, analytics, and external service integration.
- Do not add scraping, stealth browser automation, UI-based posting, CAPTCHA bypass, anti-detection behavior, or engagement bots.
- Do not commit raw tokens, cookies, API keys, credentials, local vault files, or private generated media.
- Keep open-source Core separate from private automation plugins.
- Keep publish actions auditable.
- Keep auto-publish opt-in only.
- Keep generated candidates review-first by default.

Pull requests that violate these boundaries will be closed or redirected.

## Architecture Boundaries

Core packages must not hardcode Instagram-specific or AI-provider-specific behavior.

- `packages/domain`: types, schemas, factories, domain events, state transitions.
- `packages/db`: SQLite schema, migrations, mappers, repositories.
- `packages/workflow-engine`: review, schedule, publish, retry, audit orchestration.
- `packages/scheduler-core`: local polling, locking, retry policy.
- `packages/plugin-sdk`: manifest, permissions, contracts, result types.
- `apps/api`: local API, validation, error handling.
- `apps/web`: dashboard and mobile PWA.
- `apps/worker`: local worker loop.
- `plugins/official`: open-source official plugins that respect API and workflow policy.

Private automation plugins should live in separate repositories or local ignored folders and must not become Core dependencies.

## Code Style

- Use TypeScript with explicit exported types at package boundaries.
- Use Zod for runtime validation when crossing API, plugin, config, or persistence boundaries.
- Prefer repository and workflow interfaces over concrete coupling across packages.
- Keep tests focused on behavior and state transitions.
- Avoid unrelated refactors in feature pull requests.
- Do not add paid UI dependencies.
- Keep dashboard interactions accessible and usable on mobile.

## Testing Expectations

Run before opening a pull request:

```bash
pnpm typecheck
pnpm test
pnpm build
```

Add or update tests when changing:

- domain validation,
- state transitions,
- repository mapping or queries,
- workflow decisions,
- scheduler retry/locking behavior,
- plugin manifest or permission rules,
- API request/response contracts.

For frontend changes, include a short manual verification note in the pull request.

## Plugin Contributions

Use [plugins/templates/basic-plugin](plugins/templates/basic-plugin) for new plugins.

Plugin pull requests must include:

- `plugin.json` manifest,
- explicit permissions,
- dry-run behavior when possible,
- tests,
- documentation,
- clear error handling,
- no raw secret storage,
- no direct database access,
- no hidden publishing behavior.

Publisher plugins must use official APIs only and must not include scraping, browser automation, CAPTCHA bypass, or anti-detection logic.

## Documentation

Update docs in the same pull request when behavior changes. The README should stay high level; detailed behavior belongs under `docs/`.

## Issue And PR Hygiene

- Use the issue templates.
- Link related issues in pull requests.
- Keep pull requests scoped.
- Include test results.
- Call out migration, security, plugin, or API compatibility impact.
