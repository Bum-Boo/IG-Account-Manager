# Plugin Manifest

IG Manager plugins are declared with a `plugin.json` manifest. The manifest is the only plugin artifact the Core should trust before installation. It describes what the plugin is, what it can do, and what permissions it needs.

## Schema

Every manifest must use:

```json
{
  "schemaVersion": "ig-manager.plugin.v1"
}
```

Required fields:

- `id`: lowercase stable plugin id, using letters, numbers, dots, underscores, or hyphens.
- `name`: human-readable plugin name.
- `version`: plugin version string.
- `description`: concise description of what the plugin does.
- `type`: one of the supported plugin types.
- `permissions`: explicit permission list.
- `capabilities`: declared capability list.

Supported plugin types:

- `source_importer`
- `media_generator`
- `copy_generator`
- `validator`
- `scheduler_policy`
- `publisher`
- `analytics`
- `ui_extension`

Optional fields:

- `distribution`: `official`, `community`, or `private`. Defaults to `community`.
- `private`: marks a plugin as private/internal.
- `officialApiOnly`: required as `true` for publisher plugins.
- `entry`: future runtime entrypoint. The current SDK does not execute this code.
- `uiExtensionPoints`: required for `ui_extension` plugins.
- `dryRun`: declares dry-run support.
- `author`, `homepage`, `repository`, `metadata`.

## Example

```json
{
  "schemaVersion": "ig-manager.plugin.v1",
  "id": "mock.publisher",
  "name": "Mock Publisher",
  "version": "0.1.0",
  "description": "A dry-run publisher example.",
  "type": "publisher",
  "distribution": "community",
  "officialApiOnly": true,
  "permissions": ["candidate:read", "publish:validate", "publish:approved"],
  "capabilities": [{ "id": "publish.mock" }],
  "dryRun": {
    "supported": true,
    "modes": ["validate_only", "preview", "no_write"]
  }
}
```

## Validation Rules

The SDK validates manifests with Zod.

- Unknown plugin types fail validation.
- Missing required permissions fail validation.
- Publisher plugins must declare `officialApiOnly: true`.
- UI extension plugins must declare at least one UI extension point.
- Permissions must be explicit; no plugin receives implicit access.

## Security Boundary

Manifest validation does not make plugin code safe. The current SDK defines schemas and contracts only. It does not load or execute arbitrary plugin code. A future runtime host must sandbox execution, enforce permissions, and mediate all Core access through the SDK contracts.

