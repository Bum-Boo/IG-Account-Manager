# Instagram Integration

IG Manager's Instagram publisher is an official-API-only plugin located at `plugins/official/instagram-publisher`.

The plugin does not implement browser automation, scraping, credential sharing, CAPTCHA bypassing, anti-detection behavior, or UI-based posting. Live network behavior stays behind the `InstagramGraphApiClient` interface.

## Publishing Model

The workflow engine must approve and schedule a candidate before the Instagram publisher runs. The plugin expects:

- A connected Instagram account record.
- An approved and scheduled `PostCandidate`.
- Media references or media URIs.
- Caption text.
- Optional hashtags in `candidate.metadata.instagram.hashtags`.
- Optional first comment in `candidate.firstComment`.

The plugin returns `externalPostId`, `permalink` when available, `publishedAt` for non-dry-run publishes, and a `rawResultRef` suitable for audit logs.

## Modes

`dryRun` mode validates and simulates the publish without token lookup or API calls. It is safe for tests and local preview.

`mock` mode simulates a successful publish locally and returns deterministic fake IDs and example permalinks. It does not call a token provider or API client.

`live` mode uses an injected token provider and Graph API client. The local API and worker create those from `@ig-manager/instagram-integration` when the registered publisher plugin id is `official.instagram-publisher`.

Live publishing currently supports one image item with a publicly reachable HTTPS URL. Local `file://` paths produced by generation are review-safe, but they cannot be sent to Meta's content publishing endpoint until a public media hosting step exists.

## Configuration

The config schema is exported as `InstagramPublisherConfigSchema`:

```ts
{
  mode: "mock" | "live";
  graphApiBaseUrl: string;
  graphApiVersion?: string;
  createFirstComment: boolean;
  mockPermalinkBaseUrl: string;
  requiredScopes: string[];
}
```

No secrets belong in this config. Tokens must come from a secure account connection layer through `InstagramTokenProvider`.

Runtime environment variables:

- `INSTAGRAM_APP_ID`
- `INSTAGRAM_APP_SECRET`
- `INSTAGRAM_REDIRECT_URI`, usually `http://localhost:3001/instagram/oauth/callback`
- `INSTAGRAM_GRAPH_API_BASE_URL`, default `https://graph.facebook.com`
- `INSTAGRAM_GRAPH_API_VERSION`
- `INSTAGRAM_REQUIRED_SCOPES`, default `pages_show_list,instagram_basic,instagram_content_publish`
- `INSTAGRAM_PUBLISH_MODE`, default `mock`; use `live` only when ready to publish through Meta
- `IG_MANAGER_WEB_BASE_URL`, default `http://localhost:5173`
- `IG_MANAGER_TOKEN_VAULT_KEY`, base64-encoded 32-byte key
- `INSTAGRAM_OAUTH_STATE_SECRET`, optional; falls back to the vault key

## Token Boundary

The plugin defines:

```ts
interface InstagramTokenProvider {
  getAccessToken(request: InstagramTokenRequest): Promise<InstagramAccessToken | undefined>;
}
```

The provider retrieves tokens from the local encrypted vault. Plugin code must not persist raw access tokens and must not log token values.

## Account Connection

The local API exposes:

- `POST /accounts/:id/instagram/connect`
- `GET /instagram/oauth/callback`
- `GET /accounts/:id/instagram/connection`
- `POST /accounts/:id/instagram/select`
- `POST /accounts/:id/instagram/disconnect`
- `POST /accounts/:id/instagram/refresh`

The account detail page uses those routes for Connect, account selection, refresh, and disconnect. Raw tokens are stored only in `secret_vault_entries` as AES-256-GCM ciphertext.

## Official API References

Use Meta's official developer documentation for implementation details:

- [Instagram Platform](https://developers.facebook.com/docs/instagram-platform/)
- [Content Publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing/)

## Safety Notes

- Do not add username/password posting flows.
- Do not add browser drivers, stealth plugins, or DOM automation.
- Do not add scraping or private endpoint calls.
- Do not commit credentials, access tokens, app secrets, refresh tokens, or test accounts.
- Keep all live network calls injectable and mockable so the plugin remains safe in local tests.
