# Plugin Permissions

Plugins must declare every permission they require in `plugin.json`. Core services should check permissions before giving a plugin access to workspace data or workflow actions.

## Permission List

- `workspace:read`
- `account:read`
- `account:write`
- `concept:read`
- `concept:write`
- `asset:read`
- `asset:write`
- `recipe:read`
- `recipe:write`
- `candidate:read`
- `candidate:write`
- `candidate:review`
- `source:read`
- `source:import`
- `media:generate`
- `copy:generate`
- `validator:run`
- `schedule:read`
- `schedule:write`
- `scheduler:policy`
- `publish:validate`
- `publish:approved`
- `analytics:read`
- `analytics:export`
- `ui:render`
- `settings:read`
- `settings:write`
- `audit:write`

## Required Permissions By Type

- `source_importer`: `source:import`
- `media_generator`: `media:generate`, `asset:write`
- `copy_generator`: `copy:generate`, `candidate:write`
- `validator`: `validator:run`
- `scheduler_policy`: `scheduler:policy`
- `publisher`: `candidate:read`, `publish:validate`, `publish:approved`
- `analytics`: `analytics:read`, `analytics:export`
- `ui_extension`: `ui:render`

Plugins may request additional permissions, but the host should present them clearly to the user before enabling the plugin.

## Enforcement Model

The SDK provides `requirePermission` and `requirePermissions`. Runtime hosts should call these checks before invoking plugin operations or exposing host capabilities.

Plugins should not receive raw database handles, unrestricted filesystem access, or direct access to Core internals. Core should expose narrow services that enforce:

- declared permissions,
- dry-run behavior,
- audit logging,
- review-first workflow policy,
- official API-only publishing rules.

## Secrets

Secrets should not be stored in manifests, repository records, or public query results. A runtime host may provide a secret store through `PluginContext`, but access should be mediated by host policy and audited when appropriate.

