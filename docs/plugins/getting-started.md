# Plugin Getting Started

IG Manager plugins extend the local-first Core without giving plugin code direct access to Core internals. A plugin declares what it is, what it can do, and which permissions it needs. The host is responsible for validating the manifest, enforcing permissions, honoring dry-run mode, and writing audit logs around workflow changes.

The current SDK defines schemas and TypeScript contracts. Runtime execution is intentionally constrained and should be added only behind a host that enforces the security model in [permissions.md](permissions.md) and [../architecture/security.md](../architecture/security.md).

## Choose A Plugin Type

Supported types:

- `source_importer`: imports source data into assets, references, or candidates.
- `media_generator`: generates media assets from prompts or local inputs.
- `copy_generator`: generates captions, first comments, or copy variants.
- `validator`: validates candidates, assets, or publish readiness.
- `scheduler_policy`: proposes schedule slots or policy changes.
- `publisher`: publishes approved scheduled candidates through official APIs only.
- `analytics`: exports analytics through official APIs or local records.
- `ui_extension`: contributes dashboard UI extension points.

Publisher plugins have the strictest policy: `officialApiOnly` must be `true`, and the implementation must not scrape, automate browser UI, bypass CAPTCHA, or add anti-detection behavior.

## Start From The Template

Copy the template:

```bash
cp -R plugins/templates/basic-plugin plugins/official/my-plugin
```

Then update:

- `package.json` package name
- `plugin.json` manifest id, name, version, description, type, permissions, and capabilities
- `src/index.ts` contract implementation
- `src/template-plugin.test.ts` tests

If you place a community plugin somewhere outside `plugins/official/*`, add that path to `pnpm-workspace.yaml` while developing locally.

## Create A Manifest

Every plugin needs a `plugin.json` file:

```json
{
  "schemaVersion": "ig-manager.plugin.v1",
  "id": "community.caption-tone",
  "name": "Caption Tone Plugin",
  "version": "0.1.0",
  "description": "Generates caption variants from a concept profile.",
  "type": "copy_generator",
  "distribution": "community",
  "private": false,
  "officialApiOnly": false,
  "entry": "./dist/index.js",
  "permissions": ["concept:read", "copy:generate", "candidate:write"],
  "capabilities": [{ "id": "copy.caption.variants" }],
  "dryRun": {
    "supported": true,
    "modes": ["validate_only", "preview", "no_write"]
  }
}
```

Validate it with the SDK:

```ts
import { parsePluginManifest } from "@ig-manager/plugin-sdk";

const manifest = parsePluginManifest(rawManifest);
```

## Implement A Contract

Each plugin type maps to a TypeScript contract. A copy generator implements `CopyGeneratorPlugin`:

```ts
import type { CopyGeneratorPlugin } from "@ig-manager/plugin-sdk";
import { pluginSuccess } from "@ig-manager/plugin-sdk";

export const plugin: CopyGeneratorPlugin = {
  manifest,
  async generateCopy(request, context) {
    context.logger.info("generating copy", {
      pluginId: context.pluginId,
      dryRun: request.dryRun?.enabled === true
    });

    return pluginSuccess(
      {
        captions: [{ text: "Draft caption variant." }],
        firstComments: []
      },
      { dryRun: request.dryRun?.enabled === true }
    );
  }
};
```

## Dry Runs

Plugins should support dry-run execution wherever possible:

- `validate_only`: check inputs and return issues.
- `preview`: return proposed output without committing changes.
- `no_write`: perform read-only work and avoid side effects.

Dry-run support is declared in the manifest and passed at execution time through request objects. A dry run must not publish, mutate external systems, write generated media, or update Core records unless the host explicitly provides a dry-run output sink.

## Permissions

Declare the smallest permission set that works. The host should present permissions to users before enabling the plugin and should check permissions before exposing any Core data or service.

Common examples:

- Validator: `validator:run`
- Source importer: `source:import`, plus `asset:write` if it creates assets
- Copy generator: `copy:generate`, `candidate:write`
- Publisher: `candidate:read`, `publish:validate`, `publish:approved`
- UI extension: `ui:render`

See [permissions.md](permissions.md) for the full list.

## Tests

At minimum, plugin tests should cover:

- manifest validation,
- dry-run behavior,
- permission-sensitive paths,
- invalid input errors,
- no network calls in test mode,
- no raw token output in logs or results.

Run tests with:

```bash
pnpm --filter <plugin-package-name> test
```

## Examples

- `plugins/examples/mock-publisher/plugin.json`
- `plugins/examples/caption-tone-plugin/plugin.json`
- `plugins/examples/analytics-csv-exporter/plugin.json`
- `plugins/official/mock-publisher`
- `plugins/official/local-asset-source`
- `plugins/official/instagram-publisher`

## Security Checklist

Before proposing a plugin:

- The manifest declares all permissions explicitly.
- Publisher plugins use official APIs only.
- No raw tokens, API keys, or credential files are committed.
- Dry-run mode is implemented for validation and preview paths.
- Logs do not include secrets or raw user content beyond what is needed for debugging.
- Generated candidates default to review before scheduling and publishing.
- Publish actions go through Core workflow and audit logging.
- Private automation logic is not added to the open-source Core.
