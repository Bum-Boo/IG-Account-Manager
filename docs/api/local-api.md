# Local API

The local API is a Fastify server used by the web dashboard and mobile PWA. It runs on the user's computer and talks to the local SQLite workspace through the DB repositories and workflow engine.

## Runtime

Start the API with:

```bash
pnpm --filter @ig-manager/api dev
```

Environment variables:

- `API_HOST`: bind host. Defaults to `0.0.0.0`.
- `API_PORT`: bind port. Defaults to `3001`.
- `API_DATABASE_URL`: SQLite file path. Defaults to `./data/ig-manager.sqlite`.
- `DATABASE_URL`: fallback SQLite path when `API_DATABASE_URL` is not set.
- `IG_MANAGER_LOCAL_TOKEN`: optional bearer token for local API access.
- `API_ACTOR_ID`: audit actor label. Defaults to `local-api`.

If `IG_MANAGER_LOCAL_TOKEN` is set, all Core routes require:

```http
Authorization: Bearer <token>
```

`GET /health` and `/docs` remain public for local health checks and API documentation.

## Response Shape

Successful Core responses use:

```json
{
  "data": {}
}
```

Errors use:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Request validation failed.",
    "details": {}
  }
}
```

## Routes

System:

- `GET /health`
- `GET /docs`

Accounts:

- `GET /accounts`
- `POST /accounts`
- `GET /accounts/:id`
- `GET /accounts/:id/concepts`

Concepts:

- `POST /concepts`
- `GET /concepts/:id`
- `PUT /concepts/:id`

Assets:

- `GET /assets`
- `GET /assets?accountId=:accountId`
- `GET /assets?conceptId=:conceptId`
- `POST /assets`

Recipes:

- `GET /recipes`
- `GET /recipes?conceptId=:conceptId`
- `POST /recipes`

Candidates:

- `GET /candidates`
- `GET /candidates?status=ready_for_review`
- `GET /candidates?conceptId=:conceptId`
- `POST /candidates`
- `POST /candidates/:id/approve`
- `POST /candidates/:id/reject`
- `POST /candidates/:id/schedule`

Publish jobs:

- `GET /publish-jobs`
- `GET /publish-jobs?status=queued`
- `GET /publish-jobs?dueBefore=2026-06-01T10:00:00.000Z`
- `POST /publish-jobs/:id/retry`

Plugins:

- `GET /plugins`
- `GET /plugins?type=publisher`
- `GET /plugins?type=publisher&enabled=true`
- `POST /plugins/:id/enable`
- `POST /plugins/:id/disable`

Audit:

- `GET /audit-logs`
- `GET /audit-logs?entityType=candidate&entityId=:candidateId`

## Workflow-backed Operations

These routes call the workflow engine and emit workflow events plus audit logs:

- `POST /candidates`
- `POST /candidates/:id/approve`
- `POST /candidates/:id/reject`
- `POST /candidates/:id/schedule`
- `POST /publish-jobs/:id/retry`

Scheduling still requires a publisher plugin registration. The local API binds enabled publisher registrations to a mock publisher contract for validation only. It does not implement real Instagram OAuth or publishing.

## Security Notes

- The API is local-first and intended for trusted local clients.
- MVP authentication is a simple bearer token.
- Plugin metadata is sanitized by the DB mappers so token-like, secret-like, password-like, credential-like, and API-key-like fields are not returned.
- Real Instagram OAuth is intentionally deferred to an official publisher plugin.
- No scraping, stealth browser automation, CAPTCHA bypass, or anti-detection behavior is part of this API.
