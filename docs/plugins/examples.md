# Plugin Examples

IG Manager includes example manifests and two official MVP plugins.

## Official Mock Publisher

Path:

```text
plugins/official/mock-publisher
```

Purpose:

- Simulates publisher behavior without external API calls.
- Validates the publish candidate before returning a result.
- Returns a fake `externalPostId`.
- Supports dry-run mode.
- Logs validation and publish activity through `PluginContext.logger`.

Contract:

- Implements `PublisherPlugin`.
- Uses `validatePublish` to check caption, format, media assets, and account status.
- Uses `publish` to return a fake post result or a clear non-retryable validation error.

It never calls Instagram, Meta, browser automation, scraping, CAPTCHA bypass, or any external network.

## Official Local Asset Source

Path:

```text
plugins/official/local-asset-source
```

Purpose:

- Imports YAML-described local assets from `content-library/assets`.
- Converts valid files into Core `ContentAsset` records.
- Reports invalid files as warnings and continues importing valid files.
- Supports dry-run mode.

Expected directories:

```text
content-library/assets/backgrounds
content-library/assets/outfits
content-library/assets/makeup
content-library/assets/camera
content-library/assets/poses
```

YAML fields:

```yaml
id: asset_background_soft_gray_studio
title: Soft gray studio wall
type: image
uri: file://content-library/assets/backgrounds/soft-gray-studio.png
description: Neutral gray studio wall.
tags:
  - background
  - studio
compatibleWith:
  - outfits:minimal
avoidWith:
  - lighting:low-key
promptFragment: soft gray studio wall, subtle texture
weight: 1.2
rights:
  usage: owned
```

`compatibleWith`, `avoidWith`, `promptFragment`, and `weight` are stored in `ContentAsset.metadata` so generation and validation plugins can use them later without changing Core asset fields.

## Existing Manifest Examples

Manifest-only examples remain under:

```text
plugins/examples/mock-publisher
plugins/examples/caption-tone-plugin
plugins/examples/analytics-csv-exporter
```

These are useful for manifest validation and documentation. The official MVP plugins above include executable TypeScript implementations and tests.

## Running Plugin Tests

```bash
pnpm --filter @ig-manager/plugin-official-mock-publisher test
pnpm --filter @ig-manager/plugin-official-local-asset-source test
```

All official plugin packages are part of the workspace and are included in the normal build/test flow.
