# Instagram Integration

IG Manager's Instagram publisher is an official-API-only plugin skeleton located at `plugins/official/instagram-publisher`.

The plugin does not implement browser automation, scraping, credential sharing, CAPTCHA bypassing, anti-detection behavior, or UI-based posting. Live network behavior must be added only behind the `InstagramGraphApiClient` interface.

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

`live` mode is intentionally incomplete. It requires an injected token provider and API client. The default API client throws TODO errors rather than making network calls.

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

## Token Boundary

The plugin defines:

```ts
interface InstagramTokenProvider {
  getAccessToken(request: InstagramTokenRequest): Promise<InstagramAccessToken | undefined>;
}
```

The provider may retrieve tokens from a local encrypted store or future account connection service. Plugin code must not persist raw access tokens and must not log token values.

## Official API TODOs

The live API boundary is `InstagramGraphApiClient`:

- `createMediaContainer`: create a media container through the official Instagram API.
- `publishMediaContainer`: publish the created media container through the official Instagram API.
- `createFirstComment`: create a first comment through the official Instagram API.

Use Meta's official developer documentation for implementation details:

- [Instagram Platform](https://developers.facebook.com/docs/instagram-platform/)
- [Content Publishing](https://developers.facebook.com/docs/instagram-api/guides/content-publishing/)

## Safety Notes

- Do not add username/password posting flows.
- Do not add browser drivers, stealth plugins, or DOM automation.
- Do not add scraping or private endpoint calls.
- Do not commit credentials, access tokens, app secrets, refresh tokens, or test accounts.
- Keep all live network calls injectable and mockable so the plugin remains safe in local tests.
