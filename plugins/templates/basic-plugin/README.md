# Basic Plugin Template

Copy this directory to start a new IG Manager plugin.

```bash
cp -R plugins/templates/basic-plugin plugins/official/my-plugin
```

Then update:

- `package.json` name,
- `plugin.json` manifest,
- `src/index.ts` implementation,
- `src/template-plugin.test.ts` tests.

If the plugin is not under `plugins/official/*`, add its directory to `pnpm-workspace.yaml` while developing locally.

Security requirements:

- declare permissions explicitly,
- support dry-run behavior where practical,
- do not store secrets in the manifest or source,
- do not log tokens or credentials,
- do not access the database directly,
- use official APIs only for publisher plugins,
- keep publish actions routed through Core workflow and audit logging.
